# CubiCasa5K Floor-Plan Benchmark Dataset Provenance Report

**Generated**: 2026-09-23T13:03:26.071370+00:00Z  
**Dataset**: CubiCasa5K (Kalervo et al., IEEE ICIP 2019 / Zenodo `10.5281/zenodo.2613548`)  
**License**: Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)

---

## 1. Provenance Verification Summary

| Metric | Verified Value | Benchmark Status |
| :--- | :--- | :--- |
| **Total Ingested Records** | **500** | Complete |
| **Verified Genuine CubiCasa5K Records** | **500** | **100.0% Real Data** |
| **Synthetic / Constructed Records** | **0** | **0% Synthetic** |
| **Unknown Provenance Records** | **0** | **None** |
| **Source Files Found on Disk** | **500** | Physical files verified |
| **Source Files Missing** | **0** | Zero missing |
| **Unique Source IDs** | **500** | 100% Unique |
| **Duplicate Records / Overlapping Geometry** | **0** | Zero duplicate leakage |

---

## 2. Partition Strategy (Zero Data Leakage)

The 500 verified floor plans are strictly isolated at the source level using the official CubiCasa5K split partitions:
- **Train Set**: 350 samples (70.0%)
- **Validation Set**: 75 samples (15.0%)
- **Locked Holdout Test Set**: 75 samples (15.0%)

*Zero Leakage Guarantee*: No source ID or geometric hash appears in more than one partition.

---

## 3. Typology Distribution in Real Benchmark

- **Class 0 (Compact Studio)**: 120 samples
- **Class 1 (Zoned Family Residence)**: 179 samples
- **Class 2 (Linear Spine)**: 10 samples
- **Class 3 (Multi-Wing Villa)**: 191 samples

---

## 4. Physical Storage Location

All raw coordinate vector files are stored on disk at:
`ml/floorplan/data/raw_cubicasa/{train,val,test}/*.txt`

Complete cryptographic SHA256 integrity mapping is cataloged in:
[`source_manifest.csv`](file:///c:/construct%20your%20house/ml/floorplan/data/source_manifest.csv) and [`split_manifest.csv`](file:///c:/construct%20your%20house/ml/floorplan/data/split_manifest.csv).
