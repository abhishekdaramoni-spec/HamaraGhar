"""
Spatial Graph Feature Extraction Engine for Floor-Plan Layout Intelligence.

Extracts 6 quantitative architectural livability and spatial efficiency features:
1. circulation_efficiency: Habitable carpet area ratio to non-habitable/transition area
2. daylight_exposure_factor: NBC 2016 Part 8 natural ventilation/lighting perimeter contact ratio
3. aspect_ratio_quality: Neufert standard room aspect ratio adherence (1.1 to 1.5)
4. zoning_privacy_score: Functional separation distance between public living zones and private sleep zones
5. service_clustering_index: Plumbing core adjacency and compactness of wet-wall spaces
6. vastu_orientation_score: Alignment of functional zones with cardinal Vastu Shastra quadrants
"""

import math
from typing import Dict, Any, List, Tuple


def calculate_spatial_features(layout: Dict[str, Any]) -> Dict[str, float]:
    """
    Computes normalized (0.0 to 1.0) spatial graph metrics for any candidate floor plan.
    """
    rooms = layout.get("rooms", [])
    if not rooms:
        return {
            "circulation_efficiency": 0.0,
            "daylight_exposure_factor": 0.0,
            "aspect_ratio_quality": 0.0,
            "zoning_privacy_score": 0.0,
            "service_clustering_index": 0.0,
            "vastu_orientation_score": 0.0,
        }

    # Bounding envelope of building
    min_x = min(float(r.get("x", 0)) for r in rooms)
    max_x = max(float(r.get("x", 0)) + float(r.get("width", 0)) for r in rooms)
    min_y = min(float(r.get("y", 0)) for r in rooms)
    max_y = max(float(r.get("y", 0)) + float(r.get("height", 0)) for r in rooms)

    envelope_w = max(1.0, max_x - min_x)
    envelope_h = max(1.0, max_y - min_y)
    building_diagonal = math.sqrt(envelope_w ** 2 + envelope_h ** 2)
    center_x = (min_x + max_x) / 2.0
    center_y = (min_y + max_y) / 2.0

    # 1. Circulation Efficiency
    habitable_types = {"living", "dining", "bedroom", "masterBed", "study", "pooja"}
    circulation_types = {"corridor", "passage", "foyer", "parking", "balcony"}

    total_habitable_area = 0.0
    total_non_habitable_area = 0.0

    for r in rooms:
        rtype = r.get("type", "other")
        area = float(r.get("width", 0)) * float(r.get("height", 0))
        if rtype in habitable_types:
            total_habitable_area += area
        else:
            total_non_habitable_area += area

    total_room_area = total_habitable_area + total_non_habitable_area
    if total_room_area > 0:
        circulation_ratio = total_habitable_area / total_room_area
        # Typical good layouts have 70% to 88% habitable area
        circulation_efficiency = max(0.0, min(1.0, (circulation_ratio - 0.50) / 0.40))
    else:
        circulation_efficiency = 0.5

    # 2. Daylight Exposure Factor (NBC 2016 Part 8)
    habitable_rooms = [r for r in rooms if r.get("type", "") in habitable_types]
    tolerance = 0.6  # feet tolerance for wall thickness / setback edge

    daylight_count = 0
    for r in habitable_rooms:
        rx = float(r.get("x", 0))
        ry = float(r.get("y", 0))
        rw = float(r.get("width", 0))
        rh = float(r.get("height", 0))

        touches_left = abs(rx - min_x) <= tolerance
        touches_right = abs((rx + rw) - max_x) <= tolerance
        touches_front = abs(ry - min_y) <= tolerance
        touches_rear = abs((ry + rh) - max_y) <= tolerance

        if touches_left or touches_right or touches_front or touches_rear:
            daylight_count += 1

    daylight_exposure = (daylight_count / len(habitable_rooms)) if habitable_rooms else 0.5

    # 3. Aspect Ratio Quality (Neufert standard 1.1 to 1.5)
    aspect_scores = []
    for r in rooms:
        w = max(1.0, float(r.get("width", 1.0)))
        h = max(1.0, float(r.get("height", 1.0)))
        ratio = max(w, h) / min(w, h)

        if 1.0 <= ratio <= 1.5:
            aspect_scores.append(1.0)
        elif ratio <= 1.8:
            aspect_scores.append(max(0.0, 1.0 - (ratio - 1.5) * 1.5))
        else:
            aspect_scores.append(max(0.2, 1.0 - (ratio - 1.5) * 0.8))

    aspect_ratio_quality = (sum(aspect_scores) / len(aspect_scores)) if aspect_scores else 0.7

    # 4. Zoning Privacy Score (Public vs Private zone distance separation)
    public_rooms = [r for r in rooms if r.get("type", "") in {"living", "foyer", "dining", "parking"}]
    private_rooms = [r for r in rooms if r.get("type", "") in {"masterBed", "bedroom", "study"}]

    if public_rooms and private_rooms and building_diagonal > 0:
        distances = []
        for pub in public_rooms:
            pub_cx = float(pub.get("x", 0)) + float(pub.get("width", 0)) / 2.0
            pub_cy = float(pub.get("y", 0)) + float(pub.get("height", 0)) / 2.0

            for priv in private_rooms:
                priv_cx = float(priv.get("x", 0)) + float(priv.get("width", 0)) / 2.0
                priv_cy = float(priv.get("y", 0)) + float(priv.get("height", 0)) / 2.0

                dist = math.sqrt((pub_cx - priv_cx) ** 2 + (pub_cy - priv_cy) ** 2)
                distances.append(dist / building_diagonal)

        avg_dist = sum(distances) / len(distances)
        zoning_privacy_score = max(0.0, min(1.0, avg_dist / 0.55))
    else:
        zoning_privacy_score = 0.75

    # 5. Service Clustering Index (Wet-wall plumbing compactness: Bath, Kitchen, Utility)
    wet_rooms = [r for r in rooms if r.get("type", "") in {"kitchen", "bath", "utility"}]
    if len(wet_rooms) > 1 and building_diagonal > 0:
        wet_distances = []
        for i in range(len(wet_rooms)):
            for j in range(i + 1, len(wet_rooms)):
                w1 = wet_rooms[i]
                w2 = wet_rooms[j]
                c1x = float(w1.get("x", 0)) + float(w1.get("width", 0)) / 2.0
                c1y = float(w1.get("y", 0)) + float(w1.get("height", 0)) / 2.0
                c2x = float(w2.get("x", 0)) + float(w2.get("width", 0)) / 2.0
                c2y = float(w2.get("y", 0)) + float(w2.get("height", 0)) / 2.0

                d = math.sqrt((c1x - c2x) ** 2 + (c1y - c2y) ** 2)
                wet_distances.append(d / building_diagonal)

        avg_wet_dist = sum(wet_distances) / len(wet_distances)
        service_clustering_index = max(0.1, min(1.0, 1.0 - (avg_wet_dist / 0.60)))
    else:
        service_clustering_index = 0.85

    # 6. Vastu Orientation Score
    vastu_points = 0
    total_vastu_evaluable = 0

    for r in rooms:
        rtype = r.get("type", "")
        rcx = float(r.get("x", 0)) + float(r.get("width", 0)) / 2.0
        rcy = float(r.get("y", 0)) + float(r.get("height", 0)) / 2.0

        is_east = rcx >= center_x
        is_west = rcx < center_x
        is_front_north = rcy <= center_y
        is_rear_south = rcy > center_y

        if rtype == "masterBed":
            total_vastu_evaluable += 1
            if is_west and is_rear_south:
                vastu_points += 1.0
            elif is_west or is_rear_south:
                vastu_points += 0.7
            else:
                vastu_points += 0.3
        elif rtype == "kitchen":
            total_vastu_evaluable += 1
            if (is_east and is_rear_south) or (is_west and is_front_north):
                vastu_points += 1.0
            elif is_east or is_rear_south:
                vastu_points += 0.6
            else:
                vastu_points += 0.3
        elif rtype == "pooja":
            total_vastu_evaluable += 1
            if is_east and is_front_north:
                vastu_points += 1.0
            elif is_east or is_front_north:
                vastu_points += 0.6
            else:
                vastu_points += 0.2
        elif rtype == "living":
            total_vastu_evaluable += 1
            if is_front_north or is_east:
                vastu_points += 0.9
            else:
                vastu_points += 0.5

    vastu_orientation_score = (vastu_points / total_vastu_evaluable) if total_vastu_evaluable else 0.80

    return {
        "circulation_efficiency": round(float(circulation_efficiency), 4),
        "daylight_exposure_factor": round(float(daylight_exposure), 4),
        "aspect_ratio_quality": round(float(aspect_ratio_quality), 4),
        "zoning_privacy_score": round(float(zoning_privacy_score), 4),
        "service_clustering_index": round(float(service_clustering_index), 4),
        "vastu_orientation_score": round(float(vastu_orientation_score), 4),
    }
