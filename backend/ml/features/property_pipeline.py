"""
Real Kaggle Ingestion, Cleaning, and Feature Engineering Pipeline.
Dataset: House Price Prediction Challenge (pan-India, 29,451 records).

Pipeline Steps:
1. Ingestion & Audit of raw dataset (ml/data/raw/kaggle_house_prices.csv)
2. Cleaning & Bounding (deduplication, valid residential envelope: 150 to 12,000 sqft, 1 to 10 BHK)
3. Domain Feature Engineering (city parsing, log-transforms, sqft/bhk spaciousness)
4. Leakage-Proof Splitting (70% Train, 15% Val, 15% Test with fixed seed=42)
5. Preprocessor fitting strictly on Train split only
6. Serialization of versioned datasets and preprocessor artifact
"""
import os
import sys
import joblib
from pathlib import Path
from typing import Dict, Any, Tuple
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import RobustScaler, OneHotEncoder

# Add repo root to sys.path
ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))


def clean_and_engineer_features(df_raw: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Performs real-world data cleaning and domain feature engineering."""
    initial_rows = len(df_raw)
    
    # 1. Deduplicate
    df = df_raw.drop_duplicates().copy()
    duplicates_removed = initial_rows - len(df)
    
    # 2. Standardize column names (strip whitespace and special characters)
    rename_map = {
        "BHK_NO.": "BHK_NO",
        "TARGET(PRICE_IN_LACS)": "TARGET_PRICE_IN_LACS",
    }
    df = df.rename(columns=rename_map)
    
    # 3. Filter valid residential envelope
    # Exclude extreme scraping errors (e.g. 3 sqft or 250M sqft)
    mask = (
        (df["SQUARE_FT"] >= 150.0) &
        (df["SQUARE_FT"] <= 12000.0) &
        (df["BHK_NO"] >= 1) &
        (df["BHK_NO"] <= 10) &
        (df["TARGET_PRICE_IN_LACS"] >= 1.0) &
        (df["TARGET_PRICE_IN_LACS"] <= 5000.0)
    )
    df = df[mask].copy()
    valid_rows = len(df)
    
    # 4. Feature Engineering
    # A. Extract City from ADDRESS (format: 'Locality, City')
    def extract_city(addr: str) -> str:
        parts = str(addr).split(",")
        city = parts[-1].strip()
        return city
        
    df["city_raw"] = df["ADDRESS"].apply(extract_city)
    
    # Group rare cities into 'Other' to ensure robust categorical encoding
    top_cities = df["city_raw"].value_counts().head(25).index.tolist()
    df["city"] = df["city_raw"].apply(lambda c: c if c in top_cities else "Other")
    
    # B. Log transforms for highly skewed continuous variables
    df["log_square_ft"] = np.log1p(df["SQUARE_FT"])
    df["log_target_price"] = np.log1p(df["TARGET_PRICE_IN_LACS"])
    
    # C. Spaciousness / Unit Density: square feet per bedroom
    df["sqft_per_bhk"] = df["SQUARE_FT"] / np.maximum(df["BHK_NO"], 1)
    
    # D. Price per sqft in INR (derived target for analysis and display)
    df["price_per_sqft_inr"] = (df["TARGET_PRICE_IN_LACS"] * 100000.0) / df["SQUARE_FT"]
    
    audit_stats = {
        "initial_rows": initial_rows,
        "duplicates_removed": duplicates_removed,
        "clean_valid_rows": valid_rows,
        "retention_pct": round(valid_rows / initial_rows * 100.0, 2),
        "top_cities_tracked": len(top_cities),
    }
    return df, audit_stats


def build_property_pipeline(
    raw_csv_path: Path,
    processed_dir: Path,
    artifacts_dir: Path,
    seed: int = 42
) -> Dict[str, Any]:
    """
    Executes full pipeline on the real Kaggle dataset with zero data leakage:
    - 70% Train, 15% Validation, 15% Test.
    - Preprocessor fitted strictly on Train split.
    - Test split is locked and left completely untouched for Stage 5.
    """
    df_raw = pd.read_csv(raw_csv_path)
    df_clean, audit_stats = clean_and_engineer_features(df_raw)
    
    num_cols = [
        "SQUARE_FT",
        "log_square_ft",
        "BHK_NO",
        "sqft_per_bhk",
        "LONGITUDE",
        "LATITUDE",
    ]
    cat_cols = [
        "POSTED_BY",
        "BHK_OR_RK",
        "city",
    ]
    binary_cols = [
        "UNDER_CONSTRUCTION",
        "RERA",
        "READY_TO_MOVE",
        "RESALE",
    ]
    
    feature_cols = num_cols + cat_cols + binary_cols
    target_col = "TARGET_PRICE_IN_LACS"
    log_target_col = "log_target_price"
    
    # Step 1: Train/Temp split (70% Train, 30% Temp)
    train_df, temp_df = train_test_split(
        df_clean,
        test_size=0.30,
        random_state=seed,
        shuffle=True
    )
    
    # Step 2: Split Temp into 15% Val and 15% Test
    val_df, test_df = train_test_split(
        temp_df,
        test_size=0.50,
        random_state=seed,
        shuffle=True
    )
    
    # Step 3: Fit ColumnTransformer STRICTLY on Train split only
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", RobustScaler(), num_cols),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_cols),
            ("bin", "passthrough", binary_cols),
        ],
        remainder="drop"
    )
    
    X_train_prep = preprocessor.fit_transform(train_df[feature_cols])
    X_val_prep = preprocessor.transform(val_df[feature_cols])
    X_test_prep = preprocessor.transform(test_df[feature_cols])
    
    # Extract transformed feature names
    cat_feature_names = preprocessor.named_transformers_["cat"].get_feature_names_out(cat_cols)
    all_feature_names = num_cols + list(cat_feature_names) + binary_cols
    
    # Build processed DataFrames
    def format_processed(X_arr, orig_df):
        df_out = pd.DataFrame(X_arr, columns=all_feature_names)
        df_out["target_price_lacs"] = orig_df[target_col].values
        df_out["log_target_price"] = orig_df[log_target_col].values
        df_out["price_per_sqft_inr"] = orig_df["price_per_sqft_inr"].values
        df_out["raw_square_ft"] = orig_df["SQUARE_FT"].values
        df_out["raw_bhk"] = orig_df["BHK_NO"].values
        df_out["raw_city"] = orig_df["city"].values
        return df_out
        
    train_proc = format_processed(X_train_prep, train_df)
    val_proc = format_processed(X_val_prep, val_df)
    test_proc = format_processed(X_test_prep, test_df)
    
    # Save processed splits
    processed_dir.mkdir(parents=True, exist_ok=True)
    train_path = processed_dir / "property_train_v1.csv"
    val_path = processed_dir / "property_val_v1.csv"
    test_path = processed_dir / "property_test_v1.csv"
    
    train_proc.to_csv(train_path, index=False)
    val_proc.to_csv(val_path, index=False)
    test_proc.to_csv(test_path, index=False)
    
    # Serialize preprocessor artifact
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    prep_bundle = {
        "preprocessor": preprocessor,
        "num_cols": num_cols,
        "cat_cols": cat_cols,
        "binary_cols": binary_cols,
        "all_feature_names": all_feature_names,
        "feature_count": len(all_feature_names),
        "audit_stats": audit_stats,
    }
    prep_artifact_path = artifacts_dir / "property_preprocessor_v1.joblib"
    joblib.dump(prep_bundle, prep_artifact_path)
    
    return {
        "train_samples": len(train_proc),
        "val_samples": len(val_proc),
        "test_samples": len(test_proc),
        "feature_count": len(all_feature_names),
        "audit_stats": audit_stats,
        "preprocessor_artifact": str(prep_artifact_path),
    }


def main():
    raw_path = ROOT / "ml" / "data" / "raw" / "kaggle_house_prices.csv"
    proc_dir = ROOT / "ml" / "data" / "processed"
    art_dir = ROOT / "ml" / "artifacts"
    
    print("=" * 70)
    print("INGESTING & PREPROCESSING KAGGLE HOUSE PRICE CHALLENGE DATASET")
    print("=" * 70)
    
    results = build_property_pipeline(raw_path, proc_dir, art_dir, seed=42)
    print(f"Audit Stats: {results['audit_stats']}")
    print(f"Train samples: {results['train_samples']} (70%)")
    print(f"Validation samples: {results['val_samples']} (15%)")
    print(f"Test samples: {results['test_samples']} (15% - LOCKED)")
    print(f"Transformed Features Count: {results['feature_count']}")
    print(f"Saved Preprocessor Artifact: {results['preprocessor_artifact']}")


if __name__ == "__main__":
    main()
