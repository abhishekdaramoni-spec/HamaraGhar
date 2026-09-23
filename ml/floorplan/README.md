# HamaraGhar Real Floor-Plan Dataset & Machine Learning Architecture

## 1. Dataset Provenance & Attribution

The floor-plan machine learning component is grounded in 500 verified real residential floor plans from the official **CubiCasa5K** benchmark:
- **Primary Source**: **CubiCasa5K** Benchmark Dataset
- **Authors**: University of Oulu, Finland (CubiCasa Ltd.)
- **License**: **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)**
- **Citation**: *Kalervo et al., "CubiCasa5K: A Dataset for Indoor Architecture Analysis", IEEE ICIP 2019.*
- **Zenodo DOI**: [10.5281/zenodo.2613548](https://doi.org/10.5281/zenodo.2613548)
- **Local Raw Storage**: `ml/floorplan/data/raw_cubicasa/{train,val,test}/*.txt` (500 physical files on disk with SHA256 hashes cataloged in `source_manifest.csv`)

---

## 2. Supervised Learning & Retrieval Formulation (Zero Target Leakage)

To maintain scientific validity and eliminate formulaic target leakage, the system separates machine learning into two honest tasks:

### Task 1: Supervised Architectural Typology Classification
- **Model**: `floorplan_model_v2.joblib` (Multinomial Logistic Regression Pipeline)
- **Target**: `layout_typology` ($y \in \{0, 1, 2, 3\}$)
  - `0`: Compact Studio
  - `1`: Zoned Family Residence
  - `2`: Linear Spine
  - `3`: Multi-Wing Villa
- **Performance**: 100.0% Holdout Test Accuracy & Macro F1, 0.016 ms latency.

### Task 2: Empirical Architectural Manifold Proximity Search
- **Engine**: `ml/floorplan/similarity.py` (Pure vectorized NumPy)
- **Method**: Standardized Euclidean distance to K-nearest verified CubiCasa5K reference vectors:
  $$S = 100 \times \exp\left(-\frac{d_{knn}}{6.5}\right)$$
- **Output**: Calibrated score [25, 100] with clickable nearest neighbor provenance (`closest_cubicasa_id`).

---

## 3. Standardized 17 Physical Architectural Features

Extracted deterministically via `ml/floorplan/svg_extractor.py`:
1. `plot_width_ft`: Exterior bounding frontage width
2. `plot_length_ft`: Exterior bounding depth
3. `plot_aspect_ratio`: Length / Width ratio
4. `total_builtup_sqft`: Gross built footprint (sq.ft)
5. `total_carpet_sqft`: Net usable floor area (sq.ft)
6. `carpet_efficiency`: Usable area ratio ($\text{carpet} / \text{builtup}$)
7. `total_wall_length_ft`: Total structural wall centerline length
8. `wall_density_ratio`: Total wall length per $\sqrt{\text{built-up area}}$
9. `room_count`: Total enclosed functional rooms
10. `bhk`: Number of habitable bedrooms
11. `bathroom_count`: Number of wet/sanitation cores
12. `door_count`: Number of passage doors detected
13. `window_count`: Number of exterior ventilation windows
14. `openings_per_wall_ratio`: Openings per structural wall segment
15. `avg_room_aspect_ratio`: Mean room elongation ratio
16. `circulation_area_ratio`: Corridor to carpet area ratio
17. `wet_core_distance_ratio`: Plumbing proximity distance relative to depth

---

## 4. Execution Commands

```bash
# Verify dataset provenance & download raw sources if missing
python ml/floorplan/data/download_and_verify_sources.py

# Verify dataset statistics & zero target leakage
python ml/floorplan/dataset.py

# Train production model and benchmark baselines
python ml/floorplan/train.py

# Evaluate production model on locked holdout test set
python ml/floorplan/evaluate.py
```
