"""
Reproducible Training Pipeline for HamaraGhar Residential Property Price Regressor.
Dataset: Real Kaggle pan-India House Price Prediction Challenge (28,835 clean records).

Trains:
1. Baseline: Ridge Regression
2. Competitive 1: Random Forest Regressor
3. Competitive 2: HistGradientBoosting Regressor

Evaluates strictly on the VALIDATION set (4,325 samples).
The TEST set (4,326 samples) remains strictly locked and untouched until Stage 5.
"""
import os
import sys
import time
import argparse
import datetime
from pathlib import Path
import joblib
import numpy as np
import pandas as pd

# Add repo root to sys.path
ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))

from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor
from sklearn.metrics import (
    mean_absolute_error,
    root_mean_squared_error,
    r2_score,
    mean_absolute_percentage_error,
)


def train_property_models(data_dir: Path, artifacts_dir: Path, seed: int = 42):
    """Trains baseline and competitive models for Indian residential property price prediction."""
    print("=" * 75)
    print("STAGE 4: TRAINING RESIDENTIAL PROPERTY PRICE REGRESSOR (REAL KAGGLE DATA)")
    print("=" * 75)
    
    train_path = data_dir / "property_train_v1.csv"
    val_path = data_dir / "property_val_v1.csv"
    
    train_df = pd.read_csv(train_path)
    val_df = pd.read_csv(val_path)
    
    prep_artifact = joblib.load(artifacts_dir / "property_preprocessor_v1.joblib")
    feature_cols = prep_artifact["all_feature_names"]
    
    # Train on log_target_price for scale-invariance, evaluate in actual Lakhs INR
    X_train = train_df[feature_cols]
    y_train_log = train_df["log_target_price"]
    
    X_val = val_df[feature_cols]
    y_val_log = val_df["log_target_price"]
    y_val_actual_lakhs = val_df["target_price_lacs"]
    
    print(f"Dataset: Kaggle House Price Prediction Challenge (pan-India)")
    print(f"Features: {len(feature_cols)} (geospatial, architectural, developer, regulatory)")
    print(f"Train samples: {len(X_train)} (70%) | Validation samples: {len(X_val)} (15%)")
    print(f"Test samples: 4,326 (15% - STRICTLY LOCKED)")
    
    candidate_models = {
        "Baseline_Ridge": {
            "model": Ridge(alpha=1.0, random_state=seed),
            "params": {"alpha": 1.0, "solver": "auto"},
        },
        "Competitive_RandomForest": {
            "model": RandomForestRegressor(n_estimators=100, max_depth=14, min_samples_split=4, random_state=seed, n_jobs=-1),
            "params": {"n_estimators": 100, "max_depth": 14, "min_samples_split": 4},
        },
        "Competitive_HistGradientBoosting": {
            "model": HistGradientBoostingRegressor(max_iter=300, learning_rate=0.06, max_depth=8, min_samples_leaf=15, random_state=seed),
            "params": {"max_iter": 300, "learning_rate": 0.06, "max_depth": 8, "min_samples_leaf": 15},
        },
    }
    
    results = {}
    best_name = None
    best_mae = float("inf")
    best_model_bundle = None
    
    for name, cfg in candidate_models.items():
        print(f"\nTraining {name}...")
        model = cfg["model"]
        
        start_time = time.perf_counter()
        model.fit(X_train, y_train_log)
        train_time = time.perf_counter() - start_time
        
        # Predict on validation set in log scale, then convert back to Lakhs INR
        y_val_pred_log = model.predict(X_val)
        y_val_pred_lakhs = np.expm1(y_val_pred_log)
        
        # Compute metrics on actual Lakhs scale
        mae = mean_absolute_error(y_val_actual_lakhs, y_val_pred_lakhs)
        rmse = root_mean_squared_error(y_val_actual_lakhs, y_val_pred_lakhs)
        r2 = r2_score(y_val_actual_lakhs, y_val_pred_lakhs)
        mape = mean_absolute_percentage_error(y_val_actual_lakhs, y_val_pred_lakhs) * 100.0
        
        # Also compute log-space R^2 (standard competition metric)
        r2_log = r2_score(y_val_log, y_val_pred_log)
        
        results[name] = {
            "mae_lakhs": round(mae, 2),
            "rmse_lakhs": round(rmse, 2),
            "r2_lakhs": round(r2, 4),
            "r2_log_scale": round(r2_log, 4),
            "mape_pct": round(mape, 2),
            "train_time_sec": round(train_time, 4),
            "params": cfg["params"],
        }
        
        print(f"  Validation MAE:       INR {mae:.2f} Lakhs")
        print(f"  Validation RMSE:      INR {rmse:.2f} Lakhs")
        print(f"  Validation R^2:       {r2:.4f} (Log-scale R^2: {r2_log:.4f})")
        print(f"  Validation MAPE:      {mape:.2f}%")
        print(f"  Train Duration:       {train_time:.4f}s")
        
        if mae < best_mae:
            best_mae = mae
            best_name = name
            best_model_bundle = {
                "model": model,
                "model_name": name,
                "model_family": type(model).__name__,
                "task": "Indian Residential Property Price Prediction",
                "dataset": "Kaggle House Price Prediction Challenge (29,451 records)",
                "version": "1.0.0",
                "feature_names": feature_cols,
                "target_name": "TARGET_PRICE_IN_LACS",
                "target_unit": "Lakhs INR",
                "hyperparameters": cfg["params"],
                "validation_metrics": results[name],
                "all_candidates_val_metrics": results,
                "trained_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            }
            
    # Persist winning model artifact
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    out_file = artifacts_dir / "property_price_regressor_v1.joblib"
    joblib.dump(best_model_bundle, out_file)
    print(f"\n--> Selected Best Model on Validation Set: {best_name}")
    print(f"--> Validation MAE: INR {best_mae:.2f} Lakhs (R^2: {best_model_bundle['validation_metrics']['r2_lakhs']})")
    print(f"--> Saved Model Artifact: {out_file}")
    
    return results, best_name


def main():
    parser = argparse.ArgumentParser(description="Train HamaraGhar Property Price Model")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    args = parser.parse_args()
    
    data_dir = ROOT / "ml" / "data" / "processed"
    artifacts_dir = ROOT / "ml" / "artifacts"
    
    train_property_models(data_dir, artifacts_dir, seed=args.seed)


if __name__ == "__main__":
    main()
