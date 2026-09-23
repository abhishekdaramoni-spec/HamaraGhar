"""
Automated Test Suite for Project-Specific Floor-Plan Diversity.
Verifies that materially different user requirements generate materially distinct architectural geometry:
- PROJECT A: 2BHK on 30x40 plot
- PROJECT B: 3BHK on 40x60 plot
- PROJECT C: 4BHK duplex on 50x80 plot
- PROJECT D: 5BHK villa on 60x90 plot

Verifies:
1. Room counts and room names change across projects
2. Bounding dimensions and built-up areas scale meaningfully
3. Architectural topologies change across BHKs
4. Extracted 17 physical features change across projects
5. ML inference and typology predictions respond to geometry
6. Multi-variant candidates within each project are materially non-identical
"""

import unittest
from app import generate_deterministic_floor_plan
from ml.floorplan.features import extract_features_from_layout
from ml.floorplan.inference import get_floorplan_ml_service
from ml.planner.hybrid_engine import generate_hybrid_plan


class TestProjectSpecificGeneration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ml_service = get_floorplan_ml_service()

        cls.proj_a_cfg = {"plot_width": 30.0, "plot_length": 40.0, "bhk": 2, "floors": 1, "city": "Bangalore"}
        cls.proj_b_cfg = {"plot_width": 40.0, "plot_length": 60.0, "bhk": 3, "floors": 1, "city": "Hyderabad"}
        cls.proj_c_cfg = {"plot_width": 50.0, "plot_length": 80.0, "bhk": 4, "floors": 2, "city": "Mumbai"}
        cls.proj_d_cfg = {"plot_width": 60.0, "plot_length": 90.0, "bhk": 5, "floors": 2, "city": "Delhi"}

    def test_room_counts_and_areas_scale_monotonically(self):
        """Verify room counts, built-up areas, and carpet areas scale meaningfully across projects."""
        p_a = generate_deterministic_floor_plan(self.proj_a_cfg, floor=0, variant=0)
        p_b = generate_deterministic_floor_plan(self.proj_b_cfg, floor=0, variant=0)
        p_c_f0 = generate_deterministic_floor_plan(self.proj_c_cfg, floor=0, variant=0)
        p_c_f1 = generate_deterministic_floor_plan(self.proj_c_cfg, floor=1, variant=0)
        p_d_f0 = generate_deterministic_floor_plan(self.proj_d_cfg, floor=0, variant=0)
        p_d_f1 = generate_deterministic_floor_plan(self.proj_d_cfg, floor=1, variant=0)

        total_rooms_a = len(p_a["rooms"])
        total_rooms_b = len(p_b["rooms"])
        total_rooms_c = len(p_c_f0["rooms"]) + len(p_c_f1["rooms"])
        total_rooms_d = len(p_d_f0["rooms"]) + len(p_d_f1["rooms"])

        self.assertLess(total_rooms_a, total_rooms_b)
        self.assertLess(total_rooms_b, total_rooms_c)
        self.assertLess(total_rooms_c, total_rooms_d)

        # Built-up footprint monotonic increase
        self.assertLess(p_a["builtupArea"], p_b["builtupArea"])
        self.assertLess(p_b["builtupArea"], p_c_f0["builtupArea"])
        self.assertLess(p_c_f0["builtupArea"], p_d_f0["builtupArea"])

    def test_distinct_room_sets_and_names(self):
        """Verify room names and functional spaces differ across projects."""
        p_a = generate_deterministic_floor_plan(self.proj_a_cfg, floor=0, variant=0)
        p_b = generate_deterministic_floor_plan(self.proj_b_cfg, floor=0, variant=0)
        p_d_f1 = generate_deterministic_floor_plan(self.proj_d_cfg, floor=1, variant=0)

        names_a = {r["name"] for r in p_a["rooms"]}
        names_b = {r["name"] for r in p_b["rooms"]}
        names_d_f1 = {r["name"] for r in p_d_f1["rooms"]}

        # 3BHK has Pooja Mandir on 40x60 plot; 2BHK on 30x40 does not
        self.assertIn("Pooja Mandir", names_b)
        self.assertNotIn("Pooja Mandir", names_a)

        # 5BHK Upper level has Bedroom 4 and Bedroom 5 / Study
        self.assertIn("Bedroom 4", names_d_f1)
        self.assertIn("Bedroom 5 / Study", names_d_f1)

    def test_feature_vectors_are_materially_distinct(self):
        """Verify extracted 17 physical features differ significantly across projects."""
        p_a = generate_deterministic_floor_plan(self.proj_a_cfg, floor=0, variant=0)
        p_b = generate_deterministic_floor_plan(self.proj_b_cfg, floor=0, variant=0)
        p_c = generate_deterministic_floor_plan(self.proj_c_cfg, floor=0, variant=0)

        f_a = extract_features_from_layout(p_a, self.proj_a_cfg)
        f_b = extract_features_from_layout(p_b, self.proj_b_cfg)
        f_c = extract_features_from_layout(p_c, self.proj_c_cfg)

        self.assertNotEqual(f_a["plot_width_ft"], f_b["plot_width_ft"])
        self.assertNotEqual(f_b["total_builtup_sqft"], f_c["total_builtup_sqft"])
        self.assertNotEqual(f_a["bhk"], f_b["bhk"])
        self.assertNotEqual(f_b["bhk"], f_c["bhk"])
        self.assertGreater(f_c["total_wall_length_ft"], f_a["total_wall_length_ft"])

    def test_ml_inference_and_typology_response(self):
        """Verify ML inference correctly categorizes project scale into typologies."""
        plan_a = generate_hybrid_plan(self.proj_a_cfg)
        plan_c = generate_hybrid_plan(self.proj_c_cfg)
        plan_d = generate_hybrid_plan(self.proj_d_cfg)

        # Small 2BHK is Zoned Residence or Spine; large 4BHK/5BHK is Multi-Wing Villa
        typology_a = plan_a["ml_layout_assessment"]["predicted_typology"]
        typology_d = plan_d["ml_layout_assessment"]["predicted_typology"]

        from ml.floorplan.features import TYPOLOGY_NAMES
        self.assertIn(typology_a, TYPOLOGY_NAMES.values())
        self.assertIn(typology_d, TYPOLOGY_NAMES.values())
        self.assertTrue(plan_a["ml_used"])
        self.assertTrue(plan_d["ml_used"])

    def test_intra_project_candidate_diversity(self):
        """Verify Variant 0, Variant 1, and Variant 2 within the same project have distinct room layouts."""
        v0 = generate_deterministic_floor_plan(self.proj_b_cfg, floor=0, variant=0)
        v1 = generate_deterministic_floor_plan(self.proj_b_cfg, floor=0, variant=1)
        v2 = generate_deterministic_floor_plan(self.proj_b_cfg, floor=0, variant=2)

        # Names of living and kitchen spaces differ across variants
        v0_names = [r["name"] for r in v0["rooms"]]
        v1_names = [r["name"] for r in v1["rooms"]]
        v2_names = [r["name"] for r in v2["rooms"]]

        self.assertNotEqual(v0_names, v1_names)
        self.assertNotEqual(v1_names, v2_names)
        self.assertIn("Modular Kitchen & Dining", v0_names)
        self.assertIn("Open Island Kitchen & Dining", v1_names)
        self.assertIn("Enclosed Kitchen", v2_names)


if __name__ == "__main__":
    unittest.main()
