# HamaraGhar — AI-Assisted Hybrid Residential Planning & Valuation Platform

HamaraGhar is an open-source, production-grade AI-assisted residential spatial planning, structural compliance, and cost estimation platform designed for Indian housing.

The system employs **AI-assisted hybrid floor-plan generation using procedural candidate generation, real-data floor-plan ML, similarity retrieval, and deterministic engineering validation**.

---

## 1. Problem
Designing residential homes in India poses complex, multifaceted challenges:
- **Spatial Sub-optimality**: Traditional floor plans drawn by non-specialists often suffer from awkward circulation paths, poor ventilation, and non-compliance with the National Building Code (NBC).
- **Misleading "AI Floor-Plan" Claims**: Many software solutions claim to "generate" floor plans end-to-end with Black-Box AI, but produce unbuildable artifacts: overlapping rooms, missing doorways, non-structural walls, or illegal setbacks.
- **Financial Opacity**: Homeowners struggle to differentiate between the **actual civil construction cost** (materials and labor) and the **fair market property valuation** (real estate capital worth).

---

## 2. Solution
HamaraGhar solves these challenges by combining distinct, specialized technologies:
1. **Procedural Geometry Engine**: Deterministically synthesizes structurally valid, buildable candidate room layouts based on plot dimensions and BHK requirements.
2. **Deterministic NBC 2016 Engineering Gate**: Automatically enforces statutory building code rules (setbacks, minimum room dimensions, light/ventilation ratios) before candidates are ranked.
3. **Real Floor-Plan Machine Learning**: Employs supervised ML trained on 500 verified real vector floor plans from the CubiCasa5K benchmark to classify spatial typologies and measure empirical realism.
4. **Similarity Retrieval Engine**: Computes distance across the empirical residential manifold to retrieve the nearest verifiable real-world layout reference.
5. **Decoupled Financial Intelligence**:
   - **CPWD DSR 2024 BoQ Engine**: Deterministic, itemized civil construction cost estimation.
   - **Kaggle Property Valuation ML**: Supervised regression predicting capital market valuation based on 29,451 Indian real estate transactions.
6. **GenAI Requirement Extraction**: LLM-powered natural language comprehension converting colloquial user requirements into structured Pydantic schemas.

---

## 3. Architecture Overview

