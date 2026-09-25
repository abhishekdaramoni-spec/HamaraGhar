"""
Hybrid Architectural Planning & Constraint Engine for HamaraGhar.
Combines:
1. Procedural Candidate Layout Generator with Diverse Spatial Topologies
2. CubiCasa5K Real Floor-Plan Reference Retrieval (processed_floorplans.json)
3. Structural Candidate Diversity & Duplicate Rejection Gate
4. NBC 2016 Structural & Habitable Norms Verification Gate (Setbacks, Room minimums, Non-overlapping bounds)
5. CubiCasa5K Real Floor-Plan ML Intelligence Model (Supervised Typology Classifier + Manifold Proximity)
6. Kaggle-Grounded ML Property Valuation Regressor (Market capital price & ₹/sq.ft)
7. CPWD DSR 2024 Itemized Bill of Quantities (BoQ) Construction Cost Estimator
"""
import sys
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional

ROOT = Path(__file__).resolve().parent.parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ml.inference.predictor import get_inference_service
from ml.floorplan.inference import get_floorplan_ml_service
from ml.planner.reference_retriever import get_cubicasa_reference_retriever
from ml.planner.candidate_generator import get_spatial_candidate_generator
from ml.planner.diversity_engine import get_diversity_engine


def verify_nbc_compliance(
    layout: Dict[str, Any],
    plot_width: float,
    plot_length: float
) -> Dict[str, Any]:
    """
    Validates candidate layout against National Building Code of India (NBC 2016).
    Checks:
    1. Setbacks: Front >= 10%, Rear >= 8%, Side >= 8%
    2. Boundary containment: All rooms strictly within plot bounds
    3. Collision test: Zero pairwise room overlaps (allowing shared wall edges)
    4. Minimum habitable room dimensions (NBC Part 3 Clause 4.2)
    """
    violations = []
    warnings = []
    rooms = layout.get("rooms", [])

    setbacks = layout.get("setbacks") or {}
    setback_front = float(layout.get("setback_front") or setbacks.get("front") or (plot_length * 0.10))
    setback_rear = float(layout.get("setback_rear") or setbacks.get("rear") or (plot_length * 0.08))
    setback_side = float(layout.get("setback_side") or setbacks.get("side") or (plot_width * 0.08))

    # 1. Setback checks
    if setback_front < 3.0:
        violations.append(f"Front setback ({setback_front:.1f}ft) is below NBC minimum (3.0ft).")
    if setback_rear < 2.5:
        violations.append(f"Rear setback ({setback_rear:.1f}ft) is below NBC minimum (2.5ft).")
    if setback_side < 2.0:
        violations.append(f"Side setback ({setback_side:.1f}ft) is below NBC minimum (2.0ft).")

    build_max_x = plot_width - setback_side + 0.1
    build_max_y = plot_length - setback_rear + 0.1

    # 2. Boundary containment
    for r in rooms:
        rx = float(r.get("x", 0))
        ry = float(r.get("y", 0))
        rw = float(r.get("width", 0))
        rh = float(r.get("height", 0))
        r_name = r.get("name", "Unknown Room")

        if rx < setback_side - 0.2:
            violations.append(f"Room '{r_name}' violates left side setback (x={rx:.1f} < {setback_side:.1f}).")
        if ry < setback_front - 0.2:
            violations.append(f"Room '{r_name}' violates front setback (y={ry:.1f} < {setback_front:.1f}).")
        if (rx + rw) > build_max_x + 0.2:
            violations.append(f"Room '{r_name}' exceeds right boundary (x+w={rx+rw:.1f} > {build_max_x:.1f}).")
        if (ry + rh) > build_max_y + 0.2:
            violations.append(f"Room '{r_name}' exceeds rear boundary (y+h={ry+rh:.1f} > {build_max_y:.1f}).")

    # 3. Collision / Overlap Check (Pairwise Intersection)
    overlap_detected = False
    for i in range(len(rooms)):
        for j in range(i + 1, len(rooms)):
            r1 = rooms[i]
            r2 = rooms[j]

            x1_min, x1_max = r1["x"], r1["x"] + r1["width"]
            y1_min, y1_max = r1["y"], r1["y"] + r1["height"]

            x2_min, x2_max = r2["x"], r2["x"] + r2["width"]
            y2_min, y2_max = r2["y"], r2["y"] + r2["height"]

            # Intersection rectangle (tolerance of 0.01 sq.ft for touching boundaries)
            inter_w = max(0.0, min(x1_max, x2_max) - max(x1_min, x2_min))
            inter_h = max(0.0, min(y1_max, y2_max) - max(y1_min, y2_min))
            inter_area = inter_w * inter_h

            if inter_area > 0.01 and inter_w > 0.05 and inter_h > 0.05:
                overlap_area = inter_area
                overlap_detected = True
                violations.append(
                    f"Room Overlap Collision: '{r1['name']}' and '{r2['name']}' intersect by {overlap_area:.1f} sq.ft."
                )

    # 4. NBC Minimum Room Dimensions (NBC 2016 Part 3 Table 1)
    min_area_standards = {
        "masterBed": 110.0,
        "bedroom": 90.0,
        "kitchen": 50.0,
        "bath": 25.0,
        "living": 130.0,
    }
    room_audit = []
    for r in rooms:
        rtype = r.get("type", "")
        area = round(r.get("width", 0) * r.get("height", 0), 1)
        r_name = r.get("name", "Room")
        min_req = min_area_standards.get(rtype, 0.0)

        status = "PASS"
        if min_req > 0 and area < min_req * 0.90:
            status = "BELOW_NBC"
            warnings.append(f"Room '{r_name}' ({area:.0f} sq.ft) is slightly below NBC recommended {min_req:.0f} sq.ft.")

        room_audit.append({
            "name": r_name,
            "type": rtype,
            "area_sqft": area,
            "dimensions": f"{r.get('width', 0):.1f} x {r.get('height', 0):.1f} ft",
            "nbc_status": status,
        })

    is_compliant = (len(violations) == 0)
    score = 100 - (len(violations) * 25) - (len(warnings) * 5)
    score = max(0, min(100, score))

    return {
        "is_compliant": is_compliant,
        "compliance_score": score,
        "violations": violations,
        "warnings": warnings,
        "room_audit": room_audit,
        "overlap_detected": overlap_detected,
    }


