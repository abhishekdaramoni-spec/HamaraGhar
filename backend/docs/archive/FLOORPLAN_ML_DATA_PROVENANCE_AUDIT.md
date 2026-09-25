# Forensic Audit of Floor-Plan ML Implementation & Data Provenance

**Audit Date**: September 22, 2026  
**Subject**: HamaraGhar Floor-Plan AI/ML Subsystem (`ml/floorplan/`, `ml/floorplan/data/real_floorplans.json`)  
**Investigator**: DeepMind Antigravity Forensic Engineering  
**Scope**: Verification of the claim *"1,200 real residential floor-plan benchmark records from CubiCasa5K"*, target label provenance, feature leakage, baseline comparisons, and statistical defensibility.

---

## 1. Dataset Provenance Classification

An inspection of `ml/floorplan/data/real_floorplans.json` and the generative script (`scratch/create_floorplan_pkg.py`, lines 76–198) was conducted to determine the physical origin of the 1,200 records.

| Category | Description | Exact Count |
| :--- | :--- | :--- |
| **A** | Actual original CubiCasa5K floor plan (raw SVG/raster) | **0** |
| **B** | Transformed representation of an actual CubiCasa5K floor plan (extracted from real SVGs) | **0** |
| **C** | Statistically generated/constructed record based on CubiCasa5K distributions | **1,200** |
| **D** | Manually created record | **0** |
| **E** | Synthetic record | **1,200** (overlapping with C) |
| **F** | Unknown provenance | **0** |

### Detailed Finding:
Every record in `real_floorplans.json` was generated programmatically in Python using:
```python
np.random.seed(42)
n_samples = 1200
for i in range(n_samples):
    pid = f"CC5K_{i+1:04d}"
    typo = int(np.random.choice(typologies, p=typo_probs))
    ...
    width = round(float(np.random.uniform(...)), 1)
    length = round(float(np.random.uniform(...)), 1)
```
No original CubiCasa5K vector SVG files or raster floor-plan images were parsed, transformed, or ingested into this file. The dataset consists of **1,200 pseudo-randomly sampled synthetic vectors constrained within empirical heuristic intervals**.

---

## 2. Trace Record IDs

A random sample of 20 records was drawn from `ml/floorplan/data/real_floorplans.json` and traced against the official CubiCasa5K schema and repository:

| Local Record ID | Source Field in JSON | Source Identifier | Original Dataset File | Original Floor Plan Trace |
| :--- | :--- | :--- | :--- | :--- |
| `CC5K_1093` | CubiCasa5K Benchmark (CC BY 4.0) | None | None | **Cannot establish one-to-one provenance.** |
| `CC5K_0750` | CubiCasa5K Benchmark (CC BY 4.0) | None | None | **Cannot establish one-to-one provenance.** |
| `CC5K_1170` | CubiCasa5K Benchmark (CC BY 4.0) | None | None | **Cannot establish one-to-one provenance.** |
| `CC5K_1200` | CubiCasa5K Benchmark (CC BY 4.0) | None | None | **Cannot establish one-to-one provenance.** |
| `CC5K_0340` | CubiCasa5K Benchmark (CC BY 4.0) | None | None | **Cannot establish one-to-one provenance.** |
| `CC5K_0682` | CubiCasa5K Benchmark (CC BY 4.0) | None | None | **Cannot establish one-to-one provenance.** |
| `CC5K_0786` | CubiCasa5K Benchmark (CC BY 4.0) | None | None | **Cannot establish one-to-one provenance.** |
| `CC5K_0737` | CubiCasa5K Benchmark (CC BY 4.0) | None | None | **Cannot establish one-to-one provenance.** |
| `CC5K_0631` | CubiCasa5K Benchmark (CC BY 4.0) | None | None | **Cannot establish one-to-one provenance.** |
| `CC5K_0802` | CubiCasa5K Benchmark (CC BY 4.0) | None | None | **Cannot establish one-to-one provenance.** |
| `CC5K_0420` | CubiCasa5K Benchmark (CC BY 4.0) | None | None | **Cannot establish one-to-one provenance.** |
| `CC5K_0748` | CubiCasa5K Benchmark (CC BY 4.0) | None | None | **Cannot establish one-to-one provenance.** |
| `CC5K_0224` | CubiCasa5K Benchmark (CC BY 4.0) | None | None | **Cannot establish one-to-one provenance.** |
| `CC5K_0872` | CubiCasa5K Benchmark (CC BY 4.0) | None | None | **Cannot establish one-to-one provenance.** |
| `CC5K_0817` | CubiCasa5K Benchmark (CC BY 4.0) | None | None | **Cannot establish one-to-one provenance.** |
| `CC5K_0134` | CubiCasa5K Benchmark (CC BY 4.0) | None | None | **Cannot establish one-to-one provenance.** |
| `CC5K_1036` | CubiCasa5K Benchmark (CC BY 4.0) | None | None | **Cannot establish one-to-one provenance.** |
| `CC5K_0713` | CubiCasa5K Benchmark (CC BY 4.0) | None | None | **Cannot establish one-to-one provenance.** |
| `CC5K_0827` | CubiCasa5K Benchmark (CC BY 4.0) | None | None | **Cannot establish one-to-one provenance.** |
| `CC5K_0637` | CubiCasa5K Benchmark (CC BY 4.0) | None | None | **Cannot establish one-to-one provenance.** |

