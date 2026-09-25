"""
Feature Engineering and Preprocessing Pipeline for HamaraGhar ML.
Implements:
1. Domain-specific feature calculations (aspect ratio, density, area per floor/bhk, log transforms)
2. Zero-leakage dataset splitting (70% Train, 15% Val, 15% Test with fixed seed=42)
3. ColumnTransformer fitting strictly on Train split
4. Transformation and serialization of versioned datasets and preprocessor artifacts
"""
import os
import sys
from pathlib import Path

# Add repo root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import joblib
import numpy as np
import pandas as pd
from typing import Tuple, Dict, Any
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import RobustScaler, OneHotEncoder, LabelEncoder


def build_archetype_features(df: pd.DataFrame) -> pd.DataFrame:
    """Computes architectural domain features for layout archetype classification."""
    data = df.copy()
    
    # Feature 1: Aspect Ratio
    if "aspect_ratio" not in data.columns:
        data["aspect_ratio"] = data["plot_length"] / data["plot_width"]
        
    # Feature 2: Log area
    data["log_plot_area"] = np.log1p(data["plot_area_sqft"])
    
    # Feature 3: Area per BHK (spatial density)
    data["area_per_bhk"] = data["plot_area_sqft"] / data["bhk"]
    
    # Feature 4: Occupant density (sq.ft per person)
    data["sqft_per_person"] = data["plot_area_sqft"] / np.maximum(data["family_size"], 1)
    
    # Feature 5: Frontage to Area ratio
    data["frontage_ratio"] = data["plot_width"] / np.sqrt(data["plot_area_sqft"])
    
    # Feature 6: Floor area potential
    data["total_potential_sqft"] = data["plot_area_sqft"] * data["floors"]
    
    return data


def build_cost_features(df: pd.DataFrame) -> pd.DataFrame:
    """Computes geotechnical, structural, and scale domain features for cost regression."""
    data = df.copy()
    
    # Feature 1: Log built up area
    data["log_built_up_area"] = np.log1p(data["built_up_area_sqft"])
    
    # Feature 2: Footprint area per floor
    data["area_per_floor"] = data["built_up_area_sqft"] / data["floors"]
    
    # Feature 3: Area per BHK
    data["area_per_bhk"] = data["built_up_area_sqft"] / data["bhk"]
    
    # Feature 4: High vertical flag
    data["is_multi_story"] = (data["floors"] >= 2).astype(int)
    
    # Feature 5: Structural complexity score (heuristic combining basement, lift, multi-floor)
    data["structural_complexity"] = (
        data["floors"] * 1.0 +
        data["has_basement"].astype(int) * 1.5 +
        data["has_lift"].astype(int) * 2.0
    )
    
    return data