```
                              ┌─────────────────────────┐
                              │          USER           │
                              │ (Natural Language Prompt│
                              │  or Explicit Parameters)│
                              └────────────┬────────────┘
                                           │
                                           ▼
                       ┌───────────────────────────────────────┐
                       │      GENAI REQUIREMENT EXTRACTION     │
                       │   (Gemini Flash / Rule Fallback)      │
                       └───────────────────┬───────────────────┘
                                           │
                                           ▼
                       ┌───────────────────────────────────────┐
                       │        STRUCTURED REQUIREMENTS        │
                       │  (Pydantic Schema: BHK, Plot, Vastu,  │
                       │   Floors, Budget, Quality, City)      │
                       └───────────────────┬───────────────────┘
                                           │
                                           ▼
                       ┌───────────────────────────────────────┐
                       │  PROJECT-SPECIFIC CANDIDATE GENERATION│
                       │ (Procedural Spatial Allocation Engine:│
                       │  Generates 3 Distinct Architectural   │
                       │  Variants: Balanced, Compact, Luxury) │
                       └───────────────────┬───────────────────┘
                                           │
                                           ▼
                       ┌───────────────────────────────────────┐
                       │        NBC / ENGINEERING FILTER       │
                       │ (National Building Code 2016 Gate:    │
                       │  Setbacks, Min Dimensions, Ventilation│
                       │  Clearance, Ingress/Egress Checks)    │
                       └───────────────────┬───────────────────┘
                                           │ Passes Engineering Gate
                                           ▼
                       ┌───────────────────────────────────────┐
                       │          REAL FLOOR-PLAN ML           │
                       │ (Trained on 500 CubiCasa5K Vector     │
                       │  Plans: Typology Classifier v2 +      │
                       │  Predictive Confidence Scoring)       │
                       └───────────────────┬───────────────────┘
                                           │
                                           ▼
                       ┌───────────────────────────────────────┐
                       │          SIMILARITY RETRIEVAL         │
                       │ (Euclidean Manifold Distance to 350   │
                       │  Benchmark Training Vector Layouts,   │
                       │  Identifies Closest Real Reference)   │
                       └───────────────────┬───────────────────┘
                                           │
                                           ▼
                       ┌───────────────────────────────────────┐
                       │           CANDIDATE RANKING           │
                       │ (Composite Metric: NBC Compliance +   │
                       │  ML Manifold Proximity + Typology     │
                       │  Alignment + Spatial Efficiency)      │
                       └───────────────────┬───────────────────┘
                                           │
                                           ▼
                       ┌───────────────────────────────────────┐
                       │         2D / 3D VISUALIZATION         │
                       │ (HTML5 Canvas 2D Vector CAD Engine +  │
                       │  Three.js WebGL Interactive 3D Model) │
                       └───────────────────┬───────────────────┘
                                           │
                                           ▼
                       ┌───────────────────────────────────────┐
                       │       COST & VALUATION DUAL ENGINE    │
                       ├───────────────────┬───────────────────┤
                       │  PROPERTY ML      │     CPWD DSR      │
                       │  VALUATION        │    COST ENGINE    │
                       │ (Kaggle Dataset,  │ (Itemized BoQ,    │
                       │  HistGradient-    │  Market Rates,    │
                       │  Boosting Regr.)  │  Civil Quantities)│
                       └───────────────────┴───────────────────┘
```

---

## 4. AI/ML Components Summary

| Component | Discipline | Underlying Technique | Training Data | Role |
| :--- | :--- | :--- | :--- | :--- |
| **Requirement Extraction** | Generative AI | Gemini 1.5/2.0 Flash / Heuristic Regex Fallback | Pre-trained LLM | Parses colloquial requirements into structured Pydantic parameters |
| **Floor-Plan Typology Model** | Supervised ML | Multinomial Logistic Regression (`floorplan_model_v2.joblib`) | 500 CubiCasa5K physical vector files (350 Train / 75 Val / 75 Test) | Predicts architectural typology (`Compact Studio`, `Zoned Residence`, `Linear Spine`, `Multi-Wing Villa`) |
| **Empirical Manifold Engine** | Instance-Based ML | Vectorized Euclidean distance matrix over normalized architectural feature space | 350 CubiCasa5K training vector floor plans | Scores spatial realism and identifies nearest real benchmark reference |
| **Property Valuation Model** | Supervised ML | `HistGradientBoostingRegressor` (`property_price_regressor_v1.joblib`) | 29,451 Indian real estate transactions (Kaggle) | Predicts market real estate capital value in ₹ |

---

## 5. Dataset Provenance & Integrity

