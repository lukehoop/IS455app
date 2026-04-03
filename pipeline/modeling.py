from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    classification_report,
    f1_score,
    precision_recall_curve,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from clean import run_clean
from fraud_pipeline import FEATURE_COLS, LABEL_COL, build_feature_table_from_supabase


MODEL_FILENAME = "fraud_model.sav"
METADATA_FILENAME = "model_metadata.json"
METRICS_FILENAME = "metrics.json"


def _best_f1_threshold(y_true: pd.Series, y_prob: np.ndarray) -> tuple[float, float]:
    precision, recall, thresholds = precision_recall_curve(y_true, y_prob)
    precision = precision[:-1]
    recall = recall[:-1]
    f1_vals = (2 * precision * recall) / np.clip(precision + recall, 1e-12, None)
    idx = int(np.argmax(f1_vals))
    return float(thresholds[idx]), float(f1_vals[idx])


def train_fraud_model(base_dir: Path | None = None) -> None:
    root = base_dir or Path(__file__).resolve().parent
    run_clean()
    df = build_feature_table_from_supabase()

    X = df[FEATURE_COLS]
    y = df[LABEL_COL].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.25,
        random_state=42,
        stratify=y,
    )

    pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            ("model", LogisticRegression(max_iter=2000, class_weight="balanced")),
        ]
    )
    pipeline.fit(X_train, y_train)

    y_prob = pipeline.predict_proba(X_test)[:, 1]
    best_threshold, best_f1 = _best_f1_threshold(y_test, y_prob)
    y_pred = (y_prob >= best_threshold).astype(int)

    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "f1": float(f1_score(y_test, y_pred, zero_division=0)),
        "f1_best_threshold": best_f1,
        "roc_auc": float(roc_auc_score(y_test, y_prob)),
        "average_precision": float(average_precision_score(y_test, y_prob)),
        "threshold": best_threshold,
        "classification_report": classification_report(y_test, y_pred, output_dict=True, zero_division=0),
    }

    model_payload = {
        "pipeline": pipeline,
        "feature_cols": FEATURE_COLS,
        "threshold": best_threshold,
        "label_col": LABEL_COL,
    }
    joblib.dump(model_payload, root / MODEL_FILENAME)

    metadata = {
        "model_name": "fraud_pipeline",
        "model_version": "2.0.0",
        "trained_at_utc": datetime.now(UTC).isoformat(),
        "num_training_rows": int(X_train.shape[0]),
        "num_test_rows": int(X_test.shape[0]),
        "features": FEATURE_COLS,
        "label_col": LABEL_COL,
        "threshold": best_threshold,
        "model_artifact": MODEL_FILENAME,
    }

    with open(root / METADATA_FILENAME, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    with open(root / METRICS_FILENAME, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print(f"Saved model artifact: {MODEL_FILENAME}")
    print(f"Fraud threshold: {best_threshold:.4f}")
    print(f"ROC AUC: {metrics['roc_auc']:.4f} | AP: {metrics['average_precision']:.4f} | F1: {metrics['f1']:.4f}")


if __name__ == "__main__":
    train_fraud_model()
