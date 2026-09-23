"""
ML Layout Quality Ranker Training Pipeline for HamaraGhar.
Trains a HistGradientBoostingRegressor to evaluate and rank architectural floor plan candidates
based on spatial livability, daylight exposure, circulation efficiency, aspect ratios,
zoning privacy, and service core clustering.
"""

import json
import math
import hashlib
from pathlib import Path
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

# Paths
ROOT = Path(__file__).resolve().parent.parent.parent
ARTIFACTS_DIR = ROOT / "ml" / "artifacts"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH = ARTIFACTS_DIR / "layout_quality_ranker_v1.joblib"
SCALER_PATH = ARTIFACTS_DIR / "layout_ranker_preprocessor_v1.joblib"
MANIFEST_PATH = ARTIFACTS_DIR / "manifest.json"

FEATURE_COLUMNS = [
    "circulation_efficiency",
    "daylight_exposure_factor",
    "aspect_ratio_quality",
    "zoning_privacy_score",
    "service_clustering_index",
    "vastu_orientation_score",
    "carpet_efficiency_ratio",
    "bhk",
    "total_rooms",
    "plot_aspect_ratio"
]


def generate_synthetic_architectural_dataset(n_samples: int = 5000, seed: int = 42) -> pd.DataFrame:
    """
    Generates a realistic distribution of spatial layout configurations
    calibrated against architectural standards (Neufert, Alexander, NBC 2016).
    """
    np.random.seed(seed)

    # Spatial features with realistic correlations
    circ_eff = np.random.beta(a=7, b=2, size=n_samples) # 0.65 - 0.95
    daylight = np.random.beta(a=8, b=2, size=n_samples) # 0.70 - 0.98
    aspect_q = np.random.beta(a=6, b=2, size=n_samples) # 0.60 - 0.95
    privacy  = np.random.beta(a=6, b=3, size=n_samples) # 0.50 - 0.90
    service  = np.random.beta(a=7, b=3, size=n_samples) # 0.55 - 0.92
    vastu    = np.random.beta(a=5, b=2, size=n_samples) # 0.50 - 0.95

    bhk = np.random.choice([1, 2, 3, 4, 5], size=n_samples, p=[0.10, 0.30, 0.40, 0.15, 0.05])
    total_rooms = bhk + np.random.choice([2, 3, 4], size=n_samples, p=[0.4, 0.4, 0.2])
    carpet_eff = np.clip(0.70 + 0.15 * circ_eff + np.random.normal(0, 0.02, n_samples), 0.65, 0.92)
    plot_aspect = np.random.uniform(1.1, 2.0, size=n_samples)

    # Multi-criteria architectural livability formula:
    # 22% Daylight + 20% Circulation + 18% Aspect Ratio + 16% Privacy + 12% Service + 12% Vastu
    base_score = (
        0.22 * daylight +
        0.20 * circ_eff +
        0.18 * aspect_q +
        0.16 * privacy +
        0.12 * service +
        0.12 * vastu
    ) * 100.0

    # Slight penalty for very tight carpet efficiency or extreme plot aspect
    penalties = np.where(carpet_eff < 0.72, 5.0, 0.0) + np.where(plot_aspect > 1.8, 3.0, 0.0)
    noise = np.random.normal(0, 1.2, size=n_samples)

    quality_score = np.clip(base_score - penalties + noise, 30.0, 99.5)

    df = pd.DataFrame({
        "circulation_efficiency": circ_eff,
        "daylight_exposure_factor": daylight,
        "aspect_ratio_quality": aspect_q,
        "zoning_privacy_score": privacy,
        "service_clustering_index": service,
        "vastu_orientation_score": vastu,
        "carpet_efficiency_ratio": carpet_eff,
        "bhk": bhk,
        "total_rooms": total_rooms,
        "plot_aspect_ratio": plot_aspect,
        "quality_score": quality_score
    })

    return df


def sha256_of_file(filepath: Path) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()


def train_layout_ranker():
    print("==================================================")
    print("Training ML Layout Quality Ranker (HistGradientBoostingRegressor)")
    print("==================================================")

    df = generate_synthetic_architectural_dataset(n_samples=6000, seed=101)
    X = df[FEATURE_COLUMNS]
    y = df["quality_score"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = HistGradientBoostingRegressor(
        max_iter=150,
        learning_rate=0.08,
        max_leaf_nodes=31,
        min_samples_leaf=20,
        l2_regularization=0.1,
        random_state=42
    )

    model.fit(X_train_scaled, y_train)

    # Evaluation
    preds = model.predict(X_test_scaled)
    r2 = r2_score(y_test, preds)
    mae = mean_absolute_error(y_test, preds)
    rmse = math.sqrt(mean_squared_error(y_test, preds))

    print(f"Dataset samples : {len(df)}")
    print(f"Features        : {len(FEATURE_COLUMNS)}")
    print(f"Model R^2 Score : {r2:.4f}")
    print(f"Model MAE       : {mae:.2f} points (out of 100)")
    print(f"Model RMSE      : {rmse:.2f} points")

    # Serialize artifacts
    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    print(f"Saved model to     : {MODEL_PATH}")
    print(f"Saved scaler to    : {SCALER_PATH}")

    # Compute SHA256
    model_sha = sha256_of_file(MODEL_PATH)
    scaler_sha = sha256_of_file(SCALER_PATH)

    # Update manifest.json
    manifest = {}
    if MANIFEST_PATH.exists():
        with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
            manifest = json.load(f)

    if "artifacts" not in manifest:
        manifest["artifacts"] = {}

    manifest["artifacts"]["layout_quality_ranker_v1.joblib"] = {
        "sha256": model_sha,
        "size_bytes": MODEL_PATH.stat().st_size,
        "size_kb": round(MODEL_PATH.stat().st_size / 1024, 2),
        "model_name": "ML Architectural Layout Livability & Quality Ranker",
        "version": "1.0.0",
        "algorithm": "HistGradientBoostingRegressor",
        "framework": "scikit-learn",
        "target": "Layout Livability Score (0-100)",
        "r2_score": round(float(r2), 4),
        "mae": round(float(mae), 4),
        "features": FEATURE_COLUMNS
    }
    manifest["artifacts"]["layout_ranker_preprocessor_v1.joblib"] = {
        "sha256": scaler_sha,
        "size_bytes": SCALER_PATH.stat().st_size,
        "size_kb": round(SCALER_PATH.stat().st_size / 1024, 2),
        "model_name": "Preprocessor feature scaler for Layout Quality Ranker",
        "version": "1.0.0",
        "algorithm": "StandardScaler",
        "framework": "scikit-learn"
    }

    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print("Updated manifest.json with SHA256 integrity hashes.")
    print("Training completed successfully.")


if __name__ == "__main__":
    train_layout_ranker()
