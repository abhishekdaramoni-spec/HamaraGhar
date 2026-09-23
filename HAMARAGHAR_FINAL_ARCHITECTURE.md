# HamaraGhar — Production AI/ML & Engineering Architecture

## 1. Executive Summary & Design Philosophy

**HamaraGhar** is an AI-assisted residential planning, engineering, and valuation platform for Indian housing. The platform is designed around strict separation of concerns, scientific rigor, and engineering defensibility:

1. **AI is never conflated with ML**, and **ML is never conflated with procedural algorithms**.
2. **Generative AI** is strictly confined to unstructured human intent comprehension (semantic parsing and entity extraction).
3. **Machine Learning** is applied strictly where empirical training data exists:
   - **Floor-Plan Typology Classification & Manifold Proximity**: Trained on 500 physical vector floor plans from the benchmark **CubiCasa5K** dataset.
   - **Property Valuation**: Trained on 29,451 real residential transactions from the Indian housing market (via Kaggle Indian Real Estate dataset).
4. **Candidate Generation & Layout Geometry** are governed by **deterministic, project-specific procedural algorithms** parameterized by plot dimensions, BHK configuration, setbacks, and room specifications.
5. **Structural & Life-Safety Compliance** is enforced by an immutable **NBC 2016 (National Building Code of India)** engineering validation gate.
6. **Construction Costing & Quantities** are calculated via a deterministic **CPWD DSR 2024 (Central Public Works Department Delhi Schedule of Rates)** itemized Bill of Quantities (BoQ) engine.

---

## 2. End-to-End System Pipeline

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

## 3. Strict Taxonomy of System Subsystems

To prevent misrepresentation during scientific review and technical viva, every subsystem is categorized according to its true engineering nature:

| Subsystem Component | Category | Underlying Technology / Method | Inputs | Outputs |
| :--- | :--- | :--- | :--- | :--- |
| **Natural Language Requirement Parsing** | **Generative AI** | LLM (`google-genai` / Gemini 1.5/2.0 Flash) with deterministic regex-heuristic fallback | Free-form natural language text from homeowner | Structured JSON conforming to strict Pydantic requirements schema |
| **Floor-Plan Typology Classification** | **Machine Learning** | Multinomial Logistic Regression (`floorplan_model_v2.joblib`), L2 Regularized, StandardScaler | 8 physical vector layout features (`total_area_sqm`, `aspect_ratio`, `room_count`, etc.) | Typology class (`1BHK`, `2BHK`, `3BHK`, `4BHK_PLUS`) + probability distribution |
| **Empirical Manifold Proximity Engine** | **Machine Learning (Instance-Based Retrieval)** | Vectorized Euclidean distance matrix search over normalized CubiCasa5K training vectors | 8D vector of candidate floor plan | Proximity score \([0, 1]\), closest benchmark sample ID, nearest real vector metrics |
| **Candidate Floor-Plan Generation** | **Algorithmic (Procedural)** | Deterministic geometric space allocation algorithms with parameterized zone slicing | Plot width, plot length, setbacks, BHK type, room specs | 3 distinct candidate floor plan geometries (coordinates, rooms, doors, windows) |
| **Building Code Compliance Gate** | **Deterministic Engineering** | Hard boundary constraint verification against NBC 2016 Part 3 | Room coordinates, dimensions, window areas, plot boundaries | Pass/Fail boolean, detailed violation list, compliance index |
| **Property Market Valuation** | **Machine Learning** | `HistGradientBoostingRegressor` trained on 29,451 Indian real estate transactions | City, locality, BHK, total square feet, floor level, parking | Estimated fair market value (₹) + confidence interval |
| **Construction Cost Estimator** | **Deterministic Engineering** | CPWD DSR 2024 itemized material takeoffs and Schedule of Rates | Built-up area, foundation depth, finishes, structural spec | Itemized Bill of Quantities (BoQ) with civil, MEP, and finishes breakdown |
| **2D & 3D Interactive Visualization** | **Computer Graphics / Visualization** | HTML5 Canvas 2D CAD renderer & Three.js WebGL 3D rendering pipeline | Room polygons, wall thicknesses, door/window openings, textures | Interactive CAD canvas, orbitable 3D walk-through model |

---

## 4. Detailed Component Specifications

### 4.1 Generative AI: Requirement Extraction
- **Role**: Translates ambiguous human desires into an unambiguous specification.
- **Implementation**: `ml/llm/client.py` uses Google GenAI SDK. If API keys are absent or network is unavailable, an offline heuristic regex extractor activates seamlessly.
- **Boundary**: GenAI does **NOT** generate floor-plan coordinates, walls, CAD paths, or cost numbers.

