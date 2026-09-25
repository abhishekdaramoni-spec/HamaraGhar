"""
HamaraGhar — Candidate Diversity & Structural Duplicate Detection Engine.

Calculates:
1. Room adjacency graphs G = (V, E)
2. Normalized room centroid coordinates
3. Room relative quadrant placement
4. Topological signature hashes
5. Pairwise candidate structural distance and duplicate detection

Enforces that candidate floor plans for the same plot and requirements are genuinely
materially different in room arrangement, circulation, and adjacency.
"""

import math
import hashlib
from typing import Dict, Any, List, Tuple, Set


class CandidateDiversityEngine:
    """Computes topological graph structures, spatial signatures, and duplicate detection."""

    @staticmethod
    def compute_adjacency_graph(rooms: List[Dict[str, Any]], tolerance: float = 0.5) -> Set[Tuple[str, str]]:
        """
        Extracts undirected adjacency edges between rooms that share a common partition wall (>= 2.0 ft).
        Returns a canonical sorted set of (roomA, roomB) tuples.
        """
        edges = set()
        n = len(rooms)
        for i in range(n):
            r1 = rooms[i]
            x1_min, x1_max = float(r1.get("x", 0)), float(r1.get("x", 0)) + float(r1.get("width", 0))
            y1_min, y1_max = float(r1.get("y", 0)), float(r1.get("y", 0)) + float(r1.get("height", 0))
            type1 = str(r1.get("type", "room"))
            name1 = str(r1.get("name", type1))

            for j in range(i + 1, n):
                r2 = rooms[j]
                x2_min, x2_max = float(r2.get("x", 0)), float(r2.get("x", 0)) + float(r2.get("width", 0))
                y2_min, y2_max = float(r2.get("y", 0)), float(r2.get("y", 0)) + float(r2.get("height", 0))
                type2 = str(r2.get("type", "room"))
                name2 = str(r2.get("name", type2))

                # Check shared vertical wall
                shares_vert_wall = (abs(x1_max - x2_min) <= tolerance or abs(x2_max - x1_min) <= tolerance)
                y_overlap = min(y1_max, y2_max) - max(y1_min, y2_min)
                vert_adjacent = shares_vert_wall and (y_overlap >= 1.8)

                # Check shared horizontal wall
                shares_horiz_wall = (abs(y1_max - y2_min) <= tolerance or abs(y2_max - y1_min) <= tolerance)
                x_overlap = min(x1_max, x2_max) - max(x1_min, x2_min)
                horiz_adjacent = shares_horiz_wall and (x_overlap >= 1.8)

                if vert_adjacent or horiz_adjacent:
                    pair = tuple(sorted([name1, name2]))
                    edges.add(pair)

        return edges

    @staticmethod
    def compute_normalized_centroids(rooms: List[Dict[str, Any]], plot_w: float, plot_l: float) -> Dict[str, Tuple[float, float]]:
        """Computes normalized (cx, cy) in [0.0, 1.0] relative to plot dimensions."""
        centroids = {}
        for r in rooms:
            name = str(r.get("name", r.get("id", "room")))
            w = float(r.get("width", 0))
            h = float(r.get("height", 0))
            cx = (float(r.get("x", 0)) + w / 2.0) / max(1.0, plot_w)
            cy = (float(r.get("y", 0)) + h / 2.0) / max(1.0, plot_l)
            centroids[name] = (round(cx, 3), round(cy, 3))
        return centroids

    @classmethod
    def compute_layout_signature(cls, layout: Dict[str, Any], plot_w: float, plot_l: float) -> Dict[str, Any]:
        """Generates comprehensive structural signatures for layout comparison."""
        rooms = layout.get("rooms", [])
        adj_edges = cls.compute_adjacency_graph(rooms)
        centroids = cls.compute_normalized_centroids(rooms, plot_w, plot_l)

        # Adjacency hash
        sorted_edge_str = "|".join(f"{e[0]}--{e[1]}" for e in sorted(list(adj_edges)))
        adj_hash = hashlib.md5(sorted_edge_str.encode("utf-8")).hexdigest()[:10]

        # Centroid signature hash
        sorted_cent_str = "|".join(f"{k}:{centroids[k][0]:.2f},{centroids[k][1]:.2f}" for k in sorted(centroids.keys()))
        cent_hash = hashlib.md5(sorted_cent_str.encode("utf-8")).hexdigest()[:10]

        # Relative room placement quadrant map
        quadrant_map = {}
        for k, (cx, cy) in centroids.items():
            h_pos = "West" if cx < 0.45 else ("East" if cx > 0.55 else "Center")
            v_pos = "North" if cy < 0.45 else ("South" if cy > 0.55 else "Mid")
            quadrant_map[k] = f"{v_pos}-{h_pos}"

        return {
            "adjacency_edges": list(adj_edges),
            "adjacency_hash": adj_hash,
            "centroids": centroids,
            "centroid_hash": cent_hash,
            "quadrant_map": quadrant_map,
            "edge_count": len(adj_edges)
        }

    @classmethod
    def are_candidates_duplicates(
        cls,
        layout_a: Dict[str, Any],
        layout_b: Dict[str, Any],
        plot_w: float,
        plot_l: float,
        jaccard_threshold: float = 0.85,
        centroid_dist_threshold: float = 0.08
    ) -> Tuple[bool, float, str]:
        """
        Determines whether two layouts are structural duplicates.
        Returns: (is_duplicate, similarity_metric, reason_string)
        """
        rooms_a = layout_a.get("rooms", [])
        rooms_b = layout_b.get("rooms", [])

        if len(rooms_a) == 0 or len(rooms_b) == 0:
            return False, 0.0, "Empty rooms"

        # 1. Compare Adjacency Graphs (Jaccard Similarity)
        edges_a = cls.compute_adjacency_graph(rooms_a)
        edges_b = cls.compute_adjacency_graph(rooms_b)

        union_len = len(edges_a.union(edges_b))
        inter_len = len(edges_a.intersection(edges_b))
        jaccard = (inter_len / union_len) if union_len > 0 else 1.0

        # 2. Compare Centroid Movements
        cent_a = cls.compute_normalized_centroids(rooms_a, plot_w, plot_l)
        cent_b = cls.compute_normalized_centroids(rooms_b, plot_w, plot_l)

        common_keys = set(cent_a.keys()).intersection(set(cent_b.keys()))
        if not common_keys:
            return False, 0.0, "Different room types"

        total_dist = 0.0
        for k in common_keys:
            dx = cent_a[k][0] - cent_b[k][0]
            dy = cent_a[k][1] - cent_b[k][1]
            total_dist += math.sqrt(dx ** 2 + dy ** 2)

        mean_shift = total_dist / len(common_keys)

        # Duplicate Condition: Very high edge similarity AND minimal centroid shift
        is_dup = (jaccard >= jaccard_threshold and mean_shift <= centroid_dist_threshold)
        reason = f"Jaccard={jaccard:.2f}, MeanShift={mean_shift:.3f}"
        if is_dup:
            reason = f"REJECTED_NEAR_DUPLICATE: Jaccard similarity {jaccard:.2f} >= {jaccard_threshold} and shift {mean_shift:.3f} <= {centroid_dist_threshold}"

        return is_dup, round(jaccard, 3), reason


def get_diversity_engine() -> CandidateDiversityEngine:
    return CandidateDiversityEngine()
