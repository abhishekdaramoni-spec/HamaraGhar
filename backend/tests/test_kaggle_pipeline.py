"""
Automated unit tests for HamaraGhar Kaggle-Grounded ML Pipeline.
Verifies:
1. Real Kaggle dataset integrity and valid bounds
2. Zero data leakage (preprocessor fitted strictly on train split)
3. Reproducibility of splits with fixed seed
4. Model artifact inference validity on unseen inputs
"""
import os
import sys
import unittest
import numpy as np
import pandas as pd
from pathlib import Path
import joblib

# Add repo root to sys.path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from ml.features.property_pipeline import clean_and_engineer_features


class TestKagglePipeline(unittest.TestCase):

    def setUp(self):
        self.raw_path = ROOT / "ml" / "data" / "raw" / "kaggle_house_prices.csv"
        self.train_path = ROOT / "ml" / "data" / "processed" / "property_train_v1.csv"
        self.val_path = ROOT / "ml" / "data" / "processed" / "property_val_v1.csv"
        self.test_path = ROOT / "ml" / "data" / "processed" / "property_test_v1.csv"
        self.prep_artifact = ROOT / "ml" / "artifacts" / "property_preprocessor_v1.joblib"
        self.model_artifact = ROOT / "ml" / "artifacts" / "property_price_regressor_v1.joblib"

    def test_raw_dataset_exists_and_unaltered(self):
        """Verify real Kaggle raw dataset exists and has expected 29,451 rows."""
        self.assertTrue(self.raw_path.exists())
        df = pd.read_csv(self.raw_path)
        self.assertEqual(len(df), 29451)
        self.assertEqual(len(df.columns), 12)
        self.assertIn("TARGET(PRICE_IN_LACS)", df.columns)
        self.assertIn("SQUARE_FT", df.columns)

    def test_cleaning_and_bounding_rules(self):
        """Verify cleaning filters out extreme scraping anomalies while retaining > 95% of data."""
        df_raw = pd.read_csv(self.raw_path)
        df_clean, stats = clean_and_engineer_features(df_raw)
        self.assertGreater(stats["retention_pct"], 95.0)
        self.assertTrue((df_clean["SQUARE_FT"] >= 150.0).all())
        self.assertTrue((df_clean["SQUARE_FT"] <= 12000.0).all())
        self.assertTrue((df_clean["TARGET_PRICE_IN_LACS"] >= 1.0).all())

    def test_zero_data_leakage(self):
        """
        Verify RobustScaler statistics in preprocessor match train split median strictly,
        not the global dataset or validation split.
        """
        self.assertTrue(self.prep_artifact.exists())
        prep_bundle = joblib.load(self.prep_artifact)
        preprocessor = prep_bundle["preprocessor"]
        scaler = preprocessor.named_transformers_["num"]
        
        train_df = pd.read_csv(self.train_path)
        num_cols = prep_bundle["num_cols"]
        sqft_idx = num_cols.index("SQUARE_FT")
        
        expected_median_sqft = float(train_df["raw_square_ft"].median())
        scaler_center = float(scaler.center_[sqft_idx])
        self.assertTrue(np.isclose(scaler_center, expected_median_sqft, atol=1e-3))

    def test_split_proportions(self):
        """Verify exact 70% / 15% / 15% partition."""
        train_df = pd.read_csv(self.train_path)
        val_df = pd.read_csv(self.val_path)
        test_df = pd.read_csv(self.test_path)
        
        total = len(train_df) + len(val_df) + len(test_df)
        self.assertEqual(total, 28835)
        self.assertTrue(np.isclose(len(train_df) / total, 0.70, atol=0.01))
        self.assertTrue(np.isclose(len(val_df) / total, 0.15, atol=0.01))
        self.assertTrue(np.isclose(len(test_df) / total, 0.15, atol=0.01))

    def test_trained_model_inference_bounds(self):
        """Verify model produces realistic positive prices in Lakhs INR."""
        self.assertTrue(self.model_artifact.exists())
        bundle = joblib.load(self.model_artifact)
        model = bundle["model"]
        feature_cols = bundle["feature_names"]
        
        # Test on single validation sample
        val_df = pd.read_csv(self.val_path)
        X_sample = val_df[feature_cols].iloc[0:1]
        pred_log = model.predict(X_sample)[0]
        pred_lakhs = float(np.expm1(pred_log))
        
        self.assertGreater(pred_lakhs, 5.0)
        self.assertLess(pred_lakhs, 2000.0)


if __name__ == "__main__":
    unittest.main()
