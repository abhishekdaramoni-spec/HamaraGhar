"""
Unit tests for the HamaraGhar Hybrid Architectural Planning and Constraint Engine.
Verifies:
1. NBC 2016 setbacks and room boundary containment
2. Zero room overlap collisions (pairwise disjoint room polygons)
3. Distinct layout topologies across variants (Vastu Classic, Modern Open-Plan, Linear Efficient)
4. NBC minimum area compliance scoring
5. Flask REST endpoint POST /api/ml/hybrid-plan integration
"""
import unittest
import json
from app import app
from ml.planner.hybrid_engine import verify_nbc_compliance, generate_hybrid_plan


class TestHybridFloorPlanEngine(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_nbc_setback_and_boundary_containment(self):
        """Verify all rooms are strictly positioned within setback building envelopes."""
        test_configs = [
            {"plot_width": 30.0, "plot_length": 50.0, "bhk": 3},
            {"plot_width": 40.0, "plot_length": 60.0, "bhk": 4},
            {"plot_width": 25.0, "plot_length": 40.0, "bhk": 2},
        ]
        
        for cfg in test_configs:
            plan = generate_hybrid_plan(cfg, floor=0, variant=0)
            compliance = plan["nbc_compliance"]
            self.assertFalse(compliance["overlap_detected"])
            self.assertTrue(compliance["is_compliant"], f"Violations: {compliance['violations']}")
            self.assertGreaterEqual(compliance["compliance_score"], 80)

    def test_zero_room_overlap_collisions(self):
        """Verify that no two rooms overlap across all 3 architectural variants."""
        for variant in [0, 1, 2]:
            plan = generate_hybrid_plan({"plot_width": 35.0, "plot_length": 55.0, "bhk": 3}, floor=0, variant=variant)
            rooms = plan["geometry"]["rooms"]
            
            for i in range(len(rooms)):
                for j in range(i + 1, len(rooms)):
                    r1 = rooms[i]
                    r2 = rooms[j]
                    
                    x1_min, x1_max = r1["x"], r1["x"] + r1["width"]
                    y1_min, y1_max = r1["y"], r1["y"] + r1["height"]
                    x2_min, x2_max = r2["x"], r2["x"] + r2["width"]
                    y2_min, y2_max = r2["y"], r2["y"] + r2["height"]
                    
                    inter_w = max(0.0, min(x1_max, x2_max) - max(x1_min, x2_min))
                    inter_h = max(0.0, min(y1_max, y2_max) - max(y1_min, y2_min))
                    
                    self.assertTrue(
                        inter_w <= 0.3 or inter_h <= 0.3,
                        f"Collision between '{r1['name']}' and '{r2['name']}' in variant {variant}: "
                        f"overlap {inter_w:.1f}x{inter_h:.1f} ft"
                    )

    def test_distinct_architectural_variants(self):
        """Verify that variant 0, 1, and 2 generate distinct topologies and variant names."""
        v0 = generate_hybrid_plan({"plot_width": 30.0, "plot_length": 50.0, "bhk": 3}, variant=0)
        v1 = generate_hybrid_plan({"plot_width": 30.0, "plot_length": 50.0, "bhk": 3}, variant=1)
        v2 = generate_hybrid_plan({"plot_width": 30.0, "plot_length": 50.0, "bhk": 3}, variant=2)
        
        self.assertIn("Vastu", v0["variant_name"])
        self.assertIn("Open-Plan", v1["variant_name"])
        self.assertIn("Circulation", v2["variant_name"])
        
        rooms_v0 = [(r["name"], r["x"], r["y"]) for r in v0["geometry"]["rooms"]]
        rooms_v1 = [(r["name"], r["x"], r["y"]) for r in v1["geometry"]["rooms"]]
        rooms_v2 = [(r["name"], r["x"], r["y"]) for r in v2["geometry"]["rooms"]]
        
        self.assertNotEqual(rooms_v0, rooms_v1)
        self.assertNotEqual(rooms_v1, rooms_v2)

    def test_nbc_compliance_scoring_and_violation_detection(self):
        """Verify NBC verification flags deliberate room collisions."""
        colliding_layout = {
            "setback_front": 5.0,
            "setback_rear": 4.0,
            "setback_side": 3.0,
            "rooms": [
                {"name": "Living", "type": "living", "x": 3.0, "y": 5.0, "width": 15.0, "height": 15.0},
                {"name": "Dining Overlap", "type": "living", "x": 10.0, "y": 10.0, "width": 12.0, "height": 12.0},
            ]
        }
        audit = verify_nbc_compliance(colliding_layout, plot_width=30.0, plot_length=50.0)
        self.assertFalse(audit["is_compliant"])
        self.assertTrue(audit["overlap_detected"])
        self.assertTrue(any("Room Overlap Collision" in v for v in audit["violations"]))
        self.assertLess(audit["compliance_score"], 100)

    def test_api_ml_hybrid_plan_endpoint(self):
        """Verify the POST /api/ml/hybrid-plan endpoint returns complete hybrid plan with ML valuation and CPWD BoQ."""
        payload = {
            "plot_width": 30.0,
            "plot_length": 50.0,
            "bhk": 3,
            "floors": 1,
            "city": "Bangalore",
            "finishing_tier": "Standard",
            "floor": 0,
            "variant": 1,
        }
        res = self.app.post("/api/ml/hybrid-plan", json=payload)
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["engine"], "HAMARAGHAR_HYBRID_INTELLIGENCE_ENGINE")
        self.assertIn("geometry", data)
        self.assertIn("nbc_compliance", data)
        self.assertIn("property_valuation_ml", data)
        self.assertIn("construction_cost_cpwd", data)
        
        val_ml = data["property_valuation_ml"]
        self.assertEqual(val_ml["status"], "success")
        self.assertIn("prediction", val_ml)
        self.assertIn("property_price_lakhs", val_ml["prediction"])
        self.assertIn("confidence_interval_90", val_ml["prediction"])
        self.assertIn("valuation_drivers", val_ml)
        
        cost_cpwd = data["construction_cost_cpwd"]
        self.assertEqual(cost_cpwd["status"], "success")
        self.assertFalse(cost_cpwd["ml_applied"])
        self.assertIn("calculation", cost_cpwd)
        self.assertIn("total_construction_cost_inr", cost_cpwd["calculation"])
        self.assertIn("bill_of_quantities_inr", cost_cpwd["calculation"])


if __name__ == "__main__":
    unittest.main()
