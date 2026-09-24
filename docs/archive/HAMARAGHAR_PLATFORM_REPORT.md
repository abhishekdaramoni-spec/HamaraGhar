# HamaraGhar: Production-Grade AI/ML Architectural & Construction Intelligence Platform

## Executive Summary

**HamaraGhar** is an AI/ML engineering platform for residential architecture and construction planning across India. The platform eliminates artificial/synthetic rule-labeled datasets in favor of real-world external Kaggle data, deterministic civil engineering schedules, National Building Code of India (NBC 2016) clearance gates, and schema-validated conversational AI.

---

## 1. Architectural Separation of Concerns & Nomenclature Charter

The platform enforces strict nomenclature to avoid misleading claims:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            HAMARAGHAR UNIFIED PLATFORM                            │
└─────────────────────────────────────────┬────────────────────────────────────────┘
                                          │
    ┌─────────────────────────────────────┼─────────────────────────────────────┐
    │                                     │                                     │
    ▼                                     ▼                                     ▼
┌─────────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────┐
│   MACHINE LEARNING      │   │  CIVIL ENGINEERING      │   │   STRUCTURAL CODES      │
│   VALUATION ENGINE      │   │     BOQ ENGINE          │   │   CONSTRAINT GATE       │
├─────────────────────────┤   ├─────────────────────────┤   ├─────────────────────────┤
│ • Task: Indian Resi-    │   │ • Source: CPWD DSR      │   │ • Standard: NBC 2016    │
│   dential Property      │   │   2024 Schedules        │   │   Part 3 & Clause 4.2   │
│   Price Regressor       │   │ • Methodology: Deter-   │   │ • Setbacks: Front>=10%, │
│ • Target: Market Resale │   │   ministic Quantity     │   │   Rear>=8%, Side>=8%    │
│   Valuation (₹ Lakhs)   │   │   Takeoff (No ML)       │   │ • Geometry: Pairwise    │
│ • Dataset: 29,451 Real  │   │ • Output: Itemized BoQ  │   │   disjoint rooms        │
│   Pan-India Kaggle      │   │   (Civil, Masonry,      │   │ • Livability: Room min. │
│   Aggregator Records    │   │   Finishes, MEP)        │   │   areas & aspect ratios │
│ • Model: HistGradient-  │   │ • Integrity: 100%       │   │ • Output: Live 0-100    │
│   Boosting (R²=0.85)    │   │   auditable formulas    │   │   compliance score      │
└─────────────────────────┘   └─────────────────────────┘   └─────────────────────────┘
                                          │
                                          ▼
                      ┌───────────────────────────────────────┐
                      │    GENAI REQUIREMENTS PARSER          │
                      ├───────────────────────────────────────┤
                      │ • Schema: Pydantic house requirements │
                      │ • Gate: Pre-inference physical bounds │
                      │ • Security: XSS & injection sanitizer │
                      │ • Fallback: Offline rule engine       │
                      └───────────────────────────────────────┘