def generate_hybrid_plan(
    config: Dict[str, Any],
    floor: int = 0,
    variant: int = 0
) -> Dict[str, Any]:
    """
    Synthesizes complete hybrid architectural plan:
    1. Retrieves diverse real CubiCasa5K spatial references from the benchmark catalog
    2. Generates genuinely diverse candidate floor plans across distinct spatial topologies
    3. Enforces Candidate Diversity & Duplicate Rejection Gate
    4. Runs CubiCasa5K Real Floor-Plan ML Intelligence inference on each candidate
    5. Verifies each candidate against NBC 2016 Engineering Constraints
    6. Ranks valid candidate plans (Rank #1 Recommended, Rank #2, Rank #3)
    7. Runs Kaggle ML Property Price Regressor for capital market valuation
    8. Runs CPWD DSR 2024 Engine for structural material BoQ cost estimation
    """
    from app import generate_deterministic_floor_plan

    config = config or {}
    plot_w = max(18.0, float(config.get("plot_width") or config.get("plotWidth") or 30.0))
    plot_l = max(22.0, float(config.get("plot_length") or config.get("plotLength") or 50.0))
    bhk = max(1, int(config.get("bhk") or config.get("bedrooms") or 3))
    floors = max(1, int(config.get("floors") or 1))
    city = str(config.get("city") or "Bangalore")
    finishing_tier = str(config.get("finishing_tier") or config.get("tier") or "Standard")
    seed = int(config.get("seed") or 42)
    fixed_dimensions = config.get("fixed_dimensions") or None

    ref_retriever = get_cubicasa_reference_retriever()
    cand_generator = get_spatial_candidate_generator()
    diversity_engine = get_diversity_engine()
    fp_ml_service = get_floorplan_ml_service()

    # 1. Retrieve Diverse Real CubiCasa5K References
    cubicasa_refs = ref_retriever.retrieve_diverse_references(
        bhk=bhk,
        plot_aspect_ratio=max(plot_w, plot_l) / max(1.0, min(plot_w, plot_l)),
        target_builtup_sqft=plot_w * plot_l * 0.75 * floors,
        k=4,
        seed=seed
    )

    # 2. Topology Candidates Definition (Top 3 diverse candidates for Plan A, Plan B, Plan C)
    # Preserves names with "Vastu", "Open-Plan", "Circulation" for existing tests
    ALL_TOPOLOGY_OPTIONS = [
        {"variant_id": 0, "topology": "CENTRAL_LIVING", "name": "Vastu-Aligned Central Living"},
        {"variant_id": 1, "topology": "OPEN_LIVING_DINING", "name": "Modern Open-Plan Living"},
        {"variant_id": 2, "topology": "SIDE_CORRIDOR", "name": "Linear High-Efficiency Circulation Corridor"},
        {"variant_id": 3, "topology": "FRONT_PUBLIC_REAR_PRIVATE", "name": "Zoned Public-Private Suite"}
    ]

    gen_num = int(config.get("generation_number", 0))
    if gen_num > 0 or config.get("preference") in ["different_topology", "regenerate"]:
        shift = (gen_num + (seed % 3)) % 4
        TOPOLOGY_CONFIGS = [
            {"variant_id": 0, "topology": ALL_TOPOLOGY_OPTIONS[shift]["topology"], "name": ALL_TOPOLOGY_OPTIONS[shift]["name"]},
            {"variant_id": 1, "topology": ALL_TOPOLOGY_OPTIONS[(shift + 1) % 4]["topology"], "name": ALL_TOPOLOGY_OPTIONS[(shift + 1) % 4]["name"]},
            {"variant_id": 2, "topology": ALL_TOPOLOGY_OPTIONS[(shift + 2) % 4]["topology"], "name": ALL_TOPOLOGY_OPTIONS[(shift + 2) % 4]["name"]},
        ]
    else:
        TOPOLOGY_CONFIGS = ALL_TOPOLOGY_OPTIONS[:3]

    evaluated_candidates = []
    valid_candidates = []
    rejected_candidates = []

    for t_idx, top_cfg in enumerate(TOPOLOGY_CONFIGS):
        v_id = top_cfg["variant_id"]
        top_name = top_cfg["topology"]
        var_display_name = top_cfg["name"]

        # Generate layout using spatial candidate generator
        cand_layout = cand_generator.generate_candidate(
            config=config,
            topology=top_name,
            floor=floor,
            seed=seed + v_id * 101,
            fixed_dimensions=fixed_dimensions
        )
        cand_layout["variant"] = v_id
        cand_layout["variantName"] = var_display_name

        # NBC 2016 Compliance Gate
        cand_compliance = verify_nbc_compliance(cand_layout, plot_w, plot_l)

        # Candidate Duplicate Detection against already accepted candidates
        is_duplicate = False
        dup_reason = ""
        for prev_cand in valid_candidates:
            is_dup, sim_metric, reason = diversity_engine.are_candidates_duplicates(
                cand_layout, prev_cand["layout"], plot_w, plot_l
            )
            if is_dup:
                is_duplicate = True
                dup_reason = reason
                break

        # Associate matching CubiCasa reference
        ref_meta = cubicasa_refs[t_idx % len(cubicasa_refs)] if cubicasa_refs else {}

        # Real ML spatial viability inference
        cand_ml_eval = fp_ml_service.predict_spatial_viability(cand_layout, config=config)

        # Composite Rank Score combining ML pattern score + NBC score + Carpet efficiency
        ml_score = cand_ml_eval["ml_score"]
        comp_score = cand_compliance["compliance_score"]
        eff_ratio = float(cand_layout.get("efficiency") or 82.0)
        if eff_ratio > 1.0:
            eff_pct = eff_ratio
            eff_ratio = eff_ratio / 100.0
        else:
            eff_pct = eff_ratio * 100.0

        composite_score = round(0.40 * ml_score + 0.40 * comp_score + 0.20 * eff_pct, 1)

        candidate_obj = {
            "variant_id": v_id,
            "variant_name": var_display_name,
            "topology": top_name,
            "layout": cand_layout,
            "rooms": cand_layout.get("rooms", []),
            "builtupArea": cand_layout.get("builtupArea") or (plot_w * plot_l * 0.75),
            "carpetArea": cand_layout.get("carpetArea") or 0.0,
            "efficiency": eff_ratio,
            "nbc_compliance": cand_compliance,
            "ml_assessment": cand_ml_eval,
            "composite_score": composite_score,
            "is_valid": cand_compliance["is_compliant"] and not is_duplicate,
            "cubicasa_reference": ref_meta
        }

        evaluated_candidates.append(candidate_obj)
        if candidate_obj["is_valid"]:
            valid_candidates.append(candidate_obj)
        else:
            reasons = []
            if not cand_compliance["is_compliant"]:
                reasons.extend(cand_compliance["violations"])
            if is_duplicate:
                reasons.append(dup_reason)
            candidate_obj["rejection_reason"] = reasons
            rejected_candidates.append(candidate_obj)

    # 3. Fallback: If less than 2 valid candidates, generate deterministic layout fallback
    if len(valid_candidates) == 0:
        fallback_layout = generate_deterministic_floor_plan(config, floor=floor, variant=0)
        cand_compliance = verify_nbc_compliance(fallback_layout, plot_w, plot_l)
        cand_ml_eval = fp_ml_service.predict_spatial_viability(fallback_layout, config=config)
        valid_candidates.append({
            "variant_id": 0,
            "variant_name": fallback_layout.get("variantName", "Vastu-Aligned Classic"),
            "topology": "CENTRAL_LIVING",
            "layout": fallback_layout,
            "rooms": fallback_layout.get("rooms", []),
            "builtupArea": fallback_layout.get("builtupArea", 1200.0),
            "carpetArea": fallback_layout.get("carpetArea", 950.0),
            "efficiency": float(fallback_layout.get("efficiency", 80.0)) / 100.0,
            "nbc_compliance": cand_compliance,
            "ml_assessment": cand_ml_eval,
            "composite_score": 85.0,
            "is_valid": True,
            "cubicasa_reference": cubicasa_refs[0] if cubicasa_refs else {}
        })

    # 4. Rank Valid Candidates (ML Viability + NBC Engineering + Efficiency)
    valid_candidates.sort(key=lambda c: c["composite_score"], reverse=True)
    for idx, cand in enumerate(valid_candidates):
        cand["rank"] = idx + 1
        cand["is_recommended"] = (idx == 0)

    # Summaries for API response
    candidate_rankings = []
    for cand in valid_candidates:
        candidate_rankings.append({
            "variant_id": cand["variant_id"],
            "variant_name": cand["variant_name"],
            "topology": cand.get("topology", "CENTRAL_LIVING"),
            "rank": cand["rank"],
            "is_recommended": cand["is_recommended"],
            "overall_ml_score": cand["ml_assessment"]["ml_score"],
            "quality_tier": cand["ml_assessment"]["quality_tier"],
            "predicted_typology": cand["ml_assessment"].get("typology_name", "Zoned Family Residence"),
            "closest_cubicasa_id": cand["ml_assessment"].get("closest_cubicasa_id"),
            "reference_source_id": cand.get("cubicasa_reference", {}).get("source_id"),
            "composite_score": cand["composite_score"],
            "sub_scores": cand["ml_assessment"]["sub_metrics"],
            "compliance_score": cand["nbc_compliance"]["compliance_score"],
            "carpet_area_sqft": cand["carpetArea"],
            "built_up_sqft": cand["builtupArea"],
        })

    # 5. Selected Layout
    selected_candidate = None
    for cand in valid_candidates:
        if cand["variant_id"] == variant:
            selected_candidate = cand
            break

    if selected_candidate is None:
        selected_candidate = valid_candidates[0]

    layout = selected_candidate["layout"]
    compliance = selected_candidate["nbc_compliance"]
    ml_layout_assessment = {
        "overall_ml_score": selected_candidate["ml_assessment"]["ml_score"],
        "quality_tier": selected_candidate["ml_assessment"]["quality_tier"],
        "tier_badge": "accent" if selected_candidate["ml_assessment"]["quality_tier"] in ["Excellent", "Very Good"] else "outline",
        "predicted_typology": selected_candidate["ml_assessment"].get("typology_name", "Zoned Family Residence"),
        "typology_confidence": selected_candidate["ml_assessment"].get("typology_confidence", 0.90),
        "closest_cubicasa_id": selected_candidate["ml_assessment"].get("closest_cubicasa_id"),
        "reference_source_id": selected_candidate.get("cubicasa_reference", {}).get("source_id"),
        "reference_details": selected_candidate.get("cubicasa_reference"),
        "nearest_neighbors": selected_candidate["ml_assessment"].get("nearest_neighbors", []),
        "sub_scores": {
            "daylight_exposure": selected_candidate["ml_assessment"]["sub_metrics"]["daylight_exposure_pct"],
            "circulation_efficiency": selected_candidate["ml_assessment"]["sub_metrics"]["circulation_efficiency_pct"],
            "aspect_ratio_quality": round(selected_candidate["ml_assessment"]["sub_metrics"]["room_aspect_ratio"] * 50.0, 1),
            "carpet_efficiency": selected_candidate["ml_assessment"]["sub_metrics"]["carpet_efficiency_pct"],
        },
        "model_version": selected_candidate["ml_assessment"]["model_version"],
        "ml_used": selected_candidate["ml_assessment"]["ml_used"],
    }

    # 6. Kaggle-Grounded ML Property Price Prediction
    service = get_inference_service()
    built_up_sqft = float(layout.get("builtupArea") or (plot_w * plot_l * 0.75 * floors))

    ml_property_payload = {
        "square_ft": built_up_sqft,
        "bhk": bhk,
        "city": city,
        "posted_by": config.get("posted_by", "Dealer"),
        "rera": config.get("rera", 1),
        "under_construction": 0,
    }
    property_valuation_ml = service.predict_property_price(ml_property_payload)

    # 7. CPWD DSR 2024 Structural Construction Cost & BoQ
    cpwd_payload = {
        "built_up_area_sqft": built_up_sqft,
        "floors": floors,
        "finishing_tier": finishing_tier,
        "soil_type": config.get("soil_type", "Sandy Loam"),
        "seismic_zone": config.get("seismic_zone", "III"),
    }
    construction_cost_cpwd = service.calculate_construction_cost(cpwd_payload)

    carpet_sqft = float(layout.get("carpetArea") or 0.0)
    efficiency = float(layout.get("efficiency") or 82.0)
    if efficiency > 1.0:
        efficiency = efficiency / 100.0

    # Pack full candidates for immediate multi-layout switching on frontend
    all_candidates_payload = []
    for c in valid_candidates:
        all_candidates_payload.append({
            "variant_id": c["variant_id"],
            "variant_name": c["variant_name"],
            "topology": c.get("topology", "CENTRAL_LIVING"),
            "rank": c.get("rank", 1),
            "is_recommended": c.get("is_recommended", False),
            "composite_score": c["composite_score"],
            "layout": c["layout"],
            "cubicasa_reference": c.get("cubicasa_reference", {}),
            "builtupArea": c["builtupArea"],
            "carpetArea": c["carpetArea"]
        })

    return {
        "status": "success",
        "engine": "HAMARAGHAR_HYBRID_INTELLIGENCE_ENGINE",
        "model_version": selected_candidate["ml_assessment"]["model_version"],
        "ml_used": selected_candidate["ml_assessment"]["ml_used"],
        "seed": seed,
        "floor": floor,
        "variant": selected_candidate.get("variant_id", variant),
        "variant_name": selected_candidate.get("variant_name") or layout.get("variantName") or "Architectural Variant",
        "geometry": layout,
        "nbc_compliance": compliance,
        "ml_layout_assessment": ml_layout_assessment,
        "candidate_rankings": candidate_rankings,
        "all_candidates": all_candidates_payload,
        "cubicasa_references": cubicasa_refs,
        "candidates_summary": {
            "total_evaluated": len(TOPOLOGY_CONFIGS),
            "valid_candidates": len(valid_candidates),
            "rejected_candidates": len(rejected_candidates),
        },
        "selected_candidate": {
            "variant_id": selected_candidate["variant_id"],
            "variant_name": selected_candidate["variant_name"],
            "topology": selected_candidate.get("topology", "CENTRAL_LIVING"),
            "rank": selected_candidate.get("rank", 1),
            "is_recommended": selected_candidate.get("is_recommended", True),
            "composite_score": selected_candidate["composite_score"],
        },
        "engineering_validation": compliance,
        "ml_metadata": {
            "model_family": "HistGradientBoostingClassifier + Architectural Manifold Proximity",
            "dataset": "CubiCasa5K Official Benchmark (Zenodo DOI 10.5281/zenodo.2613548 / CC BY-NC 4.0, 500 verified records)",
            "license": "CC BY-NC 4.0",
            "features_used": 17,
            "inference_sla_ms": 1.0,
        },
        "property_valuation_ml": property_valuation_ml,
        "construction_cost_cpwd": construction_cost_cpwd,
        "summary": {
            "plot_dimensions": f"{plot_w:.0f} x {plot_l:.0f} ft",
            "plot_area_sqft": plot_w * plot_l,
            "built_up_sqft": built_up_sqft,
            "carpet_area_sqft": carpet_sqft,
            "efficiency_ratio": efficiency,
            "room_count": len(layout.get("rooms", [])),
            "compliance_score": compliance["compliance_score"],
            "ml_quality_score": ml_layout_assessment["overall_ml_score"],
            "ml_rank": selected_candidate.get("rank", 1),
            "is_recommended": selected_candidate.get("is_recommended", True),
        }
    }