### 4.2 Procedural Candidate Generation
- **Role**: Synthesizes physically coherent spatial geometries adapted to the user's specific plot constraints and BHK requirements.
- **Variants Generated**:
  1. *Balanced Variant*: Optimal circulation, central living hall, separated sleeping zones.
  2. *Compact / Space-Saver Variant*: Reduced hallways, maximized carpet-to-built-up ratio.
  3. *Luxury / Open-Concept Variant*: Extended living-dining volume, larger bedrooms with en-suite bathrooms, master walk-in wardrobe.
- **Multi-Level Support**: In multi-floor duplex projects (e.g. 4BHK duplex, 5BHK duplex), automatically synthesizes upper-floor geometry including staircase circulation voids and upper bedrooms (e.g., 14 distinct functional rooms across 2 levels for 5BHK).

### 4.3 NBC 2016 Engineering Gate
- **Role**: Non-negotiable architectural rule verification.
- **Standards Enforced**:
  - Habitability: Minimum room area (Master bedroom \(\ge 9.5\,\text{m}^2\), Kitchen \(\ge 5.0\,\text{m}^2\), Bathrooms \(\ge 1.8\,\text{m}^2\)).
  - Minimum room dimensions: Widths \(\ge 2.4\,\text{m}\) for habitable rooms.
  - Natural Lighting & Ventilation: Window opening area \(\ge 10\%\) of floor area.
  - Setbacks & Margins: Rear, front, and side open spaces strictly validated against road width.
- **Fail Action**: If any candidate violates an NBC hard safety constraint, it is disqualified or flagged with critical compliance warnings.

### 4.4 Real Floor-Plan ML Subsystem
- **Dataset**: 500 physical vector `.txt` coordinate files directly extracted from the CubiCasa5K benchmark dataset stored in `ml/floorplan/data/raw_cubicasa/` and hashed with SHA-256.
- **Feature Pipeline**:
  - `total_area_sqm`: Total built-up boundary area.
  - `aspect_ratio`: Length-to-width ratio of bounding envelope.
  - `room_count`: Total number of distinct functional rooms.
  - `habitable_room_count`: Number of bedrooms, living, and dining rooms.
  - `service_room_count`: Number of kitchens, bathrooms, and utility areas.
  - `habitable_to_service_ratio`: Ratio of living space to service infrastructure.
  - `average_room_area`: Mean room size in square meters.
  - `room_area_variance`: Standard deviation / variance of individual room sizes.
- **Target Variable**: Empirical Typology Label (`1BHK`, `2BHK`, `3BHK`, `4BHK_PLUS`).
- **No Target Leakage**: The obsolete synthetic formula `spatial_viability_score = 0.25 * x1 + ...` was removed. The dataset module enforces zero target leakage via `check_target_leakage()`.
- **Inference SLA**: Average inference latency of **0.016 ms** (Multinomial Logistic Regression with L2 penalty), well within real-time web response limits.

### 4.5 Empirical Manifold Retrieval Engine
- **Role**: Measures how closely a procedurally generated candidate resembles real-world residential architecture documented in architectural literature.
- **Method**: Standardizes the candidate's 8D feature vector using training set parameters (\(\mu, \sigma\)) and computes the Euclidean distance:
  \[
  d(\mathbf{x}, \mathbf{x}_i) = \sqrt{\sum_{k=1}^8 \left(\frac{x_k - \mu_k}{\sigma_k} - \frac{x_{i,k} - \mu_k}{\sigma_k}\right)^2}
  \]
- **Proximity Metric**:
  \[
  \text{Manifold Proximity} = \frac{1}{1 + \min_i d(\mathbf{x}, \mathbf{x}_i)} \in (0, 1]
  \]
- **Traceability**: Returns the exact CubiCasa5K `source_id` (e.g. `cc5k_0142`) of the nearest real layout, allowing complete transparency and visual comparison.

### 4.6 Dual Economic Layer
- **Property Valuation ML**: Employs `HistGradientBoostingRegressor` trained on 29,451 records from the Indian housing market to output expected market valuation in Lakhs/Crores based on geospatial and dimensional features.
- **Construction Cost BoQ**: Employs CPWD DSR 2024 unit costs for RCC structure, brickwork/AAC, flooring, plumbing, electrical, and finishing to deliver an itemized Bill of Quantities.
