from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

import pandas as pd
import requests
from dotenv import load_dotenv

# Repo root (parent of pipeline/) so env loads even if cwd is not the project root
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env.local")

# Environment:
#   SUPABASE_URL = https://<ref>.supabase.co
#   SUPABASE_SERVICE_ROLE_KEY = <service_role_jwt>


FEATURE_COLS = [
    "num_items",
    "avg_price",
    "total_value",
    "customer_age",
    "customer_order_count",
]

LABEL_COL = "is_fraud_label"


def _sb_headers() -> Dict[str, str]:
    base_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    svc_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not base_url or not svc_key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.")
    return {
        "apikey": svc_key,
        "Authorization": f"Bearer {svc_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def _sb_base() -> str:
    base_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    if not base_url.startswith("http"):
        raise RuntimeError("SUPABASE_URL must look like https://<ref>.supabase.co")
    return f"{base_url}/rest/v1"


def _fetch_table(table: str, select: Optional[str] = None, limit: Optional[int] = None) -> pd.DataFrame:
    """
    Fetch an entire table via PostgREST with simple pagination using Range headers.
    """
    url = f"{_sb_base()}/{table}"
    headers = _sb_headers().copy()
    params = {}
    if select:
        params["select"] = select

    all_rows: List[dict] = []
    start = 0
    step = 1000 if limit is None else min(limit, 1000)
    while True:
        end = start + step - 1
        rng_headers = headers.copy()
        rng_headers["Range-Unit"] = "items"
        rng_headers["Range"] = f"{start}-{end}"
        resp = requests.get(url, headers=rng_headers, params=params, timeout=60)
        resp.raise_for_status()
        batch = resp.json()
        if not isinstance(batch, list):
            batch = []
        all_rows.extend(batch)
        if len(batch) < step or (limit is not None and len(all_rows) >= limit):
            break
        start += step
    if limit is not None:
        all_rows = all_rows[:limit]
    return pd.DataFrame(all_rows)


def _upsert_rows(table: str, rows: List[dict], on_conflict: Optional[str] = None) -> None:
    if not rows:
        return
    url = f"{_sb_base()}/{table}"
    headers = _sb_headers().copy()
    if on_conflict:
        url += f"?on_conflict={on_conflict}"
    resp = requests.post(url, headers=headers, json=rows, timeout=120)
    resp.raise_for_status()


def build_feature_table_from_supabase() -> pd.DataFrame:
    """
    Pull raw operational tables from Supabase and engineer the same features
    used for training/inference.
    """
    orders = _fetch_table(
        "orders",
        select="order_id,customer_id,order_datetime,is_fraud",
    )
    customers = _fetch_table(
        "customers",
        select="customer_id,birthdate",
    )
    order_items = _fetch_table(
        "order_items",
        select="order_id,product_id,quantity,unit_price,line_total",
    )
    products = _fetch_table(
        "products",
        select="product_id,price",
    )

    # Aggregate item-level to order-level features
    items_enriched = order_items.merge(products, on="product_id", how="left")
    order_item_features = (
        items_enriched.groupby("order_id")
        .agg(
            num_items=("quantity", "sum"),
            avg_price=("unit_price", "mean"),
            total_value=("line_total", "sum"),
        )
        .reset_index()
    )

    df = (
        orders.merge(customers, on="customer_id", how="left")
        .merge(order_item_features, on="order_id", how="left")
    )

    # Feature engineering identical to training
    # Normalize timezone differences: make both timestamps tz-naive in UTC for arithmetic
    df["order_datetime"] = pd.to_datetime(df["order_datetime"], utc=True, errors="coerce")
    df["order_datetime"] = df["order_datetime"].dt.tz_convert("UTC").dt.tz_localize(None)
    df["birthdate"] = pd.to_datetime(df["birthdate"], errors="coerce")
    df["customer_age"] = ((df["order_datetime"] - df["birthdate"]).dt.days // 365).astype("Int64")
    # Historical order count per customer (within currently fetched data)
    df["customer_order_count"] = df.groupby("customer_id")["order_id"].transform("count")

    # Training label name for compatibility
    if "is_fraud" in df.columns:
        df[LABEL_COL] = df["is_fraud"].fillna(0).astype(int)
    else:
        df[LABEL_COL] = 0
    return df


def fetch_existing_predicted_order_ids() -> List[int]:
    preds = _fetch_table("fraud_predictions", select="order_id")
    if "order_id" not in preds.columns:
        return []
    return [int(x) for x in preds["order_id"].dropna().unique().tolist()]


def upsert_predictions(rows: List[dict]) -> None:
    """
    Write prediction rows into fraud_predictions, de-duplicating on order_id.
    """
    _upsert_rows("fraud_predictions", rows, on_conflict="order_id")
