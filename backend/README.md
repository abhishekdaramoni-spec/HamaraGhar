# HamaraGhar — Backend Architecture & Services

The backend encapsulates all application logic, AI/ML intelligence, architectural procedural generation, engineering verification gates, property valuation, CPWD civil quantity takeoff, and database persistence.

---

## 1. Directory Structure

```
backend/
├── api/                       # API blueprints and endpoint controllers
├── routes/                    # Route handlers (auth, projects, data, pages)
├── controllers/               # Request handling controllers
├── services/                  # Business logic services
│
├── ai/
│   └── genai/                 # Gemini LLM client, Pydantic prompt schemas & constraint validation
│
├── ml/
│   ├── floorplan/             # 500 genuine CubiCasa5K dataset records, features, inference, manifold similarity
│   ├── valuation/             # Kaggle pan-India property valuation model & pipeline
│   ├── inference/             # Inference service coordinators
│   └── artifacts/             # Serialized joblib models, scalers, and provenance manifests
│
├── architecture/
│   ├── generator/             # Topology-aware candidate generator (Plan A, B, C, D)
│   ├── constraints/           # Spatial features & physical bounding constraints
│   ├── nbc/                   # NBC 2016 Part 3 engineering clearance gate
│   ├── topology/              # Structural adjacency graph & centroid duplicate detector
│   └── cubicasa/              # CubiCasa5K empirical reference retriever
│
├── cost/
│   └── cpwd/                  # CPWD DSR quantity takeoff BoQ engine & rates
│
├── database/                  # SQLAlchemy setup & database instances
├── models/                    # User, Project, HouseModel schemas
├── validators/                # Input bounds validation, text sanitization, rate limiting
├── config/                    # Environment loading, CORS, configuration mapping
├── docs/                      # Architectural audits, forensic reports, data provenance
├── tests/                     # 12 test suites (59 unit and regression tests)
├── app.py                     # Primary Flask REST API server
├── requirements.txt           # Python dependencies
└── README.md                  # This documentation
```

---

## 2. API Contract Overview

All endpoints accept and return JSON with standard HTTP status codes.

### Planning & AI/ML Endpoints
- **`POST /api/ml/hybrid-plan`**: Generates 3+ diverse architectural candidates adapted from CubiCasa5K spatial references, verified against NBC 2016 setbacks and pairwise overlap constraints.
- **`POST /api/ml/parse-requirements`**: Natural language requirement parser extracting structured specifications.
- **`POST /api/ml/predict-property-price`**: Predicts market capital valuation based on 29,451 Kaggle pan-India transactions.
- **`POST /api/ml/calculate-construction-cost`**: Computes itemized civil Bill of Quantities using CPWD DSR 2024 schedules.
- **`GET /api/ml/health`**: Health check reporting model versions, memory status, and inference availability.

### Project & Data Endpoints
- **`GET /api/projects`**: Retrieves authenticated user's projects.
- **`POST /api/projects`**: Creates a new project with canonical `HouseModel`.
- **`GET /api/projects/<id>`**: Retrieves single project.
- **`PUT /api/projects/<id>`**: Updates project configuration or layout.
- **`DELETE /api/projects/<id>`**: Removes project.
- **`GET /api/data/materials`**: CPWD material rate card.
- **`GET /api/data/cost-rates`**: Civil construction cost baseline rates.
- **`GET /api/data/risk/<city>`**: Location-based seismic and flood hazard profile.

---

## 3. Running the Backend

### Local Development
```bash
cd backend
pip install -r requirements.txt
python app.py
```
Server starts on `http://127.0.0.1:5000` with CORS enabled for frontend origins (`http://localhost:3000`, `http://localhost:5173`).

### Running Tests
```bash
cd backend
python -m unittest discover -s tests -p "test_*.py"
```
All 59 unit and regression tests will execute.
