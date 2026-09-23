# HamaraGhar: Floor-Plan ML Task Selection & Scientific Rationale

**Document Version**: 2.0  
**Status**: Authoritative Technical Decision Document  
**Date**: September 23, 2026  
**Dataset**: CubiCasa5K Real Residential Floor-Plan Benchmark (Kalervo et al., IEEE ICIP 2019 / Zenodo DOI: 10.5281/zenodo.2613548)

---

## 1. Available Real Ground-Truth Data

In the processed CubiCasa5K benchmark (`ml/floorplan/data/processed_floorplans.json`, 500 verified real floor plans), each record contains:

1. **Identifiable Provenance**: `source_id` pointing to the exact original CubiCasa5K sample path (e.g. `cubicasa5k/labels/train/1004.txt`).
2. **Structural Geometric Entities**:
   - Real structural wall polygons, closed loops, and perimeters.
   - Real entrance and interior door openings, locations, and widths.
   - Real window openings, orientations, and daylight perimeters.
3. **Derived Physical Metrics (17 Features)**:
   - `plot_width_ft`, `plot_length_ft`, `plot_aspect_ratio`
   - `total_builtup_sqft`, `total_carpet_sqft`, `carpet_efficiency`
   - `total_wall_length_ft`, `wall_density_ratio`
   - `room_count`, `bhk`, `bathroom_count`
   - `door_count`, `window_count`, `openings_per_wall_ratio`
   - `avg_room_aspect_ratio`, `circulation_area_ratio`, `wet_core_distance_ratio`
4. **Architectural Organization Categories**:
   - `0: Compact Studio` (1 BHK, <= 1 Bath, compact envelope)
   - `1: Zoned Family Residence` (2–3 BHK, balanced zoning)
   - `2: Linear Spine` (Aspect ratio >= 1.45, spine circulation)
   - `3: Multi-Wing Villa` (4+ BHK, multi-core, expansive)

---

## 2. Evaluation of Candidate ML Tasks

| Option | Candidate ML Task | Target Formulation | Advantages | Limitations | Feasibility with Real Data |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Option A** | **Architectural Typology Classification** | Multi-class label: $y \in \{0, 1, 2, 3\}$ | **Zero target leakage**. Predicts high-level spatial organization from physical boundary features. Easily validated with confusion matrix and multi-class accuracy. | Requires thresholding for multi-candidate ranking unless paired with probability distributions. | **EXCELLENT** |
| **Option B** | **Room Adjacency / Graph Prediction** | Adjacency matrix $A_{ij} \in \{0, 1\}$ | Captures topological flow. Useful for graph layout generation. | Graph neural network (GNN) requires PyTorch Geometric/DGL, heavy dependencies. | Moderate |
| **Option C** | **Structural Component / Wall Density Prediction** | Continuous $y$: `wall_density_ratio` or `total_wall_length_ft` | Genuine physical prediction task without circular leakage. Can guide structural cost. | Does not directly rank livability or architectural elegance. | Good |
| **Option D** | **Empirical Architectural Manifold Similarity** | Distance in standardized real latent space $S(C) \in [0, 100]$ | Compares candidate layouts directly against real architect-designed homes. Provides continuous ranking score without arbitrary formulas. | Requires storing representative real feature vectors. | **EXCELLENT** |
| **Option E** | **Computer Vision Segmentation** | Pixel mask $(H 	imes W 	imes C)$ | Full image understanding. | High computational overhead (>500ms inference on CPU). Overkill for CAD vector evaluation. | Poor for real-time web UI |

---

## 3. Selected ML Task: Dual-Head Spatial Intelligence

We select **Option A (Architectural Typology Classifier) + Option D (Architectural Manifold Similarity)** as the dual-headed ML intelligence subsystem for HamaraGhar.

### Why This Selection is Scientifically Valid:
1. **Elimination of Target Leakage**:
   - The artificial 5-feature formula from the legacy model is completely discarded.
   - The classifier learns to identify architectural organization from independent physical vectors.
   - The similarity score measures true empirical cosine distance between the candidate layout and genuine architect-designed floor plans in CubiCasa5K.
2. **Defensible Candidate Ranking**:
   - When HamaraGhar generates 3 candidate layouts for a user's plot, each valid candidate is mapped into the real CubiCasa5K feature manifold.
   - The ML score rewards candidates whose room aspect ratios, wall densities, and opening ratios closely mirror genuine architectural precedents.
3. **Strict Separation of Concerns**:
   - The ML model advises on architectural authenticity and spatial organization.
   - The deterministic NBC 2016 constraint solver enforces physical boundaries, setbacks, and zero room collisions ($R_i \cap R_j = \emptyset$).
