# HamaraGhar — Final Verified Repository Structure

```
HamaraGhar/
├── .env.example                                # Safe environment variable template with placeholders
├── .gitignore                                  # Hardened Git ignore rules (virtualenvs, databases, cache)
├── app.py                                      # Primary Flask MVC application & API orchestrator
├── wsgi.py                                     # Local WSGI production entrypoint
├── requirements.txt                            # Pinned Python package dependencies
├── vercel.json                                 # Serverless configuration and static asset rewrites
├── README.md                                   # Production README, system architecture, & metrics
├── REPOSITORY_CLEANUP_AUDIT.md                 # 14-section comprehensive cleanup & forensic audit report
├── FINAL_REPOSITORY_STRUCTURE.md               # Repository map and file-level purpose inventory
├── REPOSITORY_CLEANUP_REPORT.md                # Executive cleanup summary and sign-off report
│
├── api/                                        # Vercel Serverless Hosting
│   └── index.py                                # WSGI adapter with VercelPathMiddleware for serverless
│
├── data/                                       # Domain Datasets & Rates
│   ├── cost_rates.json                         # CPWD DSR 2024 unit construction cost item catalog
│   ├── DATA_SOURCES.md                         # Attribution, licenses, and data dictionaries
│   ├── house_layouts.json                      # Procedural zone and layout templates
│   ├── location_risk.json                      # Indian municipal seismic and climate risk factors
│   └── materials.json                          # Material specifications and finishing tier rates
│
├── docs/                                       # Official Architectural & Academic Documentation
│   ├── ARCHITECTURE.md                         # End-to-end multi-tier system architecture specification
│   ├── VIVA.md                                 # 16-question B.Tech/M.Tech viva defense guide
│   └── archive/                                # Archived Forensic Audits & Trajectory Reports
│       ├── AUDIT_AIML_FLOORPLAN_ARCHITECTURE.md
│       ├── AUDIT_REPORT.md
│       ├── FINAL_ML_SCIENTIFIC_AUDIT.md
│       ├── FLOORPLAN_ML_DATA_PROVENANCE_AUDIT.md
│       ├── FLOORPLAN_ML_EVALUATION.md
│       ├── FLOORPLAN_ML_TASK_SELECTION.md
│       ├── FLOORPLAN_MODEL_CARD.md
│       ├── FLOOR_PLAN_DATA_FLOW_AUDIT.md
│       ├── HAMARAGHAR_AI_ML_ARCHITECTURE.md
│       ├── HAMARAGHAR_FINAL_FORENSIC_REPORT.md
│       ├── HAMARAGHAR_PLATFORM_REPORT.md
│       └── HAMARAGHAR_QA_REPORT.md
│
├── ml/                                         # Machine Learning Subsystems
│   ├── MODEL_CARD.md                           # Model card for property price regressor
│   ├── security.py                             # Path traversal protection and input sanitizers
│   │
│   ├── artifacts/                              # Serialized Model Binaries & Cryptographic Manifest
│   │   ├── archetype_classifier_v1.joblib      # Architectural archetype classification model
│   │   ├── cost_regressor_v1.joblib            # Empirical cost regression model
│   │   ├── floorplan_model_v1.joblib           # Isolated legacy prototype benchmark model
│   │   ├── floorplan_model_v2.joblib           # ACTIVE: CubiCasa5K Real Typology Classifier
│   │   ├── layout_quality_ranker_v1.joblib     # ACTIVE: Layout Quality & Livability Ranker
│   │   ├── layout_ranker_preprocessor_v1.joblib# Feature preprocessor for layout quality ranker
│   │   ├── manifest.json                       # Cryptographic SHA-256 manifest for MLOps integrity
│   │   ├── property_preprocessor_v1.joblib     # ColumnTransformer for property features
│   │   └── property_price_regressor_v1.joblib  # ACTIVE: HistGradientBoosting property regressor
│   │
│   ├── floorplan/                              # CubiCasa5K Real Floor-Plan Intelligence
│   │   ├── README.md                           # Floor-plan subsystem overview
│   │   ├── dataset.py                          # Verified CubiCasa5K dataset loader & leakage gate
│   │   ├── evaluate.py                         # Evaluation script for holdout partition metrics
│   │   ├── features.py                         # 17 physical architectural feature definitions
│   │   ├── inference.py                        # FloorPlanMLInferenceService singleton (<1ms SLA)
│   │   ├── model.py                            # Scikit-learn pipeline definitions (LogReg, RF)
│   │   ├── model_card.md                       # Canonical model card for floorplan_model_v2
│   │   ├── similarity.py                       # ArchitecturalManifoldEngine (vectorized proximity)
│   │   ├── svg_extractor.py                    # RealFloorPlanSVGExtractor (CAD & vector parser)
│   │   ├── train.py                            # Zero-leakage training script for floorplan model
│   │   └── data/                               # Benchmark Provenance & Vector Samples
│   │       ├── download_and_verify_sources.py  # Automated source download and hashing script
│   │       ├── processed_floorplans.json       # 500 verified real CubiCasa5K records
│   │       ├── provenance_report.json          # Machine-readable provenance verification results
│   │       ├── provenance_report.md            # Human-readable provenance audit report
│   │       ├── source_manifest.csv             # SHA-256 file hashes & geometry coordinate hashes
│   │       ├── split_manifest.csv              # Official 350 Train / 75 Val / 75 Test splits
│   │       ├── raw_cubicasa/                   # 500 physical .txt vector coordinate files
│   │       │   ├── train/                      # 350 training files
│   │       │   ├── val/                        # 75 validation files
│   │       │   └── test/                       # 75 locked holdout test files
│   │       └── raw_svg/                        # SVG reference samples
│   │
│   ├── inference/                              # Property Valuation Inference
│   │   ├── __init__.py
│   │   └── predictor.py                        # MLInferenceService for property valuation & CPWD BoQ
│   │
│   ├── llm/                                    # Natural Language Requirement Extraction
│   │   ├── __init__.py
│   │   ├── client.py                           # LLMRequirementService (Gemini + Offline fallback)
│   │   └── schema.py                           # Pydantic ParsedHouseRequirements & NBC code gate
│   │
│   ├── models/                                 # Training Scripts for Auxiliary Models
│   │   ├── __init__.py
│   │   ├── evaluate.py                         # Kaggle pipeline evaluation script
│   │   ├── train.py                            # Property valuation model training script
│   │   └── train_layout_ranker.py              # Layout quality ranker training script
│   │
│   └── planner/                                # Hybrid Spatial Planning & NBC Gate
│       ├── __init__.py
│       ├── hybrid_engine.py                    # Generates 3 variants + NBC 2016 engineering gate
│       ├── layout_ranker.py                    # Multi-factor ranking: NBC + ML + Vastu + Cost
│       └── spatial_features.py                 # Spatial geometry calculations and zoning metrics
│
├── public/static/                              # Static Asset Mirror for Vercel CDN Edge
│   ├── css/                                    # Design system, components, and page layouts
│   └── js/                                     # Three.js 3D builder, 2D floor-plan, risk engines
│
├── static/                                     # Local Flask Static Assets
│   ├── css/
│   │   ├── components.css                      # UI components (modals, cards, forms, buttons)
│   │   ├── design-system.css                   # Core tokens, color palettes, typography
│   │   └── pages.css                           # View-specific layout rules
│   └── js/
│       ├── builder/                            # Three.js 3D building visualization & camera controls
│       ├── core/                               # API client, utility functions, AI chat widget
│       ├── data/                               # Client-side CPWD cost, risk, and NBC rule engines
│       ├── pages/                              # Page-specific controllers (dashboard, builder, cost)
│       └── planner/                            # HTML5 Canvas 2D vector CAD plan renderer
│
├── templates/                                  # Jinja2 Server-Rendered HTML Templates
│   ├── base.html                               # Master layout with navigation header & footer
│   ├── builder.html                            # Interactive 3D house builder workspace
│   ├── cost.html                               # Itemized CPWD DSR 2024 construction cost breakdown
│   ├── dashboard.html                          # User project dashboard and saved configurations
│   ├── data-sources.html                       # Dataset documentation, licenses, and benchmarks
│   ├── floor-plan.html                         # 2D interactive CAD floor-plan viewer & editor
│   ├── interior.html                           # Room-level interior layout & furniture staging
│   ├── landing.html                            # Public landing page with hero 3D canvas
│   ├── login.html                              # User authentication login view
│   ├── register.html                           # User registration view
│   ├── requirements.html                       # Natural language & structured requirement input
│   ├── risk.html                               # Seismic, wind, flood, and climatic risk assessment
│   └── summary.html                            # Executive summary, PDF export, and BoQ report
│
└── tests/                                      # Automated Regression & Verification Suite (55 Tests)
    ├── test_end_to_end_pipeline.py             # Full prompt-to-layout-to-cost integration tests
    ├── test_hybrid_planner.py                  # NBC 2016 safety gate & room overlap validation
    ├── test_kaggle_pipeline.py                 # Kaggle property valuation ML pipeline tests
    ├── test_layout_ranker.py                   # Layout ranking algorithm & weight tests
    ├── test_llm_parser.py                      # Pydantic schema validation & regex mock parser tests
    ├── test_ml_api.py                          # Flask REST API endpoints & payload validation tests
    ├── test_ml_pipeline.py                     # ML inference service & preprocessor tests
    ├── test_mlops_integrity.py                 # Cryptographic SHA-256 hash & manifest integrity tests
    ├── test_project_specific_generation.py     # Multi-BHK scaling & duplex floor generation tests
    ├── test_real_floorplan_ml.py               # CubiCasa5K dataset, leakage gate, & latency tests
    └── test_security_hardening.py              # Path traversal, session auth, & IDOR security tests
```
