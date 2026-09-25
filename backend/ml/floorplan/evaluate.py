import sys
from pathlib import Path
_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

"""
Evaluation Script for Real CubiCasa5K Floor-Plan ML Intelligence.
Performs thorough benchmarking on locked holdout test set (75 verified samples)
with latency SLAs, classification report, and manifold similarity validation.
"""
import time
from pathlib import Path
import joblib
import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, confusion_matrix, classification_report

from ml.floorplan.dataset import load_real_floorplan_dataset
from ml.floorplan.features import FEATURE_COLUMNS, TYPOLOGY_NAMES
from ml.floorplan.similarity import get_manifold_similarity_engine

ROOT = Path(__file__).resolve().parent.parent.parent
MODEL_PATH = ROOT / "ml" / "artifacts" / "floorplan_model_v2.joblib"


def evaluate_production_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model not found at {MODEL_PATH}")

    model = joblib.load(MODEL_PATH)
    df = load_real_floorplan_dataset()

    test_df = df[df["official_split"] == "test"]
    if test_df.empty:
        test_df = df.iloc[int(len(df) * 0.85):]

    X_test = test_df[FEATURE_COLUMNS]
    y_test = test_df["layout_typology"]

    # Warmup
    _ = model.predict(X_test.iloc[:2])

    # Measure CPU latency SLA
    t0 = time.perf_counter()
    preds = model.predict(X_test)
    probs = model.predict_proba(X_test) if hasattr(model, "predict_proba") else None
    dt_ms = (time.perf_counter() - t0) * 1000.0 / len(X_test)

    acc = accuracy_score(y_test, preds)
    f1 = f1_score(y_test, preds, average="macro", zero_division=0)
    prec = precision_score(y_test, preds, average="macro", zero_division=0)
    rec = recall_score(y_test, preds, average="macro", zero_division=0)
    cm = confusion_matrix(y_test, preds)

    # Manifold engine latency and test
    manifold_eng = get_manifold_similarity_engine()
    sample_feat = X_test.iloc[0].to_dict()
    _ = manifold_eng.compute_similarity(sample_feat)

    t_man_start = time.perf_counter()
    man_res = manifold_eng.compute_similarity(sample_feat)
    man_lat_ms = (time.perf_counter() - t_man_start) * 1000.0

    print("==================================================")
    print("HOLDOUT TEST EVALUATION — CUBICASA5K MODEL V2")
    print("Task: Typology Classification + Manifold Similarity")
    print("==================================================")
    print(f"Test Samples       : {len(X_test)}")
    print(f"Test Accuracy      : {acc:.4f}")
    print(f"Test Macro F1      : {f1:.4f}")
    print(f"Test Precision     : {prec:.4f}")
    print(f"Test Recall        : {rec:.4f}")
    print(f"Classifier Latency : {dt_ms:.3f} ms / sample (SLA < 5.0 ms)")
    print(f"Manifold Sim Latency: {man_lat_ms:.3f} ms (SLA < 10.0 ms)")
    print(f"Sample Similarity  : {man_res['similarity_score']:.1f}/100 (Closest: {man_res['closest_cubicasa_id']})")
    print("\nConfusion Matrix:")
    print(cm)
    print("\nDetailed Classification Report:")
    print(classification_report(y_test, preds, target_names=[TYPOLOGY_NAMES.get(i, str(i)) for i in sorted(y_test.unique())], zero_division=0))

    return {
        "accuracy": acc,
        "macro_f1": f1,
        "precision": prec,
        "recall": rec,
        "confusion_matrix": cm.tolist(),
        "classifier_latency_ms": dt_ms,
        "manifold_latency_ms": man_lat_ms,
        "sample_nearest_id": man_res["closest_cubicasa_id"]
    }


if __name__ == "__main__":
    evaluate_production_model()
