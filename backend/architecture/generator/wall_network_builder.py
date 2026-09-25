"""
HamaraGhar — Architectural Wall Network Engine.

Generates a unified, deduplicated, and non-overlapping architectural wall network
from room boundaries. Enforces:
1. Shared walls between adjacent rooms are merged into exactly ONE architectural wall.
2. Distinct exterior structural walls (9 in / 0.75 ft) vs. interior partitions (4.5 in / 0.38 ft).
3. Deduplication of coincident and collinear segments.
4. Openings (doors and windows) explicitly referenced to wall segments via wallId and offsetAlongWall.
"""

from typing import Dict, Any, List, Tuple, Optional
import math


def build_architectural_wall_network(
    rooms: List[Dict[str, Any]],
    build_bounds: Dict[str, float],
    floor_index: int = 0
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Constructs a merged architectural wall network, doors, and windows from room geometry.
    Args:
        rooms: list of room dicts with x, y, width, height (or bounds: {x, y, width, height})
        build_bounds: { minX, minY, maxX, maxY }
        floor_index: floor number (0, 1, ...)
    Returns:
        (walls, doors, windows)
    """
    min_x = round(build_bounds.get("minX", 2.0), 2)
    min_y = round(build_bounds.get("minY", 3.5), 2)
    max_x = round(build_bounds.get("maxX", 28.0), 2)
    max_y = round(build_bounds.get("maxY", 36.5), 2)

    # 1. Collect all boundary segments from each room
    # Horizontal segments: (y, x_start, x_end, room_id)
    # Vertical segments: (x, y_start, y_end, room_id)
    raw_h_segments: List[Tuple[float, float, float, str]] = []
    raw_v_segments: List[Tuple[float, float, float, str]] = []

    for r in rooms:
        rid = r.get("id", "room")
        if "bounds" in r and isinstance(r["bounds"], dict):
            rx = round(float(r["bounds"]["x"]), 2)
            ry = round(float(r["bounds"]["y"]), 2)
            rw = round(float(r["bounds"]["width"]), 2)
            rh = round(float(r["bounds"]["height"]), 2)
        else:
            rx = round(float(r.get("x", 0)), 2)
            ry = round(float(r.get("y", 0)), 2)
            rw = round(float(r.get("width", 0)), 2)
            rh = round(float(r.get("height", 0)), 2)

        if rw <= 0.1 or rh <= 0.1:
            continue

        x1, x2 = min(rx, rx + rw), max(rx, rx + rw)
        y1, y2 = min(ry, ry + rh), max(ry, ry + rh)

        # North & South horizontal edges
        raw_h_segments.append((y1, x1, x2, rid))
        raw_h_segments.append((y2, x1, x2, rid))

        # West & East vertical edges
        raw_v_segments.append((x1, y1, y2, rid))
        raw_v_segments.append((x2, y1, y2, rid))

    # 2. Merge collinear and coincident horizontal segments
    merged_walls: List[Dict[str, Any]] = []
    wall_counter = 1

    # Group horizontal by rounded Y
    h_groups: Dict[float, List[Tuple[float, float, str]]] = {}
    for y, x1, x2, rid in raw_h_segments:
        key = round(y, 1)
        if key not in h_groups:
            h_groups[key] = []
        h_groups[key].append((x1, x2, rid))

    for y, intervals in h_groups.items():
        # Merge overlapping 1D intervals on this horizontal line
        merged_intervals = _merge_1d_intervals(intervals)
        for (sx, ex, sharing_count) in merged_intervals:
            length = round(ex - sx, 2)
            if length < 0.4:
                continue

            is_ext = (abs(y - min_y) < 0.25 or abs(y - max_y) < 0.25)
            wall_type = "exterior" if is_ext else "interior"
            thick = 0.75 if is_ext else 0.38

            wid = f"wall-f{floor_index}-h{wall_counter}"
            wall_counter += 1
            merged_walls.append({
                "id": wid,
                "floorIndex": floor_index,
                "x1": sx,
                "y1": y,
                "x2": ex,
                "y2": y,
                "start": {"x": sx, "y": y},
                "end": {"x": ex, "y": y},
                "length": length,
                "thickness": thick,
                "thicknessFt": thick,
                "heightFt": 10.0,
                "type": wall_type,
                "orientation": "horizontal"
            })

    # Group vertical by rounded X
    v_groups: Dict[float, List[Tuple[float, float, str]]] = {}
    for x, y1, y2, rid in raw_v_segments:
        key = round(x, 1)
        if key not in v_groups:
            v_groups[key] = []
        v_groups[key].append((y1, y2, rid))

    for x, intervals in v_groups.items():
        merged_intervals = _merge_1d_intervals(intervals)
        for (sy, ey, sharing_count) in merged_intervals:
            length = round(ey - sy, 2)
            if length < 0.4:
                continue

            is_ext = (abs(x - min_x) < 0.25 or abs(x - max_x) < 0.25)
            wall_type = "exterior" if is_ext else "interior"
            thick = 0.75 if is_ext else 0.38

            wid = f"wall-f{floor_index}-v{wall_counter}"
            wall_counter += 1
            merged_walls.append({
                "id": wid,
                "floorIndex": floor_index,
                "x1": x,
                "y1": sy,
                "x2": x,
                "y2": ey,
                "start": {"x": x, "y": sy},
                "end": {"x": x, "y": ey},
                "length": length,
                "thickness": thick,
                "thicknessFt": thick,
                "heightFt": 10.0,
                "type": wall_type,
                "orientation": "vertical"
            })

    # 3. Position Doors and Windows relative to canonical walls
    doors: List[Dict[str, Any]] = []
    windows: List[Dict[str, Any]] = []

    door_idx = 1
    win_idx = 1

    for r in rooms:
        if "bounds" in r and isinstance(r["bounds"], dict):
            rx = float(r["bounds"]["x"])
            ry = float(r["bounds"]["y"])
            rw = float(r["bounds"]["width"])
            rh = float(r["bounds"]["height"])
        else:
            rx = float(r.get("x", 0))
            ry = float(r.get("y", 0))
            rw = float(r.get("width", 0))
            rh = float(r.get("height", 0))

        rtype = r.get("type", "room")
        rid = r.get("id", f"r_{door_idx}")

        # Door placement: Place door on internal wall bounding this room
        door_w = 2.5 if rtype == "bath" else 3.0
        # Find horizontal wall at bottom or vertical wall at entrance
        target_wall = None
        for w in merged_walls:
            if w["type"] == "interior" and w["orientation"] == "horizontal":
                if abs(w["y1"] - (ry + rh)) < 0.3 and (w["x1"] <= rx + 2.0 <= w["x2"]):
                    target_wall = w
                    break
        if not target_wall:
            for w in merged_walls:
                if w["type"] == "interior":
                    target_wall = w
                    break

        if target_wall:
            offset = max(1.0, min(target_wall["length"] - door_w - 0.5, 2.0))
            if target_wall["orientation"] == "horizontal":
                dx = round(target_wall["x1"] + offset, 2)
                dy = target_wall["y1"]
            else:
                dx = target_wall["x1"]
                dy = round(target_wall["y1"] + offset, 2)

            doors.append({
                "id": f"door-f{floor_index}-{door_idx}",
                "wallId": target_wall["id"],
                "offsetAlongWall": offset,
                "position": {"x": dx, "y": dy},
                "x": dx,
                "y": dy,
                "width": door_w,
                "widthFt": door_w,
                "heightFt": 7.0,
                "swing": "inward",
                "roomId": rid,
                "floorIndex": floor_index,
                "orientation": target_wall["orientation"]
            })
            door_idx += 1

        # External Windows: Check exterior walls bounding room
        for w in merged_walls:
            if w["type"] == "exterior":
                # Check if wall touches room
                touches = False
                if w["orientation"] == "horizontal" and abs(w["y1"] - ry) < 0.3:
                    # North wall
                    overlap_w = min(w["x2"], rx + rw) - max(w["x1"], rx)
                    if overlap_w > 3.0:
                        wx = round(max(w["x1"], rx) + overlap_w * 0.5 - 1.5, 2)
                        wy = w["y1"]
                        windows.append({
                            "id": f"win-f{floor_index}-{win_idx}",
                            "wallId": w["id"],
                            "offsetAlongWall": round(wx - w["x1"], 2),
                            "position": {"x": wx, "y": wy},
                            "x": wx,
                            "y": wy,
                            "width": min(4.0, round(overlap_w * 0.6, 1)),
                            "widthFt": min(4.0, round(overlap_w * 0.6, 1)),
                            "heightFt": 4.5,
                            "sillHeightFt": 3.0,
                            "wall": "north",
                            "floorIndex": floor_index
                        })
                        win_idx += 1
                elif w["orientation"] == "horizontal" and abs(w["y1"] - (ry + rh)) < 0.3:
                    # South wall
                    overlap_w = min(w["x2"], rx + rw) - max(w["x1"], rx)
                    if overlap_w > 3.0:
                        wx = round(max(w["x1"], rx) + overlap_w * 0.5 - 1.5, 2)
                        wy = w["y1"]
                        windows.append({
                            "id": f"win-f{floor_index}-{win_idx}",
                            "wallId": w["id"],
                            "offsetAlongWall": round(wx - w["x1"], 2),
                            "position": {"x": wx, "y": wy},
                            "x": wx,
                            "y": wy,
                            "width": min(4.0, round(overlap_w * 0.6, 1)),
                            "widthFt": min(4.0, round(overlap_w * 0.6, 1)),
                            "heightFt": 4.5,
                            "sillHeightFt": 3.0,
                            "wall": "south",
                            "floorIndex": floor_index
                        })
                        win_idx += 1
                elif w["orientation"] == "vertical" and abs(w["x1"] - rx) < 0.3:
                    # West wall
                    overlap_h = min(w["y2"], ry + rh) - max(w["y1"], ry)
                    if overlap_h > 3.0:
                        wx = w["x1"]
                        wy = round(max(w["y1"], ry) + overlap_h * 0.5 - 1.5, 2)
                        windows.append({
                            "id": f"win-f{floor_index}-{win_idx}",
                            "wallId": w["id"],
                            "offsetAlongWall": round(wy - w["y1"], 2),
                            "position": {"x": wx, "y": wy},
                            "x": wx,
                            "y": wy,
                            "width": min(3.5, round(overlap_h * 0.6, 1)),
                            "widthFt": min(3.5, round(overlap_h * 0.6, 1)),
                            "heightFt": 4.5,
                            "sillHeightFt": 3.0,
                            "wall": "west",
                            "floorIndex": floor_index
                        })
                        win_idx += 1
                elif w["orientation"] == "vertical" and abs(w["x1"] - (rx + rw)) < 0.3:
                    # East wall
                    overlap_h = min(w["y2"], ry + rh) - max(w["y1"], ry)
                    if overlap_h > 3.0:
                        wx = w["x1"]
                        wy = round(max(w["y1"], ry) + overlap_h * 0.5 - 1.5, 2)
                        windows.append({
                            "id": f"win-f{floor_index}-{win_idx}",
                            "wallId": w["id"],
                            "offsetAlongWall": round(wy - w["y1"], 2),
                            "position": {"x": wx, "y": wy},
                            "x": wx,
                            "y": wy,
                            "width": min(3.5, round(overlap_h * 0.6, 1)),
                            "widthFt": min(3.5, round(overlap_h * 0.6, 1)),
                            "heightFt": 4.5,
                            "sillHeightFt": 3.0,
                            "wall": "east",
                            "floorIndex": floor_index
                        })
                        win_idx += 1

    return merged_walls, doors, windows


def _merge_1d_intervals(intervals: List[Tuple[float, float, str]]) -> List[Tuple[float, float, int]]:
    """
    Merges overlapping or touching 1D intervals along a line.
    Returns list of (start, end, room_count).
    """
    if not intervals:
        return []

    # Sort intervals by start
    sorted_int = sorted(intervals, key=lambda x: (x[0], x[1]))

    merged = []
    cur_start, cur_end, _ = sorted_int[0]
    count = 1

    for s, e, _ in sorted_int[1:]:
        if s <= cur_end + 0.15:  # Overlapping or touching within 1.8 inches
            cur_end = max(cur_end, e)
            count += 1
        else:
            merged.append((round(cur_start, 2), round(cur_end, 2), count))
            cur_start = s
            cur_end = e
            count = 1

    merged.append((round(cur_start, 2), round(cur_end, 2), count))
    return merged
