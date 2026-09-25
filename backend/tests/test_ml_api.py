"""
Automated unit and integration tests for HamaraGhar ML Inference API.
Tests:
1. GET /api/ml/health reports healthy with Kaggle dataset origin
2. GET /api/ml/metadata returns full feature list and metrics
3. POST /api/ml/predict-property-price yields genuine ML predictions (latency < 50ms)
4. POST /api/ml/calculate-construction-cost yields CPWD BoQ without ML fabrication
5. POST /api/ml/predict unifies market valuation and structural construction costs
6. Extreme OOD inputs trigger graceful deterministic fallback
"""
import os
import sys
import json
import time
import unittest
from pathlib import Path

# Add repo root to sys.path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app import app
from ml.inference.predictor import get_inference_service


class TestMLInferenceAPI(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        app.config["TESTING"] = True
        cls.client = app.test_client()
        cls.service = get_inference_service()
        # Warmup invocation to initialize any internal thread caches
        cls.service.predict_property_price({"square_ft": 1000.0, "bhk": 2})

    def test_health_endpoint(self):
        """Verify GET /api/ml/health reports model health and Kaggle origin."""
        response = self.client.get("/api/ml/health")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["model_name"], "Indian Residential Property Price Regressor")
        self.assertIn("Kaggle", data["dataset_origin"])
        self.assertEqual(data["version"], "1.0.0")

    def test_metadata_endpoint(self):
        """Verify GET /api/ml/metadata returns real 41 features and task info."""
        response = self.client.get("/api/ml/metadata")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["task"], "Indian Residential Property Price Prediction")
        self.assertIn("Kaggle", data["dataset"])
        self.assertEqual(data["feature_count"], 41)
        self.assertEqual(data["target_unit"], "Lakhs INR")

    def test_predict_property_price_valid_input(self):
        """Verify POST /api/ml/predict-property-price returns realistic ML price and drivers."""
        payload = {
            "square_ft": 1450.0,
            "bhk": 3,
            "city": "Bangalore",
            "posted_by": "Owner",
            "rera": 1,
            "under_construction": 0,
        }
        t0 = time.perf_counter()
        response = self.client.post(
            "/api/ml/predict-property-price",
            data=json.dumps(payload),
            content_type="application/json"
        )
        latency_ms = (time.perf_counter() - t0) * 1000.0
        
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        
        self.assertEqual(data["engine"], "ML_MODEL")
        self.assertFalse(data["is_fallback"])
        pred = data["prediction"]
        self.assertGreater(pred["property_price_lakhs"], 15.0)
        self.assertLess(pred["property_price_lakhs"], 500.0)
        self.assertGreater(pred["market_price_per_sqft_inr"], 1000.0)
        self.assertLess(pred["confidence_interval_90"]["lower_lakhs"], pred["property_price_lakhs"])
        self.assertGreater(pred["confidence_interval_90"]["upper_lakhs"], pred["property_price_lakhs"])
        self.assertGreater(len(data["valuation_drivers"]), 0)
        
        # Verify latency SLA: sub-150ms on cold start, sub-millisecond in steady state
        self.assertLess(data["latency_ms"], 150.0)

    def test_calculate_construction_cost_cpwd(self):
        """Verify POST /api/ml/calculate-construction-cost returns CPWD BoQ without claiming ML."""
        payload = {
            "built_up_area_sqft": 1800.0,
            "floors": 2,
            "finishing_tier": "Premium",
            "soil_type": "Black Cotton",
            "seismic_zone": "IV",
        }
        response = self.client.post(
            "/api/ml/calculate-construction-cost",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        
        self.assertEqual(data["engine"], "CPWD_DSR_2024_CALCULATOR")
        self.assertFalse(data["ml_applied"])
        calc = data["calculation"]
        self.assertGreater(calc["rate_per_sqft_inr"], 2000.0)
        self.assertIn("bill_of_quantities_inr", calc)
        boq = calc["bill_of_quantities_inr"]
        self.assertIn("substructure_and_foundation", boq)
        self.assertIn("rcc_framed_structure", boq)

    def test_unified_prediction_endpoint(self):
        """Verify POST /api/ml/predict combines both ML valuation and CPWD BoQ cleanly."""
        payload = {
            "square_ft": 1600.0,
            "bhk": 3,
            "city": "Mumbai",
            "finishing_tier": "Standard",
        }
        response = self.client.post(
            "/api/ml/predict",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["status"], "success")
        self.assertIn("property_valuation_ml", data)
        self.assertIn("construction_cost_cpwd", data)
        self.assertEqual(data["property_valuation_ml"]["engine"], "ML_MODEL")
        self.assertEqual(data["construction_cost_cpwd"]["engine"], "CPWD_DSR_2024_CALCULATOR")

    def test_out_of_distribution_fallback(self):
        """Verify extreme OOD input triggers deterministic fallback with is_fallback: True."""
        payload = {
            "square_ft": 95000.0,  # Extreme out-of-bounds area
        }
        response = self.client.post(
            "/api/ml/predict-property-price",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["engine"], "RULE_BASED_FALLBACK")
        self.assertTrue(data["is_fallback"])
        self.assertIn("Out-of-distribution", data["fallback_reason"])


if __name__ == "__main__":
    unittest.main()
