"""
Unit and Integration Test Suite for HamaraGhar Real Floor-Plan AI/ML Intelligence.
Tests:
1. Real CubiCasa5K benchmark floor-plan dataset loading, verifiable provenance, and schema validation
2. Official source-level Train / Val / Holdout Test partition integrity (zero data leakage)
3. FloorPlanMLInferenceService loading, inference latency (<50ms SLA), and score bounds
4. Project-specific candidate diversity across BHK typologies (1BHK vs 2BHK vs 4BHK duplex)
5. NBC 2016 constraint rejection gate (room collision and setback disqualification)
6. Deterministic reproducibility (same inputs + model version = identical output)
7. Graceful ML fallback degradation
8. Project isolation and IDOR security
"""

import unittest
import time
import json
from werkzeug.security import generate_password_hash
from app import app, db, User, Project, generate_deterministic_floor_plan
from ml.floorplan.dataset import load_real_floorplan_dataset
from ml.floorplan.features import FEATURE_COLUMNS, extract_features_from_layout
from ml.floorplan.inference import get_floorplan_ml_service, FloorPlanMLInferenceService
from ml.planner.hybrid_engine import generate_hybrid_plan, verify_nbc_compliance


class TestRealFloorPlanML(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dataset = load_real_floorplan_dataset()
        cls.ml_service = get_floorplan_ml_service()

    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    # 1. Dataset Loading & Schema Validation
    def test_real_dataset_loading_and_schema(self):
        """Verify 500 genuine CubiCasa5K benchmark records with verifiable source IDs."""
        self.assertEqual(len(self.dataset), 500)
        required_columns = [
            "source_id", "source_dataset", "official_split", "layout_typology",
            "plot_width_ft", "plot_length_ft", "total_builtup_sqft",
            "total_carpet_sqft", "carpet_efficiency", "wall_density_ratio",
            "circulation_area_ratio"
        ]
        for col in required_columns:
            self.assertIn(col, self.dataset.columns, f"Missing column '{col}' in dataset")

        # Provenance verification: every sample must trace directly to CubiCasa5K label vector
        for sid in self.dataset["source_id"]:
            self.assertTrue(sid.startswith("cubicasa5k/labels/"), f"Invalid provenance source_id: {sid}")

        self.assertEqual(set(self.dataset["layout_typology"].unique()), {0, 1, 2, 3})
        self.assertEqual(int(self.dataset.isna().sum().sum()), 0)

    # 2. Train / Val / Test Split Zero Leakage
    def test_train_val_test_split_zero_leakage(self):
        """Verify strict source-level partition with zero duplicate source_ids across splits."""
        train_df = self.dataset[self.dataset["official_split"] == "train"]
        val_df = self.dataset[self.dataset["official_split"] == "val"]
        test_df = self.dataset[self.dataset["official_split"] == "test"]

        self.assertEqual(len(train_df), 350)
        self.assertEqual(len(val_df), 75)
        self.assertEqual(len(test_df), 75)

        train_ids = set(train_df["source_id"])
        val_ids = set(val_df["source_id"])
        test_ids = set(test_df["source_id"])

        # Zero data leakage across splits
        self.assertEqual(len(train_ids.intersection(val_ids)), 0)
        self.assertEqual(len(train_ids.intersection(test_ids)), 0)
        self.assertEqual(len(val_ids.intersection(test_ids)), 0)

    # 3. Model Inference Latency & Bounds
    def test_inference_service_latency_and_score_bounds(self):
        """Verify ML model inference runs within SLA, links nearest CubiCasa sample, and scores fall in [25, 100]."""
        self.assertTrue(self.ml_service.model_loaded)
        sample_layout = {
            "rooms": [
                {"name": "Living", "type": "living", "x": 3.0, "y": 5.0, "width": 15.0, "height": 16.0},
                {"name": "Kitchen", "type": "kitchen", "x": 18.0, "y": 5.0, "width": 10.0, "height": 12.0},
                {"name": "Master Bed", "type": "masterBed", "x": 3.0, "y": 21.0, "width": 15.0, "height": 14.0},
                {"name": "Bath", "type": "bath", "x": 18.0, "y": 21.0, "width": 8.0, "height": 7.0},
            ],
            "carpetArea": 550.0,
            "builtupArea": 680.0
        }
        config = {"plot_width": 30.0, "plot_length": 50.0, "bhk": 2}

        # Warm up
        self.ml_service.predict_spatial_viability(sample_layout, config)

        # Benchmark 30 calls
        t0 = time.perf_counter()
        iterations = 30
        for _ in range(iterations):
            res = self.ml_service.predict_spatial_viability(sample_layout, config)
        elapsed_sec = time.perf_counter() - t0
        avg_ms = (elapsed_sec / iterations) * 1000.0

        self.assertLess(avg_ms, 50.0, f"Inference latency too high: {avg_ms:.3f}ms per call (SLA < 50.0ms)")
        self.assertGreaterEqual(res["ml_score"], 25.0)
        self.assertLessEqual(res["ml_score"], 100.0)
        self.assertTrue(res["ml_used"])
        self.assertIn("closest_cubicasa_id", res)
        self.assertTrue(res["closest_cubicasa_id"].startswith("cubicasa5k/labels/"))
        self.assertIn(res["predicted_typology"], [0, 1, 2, 3])
        self.assertIn("sub_metrics", res)

    # 4. Project-Specific Candidate Diversity Across Typologies
    def test_project_specific_typology_diversity(self):
        """Verify 1BHK, 2BHK, and 4BHK duplex generate materially distinct room sets and topologies."""
        p1 = generate_deterministic_floor_plan({"plot_width": 20.0, "plot_length": 35.0, "bhk": 1, "floors": 1})
        p2 = generate_deterministic_floor_plan({"plot_width": 30.0, "plot_length": 50.0, "bhk": 2, "floors": 1})
        p4 = generate_deterministic_floor_plan({"plot_width": 40.0, "plot_length": 60.0, "bhk": 4, "floors": 2})

        rooms_p1 = [r["name"] for r in p1["rooms"]]
        rooms_p2 = [r["name"] for r in p2["rooms"]]
        rooms_p4 = [r["name"] for r in p4["rooms"]]

        # Materially distinct room counts and naming
        self.assertLessEqual(len(rooms_p1), 5)
        self.assertGreaterEqual(len(rooms_p2), 5)
        self.assertEqual(p1["floors"], [0])
        self.assertEqual(p4["floors"], [0, 1])
        self.assertNotEqual(rooms_p1, rooms_p2)
        self.assertNotEqual(rooms_p2, rooms_p4)

    # 5. NBC Constraint Rejection Gate
    def test_nbc_constraint_rejection_gate(self):
        """Verify candidate with room collision is rejected from valid_candidates."""
        plan = generate_hybrid_plan({"plot_width": 30.0, "plot_length": 50.0, "bhk": 3})
        self.assertTrue(plan["nbc_compliance"]["is_compliant"])
        self.assertFalse(plan["nbc_compliance"]["overlap_detected"])

        # Manually verify a collision is rejected
        colliding_layout = {
            "rooms": [
                {"name": "Room A", "type": "living", "x": 3.0, "y": 5.0, "width": 15.0, "height": 15.0},
                {"name": "Room B", "type": "kitchen", "x": 10.0, "y": 10.0, "width": 12.0, "height": 12.0}
            ]
        }
        compliance = verify_nbc_compliance(colliding_layout, plot_width=30.0, plot_length=50.0)
        self.assertFalse(compliance["is_compliant"])
        self.assertTrue(compliance["overlap_detected"])
        self.assertIn("Room Overlap Collision", compliance["violations"][0])

    # 6. Deterministic Output Reproducibility
    def test_deterministic_reproducibility(self):
        """Verify identical inputs produce identical room geometry and ML scores."""
        cfg = {"plot_width": 32.0, "plot_length": 52.0, "bhk": 3, "floors": 1}
        plan_a = generate_hybrid_plan(cfg, floor=0, variant=1)
        plan_b = generate_hybrid_plan(cfg, floor=0, variant=1)

        self.assertEqual(plan_a["ml_layout_assessment"]["overall_ml_score"],
                         plan_b["ml_layout_assessment"]["overall_ml_score"])
        self.assertEqual(len(plan_a["geometry"]["rooms"]), len(plan_b["geometry"]["rooms"]))
        for r_a, r_b in zip(plan_a["geometry"]["rooms"], plan_b["geometry"]["rooms"]):
            self.assertEqual(r_a["x"], r_b["x"])
            self.assertEqual(r_a["y"], r_b["y"])
            self.assertEqual(r_a["width"], r_b["width"])
            self.assertEqual(r_a["height"], r_b["height"])

    # 7. Model Fallback Graceful Degradation
    def test_ml_fallback_graceful_degradation(self):
        """Verify service falls back safely if model is missing or disabled."""
        svc = FloorPlanMLInferenceService()
        svc.model = None
        svc.model_loaded = False

        res = svc.predict_spatial_viability({"rooms": []}, config={})
        self.assertFalse(res["ml_used"])
        self.assertGreaterEqual(res["ml_score"], 25.0)

    # 8. Project Isolation & IDOR Security
    def test_project_isolation_and_idor_prevention(self):
        """Verify User A cannot access or overwrite User B's floor-plan project."""
        with app.app_context():
            u1 = User.query.filter_by(email="alice_test@example.com").first()
            if not u1:
                u1 = User(name="Alice", email="alice_test@example.com", password_hash=generate_password_hash("SecurePass123!"))
                db.session.add(u1)
                db.session.commit()

            u2 = User.query.filter_by(email="bob_test@example.com").first()
            if not u2:
                u2 = User(name="Bob", email="bob_test@example.com", password_hash=generate_password_hash("SecurePass123!"))
                db.session.add(u2)
                db.session.commit()

            bob_proj = Project.query.filter_by(user_id=u2.id, name="Bob Secret Villa").first()
            if not bob_proj:
                bob_proj = Project(
                    user_id=u2.id,
                    name="Bob Secret Villa",
                    data_json=json.dumps({"plot_width": 40.0, "plot_length": 60.0, "bhk": 4})
                )
                db.session.add(bob_proj)
                db.session.commit()
            bob_proj_id = bob_proj.id
            u1_id = u1.id

        # Session login as Alice
        with self.app.session_transaction() as sess:
            sess["user_id"] = u1_id

        # Alice attempts to access Bob's project
        resp = self.app.get(f"/api/projects/{bob_proj_id}")
        self.assertIn(resp.status_code, [403, 404])

        # Alice attempts to update Bob's project
        put_resp = self.app.put(f"/api/projects/{bob_proj_id}", json={"name": "Hacked Villa"})
        self.assertIn(put_resp.status_code, [403, 404])


if __name__ == "__main__":
    unittest.main()
