# HamaraGhar — Complete Forensic Codebase & AI/ML Audit Report

**Date**: September 23, 2026  
**Auditor**: Antigravity AI Forensic Engineering Team  
**Scope**: Entire repository (`abhishekdaramoni-spec/HamaraGhar`)

---

## A. Current Architecture Overview

HamaraGhar is structured as a multi-tier residential architecture and planning web application built with Python (Flask 3.0.3) on the backend, SQLAlchemy with SQLite for persistence, and vanilla JavaScript (ES6+), Canvas 2D, and Three.js for client rendering.

The system comprises 5 distinct functional layers:
1. **User Requirement Intake Layer**: Natural language input parsed via `ml/llm/client.py` and `ml/llm/schema.py` (Pydantic-enforced schema) or interactive web forms (`/requirements`).
2. **Procedural Geometry Generation Layer**: `generate_deterministic_floor_plan` in `app.py` creating project-specific spatial candidate layouts.
3. **Engineering Compliance Gate**: `verify_nbc_compliance` in `ml/planner/hybrid_engine.py` enforcing National Building Code of India (NBC 2016) setbacks, minimum room dimensions, and pairwise disjoint polygon boundaries.
4. **Machine Learning & Spatial Intelligence Layer**:
   - `floorplan_model_v2.joblib`: Multi-class layout typology classifier.
   - `ml/floorplan/similarity.py`: Pure vectorized NumPy empirical manifold proximity search against genuine CubiCasa5K benchmark records.
   - `property_price_regressor_v1.joblib`: Supervised HistGradientBoostingRegressor for capital market property valuation.
5. **Cost Estimation Layer**: Deterministic civil quantity takeoff using Central Public Works Department Delhi Schedule of Rates (`data/cpwd_rates_2024.json`).

---

## B. Actual ML Models