The floor-plan machine learning subsystem is trained on verifiable, authentic architectural data:
- **Source**: Official [CubiCasa5K](https://github.com/CubiCasa/CubiCasa5k) open-access benchmark dataset (CC BY-NC 4.0 license, Zenodo DOI: `10.5281/zenodo.2613548`).
- **Physical Files on Disk**: 500 physical vector `.txt` files exist in `ml/floorplan/data/raw_cubicasa/{train,val,test}/`.
- **Deduplication & Cryptographic Hashes**: Every file is cataloged in `ml/floorplan/data/source_manifest.csv` with its physical SHA-256 file hash and geometry hash.
- **Verification Audit**: Zero synthetic records. Zero missing records. 500 unique source IDs.
- **Split Distribution**:
  - Training: 350 records (70%)
  - Validation: 75 records (15%)
  - Holdout Test: 75 records (15%, locked)

---

## 6. CubiCasa5K Feature Extraction

CubiCasa5K floor plans contain vector coordinates for rooms, walls, doors, and windows. HamaraGhar extracts 17 objective physical layout features via `RealFloorPlanSVGExtractor`:
1. `plot_width_ft`: Exterior bounding frontage width
2. `plot_length_ft`: Exterior bounding depth
3. `plot_aspect_ratio`: Length/Width ratio
4. `total_builtup_sqft`: Gross built footprint
5. `total_carpet_sqft`: Usable interior carpet area
6. `carpet_efficiency`: Ratio of carpet area to built-up area
7. `total_wall_length_ft`: Cumulative structural wall centerline length
8. `wall_density_ratio`: Total wall length per $\sqrt{\text{built-up area}}$
9. `room_count`: Total functional enclosed rooms
10. `bhk`: Number of habitable bedrooms
11. `bathroom_count`: Number of wet/sanitation cores
12. `door_count`: Number of passage doors detected
13. `window_count`: Number of exterior ventilation windows
14. `openings_per_wall_ratio`: Ratio of openings to structural wall segments
15. `avg_room_aspect_ratio`: Mean elongation ratio across all rooms
16. `circulation_area_ratio`: Ratio of corridor/passage area to carpet area
17. `wet_core_distance_ratio`: Plumbing cluster separation relative to plot depth

---

## 7. Floor-Plan Machine Learning Task

- **Task Formulation**: Supervised multiclass classification mapping layout features to standard residential typologies:
  - `Class 0`: Compact Studio (single-zone urban footprint)
  - `Class 1`: Zoned Family Residence (multi-room layout with clear public/private separation)
  - `Class 2`: Linear Spine (elongated circulation spine topology)
  - `Class 3`: Multi-Wing Villa (expansive multi-bedroom, multi-bathroom residential configuration)
- **Target Integrity**: Discrete multiclass target, completely eliminating formulaic target leakage.
- **Leakage Prevention**: An automated test (`check_target_leakage()`) enforces that no feature correlates with the target above \(|r| = 0.98\).

---

## 8. Property Valuation ML

- **Model**: `HistGradientBoostingRegressor` (`ml/models/valuation_model.py`).
- **Data Source**: 29,451 residential property transactions across Indian Tier-1 and Tier-2 cities (Kaggle Indian Real Estate dataset).
- **Features**: City, micro-market locality, square footage, BHK count, floor position, parking availability, and builder grade.
- **Decoupling**: Strictly independent of construction costing; models market exchange valuation.

---

## 9. CPWD DSR 2024 Construction Cost Engine

Construction costing is **strictly non-ML** and computed deterministically:
- Based on official **Central Public Works Department (CPWD) Delhi Schedule of Rates (DSR 2024)**.
- Computes itemized Bill of Quantities (BoQ):
  - Substructure & Excavation
  - Reinforced Cement Concrete (RCC M25) & Fe500 TMT Steel Reinforcement
  - Brickwork / AAC Masonry
  - Internal / External Plaster & Weather-Proof Finishes
  - Flooring (Vitrified / Granite / Marble)
  - Plumbing, Sanitary, and Electrical Conduiting
- Output includes complete civil quantity takeoffs and labor/material cost breakdowns.

---

## 10. NBC 2016 Engineering Validation

All floor-plan candidates must pass the **National Building Code of India (NBC 2016, Part 3)** engineering gate:
- **Setback Encroachment**: Mandatory front (\(\ge 1.5\,\text{m}\) up to \(3.0\,\text{m}\)), rear (\(\ge 1.5\,\text{m}\)), and side setbacks verified against plot boundaries.
- **Spatial Overlap**: Hard topological check (\(R_i \cap R_j = \emptyset\)) ensuring zero room collision.
- **Minimum Room Dimensions**: Master Bedroom \(\ge 9.5\,\text{m}^2\), width \(\ge 2.4\,\text{m}\); Kitchen \(\ge 5.0\,\text{m}^2\), width \(\ge 1.8\,\text{m}\); Toilets \(\ge 1.8\,\text{m}^2\).
- **Ventilation**: Natural window opening area \(\ge 10\%\) of floor area.

---

## 11. Generative AI Subsystem

- Handled by `ml/llm/client.py` using Google Gemini Flash.
- Strictly parses natural language input into validated Pydantic models (`UserRequirements`).
- Includes an automatic offline regex-heuristic fallback when API keys are absent or network requests time out.
- **Does not generate coordinates, CAD geometry, or cost numbers**.

---

## 12. Procedural Candidate Generation

The geometric layout engine deterministically generates 3 distinct, project-specific architectural variants for any given plot and BHK configuration:
1. **Balanced Variant**: Central living hall, standard circulation, private bedroom wing.
2. **Compact Variant**: Space-saving layout maximizing carpet area and minimizing corridor footprint.
3. **Luxury / Open-Concept Variant**: Expansive living-dining layout with larger bedrooms, attached bathrooms, and walk-in dressing zones.

For multi-level homes (e.g. 4BHK duplex, 5BHK duplex), the generator synthesizes upper-floor geometry including staircase circulation voids and upper bedroom suites (e.g. 14 distinct rooms across 2 levels for 5BHK).

---

## 13. Similarity & Retrieval Engine

- Computes the Euclidean distance between a candidate's standardized feature vector and 350 real training vectors from CubiCasa5K.
- Yields a normalized **Manifold Proximity Score** in \((0, 1]\):
  $$\text{Proximity} = \frac{1}{1 + \min_i d(\mathbf{x}, \mathbf{x}_i)}$$
- Identifies and displays the exact CubiCasa benchmark `source_id` (e.g., `cubicasa5k/labels/train/1000.txt`) of the closest real-world floor plan.

---

## 14. Model Metrics & Scientific Evaluation

Evaluated on the locked 75-sample holdout test partition (zero data or split leakage):

### Experiment A: 17 Architectural Features (Rule Reconstruction Formulation)
Includes structural counts (`bhk`, `room_count`, `bathroom_count`). Linear and tree models fit the labeling rules with 100% accuracy:

| Model Architecture | Test Accuracy | Macro F1 | Weighted F1 | Note |
| :--- | :--- | :--- | :--- | :--- |
| **Majority Dummy** | 36.00% | 0.1324 | 0.1906 | Predicts Class 3 always |
| **Decision Tree (depth=3)** | 100.0% | 1.0000 | 1.0000 | Fits architectural rules |
| **Multinomial Logistic Regression** | **100.0%** | **1.0000** | **1.0000** | Linear separation on scaled features |
| **Random Forest (n=100)** | 100.0% | 1.0000 | 1.0000 | Zero ensemble variance |

### Experiment B: Pure External Geometry Set (7 Features — Zero Feature Leakage)
Excludes all bedroom counts, room counts, and direct built-up threshold proxies:  
*Features: `plot_width_ft`, `plot_length_ft`, `plot_aspect_ratio`, `carpet_efficiency`, `wall_density_ratio`, `openings_per_wall_ratio`, `avg_room_aspect_ratio`*

| Model Architecture | Test Accuracy | Macro F1 | Weighted F1 | Scientific Finding |
| :--- | :--- | :--- | :--- | :--- |
| **Majority Dummy** | 36.00% | 0.1324 | 0.1906 | Naive baseline |
| **Decision Tree (depth=3)** | 80.00% | 0.6043 | 0.7812 | Non-linear geometric partitions |
| **Multinomial Logistic Regression** | **86.67%** | **0.7772** | **0.8624** | **Defensible linear spatial generalization** |
| **Random Forest (n=100)** | **88.00%** | **0.8603** | **0.8784** | **Defensible non-linear spatial generalization** |

### Latency SLAs (Synchronous CPU Serving)
- **Classifier Inference Latency**: **0.016 ms** per sample (16 µs; SLA < 5.0 ms)
- **Manifold Retrieval Latency**: **0.757 ms** per query (NumPy vectorized; SLA < 10.0 ms)

---

## 15. Testing Suite

The codebase features comprehensive unit, integration, and security tests:
- `tests/test_real_floorplan_ml.py`: Validates CubiCasa5K dataset integrity, leakage freedom, model reproducibility, and latency SLAs.
- `tests/test_project_specific_generation.py`: Verifies project-specific generation across 1BHK, 2BHK, 3BHK, 4BHK duplex, and 5BHK configurations with multi-floor scaling.
- `tests/test_hybrid_planner.py`: Validates NBC compliance checks and collision detection.
- `tests/test_kaggle_pipeline.py`: Validates property market valuation ML inference.

---

## 16. Security & Privacy

- **No Exposed Secrets**: No hardcoded API keys; Gemini API keys are read from environment variables.
- **CSRF & Session Protection**: Flask sessions are cryptographically signed.
- **Path Traversal Protection**: Data endpoints sanitize and validate file paths against safe base directories.
- **IDOR Protections**: Project retrieval and modification routes enforce strict user ownership checks.

---

## 17. Deployment & Reproduction

### Prerequisites
- Python 3.10+ (tested on Python 3.14)
- Git

### Installation
```bash
git clone https://github.com/abhishekdaramoni-spec/HamaraGhar.git
cd HamaraGhar
python -m venv .venv
# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

### Reproduce Floor-Plan ML Training
```bash
python ml/floorplan/train.py
```

### Run Tests
```bash
python -m unittest discover -s tests -p "test_*.py"
```

### Run Application
```bash
python app.py
```
Open your browser at `http://127.0.0.1:5000`.

---

## 18. Documentation Directory

| Document | Path | Purpose |
| :--- | :--- | :--- |
| **System Architecture** | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Full multi-tier engineering specification, data flows, and design rationale |
| **Viva & Defense Guide** | [`docs/VIVA.md`](docs/VIVA.md) | 16 comprehensive academic defense questions, mathematical derivations, and viva Q&A |
| **Floor-Plan Model Card** | [`ml/floorplan/model_card.md`](ml/floorplan/model_card.md) | Specifications, data provenance, and dual-experiment benchmarks for `floorplan_model_v2` |
| **Property Valuation Model Card** | [`ml/MODEL_CARD.md`](ml/MODEL_CARD.md) | Regressor specifications and slice-based metrics for `property_price_regressor_v1` |
| **Provenance Manifest** | [`ml/floorplan/data/provenance_report.md`](ml/floorplan/data/provenance_report.md) | Cryptographic SHA-256 hashes and split distribution for 500 CubiCasa5K sources |
| **Historical Forensic Archive** | [`docs/archive/`](docs/archive/) | Archived forensic audit reports and historical development trajectories |

---

## 19. Known Limitations

1. **Orthogonal Geometry**: The candidate generation engine is optimized for rectangular and near-rectangular plots; highly irregular, triangular, or curved plots require manual CAD adjustments.
2. **CubiCasa Regional Bias**: CubiCasa5K comprises predominantly Western residential layouts; traditional Indian regional motifs (e.g., central open courtyards) are synthesized via procedural zone templates.
3. **2.5D Parametric Extrusion**: 3D visualization is rendered using 2.5D parametric extrusion of 2D CAD polygons in Three.js rather than native volumetric IFC BIM models.

---

## 20. Honest Viva Explanation

During academic or technical evaluation:
- **Never claim**: *"AI generated the floor plan walls and rooms."*
- **Explain accurately**: *"We use procedural space-allocation algorithms to generate candidate floor plans, NBC 2016 rules to enforce structural compliance, real CubiCasa5K ML to classify typology and score manifold proximity, GenAI to parse natural language requirements, Kaggle ML for property valuation, and CPWD DSR 2024 rates for construction costing."*