def prepare_archetype_dataset(
    raw_csv_path: str,
    output_dir: str,
    seed: int = 42
) -> Dict[str, Any]:
    """
    Splits and preprocesses archetype dataset with strict zero-leakage guarantee:
    1. Splits raw data into 70% Train, 15% Val, 15% Test using stratified split.
    2. Fits ColumnTransformer strictly on Train features.
    3. Transforms Train, Val, Test.
    4. Serializes datasets to processed/ and preprocessor to artifacts/.
    """
    df_raw = pd.read_csv(raw_csv_path)
    
    # Check nulls
    if df_raw.isnull().sum().sum() > 0:
        raise ValueError("Raw archetype dataset contains null values")
        
    # Domain feature engineering
    df_features = build_archetype_features(df_raw)
    
    # Define columns
    num_cols = [
        "plot_width", "plot_length", "plot_area_sqft", "aspect_ratio",
        "floors", "bhk", "family_size", "parking_spaces",
        "log_plot_area", "area_per_bhk", "sqft_per_person",
        "frontage_ratio", "total_potential_sqft"
    ]
    cat_cols = ["facing_direction", "vastu_priority"]
    target_cls = "layout_archetype"
    target_reg = "circulation_ratio"
    
    # Step 1: Stratified Split (70% train, 30% temp)
    train_df, temp_df = train_test_split(
        df_features,
        test_size=0.30,
        random_state=seed,
        stratify=df_features[target_cls]
    )
    
    # Step 2: Split temp into 50/50 -> 15% Val, 15% Test
    val_df, test_df = train_test_split(
        temp_df,
        test_size=0.50,
        random_state=seed,
        stratify=temp_df[target_cls]
    )
    
    # Step 3: Fit LabelEncoder for target archetype strictly on train
    label_encoder = LabelEncoder()
    train_y_cls = label_encoder.fit_transform(train_df[target_cls])
    val_y_cls = label_encoder.transform(val_df[target_cls])
    test_y_cls = label_encoder.transform(test_df[target_cls])
    
    # Step 4: Fit ColumnTransformer STRICTLY on Train features
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", RobustScaler(), num_cols),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_cols),
        ],
        remainder="drop"
    )
    
    train_X_prep = preprocessor.fit_transform(train_df[num_cols + cat_cols])
    val_X_prep = preprocessor.transform(val_df[num_cols + cat_cols])
    test_X_prep = preprocessor.transform(test_df[num_cols + cat_cols])
    
    # Get feature names
    cat_feature_names = preprocessor.named_transformers_["cat"].get_feature_names_out(cat_cols)
    all_feature_names = num_cols + list(cat_feature_names)
    
    # Create DataFrames for processed outputs
    def make_processed_df(X_arr, y_cls, y_reg_series):
        df_out = pd.DataFrame(X_arr, columns=all_feature_names)
        df_out["target_archetype_label"] = y_cls
        df_out["target_circulation_ratio"] = y_reg_series.values
        return df_out
        
    train_processed = make_processed_df(train_X_prep, train_y_cls, train_df[target_reg])
    val_processed = make_processed_df(val_X_prep, val_y_cls, val_df[target_reg])
    test_processed = make_processed_df(test_X_prep, test_y_cls, test_df[target_reg])
    
    # Persist processed CSV files
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    
    train_file = out_path / "archetype_train_v1.csv"
    val_file = out_path / "archetype_val_v1.csv"
    test_file = out_path / "archetype_test_v1.csv"
    
    train_processed.to_csv(train_file, index=False)
    val_processed.to_csv(val_file, index=False)
    test_processed.to_csv(test_file, index=False)
    
    # Persist Preprocessor and LabelEncoder artifacts
    artifact_dir = out_path.parent / "artifacts"
    artifact_dir.mkdir(parents=True, exist_ok=True)
    
    prep_bundle = {
        "preprocessor": preprocessor,
        "label_encoder": label_encoder,
        "num_cols": num_cols,
        "cat_cols": cat_cols,
        "all_feature_names": all_feature_names,
        "classes": list(label_encoder.classes_),
    }
    artifact_file = artifact_dir / "archetype_preprocessor_v1.joblib"
    joblib.dump(prep_bundle, artifact_file)
    
    return {
        "train_shape": train_processed.shape,
        "val_shape": val_processed.shape,
        "test_shape": test_processed.shape,
        "feature_count": len(all_feature_names),
        "classes": list(label_encoder.classes_),
        "artifact_path": str(artifact_file),
    }


