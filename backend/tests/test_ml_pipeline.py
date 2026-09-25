"""
Automated unit tests for HamaraGhar ML data pipeline and feature engineering.
Verifies:
1. Zero data leakage (preprocessors fit strictly on train split)
2. Correct shapes, types, and column preservation
3. Full reproducibility with fixed random seed
4. Null value checks and domain range bounds
"""
import os
import sys
import unittest
import tempfile
import numpy as np
import pandas as pd
from pathlib import Path
import joblib

# Add repo root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ml.data.generate_datasets import generate_archetype_dataset, generate_cost_dataset
from ml.data.schema import HouseDesignRecord, ConstructionCostRecord
from ml.features.pipeline import (
    build_archetype_features,
    build_cost_features,
    prepare_archetype_dataset,
    prepare_cost_dataset,
)


class TestMLPipeline(unittest.TestCase):

    def test_archetype_generation_schema_and_bounds(self):
        """Verify generated archetype samples strictly adhere to Pydantic domain bounds."""
        df = generate_archetype_dataset(n_samples=100, seed=42)
        self.assertEqual(len(df), 100)
        self.assertEqual(df.isnull().sum().sum(), 0)
        
        for _, row in df.iterrows():
            record = HouseDesignRecord(**row.to_dict())
            self.assertTrue(15.0 <= record.plot_width <= 120.0)
            self.assertTrue(20.0 <= record.plot_length <= 160.0)
            self.assertTrue(0.08 <= record.circulation_ratio <= 0.28)
            self.assertIn(
                record.layout_archetype.value,
                [
                    "CENTRAL_SPINE_SPLIT",
                    "L_SHAPED_COURTYARD",
                    "WRAP_AROUND_OPEN_PLAN",
                    "COMPACT_LINEAR",
                    "VILLA_PERIMETER",
                ],
            )

    def test_cost_generation_schema_and_bounds(self):
        """Verify generated cost samples strictly adhere to Pydantic domain bounds."""
        df = generate_cost_dataset(n_samples=100, seed=42)
        self.assertEqual(len(df), 100)
        self.assertEqual(df.isnull().sum().sum(), 0)
        
        for _, row in df.iterrows():
            record = ConstructionCostRecord(**row.to_dict())
            self.assertTrue(300.0 <= record.built_up_area_sqft <= 15000.0)
            self.assertTrue(900.0 <= record.cost_per_sqft_inr <= 8500.0)
            self.assertGreaterEqual(record.total_cost_inr, 200000.0)

    def test_feature_engineering_domain_formulas(self):
        """Verify derived domain features match exact architectural definitions."""
        raw_df = pd.DataFrame([{
            "plot_width": 30.0,
            "plot_length": 60.0,
            "plot_area_sqft": 1800.0,
            "aspect_ratio": 2.0,
            "floors": 2,
            "bhk": 3,
            "family_size": 4,
            "parking_spaces": 1,
            "facing_direction": "East",
            "vastu_priority": True,
            "layout_archetype": "CENTRAL_SPINE_SPLIT",
            "circulation_ratio": 0.16,
        }])
        
        feat_df = build_archetype_features(raw_df)
        self.assertEqual(feat_df["aspect_ratio"].iloc[0], 2.0)
        self.assertEqual(feat_df["area_per_bhk"].iloc[0], 1800.0 / 3.0)
        self.assertEqual(feat_df["sqft_per_person"].iloc[0], 1800.0 / 4.0)
        self.assertEqual(feat_df["total_potential_sqft"].iloc[0], 1800.0 * 2)

    def test_zero_data_leakage_in_archetype_pipeline(self):
        """
        Critical Leakage Test:
        Verifies that RobustScaler center and scale statistics are computed
        STRICTLY from the train split and do not leak validation or test data statistics.
        """
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            raw_csv = tmp_path / "test_raw_archetype.csv"
            df_raw = generate_archetype_dataset(n_samples=500, seed=42)
            df_raw.to_csv(raw_csv, index=False)
            
            out_dir = tmp_path / "processed"
            prepare_archetype_dataset(str(raw_csv), str(out_dir), seed=42)
            
            train_df = pd.read_csv(out_dir / "archetype_train_v1.csv")
            val_df = pd.read_csv(out_dir / "archetype_val_v1.csv")
            test_df = pd.read_csv(out_dir / "archetype_test_v1.csv")
            
            # 70% of 500 = 350; 15% = 75; 15% = 75
            self.assertEqual(len(train_df), 350)
            self.assertEqual(len(val_df), 75)
            self.assertEqual(len(test_df), 75)
            
            # Load serialized preprocessor
            artifact = joblib.load(tmp_path / "artifacts" / "archetype_preprocessor_v1.joblib")
            preprocessor = artifact["preprocessor"]
            scaler = preprocessor.named_transformers_["num"]
            
            # Recompute manual median of train split on plot_width
            df_feat = build_archetype_features(df_raw)
            from sklearn.model_selection import train_test_split
            manual_train, _ = train_test_split(
                df_feat, test_size=0.30, random_state=42, stratify=df_feat["layout_archetype"]
            )
            
            num_cols = artifact["num_cols"]
            width_idx = num_cols.index("plot_width")
            
            # Verify scaler center exactly equals the train set median
            train_median_width = float(np.median(manual_train["plot_width"]))
            self.assertTrue(np.isclose(scaler.center_[width_idx], train_median_width, atol=1e-4))

    def test_reproducibility_with_fixed_seed(self):
        """Verify that dataset generation produces identical outputs across repeated calls with fixed seed."""
        df1 = generate_archetype_dataset(n_samples=50, seed=42)
        df2 = generate_archetype_dataset(n_samples=50, seed=42)
        pd.testing.assert_frame_equal(df1, df2)
        
        cost1 = generate_cost_dataset(n_samples=50, seed=42)
        cost2 = generate_cost_dataset(n_samples=50, seed=42)
        pd.testing.assert_frame_equal(cost1, cost2)


if __name__ == "__main__":
    unittest.main()