In the official CubiCasa5K dataset, samples are indexed by folder paths (e.g., `high_quality_architectural/123/model.svg`). The identifier format `CC5K_xxxx` is synthetic and local to this repository.

---

## 3. Check the Training Target

The target variable `spatial_viability_score` was forensically analyzed to determine how it was created.

### Exact Construction Formula (from source code):
```python
circ_score = max(0.0, min(1.0, 1.0 - abs(circ_ratio - 0.12) / 0.15))
aspect_score = max(0.0, min(1.0, 1.0 - abs(aspect_ratio - 1.30) / 0.45))
wet_score = max(0.0, min(1.0, 1.0 - wet_core_dist))
carpet_score = max(0.0, min(1.0, (carpet_eff - 0.70) / 0.20))

viability_score = round(
    100.0 * (
        0.25 * daylight +
        0.20 * circ_score +
        0.20 * aspect_score +
        0.20 * carpet_score +
        0.15 * wet_score
    ),
    1
)
```

### Forensic Classification:
- Human annotated: **NO**
- Provided by original dataset: **NO**
- Derived from real architectural annotations: **NO**
- Manually assigned: **NO**
- Computed from the same 17 features: **YES**
- Generated using a weighted formula: **YES (deterministic piecewise-linear equation)**
- Otherwise constructed: **YES**

---

## 4. Check for Target Leakage

Every feature in the 17-dimensional input vector was audited against the target generation equation:

| # | Feature Name | Used to calculate target? | Leakage Risk | Details |
|---|:---|:---:|:---:|:---|
| 1 | `plot_width_ft` | No | None | Independent coordinate bound |
| 2 | `plot_length_ft` | No | None | Independent coordinate bound |
| 3 | `plot_aspect_ratio` | No | None | Ratio of width/length |
| 4 | `total_builtup_sqft` | No | None | Area scale |
| 5 | `total_carpet_sqft` | No | Low | Used only to derive `carpet_eff` |
| 6 | `carpet_efficiency` | **YES** | **CRITICAL** | Sub-component: `(carpet_eff - 0.70) / 0.20` (weight: 20%) |
| 7 | `bhk` | No | None | Integer room spec |
| 8 | `bathroom_count` | No | None | Integer room spec |
| 9 | `room_count` | No | None | Integer room spec |
| 10 | `living_area_sqft` | No | None | Component area |
| 11 | `kitchen_area_sqft` | No | None | Component area |
| 12 | `circulation_ratio` | **YES** | **CRITICAL** | Sub-component: `1.0 - abs(circ_ratio - 0.12)/0.15` (weight: 20%) |
| 13 | `daylight_perimeter_ratio`| **YES** | **CRITICAL** | Sub-component: `0.25 * daylight` (weight: 25%) |
| 14 | `avg_room_aspect_ratio` | **YES** | **CRITICAL** | Sub-component: `1.0 - abs(aspect_ratio - 1.30)/0.45` (weight: 20%) |
| 15 | `doors_count` | No | None | Count |
| 16 | `windows_count` | No | None | Count |
| 17 | `wet_core_distance_ratio` | **YES** | **CRITICAL** | Sub-component: `1.0 - wet_core_dist` (weight: 15%) |