def prepare_cost_dataset(
    raw_csv_path: str,
    output_dir: str,
    seed: int = 42
) -> Dict[str, Any]:
    """
    Splits and preprocesses construction cost dataset with zero leakage:
    1. Splits raw data into 70% Train, 15% Val, 15% Test.
    2. Fits ColumnTransformer strictly on Train features.
    3. Transforms Train, Val, Test.
    4. Serializes versioned files to processed/ and preprocessor to artifacts/.
    """
    df_raw = pd.read_csv(raw_csv_path)
    
    # Check nulls
    if df_raw.isnull().sum().sum() > 0:
        raise ValueError("Raw cost dataset contains null values")
        
    df_features = build_cost_features(df_raw)
    
    num_cols = [
        "built_up_area_sqft", "floors", "bhk", "city_tier",
        "log_built_up_area", "area_per_floor", "area_per_bhk",
        "is_multi_story", "structural_complexity"
    ]
    cat_cols = [
        "soil_type", "seismic_zone", "climate_zone", "finishing_tier",
        "has_basement", "has_lift"
    ]
    target_rate = "cost_per_sqft_inr"
    target_total = "total_cost_inr"
    
    # Step 1: Split 70% Train, 30% temp
    train_df, temp_df = train_test_split(
        df_features,
        test_size=0.30,
        random_state=seed
    )
    
    # Step 2: Split temp into 15% Val, 15% Test
    val_df, test_df = train_test_split(
        temp_df,
        test_size=0.50,
        random_state=seed
    )
    
    # Step 3: Fit ColumnTransformer STRICTLY on Train features
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", RobustScaler(), num_cols),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_cols),
        ],
        remainder="drop"
    )
    
    train_X_prep = preprocessor.fit_transform(train_df[num_cols + cat_cols])
    val_X_prep = preprocessor.transform(val_df[num_cols + cat_cols])
    test_X_prep = preprocessor.transform(test_df[num_cols + cat_cols])
    
    cat_feature_names = preprocessor.named_transformers_["cat"].get_feature_names_out(cat_cols)
    all_feature_names = num_cols + list(cat_feature_names)
    
    def make_processed_df(X_arr, y_rate_series, y_total_series):
        df_out = pd.DataFrame(X_arr, columns=all_feature_names)
        df_out["target_cost_per_sqft"] = y_rate_series.values
        df_out["target_total_cost"] = y_total_series.values
        return df_out
        
    train_processed = make_processed_df(train_X_prep, train_df[target_rate], train_df[target_total])
    val_processed = make_processed_df(val_X_prep, val_df[target_rate], val_df[target_total])
    test_processed = make_processed_df(test_X_prep, test_df[target_rate], test_df[target_total])
    
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    
    train_file = out_path / "cost_train_v1.csv"
    val_file = out_path / "cost_val_v1.csv"
    test_file = out_path / "cost_test_v1.csv"
    
    train_processed.to_csv(train_file, index=False)
    val_processed.to_csv(val_file, index=False)
    test_processed.to_csv(test_file, index=False)
    
    artifact_dir = out_path.parent / "artifacts"
    artifact_dir.mkdir(parents=True, exist_ok=True)
    
    prep_bundle = {
        "preprocessor": preprocessor,
        "num_cols": num_cols,
        "cat_cols": cat_cols,
        "all_feature_names": all_feature_names,
    }
    artifact_file = artifact_dir / "cost_preprocessor_v1.joblib"
    joblib.dump(prep_bundle, artifact_file)
    
    return {
        "train_shape": train_processed.shape,
        "val_shape": val_processed.shape,
        "test_shape": test_processed.shape,
        "feature_count": len(all_feature_names),
        "artifact_path": str(artifact_file),
    }


def run_pipeline():
    """Runs data generation, validation, and preprocessing pipeline."""
    from ml.data.generate_datasets import main as gen_main
    gen_main()
    
    root = Path(__file__).resolve().parent.parent.parent
    raw_dir = root / "ml" / "data" / "raw"
    processed_dir = root / "ml" / "data" / "processed"
    
    print("\nProcessing Archetype Dataset...")
    res_arch = prepare_archetype_dataset(
        raw_csv_path=str(raw_dir / "synthetic_archetype_dataset.csv"),
        output_dir=str(processed_dir),
        seed=42
    )
    print(" Archetype Result:", res_arch)
    
    print("\nProcessing Cost Dataset...")
    res_cost = prepare_cost_dataset(
        raw_csv_path=str(raw_dir / "synthetic_cost_dataset.csv"),
        output_dir=str(processed_dir),
        seed=42
    )
    print(" Cost Result:", res_cost)


if __name__ == "__main__":
    run_pipeline()
