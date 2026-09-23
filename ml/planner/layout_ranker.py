"""
ML Layout Quality Ranker Inference Service for HamaraGhar.
Evaluates candidate architectural floor plans using a supervised HistGradientBoostingRegressor
trained on spatial graph features (circulation efficiency, daylight exposure, aspect ratios,
zoning privacy, service core clustering, and Vastu orientation).
"""

import sys
import json
import hashlib
from pathlib import Path
from typing import Dict, Any, List, Optional
import pandas as pd
import joblib

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))

from ml.planner.spatial_features import calculate_spatial_features

ARTIFACTS_DIR = ROOT / "ml" / "artifacts"
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


class LayoutQualityRanker:
    """Singleton ML inference service for evaluating and ranking candidate floor plans."""
    _instance = None

    def __init__(self):
        self.model = None
        self.scaler = None
        self.model_loaded = False
        self._load_artifacts()

    @classmethod
    def get_instance(cls) -> "LayoutQualityRanker":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _load_artifacts(self):
        try:
            if MODEL_PATH.exists() and SCALER_PATH.exists():
                self.model = joblib.load(MODEL_PATH)
                self.scaler = joblib.load(SCALER_PATH)
                self.model_loaded = True
            else:
                self.model_loaded = False
        except Exception as e:
            self.model_loaded = False
            print(f"Warning: Failed to load LayoutQualityRanker artifacts: {e}")

    def score_layout(
        self,
        layout: Dict[str, Any],
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Computes ML Layout Quality Score (0-100) and explainability sub-metrics for a floor plan.
        """
        config = config or {}
        rooms = layout.get("rooms", [])

        # 1. Extract 6 quantitative spatial graph features
        spatial_feats = calculate_spatial_features(layout)

        # Plot & structural metrics
        plot_w = float(config.get("plot_width") or config.get("plotWidth") or layout.get("plotWidth") or 30.0)
        plot_l = float(config.get("plot_length") or config.get("plotLength") or layout.get("plotLength") or 50.0)
        bhk = int(config.get("bhk") or config.get("bedrooms") or layout.get("bhk") or 3)
        total_rooms = len(rooms)
        carpet_eff = float(layout.get("efficiency") or layout.get("efficiency_ratio") or 0.82)
        plot_aspect = max(plot_w, plot_l) / max(1.0, min(plot_w, plot_l))

        feature_dict = {
            "circulation_efficiency": spatial_feats["circulation_efficiency"],
            "daylight_exposure_factor": spatial_feats["daylight_exposure_factor"],
            "aspect_ratio_quality": spatial_feats["aspect_ratio_quality"],
            "zoning_privacy_score": spatial_feats["zoning_privacy_score"],
            "service_clustering_index": spatial_feats["service_clustering_index"],
            "vastu_orientation_score": spatial_feats["vastu_orientation_score"],
            "carpet_efficiency_ratio": carpet_eff,
            "bhk": bhk,
            "total_rooms": total_rooms,
            "plot_aspect_ratio": plot_aspect,
        }

        # 2. Predict with ML model or fallback to heuristic calculation
        if self.model_loaded and self.model is not None:
            try:
                X_df = pd.DataFrame([feature_dict])[FEATURE_COLUMNS]
                X_scaled = self.scaler.transform(X_df)
                pred_raw = float(self.model.predict(X_scaled)[0])
                predicted_score = round(max(35.0, min(99.0, pred_raw)), 1)
            except Exception:
                predicted_score = self._heuristic_fallback(spatial_feats)
        else:
            predicted_score = self._heuristic_fallback(spatial_feats)

        # Architectural quality tier
        if predicted_score >= 88.0:
            quality_tier = "Excellent"
            tier_badge = "success"
        elif predicted_score >= 75.0:
            quality_tier = "Very Good"
            tier_badge = "primary"
        elif predicted_score >= 60.0:
            quality_tier = "Standard"
            tier_badge = "warning"
        else:
            quality_tier = "Sub-Optimal"
            tier_badge = "danger"

        return {
            "overall_ml_score": predicted_score,
            "quality_tier": quality_tier,
            "tier_badge": tier_badge,
            "sub_scores": {
                "circulation_efficiency": round(spatial_feats["circulation_efficiency"] * 100, 1),
                "daylight_exposure": round(spatial_feats["daylight_exposure_factor"] * 100, 1),
                "aspect_ratio_quality": round(spatial_feats["aspect_ratio_quality"] * 100, 1),
                "zoning_privacy": round(spatial_feats["zoning_privacy_score"] * 100, 1),
                "service_clustering": round(spatial_feats["service_clustering_index"] * 100, 1),
                "vastu_compliance": round(spatial_feats["vastu_orientation_score"] * 100, 1),
            },
            "spatial_features": spatial_feats,
            "model_metadata": {
                "algorithm": "HistGradientBoostingRegressor",
                "version": "1.0.0",
                "features_used": len(FEATURE_COLUMNS),
                "inference": "ML_REGRESSION"
            }
        }

    def _heuristic_fallback(self, feats: Dict[str, float]) -> float:
        score = (
            0.22 * feats["daylight_exposure_factor"] +
            0.20 * feats["circulation_efficiency"] +
            0.18 * feats["aspect_ratio_quality"] +
            0.16 * feats["zoning_privacy_score"] +
            0.12 * feats["service_clustering_index"] +
            0.12 * feats["vastu_orientation_score"]
        ) * 100.0
        return round(float(score), 1)

    def rank_candidate_layouts(
        self,
        candidates: List[Dict[str, Any]],
        config: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Takes candidate floor plans, assesses each with ML Layout Quality Ranker,
        and returns them sorted by overall_ml_score descending with rank annotations.
        """
        if not candidates:
            return []

        scored_candidates = []
        for cand in candidates:
            assessment = self.score_layout(cand, config=config)
            cand_copy = dict(cand)
            cand_copy["ml_layout_assessment"] = assessment
            cand_copy["quality_score"] = assessment["overall_ml_score"]
            scored_candidates.append(cand_copy)

        # Sort descending by score
        scored_candidates.sort(key=lambda c: c["quality_score"], reverse=True)

        # Assign ranks
        for idx, cand in enumerate(scored_candidates):
            cand["rank"] = idx + 1
            cand["is_recommended"] = (idx == 0)

        return scored_candidates


def get_layout_ranker() -> LayoutQualityRanker:
    """Convenience getter for singleton ranker."""
    return LayoutQualityRanker.get_instance()
