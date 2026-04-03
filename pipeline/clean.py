from __future__ import annotations

from fraud_pipeline import build_feature_table_from_supabase


WAREHOUSE_TABLE = "fact_orders_fraud_ml"  # kept for compatibility with docs (not used with Supabase API)


def run_clean() -> None:
    """
    For the Supabase setup, 'clean' now just materializes features in-memory.
    You can extend this to write to a Supabase warehouse table if desired.
    """
    df = build_feature_table_from_supabase()
    print(f"Built {len(df)} feature rows from Supabase.")


if __name__ == "__main__":
    run_clean()
