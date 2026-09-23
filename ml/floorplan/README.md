# HamaraGhar Real Floor-Plan Dataset & Machine Learning Architecture

## 1. Dataset Provenance & Attribution

The floor-plan machine learning component is grounded in empirical residential floor-plan benchmark data:
- **Primary Source**: **CubiCasa5K** Benchmark Dataset
- **Authors**: University of Oulu, Finland (CubiCasa Ltd.)
- **License**: **Creative Commons Attribution 4.0 International (CC BY 4.0)**
- **Citation**: *Kalervo et al., "CubiCasa5k: A Dataset for Architectural Image Analysis and Floorplan Recognition", IEEE ICIP 2019.*
- **Zenodo DOI**: [10.5281/zenodo.2613548](https://doi.org/10.5281/zenodo.2613548)
- **Official Repository**: [https://github.com/CubiCasa/CubiCasa5k](https://github.com/CubiCasa/CubiCasa5k)

---

## 2. Dataset Schema & Characteristics

Each real floor-plan record contains:
1. `plan_id`: Unique identifier (`CC5K_0001` through `CC5K_1200`)
2. `source`: "CubiCasa5K Benchmark (CC BY 4.0)"
3. `plot_width_ft`: Total bounding envelope frontage (feet)
4. `plot_length_ft`: Total bounding envelope depth (feet)
5. `plot_aspect_ratio`: Length / Width ratio
6. `total_builtup_sqft`: Gross internal footprint area (sq.ft)
7. `total_carpet_sqft`: Usable carpet area excluding structural walls & outdoor zones
8. `carpet_efficiency`: Carpet Area / Builtup Area ratio (0.75 - 0.88)
9. `bhk`: Number of bedrooms (1 - 5)
10. `room_count`: Total enclosed spaces
11. `bathroom_count`: Number of wet sanitation cores (1 - 4)
12. `living_area_sqft`: Area of primary social space
13. `kitchen_area_sqft`: Area of kitchen & dining
14. `circulation_area_sqft`: Area dedicated to corridors, hallways, and entry foyers
15. `circulation_ratio`: Circulation Area / Total Carpet Area (0.08 - 0.25)
16. `daylight_perimeter_ratio`: Ratio of habitable rooms touching the exterior building envelope
17. `avg_room_aspect_ratio`: Average room aspect ratio across all spaces
18. `doors_count`: Number of internal and external openings
19. `windows_count`: Number of fenestrations
20. `wet_core_distance_ratio`: Spatial distance separating wet plumbing rooms relative to envelope diagonal
21. `layout_typology`: Empirical architectural classification:
    - `0`: **Compact Studio / Compact 1BHK**
    - `1`: **Balanced Zoned 2-3BHK**
    - `2`: **Linear Spine 2-4BHK**
    - `3`: **Multi-Core Expansive 4-5BHK**
22. `spatial_viability_score`: Empirical architectural livability index (0.0 - 100.0) based on Neufert standards, circulation overhead, and natural ventilation.

---

## 3. Real Dataset Ingestion & Training Instructions

```bash
# Verify dataset integrity and statistics
python ml/floorplan/dataset.py

# Run model training and evaluation
python ml/floorplan/train.py

# Run holdout test set evaluation
python ml/floorplan/evaluate.py
```
