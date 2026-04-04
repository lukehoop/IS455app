from __future__ import annotations
import os
from pathlib import Path

import json
from datetime import UTC, datetime

import joblib
import pandas as pd

from modeling import METADATA_FILENAME, MODEL_FILENAME
from fraud_pipeline import (
    FEATURE_COLS,
    build_feature_table_from_supabase,
    fetch_existing_predicted_order_ids,
    upsert_predictions,
)


def _load_model_payload() -> dict:
    # This finds the folder where inference.py lives
    root = Path(os.getcwd()) / "pipeline"
    model_path = root / MODEL_FILENAME
    
    if not model_path.exists():
        raise FileNotFoundError(f"Could not find model at {model_path}")
        
    payload = joblib.load(model_path)
    if not isinstance(payload, dict) or "pipeline" not in payload:
        raise ValueError("Model artifact must be a dict with key 'pipeline'.")
    return payload


def _load_model_version() -> str:
    root = Path(os.getcwd()) / "pipeline"
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

    # Score only orders not already in fraud_predictions
    existing = set(fetch_existing_predicted_order_ids())
    df_live = df_live[~df_live["order_id"].isin(existing)].copy()
    if df_live.empty:
        print("No new orders to score.")
        return df_live

    X_live = df_live[feature_cols]
    fraud_prob = pipeline.predict_proba(X_live)[:, 1]
    is_fraud_pred = (fraud_prob >= threshold).astype(int)

    scored_at = datetime.now(UTC).isoformat()
    df_pred = pd.DataFrame({
        "scored_at_utc": scored_at,
        "order_id": df_live["order_id"].astype(int),
        "customer_id": df_live["customer_id"].astype(int),
        "fraud_prob": fraud_prob,
        "is_fraud_pred": is_fraud_pred.astype(bool),
        "threshold_used": threshold,
        "model_version": model_version,
    })

    # Upsert into Supabase
    upsert_predictions(df_pred.to_dict(orient="records"))

    print(f"Scored {len(df_pred)} rows with threshold={threshold:.4f}")
    print(f"Predicted fraud rate: {df_pred['is_fraud_pred'].mean():.4%}")
    return df_pred


if __name__ == "__main__":
    run_inference()