### Explicit Finding:
Because:
$$	ext{target} = f(x_6, x_{12}, x_{13}, x_{14}, x_{17})$$
and:
$$	ext{model}: [x_1, \dots, x_{17}] ightarrow 	ext{target}$$
**The machine learning model is strictly learning to approximate the engineered scoring function rather than independently learning architectural quality from ground-truth data.**

---

## 5. Check Train / Validation / Test Independence

An audit was performed across the 840 Train / 180 Validation / 180 Test splits:
- **Duplicate feature vectors**: `0` exact duplicates.
- **Near-duplicate vectors** ($L_2$ distance $< 0.1$ standard deviations): `0` pairs.
- **Minimum pairwise distance across records**: `0.5255` standard deviations.
- **Cross-split leakage**: No identical feature vectors appear across splits.

### Independence Qualification:
While no identical records cross the split boundaries, **all records in train, validation, and test sets were drawn from the exact same pseudo-random parametric uniform distributions** (`np.random.seed(42)`). Therefore, the holdout test set tests interpolation across the synthetic distribution, rather than generalization to independent real floor plans.

---

## 6. Verification of $R^2 = 0.9865$

The production model `ml/artifacts/floorplan_model_v1.joblib` was evaluated on the locked holdout test set (records 1020–1200):

| Metric | Reported in Model Card / Docs | Freshly Reproduced from Scratch | Status |
| :--- | :--- | :--- | :--- |
| **$R^2$ Score** | `0.9865` | **`0.9961`** | **Verified (Extremely high)** |
| **MAE** | `0.76` points | **`0.3004`** points | **Verified** |
| **RMSE** | `1.21` points | **`0.5450`** points | **Verified** |

The freshly evaluated model achieves an even higher $R^2$ (0.9961) on the test split, confirming that the regression algorithm has fit the deterministic equation almost without error.

---

## 7. Baseline Model Comparison

To evaluate why $R^2$ is near 1.0, multiple baseline algorithms were trained on the exact same 840 train samples and evaluated on the 180 test samples:

| Model Architecture | Test $R^2$ | Test MAE | Test RMSE | Explanation |
| :--- | :---: | :---: | :---: | :--- |
| **Mean Predictor (Dummy)** | `-0.0060` | `7.1840` | `8.7128` | Null baseline |
| **Linear Regression** | **`0.9117`** | `1.9971` | `2.5819` | Standard linear fit captures >91% variance |
| **Ridge Regression ($lpha=1.0$)** | **`0.9125`** | `1.9914` | `2.5690` | Identical to OLS |
| **Random Forest ($n=100$)** | **`0.9729`** | `1.1179` | `1.4295` | Captures piece-wise step thresholds |
| **HistGradientBoosting** | **`0.9885`** | `0.6940` | `0.9325` | Gradient boosted trees fit piece-wise linear function |

### Why Simple Linear Regression Obtains $R^2 > 0.91$:
The target formula is a weighted sum of 5 input features with simple linear clamping $\max(0, \min(1, \cdot))$. Because the features were sampled within ranges where the clamping rarely saturates at 0, the target is effectively a linear combination:
$$	ext{Score} pprox 25 f_{daylight} - 133.3 f_{circ} - 44.4 f_{aspect} + 100 f_{carpet} - 15 f_{wet} + C$$
A simple ordinary least squares linear regression without any interactions or tree structures captures over 91.1% of the variance immediately.

---

## 8. Ablation Study: Proving Formula Reproduction

An ablation experiment was executed by retraining `HistGradientBoostingRegressor` on varying subsets of features:

| Experiment | Feature Set | Feature Count | Test $R^2$ | Test MAE | Test RMSE |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **A. Full Baseline** | All 17 features | 17 | **`0.9885`** | **`0.6940`** | **`0.9325`** |
| **B. Remove Target Features** | Non-target features only | 12 | **`0.6513`** | **`4.1734`** | **`5.1295`** |
| **C. Raw Geometry Only** | Width, length, aspect, areas, BHK, rooms | 8 | **`0.6782`** | **`3.9125`** | **`4.9280`** |
| **D. Non-Derived Features** | Exclude 5 formula inputs | 12 | **`0.6513`** | **`4.1734`** | **`5.1295`** |

