"""
Unit & Integration Tests for ML Layout Quality Ranker and Spatial Intelligence.
Verifies:
1. Spatial feature extraction mathematical bounds (0.0 to 1.0)
2. Supervised ML Ranker inference and artifact loading
3. Multi-candidate ranking order and recommendation flags
4. Rejection of invalid candidates failing NBC 2016 constraint gate
5. End-to-end POST /api/ml/hybrid-plan contract with ML layout assessment
"""

import unittest
import json
from app import app
from ml.planner.spatial_features import calculate_spatial_features
from ml.planner.layout_ranker import get_layout_ranker
from ml.planner.hybrid_engine import generate_hybrid_plan, verify_nbc_compliance


class TestMLLayoutQualityRanker(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
        self.ranker = get_layout_ranker()

    def test_spatial_feature_extraction_bounds(self):
        """Verify spatial metrics extract valid bounded values [0.0, 1.0]."""
        sample_layout = {
            "rooms": [
                {"name": "Living", "type": "living", "x": 3.0, "y": 5.0, "width": 14.0, "height": 16.0},
                {"name": "Kitchen", "type": "kitchen", "x": 17.0, "y": 25.0, "width": 10.0, "height": 10.0},
                {"name": "Master Bed", "type": "masterBed", "x": 3.0, "y": 25.0, "width": 14.0, "height": 14.0},
                {"name": "Bath", "type": "bath", "x": 17.0, "y": 35.0, "width": 8.0, "height": 6.0},
            ]
        }
        features = calculate_spatial_features(sample_layout)
        for key, val in features.items():
            self.assertGreaterEqual(val, 0.0, f"Feature {key} below 0.0: {val}")
            self.assertLessEqual(val, 1.0, f"Feature {key} above 1.0: {val}")

    def test_layout_ranker_artifact_loading_and_inference(self):
        """Verify HistGradientBoosting ranker loads from artifacts and predicts score."""
        self.assertTrue(self.ranker.model_loaded, "ML Layout Ranker model failed to load from artifacts")

        sample_layout = {
            "rooms": [
                {"name": "Living", "type": "living", "x": 3.0, "y": 5.0, "width": 15.0, "height": 16.0},
                {"name": "Kitchen", "type": "kitchen", "x": 18.0, "y": 22.0, "width": 10.0, "height": 10.0},
                {"name": "Master Bed", "type": "masterBed", "x": 3.0, "y": 22.0, "width": 14.0, "height": 14.0},
                {"name": "Bath", "type": "bath", "x": 18.0, "y": 32.0, "width": 8.0, "height": 6.0},
            ]
        }
        assessment = self.ranker.score_layout(sample_layout, config={"plot_width": 30.0, "plot_length": 50.0, "bhk": 2})

        self.assertIn("overall_ml_score", assessment)
        self.assertGreaterEqual(assessment["overall_ml_score"], 35.0)
        self.assertLessEqual(assessment["overall_ml_score"], 100.0)
        self.assertIn("sub_scores", assessment)
        self.assertIn("daylight_exposure", assessment["sub_scores"])
        self.assertIn("circulation_efficiency", assessment["sub_scores"])

    def test_candidate_ranking_ordering(self):
        """Verify multiple candidate layouts are correctly ranked in descending score order."""
        high_quality_candidate = {
            "variant_id": 0,
            "variant_name": "Optimized Vastu",
            "rooms": [
                {"name": "Living", "type": "living", "x": 3.0, "y": 5.0, "width": 15.0, "height": 16.0},
                {"name": "Kitchen", "type": "kitchen", "x": 18.0, "y": 30.0, "width": 10.0, "height": 10.0},
                {"name": "Master Bed", "type": "masterBed", "x": 3.0, "y": 30.0, "width": 14.0, "height": 14.0},
                {"name": "Bath", "type": "bath", "x": 18.0, "y": 22.0, "width": 8.0, "height": 6.0},
            ]
        }
        low_quality_candidate = {
            "variant_id": 1,
            "variant_name": "Narrow Poor Aspect",
            "rooms": [
                {"name": "Living", "type": "living", "x": 3.0, "y": 5.0, "width": 25.0, "height": 5.0}, # poor aspect ratio
                {"name": "Kitchen", "type": "kitchen", "x": 3.0, "y": 10.0, "width": 25.0, "height": 4.0},
                {"name": "Master Bed", "type": "masterBed", "x": 3.0, "y": 15.0, "width": 25.0, "height": 5.0},
            ]
        }

        ranked = self.ranker.rank_candidate_layouts([low_quality_candidate, high_quality_candidate])
        self.assertEqual(len(ranked), 2)
        # Verify descending sort
        self.assertGreater(ranked[0]["quality_score"], ranked[1]["quality_score"])
        self.assertEqual(ranked[0]["rank"], 1)
        self.assertTrue(ranked[0]["is_recommended"])
        self.assertEqual(ranked[1]["rank"], 2)
        self.assertFalse(ranked[1]["is_recommended"])

    def test_engineering_constraint_rejection_before_ranking(self):
        """Verify candidates failing NBC 2016 engineering constraints are rejected."""
        valid_layout = {
            "setback_front": 5.0, "setback_rear": 4.0, "setback_side": 3.0,
            "rooms": [
                {"name": "Living", "type": "living", "x": 3.0, "y": 5.0, "width": 14.0, "height": 15.0},
                {"name": "Bed", "type": "bedroom", "x": 3.0, "y": 21.0, "width": 14.0, "height": 14.0},
            ]
        }
        invalid_layout = {
            "setback_front": 5.0, "setback_rear": 4.0, "setback_side": 3.0,
            "rooms": [
                {"name": "Living", "type": "living", "x": 3.0, "y": 5.0, "width": 14.0, "height": 15.0},
                {"name": "Colliding Room", "type": "bedroom", "x": 5.0, "y": 7.0, "width": 14.0, "height": 14.0}, # Overlap
            ]
        }

        audit_valid = verify_nbc_compliance(valid_layout, 30.0, 50.0)
        audit_invalid = verify_nbc_compliance(invalid_layout, 30.0, 50.0)

        self.assertTrue(audit_valid["is_compliant"])
        self.assertFalse(audit_invalid["is_compliant"])
        self.assertTrue(audit_invalid["overlap_detected"])

    def test_api_ml_hybrid_plan_includes_quality_ranking(self):
        """Verify POST /api/ml/hybrid-plan returns ml_layout_assessment and candidate_rankings."""
        payload = {
            "plot_width": 30.0,
            "plot_length": 50.0,
            "bhk": 3,
            "floors": 1,
            "city": "Mumbai",
            "finishing_tier": "Premium"
        }
        res = self.app.post("/api/ml/hybrid-plan", json=payload)
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)

        self.assertIn("ml_layout_assessment", data)
        self.assertIn("candidate_rankings", data)
        self.assertIn("candidates_summary", data)

        rankings = data["candidate_rankings"]
        self.assertGreaterEqual(len(rankings), 1)
        self.assertEqual(rankings[0]["rank"], 1)
        self.assertTrue(rankings[0]["is_recommended"])
        self.assertIn("overall_ml_score", rankings[0])
        self.assertIn("sub_scores", rankings[0])


if __name__ == "__main__":
    unittest.main()
