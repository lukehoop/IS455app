from __future__ import annotations
import sys
import os

# Essential Fix: Tell this file to look in its own folder for modeling and fraud_pipeline
current_dir = os.path.dirname(__file__)
if current_dir not in sys.path:
    sys.path.append(current_dir)

from pathlib import Path
import json
from datetime import UTC, datetime, timedelta

import joblib
import pandas as pd

# These imports will now work on Vercel because of the sys.path line above
from modeling import METADATA_FILENAME, MODEL_FILENAME
from fraud_pipeline import (
    FEATURE_COLS,
    build_feature_table_from_supabase,
    fetch_existing_predicted_order_ids,
    upsert_predictions,
)

def _load_model_payload() -> dict:
    # Use the absolute path to the pipeline folder
    root = Path(os.path.dirname(__file__))
    model_path = root / MODEL_FILENAME
    
    if not model_path.exists():
        raise FileNotFoundError(f"Could not find model at {model_path}")
        
    payload = joblib.load(model_path)
    if not isinstance(payload, dict) or "pipeline" not in payload:
        raise ValueError("Model artifact must be a dict with key 'pipeline'.")
    return payload

def _load_model_version() -> str:
    root = Path(os.path.dirname(__file__))
    metadata_path = root / METADATA_FILENAME
    try:
        with open(metadata_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)
        return str(metadata.get("model_version", "unknown"))
    except FileNotFoundError:
        return "unknown"

def run_inference() -> pd.DataFrame:
    model_payload = _load_model_payload()
    pipeline = model_payload["pipeline"]
    feature_cols = model_payload.get("feature_cols", FEATURE_COLS)
    threshold = float(model_payload.get("threshold", 0.5))
    model_version = _load_model_version()

    df_live = build_feature_table_from_supabase()

    existing = set(fetch_existing_predicted_order_ids())
    df_live = df_live[~df_live["order_id"].isin(existing)].copy()
    
    if df_live.empty:
        return pd.DataFrame()

    X_live = df_live[feature_cols]
    fraud_prob = pipeline.predict_proba(X_live)[:, 1]
    is_fraud_pred = (fraud_prob >= threshold).astype(int)

    base_time = datetime.now(UTC)
    rows = []
    for i in range(len(df_live)):
        order_row = df_live.iloc[i]
        feature_snapshot = {
            col: float(order_row[col]) if pd.notna(order_row[col]) else None for col in feature_cols
        }
        rows.append({
            "scored_at_utc": (base_time + timedelta(microseconds=i)).isoformat(),
            "order_id": int(order_row["order_id"]),
            "customer_id": int(order_row["customer_id"]),
            "fraud_prob": float(fraud_prob[i]),
            "is_fraud_pred": bool(int(is_fraud_pred[i])),
            "threshold_used": float(threshold),
            "model_version": model_version,
            "feature_snapshot": feature_snapshot,
        })

    upsert_predictions(rows)
    return pd.DataFrame(rows)

if __name__ == "__main__":
    run_inference()