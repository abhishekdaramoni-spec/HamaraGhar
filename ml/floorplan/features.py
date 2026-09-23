import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
"""
Feature Vector Extraction for Real Floor-Plan Machine Learning.
Extracts 17 empirical architectural metrics from real floor-plan records or candidate CAD layouts.
Provides complete parity between CubiCasa5K real records and generated procedural candidates.
"""
from typing import Dict, Any, List, Optional
import numpy as np
import math

FEATURE_COLUMNS = [
    "plot_width_ft",
    "plot_length_ft",
    "plot_aspect_ratio",
    "total_builtup_sqft",
    "total_carpet_sqft",
    "carpet_efficiency",
    "total_wall_length_ft",
    "wall_density_ratio",
    "room_count",
    "bhk",
    "bathroom_count",
    "door_count",
    "window_count",
    "openings_per_wall_ratio",
    "avg_room_aspect_ratio",
    "circulation_area_ratio",
    "wet_core_distance_ratio"
]

TYPOLOGY_NAMES = {
    0: "Compact Studio",
    1: "Zoned Family Residence",
    2: "Linear Spine",
    3: "Multi-Wing Villa"
}


def extract_features_from_layout(layout: Dict[str, Any], config: Optional[Dict[str, Any]] = None) -> Dict[str, float]:
    """
    Extracts the 17 standard architectural features from any generated CAD candidate layout.
    Delegates to RealFloorPlanSVGExtractor.extract_from_cad_layout for guaranteed feature symmetry.
    """
    from ml.floorplan.svg_extractor import RealFloorPlanSVGExtractor
    return RealFloorPlanSVGExtractor.extract_from_cad_layout(layout, config)
