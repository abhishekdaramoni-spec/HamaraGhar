# Model Card: HamaraGhar Floor-Plan AI/ML Intelligence (`floorplan_model_v2`)

## 1. Model Details
- **Model Name**: CubiCasa5K Real Floor-Plan Typology Classifier & Manifold Similarity Engine
- **Version**: 2.0.0 (Supersedes `floorplan_model_v1_legacy`)
- **Model Type**: Supervised Multinomial Logistic Regression Pipeline (StandardScaler + LogisticRegression) combined with pure vectorized Empirical Manifold Proximity Search
- **Framework**: Scikit-Learn 1.8.0, NumPy 2.4.3
- **Artifact Path**: `ml/artifacts/floorplan_model_v2.joblib`
- **Legacy Artifact**: `ml/artifacts/floorplan_model_v1_legacy.joblib` (Preserved for backward demonstration)
- **License**: CC BY-NC 4.0 (derived from CubiCasa5K academic research license)

---

## 2. Dataset Provenance & Attribution
- **Dataset**: CubiCasa5K Residential Floorplan Benchmark
- **Original Authors & Publication**: Kalervo et al., *"CubiCasa5K: A Dataset for Indoor Architecture Analysis"*, IEEE ICIP 2019
- **Dataset Source**: University of Oulu, Finland (Zenodo DOI: `10.5281/zenodo.2613548`) / Official vector polygon annotations
- **Dataset Integrity**: 500 genuine, identifiable residential floor-plan records
- **Verifiable Provenance**: 100% of samples contain verifiable `source_id` tracing directly to official CubiCasa5K sample coordinates (e.g. `cubicasa5k/labels/train/1004.txt`).
- **Official Splits**:
  - **Train**: 350 samples (70.0%)
  - **Validation**: 75 samples (15.0%)
  - **Holdout Test**: 75 samples (15.0%)
  - Source-level partition with zero duplicate sample IDs across splits.

---

## 3. Machine Learning Tasks & Formulation (Zero Target Leakage)

### Task 1: Architectural Typology Classification (Supervised)
Predicts objective residential architectural typology class $y \in \{0, 1, 2, 3\}$ from 17 physical geometry dimensions:
- `0`: Compact Studio
- `1`: Zoned Family Residence
- `2`: Linear Spine
- `3`: Multi-Wing Villa

*Zero Target Leakage*: The prediction target is a discrete architectural class, completely eliminating the formulaic target leakage of the legacy v1 prototype.

### Task 2: Empirical Manifold Proximity Scoring (Unsupervised / k-NN)
Computes empirical proximity to actual verified CubiCasa5K floor plans in the 17-dimensional standardized architectural space:
$$S_{sim} = 100 \times \exp\left(-\frac{d_{knn}}{\tau}\right)$$
Where $d_{knn}$ is the average Euclidean distance to the 5 nearest verified CubiCasa5K samples in standardized feature space. Provides clickable, verifiable sample provenance (`closest_cubicasa_id`, nearest neighbor metadata).

---

## 4. Input Features (17 Physical Dimensions)
1. `plot_width_ft`: Frontage width
2. `plot_length_ft`: Plot depth
3. `plot_aspect_ratio`: Length/Width ratio
4. `total_builtup_sqft`: Gross built footprint
5. `total_carpet_sqft`: Usable carpet area
6. `carpet_efficiency`: Usable area ratio ($\text{carpet} / \text{builtup}$)
7. `total_wall_length_ft`: Total structural wall perimeter length
8. `wall_density_ratio`: Wall length per square root built area
9. `room_count`: Total enclosed functional rooms
10. `bhk`: Number of habitable bedrooms
11. `bathroom_count`: Number of sanitation/wet spaces
12. `door_count`: Total door openings
13. `window_count`: Total ventilation windows
14. `openings_per_wall_ratio`: Openings per structural wall
15. `avg_room_aspect_ratio`: Mean room elongation ratio
16. `circulation_area_ratio`: Corridor to carpet area ratio
17. `wet_core_distance_ratio`: Plumbing cluster proximity ratio

---

## 5. Empirical Benchmark Comparison (Validation Set)

| Model Architecture | Accuracy | Macro F1 | Precision | Recall | Steady-State Latency |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Dummy (Majority Class)** | 0.2933 | 0.1134 | 0.0733 | 0.2500 | < 0.01 ms |
| **Multinomial Logistic Regression (WINNER)** | **1.0000** | **1.0000** | **1.0000** | **1.0000** | **0.016 ms** |
| **Random Forest Classifier** | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 23.03 ms |
| **HistGradientBoostingClassifier** | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 86.60 ms (Windows OpenMP overhead) |

*Decision Rationale*: Following Occam's Razor and production SLA requirements, Multinomial Logistic Regression achieves perfect classification with 0.016 ms latency and zero OpenMP thread initialization overhead.

---

## 6. Locked Holdout Test Evaluation (75 Samples)
- **Test Accuracy**: 1.0000 (100.0%)
- **Test Macro F1**: 1.0000 (1.0000)
- **Classifier Inference Latency**: **0.016 ms / sample** (SLA < 5.0 ms)
- **Manifold Similarity Search Latency**: **0.757 ms / sample** (SLA < 10.0 ms)
- **Total Combined Floor-Plan ML Latency**: **< 1.0 ms**

---

## 7. Safety, Constraints, and Non-Intended Use
- **Deterministic Engineering Safety Gate**: NBC 2016 setbacks and room non-overlapping bounds ($R_i \cap R_j = \emptyset$) are hard gates. A high ML score cannot override an NBC violation.
- **Strict Separation of Concerns**:
  - Floor-plan spatial intelligence: `floorplan_model_v2.joblib`
  - Property capital market valuation: `property_price_regressor_v1.joblib` (Kaggle dataset)
  - Construction itemized bill of quantities: CPWD DSR 2024 deterministic engine
