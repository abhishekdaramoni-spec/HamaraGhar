# HamaraGhar — Production Repository Cleanup & Verification Report

**Date**: September 24, 2026  
**Repository**: `https://github.com/abhishekdaramoni-spec/HamaraGhar`  
**Branch**: `main`  
**Commit Action**: `chore: clean and finalize production repository`  
**Execution Environment**: Python 3.14.0 / Scikit-Learn 1.8.0 / Vercel Serverless WSGI  

---

## 1. Executive Summary

A comprehensive repository audit, cleanup, and verification has been executed on the HamaraGhar codebase. The repository is now clean, recruiter-friendly, scientifically honest, free of obsolete synthetic files, and fully verified for both local development and Vercel serverless deployment.

### Key Achievements:
- **Obsolete Synthetic Files Retired**: Removed `floorplan_model_v1_legacy.joblib` (605 KB duplicate) and `demo_floorplans_legacy.json` (908 KB synthetic data).
- **Data Provenance Preserved**: Verified all 500 genuine CubiCasa5K vector records with physical `.txt` files on disk, cryptographic hashes in `source_manifest.csv`, and an automated verification script.
- **Scientific Honesty Enforced**: Transparently documented Experiment A (100% rule reconstruction) versus Experiment B (86.67% Logistic Regression / 88.00% Random Forest on pure geometry without leakage).
- **Documentation Restructured**: Moved 12 historical forensic audits into `docs/archive/`; established `docs/ARCHITECTURE.md`, `docs/VIVA.md`, and canonical model cards in `ml/`.
- **Zero Regressions**: All 55 automated tests pass in 4.8 seconds; all routes verified locally and under Vercel path rewriting.

---

## 2. Summary of Cleanup Actions

| Action | Target Files / Paths | Rationale / Result |
| :--- | :--- | :--- |
| **Delete Obsolete Artifact** | `ml/artifacts/floorplan_model_v1_legacy.joblib` | Obsolete duplicate synthetic model retired from git tracking |
| **Delete Obsolete Dataset** | `ml/floorplan/data/demo_floorplans_legacy.json` | 908 KB legacy synthetic data eliminated; only verified real CubiCasa5K data kept |
| **Update Dataset Loader** | `ml/floorplan/dataset.py` | Removed fallback to legacy synthetic data; strictly requires real benchmark |
| **Fix Deprecated API** | `ml/floorplan/data/download_and_verify_sources.py` | Replaced `pd.Timestamp.utcnow()` with `pd.Timestamp.now('UTC')` |
| **Archive Historical Audits** | 12 markdown reports -> `docs/archive/` | Cleaned root namespace while preserving complete audit history |
| **Standardize Core Docs** | `HAMARAGHAR_FINAL_ARCHITECTURE.md` -> `docs/ARCHITECTURE.md`<br>`HAMARAGHAR_VIVA.md` -> `docs/VIVA.md` | Standard professional documentation paths |
| **Update Model Card** | `ml/floorplan/model_card.md` | Documented Experiment A vs Experiment B dual-benchmark results |
| **Update README** | `README.md` | Aligned with 17 architectural features, 4 typologies, honest metrics, and doc links |
| **Harden Git Ignore** | `.gitignore` | Added `.sqlite`, `.pytest_cache`, `.coverage`, `.vercel`, `*.tmp` exclusions |
| **Create Audit Manifests** | `REPOSITORY_CLEANUP_AUDIT.md`<br>`FINAL_REPOSITORY_STRUCTURE.md`<br>`REPOSITORY_CLEANUP_REPORT.md` | Complete forensic audit, directory map, and executive summary |

---

## 3. Active Machine Learning Model Registry

| Model Name | Artifact File | Version | Size | Test Accuracy / Metric | Role |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CubiCasa5K Typology Classifier** | `ml/artifacts/floorplan_model_v2.joblib` | 2.0.0 | 2.8 KB | **86.67%** (Exp B) / **100%** (Exp A) | Floor-plan typology categorization |
| **Property Valuation Regressor** | `ml/artifacts/property_price_regressor_v1.joblib` | 1.0.0 | 955 KB | **MAE = ₹26.83L**, $R^2 = 0.849$ | Indian residential capital valuation |
| **Property Preprocessor** | `ml/artifacts/property_preprocessor_v1.joblib` | 1.0.0 | 4.8 KB | RobustScaler + OneHot Pipeline | Normalization of real estate features |
| **Layout Quality Ranker** | `ml/artifacts/layout_quality_ranker_v1.joblib` | 1.0.0 | 560 KB | $R^2 = 0.938$, MAE = 1.16 | Livability scoring of candidate layouts |
| **Layout Preprocessor** | `ml/artifacts/layout_ranker_preprocessor_v1.joblib` | 1.0.0 | 1.3 KB | StandardScaler Pipeline | Layout feature scaling |
| **Legacy Benchmark (Isolated)** | `ml/artifacts/floorplan_model_v1.joblib` | 1.0.0 | 605 KB | Isolated Demo Only | Preserved for baseline comparisons |

---

## 4. Verification & Validation Summary

### 4.1 Automated Test Suite
```bash
python -m unittest discover -s tests -p "test_*.py"
Ran 55 tests in 4.832s
OK
```
- **Total Tests**: 55
- **Passed**: 55 (100%)
- **Failures / Errors**: 0

### 4.2 Dataset Provenance Verification
```bash
python ml/floorplan/data/download_and_verify_sources.py
Total processed records in catalog: 500
Processed & verified: 500 / 500 files...
```
- **Verified Sources**: 500 physical files
- **Missing Files**: 0
- **Duplicate Hashes**: 0

### 4.3 Web Routing & Vercel Serverless
- `/` -> HTTP 200 OK (Landing page)
- `/login` -> HTTP 200 OK (Login form)
- `/register` -> HTTP 200 OK (Registration form)
- `/builder` -> HTTP 302 Redirect to `/login` (Protected)
- `/cost` -> HTTP 302 Redirect to `/login` (Protected)
- `/risk` -> HTTP 302 Redirect to `/login` (Protected)
- `/api/ml/health` -> HTTP 200 OK (`{"status": "healthy", "artifact_integrity": "VERIFIED"}`)
- Vercel WSGI path middleware verified rewriting `/api/index.py/register` -> `/register`.

---

## 5. Viva Defense Summary

| Question | Short Answer | Reference |
| :--- | :--- | :--- |
| **Did ML generate the floor plan?** | No. Floor plans are generated procedurally to guarantee topological validity; ML classifies typologies and scores manifold proximity. | `docs/VIVA.md` (Q3) |
| **Why did Experiment A have 100% accuracy?** | The 17-feature set included `bhk` and `room_count`, which are the exact variables used in the labeling decision rules. The model reconstructed the rules. | `docs/VIVA.md` (Q7) |
| **What does the model achieve without leakage?** | When evaluated on 7 pure geometric features without room counts (Experiment B), Logistic Regression achieves **86.67%** and Random Forest achieves **88.00%**. | `docs/ARCHITECTURE.md` |
| **Is the training data real?** | Yes. 500 physical vector coordinate files from the CubiCasa5K benchmark dataset are stored on disk with cryptographic SHA-256 hashes. | `docs/VIVA.md` (Q6) |
| **How are costs calculated?** | Deterministically using the official CPWD Delhi Schedule of Rates (DSR 2024) Bill of Quantities, completely decoupled from property market ML. | `docs/VIVA.md` (Q12) |

---

## 6. Final Recommendation & Sign-Off

The repository is fully verified, cleaned, and certified for production commit and remote push.