```

---

## 2. Machine Learning Data Pipeline

### 2.1 Dataset Provenance & Selection
- **Dataset**: Kaggle *House Price Prediction Challenge* (`anmol4210/house-price-prediction-challenge`)
- **Raw Volume**: 29,451 real pan-India property records across 25+ metro and tier-1/2 cities.
- **Data Hygiene**: Deduplicated 401 duplicates, removed commercial/atypical rows, filtered extreme non-residential boundaries ($150 \le \text{sq.ft} \le 12,000$).
- **Clean Retention**: 28,835 validated residential records (**97.91% retention**).

### 2.2 Feature Engineering (41 Features)
1. **Numerical & Log Transforms**: `log_square_ft = log(square_ft)`, `log_bhk = log(bhk + 1)`
2. **Spaciousness Metric**: $\text{sqft\_per\_bhk} = \frac{\text{square\_ft}}{\text{bhk}}$
3. **Geospatial Coordinates**: Standardized `LONGITUDE` and `LATITUDE` with median-imputed regional centroids.
4. **Top-25 City Categorical Encodings**: One-Hot Encoded major Indian urban hubs (`Bangalore`, `Mumbai`, `Pune`, `Noida`, `Hyderabad`, `Chennai`, `Kolkata`, `Jaipur`, `Delhi`, etc.).
5. **Listing & Legal Signals**: `POSTED_BY` (Owner, Dealer, Builder), `RERA` approved flag, `UNDER_CONSTRUCTION`, `RESALE`.

### 2.3 Split Methodology (Zero Leakage)
- **Train Split (70%)**: 20,184 property records.
- **Validation Split (15%)**: 4,325 property records.
- **Test Holdout Split (15%)**: 4,326 property records (strictly locked during hyperparameter optimization).

---

## 3. Model Tournament & Evaluation

### 3.1 Validation Benchmark

| Model Candidate | Validation MAE (₹ Lakhs) | Validation $R^2$ | Log-Scale $R^2$ | Validation MAPE | Selection Verdict |
|---|---|---|---|---|---|
| **L2 Ridge Baseline** | ₹34.30 L | 0.6033 | 0.6412 | 34.20% | Underfitting baseline |
| **Random Forest Regressor** | ₹24.72 L | 0.7854 | 0.8310 | 25.10% | Strong, high memory footprint |
| **HistGradientBoostingRegressor** | **₹24.24 L** | **0.8114** | **0.8635** | **23.36%** | **WINNER (Selected for Prod)** |

### 3.2 Unlocked Test Set Performance (4,326 Records)
- **Test MAE**: ₹26.83 Lakhs
- **Test Log-$R^2$**: **0.8492**
- **Test Median APE (MdAPE)**: **17.82%**
- **Test MAPE**: **24.74%**
- **Inference CPU Latency**: **0.392 ms / sample** (sub-millisecond throughput)

---

## 4. Deterministic Civil Engineering Engine (CPWD DSR 2024)

Physical construction cost is strictly isolated from property market price:
- **Base Schedules**: CPWD Delhi Schedule of Rates (DSR 2024–2026).
- **Finishing Tiers**:
  - *Basic*: ₹1,200 / sq.ft (Red brick, vitrified tiles, flush doors)
  - *Standard*: ₹1,800 / sq.ft (AAC blocks, Fe550D TMT, glazed vitrified, UPVC windows)
  - *Premium*: ₹2,800 / sq.ft (Granite, premium emulsion, teakwood, sound-insulated glazing)
  - *Luxury*: ₹4,500 / sq.ft (Italian marble, smart home automation, bespoke joinery)
- **Soil Multipliers**: Hard Rock (0.95), Sandy Loam (1.00), Soft Clay (1.10), Black Cotton (1.20).
- **Seismic Hazard Factors (IS 1893:2016)**: Zone II (1.00), Zone III (1.03), Zone IV (1.08), Zone V (1.15).

---

## 5. NBC 2016 Engineering Gate & ML Floor-Plan Intelligence

The floor-plan system employs a multi-stage hybrid intelligence pipeline:

### 5.1 Multi-Candidate Generation & NBC 2016 Clearance Gate
1. **Procedural Geometry Generator**: Synthesizes diverse candidate architectural topologies:
   - Variant 0: *Vastu-Aligned Classic*
   - Variant 1: *Modern Open-Plan Living*
   - Variant 2: *Linear High-Efficiency Circulation*
2. **Deterministic Engineering Constraint Verification Gate (`verify_nbc_compliance()`)**:
   - Setback Envelopes: Front $\ge 10\%$ ($\ge 3.0\text{ ft}$), Rear $\ge 8\%$ ($\ge 2.5\text{ ft}$), Side $\ge 8\%$ ($\ge 2.0\text{ ft}$).
   - Zero-Overlap Collision Detector: Pairwise room boundary intersection $R_i \cap R_j = \emptyset$ with $0.3\text{ ft}$ shared wall tolerance.
   - Habitable Livability Norms (Part 3 Clause 4.2): Living $\ge 130\text{ sq.ft}$, Master $\ge 110\text{ sq.ft}$, Bed $\ge 90\text{ sq.ft}$, Kitchen $\ge 50\text{ sq.ft}$, Bath $\ge 25\text{ sq.ft}$.
   - **Candidate Rejection**: Any candidate with collisions or boundary breaches is disqualified and rejected from recommendation rankings.

### 5.2 Machine Learning Layout Quality Ranker (`ml/planner/layout_ranker.py`)
Valid candidates that clear the NBC gate are evaluated by a trained `HistGradientBoostingRegressor` model:
- **Spatial Graph Features (`ml/planner/spatial_features.py`)**:
  1. `circulation_efficiency`: Carpet-to-circulation area utilization ratio
  2. `daylight_exposure_factor`: NBC Part 8 external perimeter wall contact ratio
  3. `aspect_ratio_quality`: Neufert standard room aspect ratio adherence ($1.1 \le \frac{L}{W} \le 1.5$)
  4. `zoning_privacy_score`: Euclidean centroid distance separating public reception from private sleeping zones
  5. `service_clustering_index`: Adjacency and compactness of wet-wall plumbing cores (kitchen/bath)
  6. `vastu_orientation_score`: Cardinal quadrant alignment (NE Pooja, SE Kitchen, SW Master Bed)
- **Model Performance**:
  - Algorithm: Supervised `HistGradientBoostingRegressor` (Scikit-Learn)
  - Validation $R^2$ Score: **0.9380**
  - Validation MAE: **1.16 points** (on 0–100 livability scale)
  - Inference Latency: **< 1.0 ms CPU**
- **Ranking Output**: Sorts valid candidates with Rank #1 as the primary recommendation, displaying explainable sub-scores in the 2D CAD Blueprint Studio.

---

## 6. MLOps, Integrity & Cryptographic Security

### 6.1 Cryptographic Artifact Manifest (`manifest.json`)
All production model artifacts are cryptographically registered with SHA256 checksums and file sizes:
1. `property_price_regressor_v1.joblib`: `10b8a92acc124df39d1f24f9e7fccf5208ae06a8c96acceee1b8bc93491267fb` (955,383 bytes)
2. `property_preprocessor_v1.joblib`: `c2fe596f2848703892d8404d0605eb186c26b12e0ff3f041fca1bb001f3bfe8a` (4,816 bytes)
3. `layout_quality_ranker_v1.joblib`: `ca348fc713a998a8e8a9e84c561d68d5e9d2188d66817617cce4e1db6a523049` (74,013 bytes)
4. `layout_ranker_preprocessor_v1.joblib`: `f6a4f56e6aa7b68837433b30e2097912fffc7fa94e739fcd7767db93f92ec3d1` (936 bytes)

### 6.2 Boot-Time Verification & Tamper Detection
`MLInferenceService` and test suites verify disk files against `manifest.json`. Any modified byte, file missing, or hash discrepancy triggers `status: "INTEGRITY_MISMATCH"` and rejects inference.

### 6.3 Security Hardening (`ml/security.py`)
- **Sliding-Window IP Rate Limiter**: 120 req/min for ML endpoints; 60 req/min for LLM parser. Returns HTTP 429 with `Retry-After: 60`.
- **Numeric Bounds Validation**: Validates $50 \le \text{sqft} \le 500,000$, $10 \le \text{width} \le 500$, $15 \le \text{length} \le 1,000$, $1 \le \text{bhk} \le 12$, $1 \le \text{floors} \le 10$. Rejects negative, NaN, and infinite inputs with HTTP 400.
- **XSS & HTML Stripping**: Drops `<script>...</script>` and `<style>...</style>` blocks with inner contents; escapes all special characters.
- **Prompt Injection Defense**: Neutralizes jailbreaks (*"ignore previous instructions"*, *"system prompt override"*, *"drop database"*) into `[FILTERED]`.

---

## 7. Production API Endpoints

| Method | Endpoint | Description | Engine |
|---|---|---|---|
| `GET` | `/api/ml/health` | Service uptime, latency telemetry, and SHA256 integrity status | MLOps |
| `GET` | `/api/ml/metadata` | 41-feature manifest, training timestamp, validation metrics | MLOps |
| `POST` | `/api/ml/predict-property-price` | Predicts residential capital market valuation & ₹/sq.ft | Kaggle ML Regressor |
| `POST` | `/api/ml/calculate-construction-cost` | Calculates itemized physical construction cost & BoQ | CPWD DSR 2024 |
| `POST` | `/api/ml/predict` | Returns unified ML valuation + CPWD BoQ + equity margin | Hybrid |
| `POST` | `/api/ml/parse-requirements` | Conversational NLP parser with NBC physical bounds gate | Pydantic LLM Gate |
| `POST` | `/api/ml/hybrid-plan` | Evaluates candidates, validates NBC gate, ranks via ML Layout Quality | Hybrid Architectural |

---

## 8. Verification & Test Suite Summary

The repository includes automated unit, integration, and security tests:

```
Ran 41 tests in 9.380s — OK (100% pass rate)
```

### Breakdown of Test Modules:
1. `tests/test_kaggle_pipeline.py`: Real Kaggle dataset loading, cleaning, deduplication, feature engineering, and split verification.
2. `tests/test_ml_pipeline.py`: Pipeline reproducibility, preprocessor ColumnTransformer, and feature schema.
3. `tests/test_ml_api.py`: REST endpoints, valuation drivers, confidence intervals, CPWD BoQ formulas, and OOD fallback logic.
4. `tests/test_llm_parser.py`: Pydantic schema validation, NBC physical bounds gate, aspect ratio checks, and offline fallback.
5. `tests/test_hybrid_planner.py`: NBC setbacks, pairwise zero room overlap collisions, architectural variant diversity, and full endpoint integration.
6. `tests/test_layout_ranker.py`: Spatial graph feature computation, candidate layout ranking, NBC constraint rejection gate, and API integration.
7. `tests/test_mlops_integrity.py`: SHA256 checksum validation, manifest conformity across all 4 artifacts, boot integrity, and tamper simulation detection.
8. `tests/test_security_hardening.py`: Boundary checking, NaN/negative rejection, XSS stripping, prompt injection defense, and IP rate limiting.
