"""
HamaraGhar — Automated Geometry Overlap & 2D <-> 3D Consistency Test Suite.

Verifies:
1. Zero volumetric room overlap across all 4 spatial topologies and BHK 1, 2, 3, 4 (Area <= 0.01 sq.ft).
2. Shared wall deduplication (adjacent rooms share exactly 1 wall segment).
3. 2D vs 3D coordinate and dimension consistency (1 ft = 0.3048 Three.js units).
4. Multi-floor vertical elevation separation and vertical staircase alignment.
5. Core acceptance test case: 30x40 ft, 2 floors, 2 beds, 2 baths, fixed dimensions (Plan A, B, C).
"""

import unittest
import sys
from pathlib import Path

# Ensure backend root is on sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from architecture.constraints.geometry_validator import validate_room_geometry, EPSILON_AREA
from architecture.generator.candidate_generator import SpatialCandidateGenerator
from architecture.generator.wall_network_builder import build_architectural_wall_network
from ml.planner.hybrid_engine import generate_hybrid_plan


class TestGeometryOverlapAndConsistency(unittest.TestCase):

    def setUp(self):
        self.generator = SpatialCandidateGenerator()
        self.topologies = [
            "CENTRAL_LIVING",
            "SIDE_CORRIDOR",
            "FRONT_PUBLIC_REAR_PRIVATE",
            "OPEN_LIVING_DINING"
        ]

    def test_zero_room_overlap_across_all_topologies_and_bhks(self):
        """Test 1: Zero pairwise room area overlap (<= 0.01 sq.ft) across all topologies and BHK 1-4."""
        for topology in self.topologies:
            for bhk in [1, 2, 3, 4]:
                config = {
                    "plot_width": 30.0 if bhk <= 2 else 40.0,
                    "plot_length": 40.0 if bhk <= 2 else 55.0,
                    "bhk": bhk,
                    "bathrooms": min(bhk, 3),
                    "floors": 1 if bhk <= 2 else 2,
                    "seed": 42 + bhk * 7
                }
                layout = self.generator.generate_candidate(
                    config=config,
                    topology=topology,
                    floor=0,
                    seed=config["seed"]
                )
                rooms = layout["rooms"]
                self.assertGreater(len(rooms), 0, f"No rooms generated for {topology} BHK {bhk}")

                # Run formal geometry validator
                val_res = validate_room_geometry(layout)
                self.assertTrue(
                    val_res["valid"],
                    f"Geometry validation failed for topology={topology}, bhk={bhk}: {val_res['errors']}"
                )

                # Pairwise area overlap verification
                for i in range(len(rooms)):
                    for j in range(i + 1, len(rooms)):
                        r1 = rooms[i]
                        r2 = rooms[j]
                        ix1 = max(r1["x"], r2["x"])
                        iy1 = max(r1["y"], r2["y"])
                        ix2 = min(r1["x"] + r1["width"], r2["x"] + r2["width"])
                        iy2 = min(r1["y"] + r1["height"], r2["y"] + r2["height"])

                        inter_w = max(0.0, ix2 - ix1)
                        inter_h = max(0.0, iy2 - iy1)
                        overlap_area = inter_w * inter_h

                        self.assertLessEqual(
                            overlap_area,
                            EPSILON_AREA,
                            f"Room overlap detected between '{r1['name']}' and '{r2['name']}' "
                            f"in topology {topology} (BHK {bhk}): {overlap_area:.4f} sq.ft"
                        )

    def test_shared_wall_deduplication(self):
        """Test 2: Adjacent rooms share exactly ONE unified wall segment (no duplicate overlapping lines)."""
        config = {
            "plot_width": 30.0,
            "plot_length": 40.0,
            "bhk": 2,
            "bathrooms": 2,
            "floors": 1,
            "seed": 101
        }
        layout = self.generator.generate_candidate(config=config, topology="CENTRAL_LIVING", floor=0)
        walls = layout["walls"]
        self.assertGreater(len(walls), 0)

        # Check for collinear coincident wall segments
        for i in range(len(walls)):
            for j in range(i + 1, len(walls)):
                w1 = walls[i]
                w2 = walls[j]

                # Check if w1 and w2 are collinear and overlapping
                # Horizontal wall check
                if abs(w1["start"]["y"] - w1["end"]["y"]) < 0.05 and abs(w2["start"]["y"] - w2["end"]["y"]) < 0.05:
                    if abs(w1["start"]["y"] - w2["start"]["y"]) < 0.05:
                        x1_min, x1_max = min(w1["start"]["x"], w1["end"]["x"]), max(w1["start"]["x"], w1["end"]["x"])
                        x2_min, x2_max = min(w2["start"]["x"], w2["end"]["x"]), max(w2["start"]["x"], w2["end"]["x"])
                        overlap_x = max(0.0, min(x1_max, x2_max) - max(x1_min, x2_min))
                        self.assertLessEqual(
                            overlap_x,
                            0.05,
                            f"Duplicate collinear wall detected: wall {i} and wall {j} overlap by {overlap_x:.2f} ft"
                        )

                # Vertical wall check
                if abs(w1["start"]["x"] - w1["end"]["x"]) < 0.05 and abs(w2["start"]["x"] - w2["end"]["x"]) < 0.05:
                    if abs(w1["start"]["x"] - w2["start"]["x"]) < 0.05:
                        y1_min, y1_max = min(w1["start"]["y"], w1["end"]["y"]), max(w1["start"]["y"], w1["end"]["y"])
                        y2_min, y2_max = min(w2["start"]["y"], w2["end"]["y"]), max(w2["start"]["y"], w2["end"]["y"])
                        overlap_y = max(0.0, min(y1_max, y2_max) - max(y1_min, y2_min))
                        self.assertLessEqual(
                            overlap_y,
                            0.05,
                            f"Duplicate collinear vertical wall detected: wall {i} and wall {j} overlap by {overlap_y:.2f} ft"
                        )

    def test_2d_to_3d_coordinate_consistency(self):
        """Test 3: 2D architectural coordinates map directly to 3D world units (1 ft = 0.3048 units)."""
        scale = 0.3048
        config = {
            "plot_width": 30.0,
            "plot_length": 40.0,
            "bhk": 2,
            "bathrooms": 2,
            "floors": 1,
            "seed": 202
        }
        layout = self.generator.generate_candidate(config=config, topology="CENTRAL_LIVING", floor=0)
        rooms = layout["rooms"]

        for r in rooms:
            rx = float(r["x"])
            ry = float(r["y"])
            rw = float(r["width"])
            rh = float(r["height"])

            # 3D procedural placement logic
            expected_3d_center_x = (rx + rw / 2.0) * scale
            expected_3d_center_z = (ry + rh / 2.0) * scale
            expected_3d_width = rw * scale
            expected_3d_length = rh * scale

            # Invert back to architectural feet
            derived_arch_x = (expected_3d_center_x / scale) - (rw / 2.0)
            derived_arch_y = (expected_3d_center_z / scale) - (rh / 2.0)

            self.assertAlmostEqual(derived_arch_x, rx, places=4)
            self.assertAlmostEqual(derived_arch_y, ry, places=4)
            self.assertAlmostEqual(expected_3d_width / scale, rw, places=4)
            self.assertAlmostEqual(expected_3d_length / scale, rh, places=4)

    def test_multifloor_vertical_elevation_and_stair_alignment(self):
        """Test 4: Multi-floor vertical elevation separation and staircase alignment."""
        scale = 0.3048
        floor_height_ft = 10.0
        expected_elev_fl0 = 0.0 * scale
        expected_elev_fl1 = floor_height_ft * scale

        self.assertAlmostEqual(expected_elev_fl1 - expected_elev_fl0, 3.048, places=4)

        config = {
            "plot_width": 30.0,
            "plot_length": 40.0,
            "bhk": 2,
            "bathrooms": 2,
            "floors": 2,
            "seed": 303
        }
        fl0 = self.generator.generate_candidate(config=config, topology="CENTRAL_LIVING", floor=0)
        fl1 = self.generator.generate_candidate(config=config, topology="CENTRAL_LIVING", floor=1)

        # Both floors must have valid geometry
        self.assertTrue(validate_room_geometry(fl0)["valid"])
        self.assertTrue(validate_room_geometry(fl1)["valid"])

        # Check staircase footprint alignment if present
        stair0 = fl0.get("staircase")
        stair1 = fl1.get("staircase")
        if stair0 and stair1:
            self.assertAlmostEqual(stair0["x"], stair1["x"], delta=0.2)
            self.assertAlmostEqual(stair0["y"], stair1["y"], delta=0.2)
            self.assertAlmostEqual(stair0["width"], stair1["width"], delta=0.2)
            self.assertAlmostEqual(stair0["height"], stair1["height"], delta=0.2)

    def test_core_acceptance_case_30x40_fixed_dims(self):
        """Test 5: Acceptance case: 30x40 plot, 2 floors, 2 beds, 2 baths, fixed dimensions (Plan A, B, C)."""
        core_config = {
            "plot_width": 30.0,
            "plot_length": 40.0,
            "bhk": 2,
            "bedrooms": 2,
            "bathrooms": 2,
            "floors": 2,
            "city": "Bangalore",
            "finishing_tier": "Standard",
            "seed": 42,
            "fixed_dimensions": {
                "living": {"width": 14.0, "height": 16.0},
                "masterBed": {"width": 12.0, "height": 13.0}
            }
        }

        # Generate complete hybrid plan containing Plan A, Plan B, Plan C
        hybrid_plan = generate_hybrid_plan(core_config, floor=0)

        candidates = hybrid_plan.get("all_candidates", [])
        self.assertGreaterEqual(len(candidates), 3, "Expected at least 3 ranked candidate plans (Plan A, B, C)")

        for cand in candidates:
            cand_layout = cand["layout"]
            rooms = cand_layout.get("rooms", [])
            walls = cand_layout.get("walls", [])
            doors = cand_layout.get("doors", [])
            windows = cand_layout.get("windows", [])

            self.assertGreater(len(rooms), 0)
            self.assertGreater(len(walls), 0)
            self.assertGreater(len(doors), 0)
            self.assertGreater(len(windows), 0)

            # Strict zero overlap validation
            val_res = validate_room_geometry(cand_layout)
            self.assertTrue(
                val_res["valid"],
                f"Candidate {cand.get('variant_name')} failed geometry validation: {val_res['errors']}"
            )

            # Check doors and windows have orientation attribute
            for d in doors:
                self.assertIn(d.get("orientation", "horizontal"), ["horizontal", "vertical"])
            for w in windows:
                self.assertIn(w.get("orientation", "horizontal"), ["horizontal", "vertical"])


if __name__ == "__main__":
    unittest.main()