### Critical Scientific Conclusion:
When the 5 formula input features are removed, the model's predictive capability collapses (MAE increases by **601%** from 0.69 to 4.17). The residual $R^2 pprox 0.65$ in Experiment B/C exists solely because the synthetic data generator used distinct uniform sampling boundaries for different typologies (e.g., Typology 0 vs Typology 3).

**This empirically proves that the model is functioning as a surrogate regressor reproducing an arithmetic Python formula.**

---

## 9. CubiCasa5K Claim Verification

The actual CubiCasa5K dataset (Kalervo et al., IEEE ICIP 2019) contains:
- 5,000 vector SVG architectural floor plans.
- 80+ floor-plan object classes (walls, railings, windows, doors, bathtubs, counters, icons).
- Multi-polygon room annotations (living rooms, bedrooms, kitchens, balconies).

In contrast, HamaraGhar:
- Does not contain any CubiCasa5K SVG files or raster images.
- Does not contain geometry parsed from CubiCasa5K polygons.
- Uses synthetic random variables drawn from uniform distributions configured to mimic CubiCasa5K summary metrics.

Therefore, referring to the dataset as *"1,200 real residential floor-plan benchmark records from CubiCasa5K"* is **inaccurate**.

---

## 10. Final Verdict

### **STATUS C: "Trained on constructed/synthetic records calibrated from a real dataset."**

### Rationale:
1. The 1,200 records in `real_floorplans.json` were generated using pseudo-random uniform distributions (`np.random.uniform`) in Python rather than extracted from original CubiCasa5K SVG drawings.
2. The target variable `spatial_viability_score` is a deterministic arithmetic formula computed directly from 5 of the 17 input features.
3. The extremely high $R^2 \ge 0.98$ is the result of a regression algorithm learning an algebraic formula containing target leakage.

---

## 11. Remediation Plan & Scientific Recommendations

To transition HamaraGhar into a scientifically defensible AI/ML platform without deleting existing work, the following steps must be taken:

### Step 1: Immediate Scientific Transparency in Documentation
- Update `ml/FLOORPLAN_MODEL_CARD.md` and `README.md` to accurately disclose:
  *"The current demonstration floor-plan model (`floorplan_model_v1`) is trained on 1,200 constructed benchmark vectors calibrated to empirical distribution bounds from CubiCasa5K, with a multi-criteria scoring function target."*
- Acknowledge that `spatial_viability_score` is an **algorithmic multi-criteria evaluation index (MCDA)** rather than an empirical ground-truth label from real human architects.

### Step 2: Ingest Identifiable Real CubiCasa5K Geometry (STATUS B)
To achieve true **STATUS B** (*Trained on derived features extracted from identifiable real floor-plan samples*):
1. Download a verified subset (e.g., 500–1,000 samples) of the official CubiCasa5K dataset from Zenodo (`10.5281/zenodo.2613548`).
2. Build an SVG feature parser (`ml/floorplan/svg_extractor.py`) using `svgpathtools` / `xml.etree.ElementTree`.
3. Extract actual polygon areas, calculate genuine room aspect ratios, count real doors/windows, and measure real wall lengths.
4. Store each record with its original CubiCasa5K sample path (e.g., `high_quality_architectural/1001/model.svg`) so that every record has **verifiable, one-to-one provenance**.

### Step 3: Scientifically Defensible Target Formulation
To eliminate target leakage:
- **Approach A (Self-Supervised / Structural Prediction)**: Train the ML model to predict an intrinsic physical quantity of the floor plan that is non-trivial to compute (e.g., predicting total structural wall perimeter, natural daylight penetration area, or room adjacency graphs from basic boundary parameters).
- **Approach B (Expert Annotation / Comparative Ranking)**: Use Pairwise Ranking ML (e.g., RankNet / LambdaMART) where pairs of floor plans are compared based on multiple architectural criteria, or predict architectural typology classification (e.g., 4-class typology classifier) which is an objective ground-truth label.
- **Approach C (Honest Evaluation Pipeline)**: If the goal is layout quality scoring, designate the formula as an **authoritative deterministic architectural metric** (like the NBC 2016 gate), and use Machine Learning for tasks where statistical learning is appropriate (such as the property price regressor and structural dimension prediction).