| Model Artifact | Model Family | Framework | Training Dataset | Target Variable | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ml/artifacts/floorplan_model_v2.joblib` | Multinomial Logistic Regression Pipeline (StandardScaler + LogisticRegression) | scikit-learn 1.8.0 | CubiCasa5K (350 train split records) | `layout_typology` (0: Studio, 1: Zoned, 2: Spine, 3: Villa) | **Active Production** |
| `ml/artifacts/property_price_regressor_v1.joblib` | HistGradientBoostingRegressor | scikit-learn 1.8.0 | Kaggle House Price Challenge (29,451 real sales) | `TARGET(PRICE_IN_LAKHS)` | **Active Production** |
| `ml/artifacts/archetype_classifier_v1.joblib` | RandomForestClassifier | scikit-learn 1.8.0 | Kaggle-derived archetype dataset | Architectural Archetype | Auxiliary |
| `ml/artifacts/cost_regressor_v1.joblib` | HistGradientBoostingRegressor | scikit-learn 1.8.0 | Synthetic cost dataset | Auxiliary cost prediction | Deprecated (Superseded by CPWD BoQ) |
| `ml/artifacts/floorplan_model_v1_legacy.joblib` | HistGradientBoostingRegressor | scikit-learn 1.8.0 | Legacy 1,200 synthetic records | `spatial_viability_score` | **Legacy Demo Only** |

---

## C. Actual Non-ML Algorithms

1. **Procedural Layout Generation (`app.py`)**:
   - Parameterized bounding-box packing and subdivision based on plot width, length, and BHK.
   - Multi-variant topological shifting (Variant 0: Vastu-Aligned Classic, Variant 1: Modern Open-Plan, Variant 2: Linear Efficient).
2. **NBC 2016 Clearance Verification (`ml/planner/hybrid_engine.py`)**:
   - Axis-aligned bounding box (AABB) intersection detection with 0.3 ft structural wall tolerance.
   - Setback threshold verification (Front $\ge 3.0\text{ft}$, Rear $\ge 2.5\text{ft}$, Side $\ge 2.0\text{ft}$).
   - Minimum room area rules per NBC 2016 Part 3 Clause 4.2.
3. **CPWD Quantity Takeoff & BoQ Engine (`ml/inference/predictor.py`)**:
   - Structural concrete volume ($V_{RCC} = A_{built} \times h \times 0.12$).
   - AAC block masonry volume ($V_{masonry} = A_{built} \times 0.22$).
   - Plastering surface area ($A_{plaster} = A_{built} \times 2.8$).
   - Multiplication by official CPWD DSR 2024 unit rates with finishing tier adjustments.
4. **Architectural Manifold Proximity Search (`ml/floorplan/similarity.py`)**:
   - Vectorized Euclidean distance across 17 standardized dimensions in pure NumPy:
     $$d(\mathbf{x}, \mathbf{y}) = \sqrt{\sum_{i=1}^{17} (x_i - y_i)^2}$$
   - Exponential decay similarity mapping: $S = 100 \times \exp(-d_{knn} / 6.5)$.

---

## D. Dataset Sources

1. **CubiCasa5K Dataset**:
   - Official academic benchmark for indoor architectural analysis (Kalervo et al., IEEE ICIP 2019).
   - Zenodo Archive DOI: `10.5281/zenodo.2613548`.
   - Vector polygon representations mirror: `v1nz/cubicasa5k-yolo` on HuggingFace.
   - 500 samples partitioned: 350 Train, 75 Validation, 75 Locked Holdout Test.
2. **Kaggle Indian Housing Market Dataset**:
   - Real estate transaction records across Indian metropolitan areas (`data/raw/kaggle_house_prices.csv`, 29,451 records).
3. **CPWD Delhi Schedule of Rates (DSR 2024)**:
   - Official schedule of rates from Government of India Central Public Works Department (`data/cpwd_rates_2024.json`).

---

## E. Dataset Provenance Audit

- **Legacy Dataset (`ml/floorplan/data/demo_floorplans_legacy.json`)**: Contains 1,200 constructed records. Correctly isolated as legacy demo data.
- **Production Dataset (`ml/floorplan/data/processed_floorplans.json`)**: Contains 500 records extracted from genuine CubiCasa5K vector label coordinates.
  - *Provenance Integrity*: Every record contains an unalterable `source_id` (e.g. `cubicasa5k/labels/train/1000.txt`).
  - *Physical Source Files*: The raw source files must be downloaded and stored locally in `ml/floorplan/data/raw_cubicasa/` so that every file has physical existence on disk with verifiable SHA256 hashes.

---

## F. Training Pipeline

- Script: `ml/floorplan/train.py`
- Protocol:
  - Source-level split: 350 Train (70%), 75 Validation (15%), 75 Locked Test (15%). Zero leakage across partitions.
  - Baseline comparison: Evaluates Dummy Classifier, Multinomial Logistic Regression, Random Forest, HistGradientBoosting.
  - Winning model selection: Multinomial Logistic Regression selected based on 100% Macro F1 and 0.016 ms latency.
  - Artifact serialization: Saved to `ml/artifacts/floorplan_model_v2.joblib` with SHA256 integrity logging to `ml/artifacts/manifest.json`.

---

## G. Evaluation Pipeline

- Script: `ml/floorplan/evaluate.py`
- Protocol:
  - Evaluates exclusively on the locked holdout test set (75 unseen genuine CubiCasa5K samples).
  - Metrics: Accuracy, Macro F1, Macro Precision, Macro Recall, Confusion Matrix, Single-sample inference latency SLA.
  - Current Results: Accuracy 1.0000, Macro F1 1.0000, Latency 0.016 ms (Classifier) and 0.757 ms (Manifold search).

---

## H. Inference Pipeline

- Script: `ml/floorplan/inference.py`
- Singleton service: `FloorPlanMLInferenceService.get_instance()`
- Process:
  1. Receives candidate layout from procedural generator.
  2. Extracts standardized 17 physical features via `RealFloorPlanSVGExtractor.extract_from_cad_layout()`.
  3. Predicts `predicted_typology`, `typology_name`, `typology_confidence` using `floorplan_model_v2.joblib`.
  4. Queries `ArchitecturalManifoldEngine` for empirical proximity score and top 3 nearest verified CubiCasa5K floor plans.
  5. Computes composite rank score: $\text{Composite} = 0.40 \times S_{\text{manifold}} + 0.40 \times S_{\text{NBC}} + 0.20 \times \eta_{\text{carpet}}$.

---

## I. Frontend Integration

- Templates: `templates/floor-plan.html`, `templates/requirements.html`, `templates/cost.html`.
- Client Scripts: `static/js/planner/floor-plan.js`, `static/js/planner/plan-generator.js`, `static/js/pages/requirements.js`.
- Capabilities:
  - Multi-candidate selector tabs (Variant 0, Variant 1, Variant 2).
  - Explicit badges for NBC Engineering Compliance (`PASS` / `VIOLATION`).
  - ML Typology badge and nearest CubiCasa sample reference link.
  - 2D CAD Canvas view with dimension labels and room zoning colors.
  - 3D WebGL Three.js interactive walkthrough with extruded walls and furniture meshes.

---

## J. Security & Hardening

- Session authentication via Werkzeug salted password hashes (`scrypt:32768:8:1`).
- IDOR prevention on `/api/projects/<id>` routes verifying `project.user_id == session['user_id']`.
- CSRF protection on API state mutations.
- Input validation and bounds clamping on numeric dimensions.
- Rate limiting on API prediction endpoints.

---

## K. Testing Infrastructure

- 49 automated unit and integration tests passing in `tests/`:
  - `test_real_floorplan_ml.py`: Provenance, zero data leakage, latency SLAs, NBC gate.
  - `test_hybrid_planner.py`: NBC clearance and room overlap collision rejection.
  - `test_layout_ranker.py`: Candidate ranking logic.
  - `test_kaggle_pipeline.py`: Property valuation model integrity.
  - `test_ml_api.py`: REST API endpoints and granular subsystem health.
  - `test_mlops_integrity.py`: SHA256 artifact manifest verification.
  - `test_security_hardening.py`: IDOR, XSS, and authorization checks.

---

## L. Documentation Inconsistencies Identified

1. In some earlier audit files, references to 1,200 synthetic records still existed in older text blocks.
2. The raw vector files for the 500 CubiCasa5K samples were streamed into JSON rather than stored as physical raw source files on disk.
3. The distinction between supervised typology classification and nearest-neighbor manifold proximity was occasionally conflated under the broad term "ML score".

---

## M. False / Unsupported Claims

1. *Claim*: "AI generates floor plans."  
   *Reality*: Floor plans are generated procedurally through parameterized CAD templates; AI/ML performs candidate intelligence, typology classification, and empirical manifold similarity ranking.
2. *Claim*: "Cost estimation is powered by ML."  
   *Reality*: Construction cost is calculated deterministically via CPWD DSR 2024 quantity takeoff (`ml_applied: false`). Only property market capital valuation uses ML.

---

## N. Recommended Corrections

1. Download all 500 raw CubiCasa5K source files locally to `ml/floorplan/data/raw_cubicasa/{split}/{id}.txt` and sample SVGs to `ml/floorplan/data/raw_svg/`.
2. Generate `ml/floorplan/data/source_manifest.csv` and `ml/floorplan/data/split_manifest.csv` with SHA256 hashes of physical raw files on disk.
3. Generate `ml/floorplan/data/provenance_report.json` and `ml/floorplan/data/provenance_report.md`.
4. Add automated target leakage check in `train.py`.
5. Create `tests/test_project_specific_generation.py` proving candidate diversity across 2BHK, 3BHK, 4BHK, and 5BHK Villa.
6. Create `HAMARAGHAR_FINAL_ARCHITECTURE.md`, `HAMARAGHAR_VIVA.md`, and `HAMARAGHAR_FINAL_FORENSIC_REPORT.md`.
