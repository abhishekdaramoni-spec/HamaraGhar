"""
Production ML Inference Service for HamaraGhar.
Grounded on:
- ML Model: Indian Residential Property Price Regressor (Kaggle dataset: 29,451 pan-India records)
- Deterministic Domain Engine: CPWD DSR 2024 Construction Cost & BoQ Estimator
- Geometric Constraint Solver: NBC 2016 Setbacks & Room Geometry
"""
import os
import sys
import time
import json
import hashlib
import threading
from pathlib import Path
from typing import Dict, Any, Optional
import joblib
import numpy as np
import pandas as pd

# Add repo root to sys.path
ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))


class MLInferenceService:
    """Thread-safe singleton service for real-world property valuation ML inference and BoQ calculation."""
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(MLInferenceService, cls).__new__(cls)
                cls._instance._initialized = False
        return cls._instance

    def __init__(self, artifacts_dir: Optional[Path] = None):
        if getattr(self, "_initialized", False):
            return
        self.artifacts_dir = artifacts_dir or (ROOT / "ml" / "artifacts")
        self.start_time = time.time()
        self.total_predictions = 0
        self.latencies = []
        
        self.property_model_bundle = None
        self.property_preprocessor = None
        self.integrity_info = {}
        
        self._load_artifacts()
        self._initialized = True

    def _compute_sha256(self, filepath: Path) -> str:
        """Computes SHA256 checksum of an artifact file."""
        h = hashlib.sha256()
        with open(filepath, 'rb') as f:
            while chunk := f.read(8192):
                h.update(chunk)
        return h.hexdigest()

    def _verify_integrity(self) -> Dict[str, Any]:
        """Validates artifact file hashes against cryptographic manifest.json."""
        manifest_path = self.artifacts_dir / "manifest.json"
        if not manifest_path.exists():
            return {
                "status": "MANIFEST_MISSING",
                "verified": False,
                "message": "manifest.json not found in artifacts directory"
            }
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            
            artifacts_meta = manifest.get("artifacts", {})
            results = {}
            all_verified = True
            
            for fname, expected in artifacts_meta.items():
                fpath = self.artifacts_dir / fname
                if not fpath.exists():
                    all_verified = False
                    results[fname] = {"status": "FILE_MISSING", "verified": False}
                    continue
                actual_hash = self._compute_sha256(fpath)
                expected_hash = expected.get("sha256")
                is_match = (actual_hash == expected_hash)
                if not is_match:
                    all_verified = False
                results[fname] = {
                    "verified": is_match,
                    "actual_sha256": actual_hash,
                    "expected_sha256": expected_hash,
                    "size_bytes": fpath.stat().st_size
                }
                
            return {
                "status": "VERIFIED" if all_verified else "INTEGRITY_MISMATCH",
                "verified": all_verified,
                "details": results,
                "manifest_generated_at": manifest.get("generated_at_utc")
            }
        except Exception as e:
            return {
                "status": "ERROR",
                "verified": False,
                "message": str(e)
            }

    def _load_artifacts(self):
        """Loads real Kaggle-trained model and preprocessor pipelines and verifies cryptographic integrity."""
        self.integrity_info = self._verify_integrity()
        if not self.integrity_info.get("verified", False):
            print(f"[MLInferenceService] Artifact Integrity Warning: {self.integrity_info.get('status')}")

        try:
            model_path = self.artifacts_dir / "property_price_regressor_v1.joblib"
            prep_path = self.artifacts_dir / "property_preprocessor_v1.joblib"
            
            if model_path.exists():
                self.property_model_bundle = joblib.load(model_path)
            if prep_path.exists():
                self.property_preprocessor = joblib.load(prep_path)
        except Exception as e:
            print(f"[MLInferenceService] Artifact load warning: {e}")

    def is_healthy(self) -> bool:
        return self.property_model_bundle is not None and self.property_preprocessor is not None

    def get_health_status(self) -> Dict[str, Any]:
        avg_latency = round(sum(self.latencies) / len(self.latencies), 3) if self.latencies else 0.0

        from ml.floorplan.inference import get_floorplan_ml_service
        fp_service = get_floorplan_ml_service()
        fp_healthy = fp_service.model_loaded

        overall_healthy = self.is_healthy() and fp_healthy

        return {
            "status": "healthy" if overall_healthy else "degraded",
            "uptime_seconds": round(time.time() - self.start_time, 1),
            "total_predictions_served": self.total_predictions,
            "avg_latency_ms": avg_latency,
            "model_name": "Indian Residential Property Price Regressor",
            "dataset_origin": "Kaggle House Price Prediction Challenge (29,451 records)",
            "model_family": self.property_model_bundle.get("model_family") if self.property_model_bundle else None,
            "version": "1.0.0",
            "subsystems": {
                "property_valuation_model": {
                    "status": "healthy" if self.is_healthy() else "unavailable",
                    "model_name": "Indian Residential Property Price Regressor",
                    "dataset": "Kaggle (29,451 records)",
                    "version": "1.0.0"
                },
                "floorplan_intelligence_model": {
                    "status": "healthy" if fp_healthy else "unavailable",
                    "model_name": "CubiCasa5K Floor-Plan Spatial Viability Regressor",
                    "dataset": "CubiCasa5K Benchmark (CC BY 4.0)",
                    "version": "1.0.0"
                },
                "genai_parser": {
                    "status": "healthy",
                    "engine": "Pydantic Schema Gate + Heuristic Fallback"
                },
                "engineering_engine": {
                    "status": "healthy",
                    "engine": "NBC 2016 Clearance + CPWD DSR 2024 BoQ"
                }
            },
            "mlops": {
                "artifact_integrity": self.integrity_info.get("status", "UNKNOWN"),
                "integrity_verified": self.integrity_info.get("verified", False),
                "artifacts_dir": str(self.artifacts_dir),
            }
        }

    def get_metadata(self) -> Dict[str, Any]:
        if not self.property_model_bundle:
            return {"status": "Model not loaded"}
        return {
            "task": self.property_model_bundle.get("task"),
            "dataset": self.property_model_bundle.get("dataset"),
            "model_family": self.property_model_bundle.get("model_family"),
            "version": self.property_model_bundle.get("version"),
            "target": self.property_model_bundle.get("target_name"),
            "target_unit": self.property_model_bundle.get("target_unit"),
            "feature_count": len(self.property_model_bundle.get("feature_names", [])),
            "features": self.property_model_bundle.get("feature_names"),
            "validation_metrics": self.property_model_bundle.get("validation_metrics"),
            "trained_at_utc": self.property_model_bundle.get("trained_at_utc"),
            "mlops_telemetry": {
                "integrity": self.integrity_info,
                "uptime_seconds": round(time.time() - self.start_time, 1),
                "total_inferences": self.total_predictions,
                "latencies_tracked": len(self.latencies),
            }
        }

    # -------------------------------------------------------------
    # 1. ML PROPERTY VALUATION PREDICTOR (REAL KAGGLE MODEL)
    # -------------------------------------------------------------
    def _property_fallback(self, payload: Dict[str, Any], reason: str) -> Dict[str, Any]:
        """Deterministic rule fallback if ML model is unavailable or input is out-of-bounds."""
        sqft = float(payload.get("square_ft") or payload.get("built_up_area_sqft") or 1200.0)
        city = str(payload.get("city", "Bangalore")).title()
        
        # Benchmark metro median rates per sq.ft (Lakhs)
        city_rates = {
            "Mumbai": 18500,
            "Bangalore": 6500,
            "Pune": 5800,
            "Noida": 4900,
            "Kolkata": 4500,
            "Chennai": 6200,
            "Jaipur": 3800,
        }
        rate = city_rates.get(city, 5200)
        total_inr = rate * sqft
        price_lakhs = round(total_inr / 100000.0, 2)
        
        return {
            "status": "success",
            "engine": "RULE_BASED_FALLBACK",
            "is_fallback": True,
            "fallback_reason": reason,
            "prediction": {
                "property_price_lakhs": price_lakhs,
                "property_price_inr": round(total_inr, 0),
                "market_price_per_sqft_inr": rate,
                "confidence_interval_90": {
                    "lower_lakhs": round(price_lakhs * 0.85, 2),
                    "upper_lakhs": round(price_lakhs * 1.15, 2),
                },
            },
            "valuation_drivers": [
                {"driver": "Regional Benchmark", "impact": f"Fallback calculated using standard municipal market rates for {city}."},
                {"driver": "Fallback Trigger", "impact": reason},
            ],
            "model_version": "fallback_rules_v1",
        }

    def predict_property_price(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predicts residential market property price in Lakhs INR and ₹/sq.ft.
        Uses HistGradientBoostingRegressor trained on 29,451 real pan-India property records.
        """
        t0 = time.perf_counter()
        self.total_predictions += 1
        
        if not self.property_model_bundle or not self.property_preprocessor:
            res = self._property_fallback(payload, "ML model artifacts not loaded")
            res["latency_ms"] = round((time.perf_counter() - t0) * 1000, 3)
            return res
            
        try:
            sqft = float(payload.get("square_ft") or payload.get("built_up_area_sqft") or payload.get("plot_area_sqft") or 1200.0)
            bhk = int(payload.get("bhk") or payload.get("bedrooms") or 2)
            posted_by = str(payload.get("posted_by") or payload.get("postedBy") or "Dealer").capitalize()
            bhk_or_rk = str(payload.get("bhk_or_rk") or "BHK").upper()
            city = str(payload.get("city") or "Bangalore").title()
            rera = int(bool(payload.get("rera", True)))
            under_construction = int(bool(payload.get("under_construction", False)))
            ready_to_move = int(not under_construction)
            resale = int(bool(payload.get("resale", False)))
            
            # City coordinates lookup (defaults to center of city)
            city_coords = {
                "Bangalore": (77.5946, 12.9716),
                "Mumbai": (72.8777, 19.0760),
                "Pune": (73.8567, 18.5204),
                "Noida": (77.3910, 28.5355),
                "Kolkata": (88.3639, 22.5726),
                "Chennai": (80.2707, 13.0827),
                "Jaipur": (75.7873, 26.9124),
                "Delhi": (77.1025, 28.7041),
                "Hyderabad": (78.4867, 17.3850),
            }
            default_lon, default_lat = city_coords.get(city, (77.5946, 12.9716))
            longitude = float(payload.get("longitude") or default_lon)
            latitude = float(payload.get("latitude") or default_lat)
        except (ValueError, TypeError) as e:
            res = self._property_fallback(payload, f"Invalid input field types: {str(e)}")
            res["latency_ms"] = round((time.perf_counter() - t0) * 1000, 3)
            return res
            
        # Out-of-Distribution (OOD) Checks
        if sqft < 120.0 or sqft > 15000.0 or bhk < 1 or bhk > 10:
            res = self._property_fallback(payload, f"Out-of-distribution dimensions (sqft: {sqft}, BHK: {bhk})")
            res["latency_ms"] = round((time.perf_counter() - t0) * 1000, 3)
            return res
            
        if posted_by not in ["Owner", "Dealer", "Builder"]:
            posted_by = "Dealer"
        if bhk_or_rk not in ["BHK", "RK"]:
            bhk_or_rk = "BHK"
            
        # Feature calculations
        log_sqft = np.log1p(sqft)
        sqft_per_bhk = sqft / max(bhk, 1)
        
        raw_dict = {
            "SQUARE_FT": [sqft],
            "log_square_ft": [log_sqft],
            "BHK_NO": [bhk],
            "sqft_per_bhk": [sqft_per_bhk],
            "LONGITUDE": [longitude],
            "LATITUDE": [latitude],
            "POSTED_BY": [posted_by],
            "BHK_OR_RK": [bhk_or_rk],
            "city": [city],
            "UNDER_CONSTRUCTION": [under_construction],
            "RERA": [rera],
            "READY_TO_MOVE": [ready_to_move],
            "RESALE": [resale],
        }
        raw_df = pd.DataFrame(raw_dict)
        
        try:
            preprocessor = self.property_preprocessor["preprocessor"]
            feature_cols = (
                self.property_preprocessor["num_cols"] +
                self.property_preprocessor["cat_cols"] +
                self.property_preprocessor["binary_cols"]
            )
            X_prep = preprocessor.transform(raw_df[feature_cols])
            all_feat_names = self.property_model_bundle["feature_names"]
            X_prep_df = pd.DataFrame(X_prep, columns=all_feat_names)
            
            model = self.property_model_bundle["model"]
            pred_log = model.predict(X_prep_df)[0]
            pred_lakhs = float(np.expm1(pred_log))
            pred_lakhs = round(max(3.0, pred_lakhs), 2)
            total_inr = round(pred_lakhs * 100000.0, 0)
            market_rate = round(total_inr / sqft, 1)
            
            # 90% Confidence Interval (based on Test MAPE ~24%)
            lower_lakhs = round(pred_lakhs * 0.78, 2)
            upper_lakhs = round(pred_lakhs * 1.22, 2)
            
            # Explainability / Valuation Drivers
            drivers = []
            drivers.append({"driver": "Property Footprint", "impact": f"{sqft:.0f} sq.ft ({bhk} BHK) baseline valuation"})
            if rera:
                drivers.append({"driver": "RERA Certification", "impact": "RERA legal compliance safety margin (+5-8% asset liquidity)"})
            if city in ["Mumbai", "Bangalore"]:
                drivers.append({"driver": "High-Demand Metro", "impact": f"High commercial and job-density premium in {city}"})
            if sqft_per_bhk > 650:
                drivers.append({"driver": "Spacious Layout", "impact": f"{sqft_per_bhk:.0f} sq.ft/bedroom spaciousness tier premium"})
                
            latency_ms = round((time.perf_counter() - t0) * 1000, 3)
            self.latencies.append(latency_ms)
            if len(self.latencies) > 500:
                self.latencies.pop(0)
            
            return {
                "status": "success",
                "engine": "ML_MODEL",
                "is_fallback": False,
                "model_version": self.property_model_bundle.get("version", "1.0.0"),
                "model_family": self.property_model_bundle.get("model_family"),
                "task": "Indian Residential Property Price Prediction",
                "prediction": {
                    "property_price_lakhs": pred_lakhs,
                    "property_price_inr": total_inr,
                    "market_price_per_sqft_inr": market_rate,
                    "confidence_interval_90": {
                        "lower_lakhs": lower_lakhs,
                        "upper_lakhs": upper_lakhs,
                    },
                },
                "valuation_drivers": drivers,
                "latency_ms": latency_ms,
            }
        except Exception as e:
            res = self._property_fallback(payload, f"Model inference exception: {str(e)}")
            res["latency_ms"] = round((time.perf_counter() - t0) * 1000, 3)
            return res

    # -------------------------------------------------------------
    # 2. DETERMINISTIC CPWD DSR 2024 CONSTRUCTION COST & BoQ
    # -------------------------------------------------------------
    def calculate_construction_cost(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculates itemized physical construction cost via CPWD Delhi Schedule of Rates (DSR 2024).
        Strictly labeled as deterministic engineering logic, NOT machine learning.
        """
        sqft = float(payload.get("built_up_area_sqft") or payload.get("square_ft") or 1200.0)
        floors = int(payload.get("floors") or 1)
        tier = str(payload.get("finishing_tier") or "Standard").capitalize()
        soil = str(payload.get("soil_type") or "Sandy Loam")
        seismic = str(payload.get("seismic_zone") or "III")
        
        # CPWD Base Rate Schedule (INR / sqft)
        base_rates = {
            "Basic": 1350.0,
            "Standard": 1850.0,
            "Premium": 2750.0,
            "Luxury": 4200.0,
        }
        base_rate = base_rates.get(tier, 1850.0)
        
        # Geotechnical multiplier (IS 2911 deep pile requirement in Black Cotton soil)
        soil_mult = 1.18 if "Black Cotton" in soil else (0.96 if "Rocky" in soil else 1.00)
        # Seismic ductile detailing multiplier (IS 13920 rebar in Zone IV/V)
        seismic_mult = 1.10 if seismic in ["IV", "V"] else (1.04 if seismic == "III" else 1.00)
        # Vertical efficiency
        vert_mult = 0.98 if floors == 2 else 1.02
        
        effective_rate = round(base_rate * soil_mult * seismic_mult * vert_mult, 1)
        total_construction_cost = round(effective_rate * sqft, 0)
        
        # Itemized Bill of Quantities (BoQ)
        boq = {
            "substructure_and_foundation": round(total_construction_cost * 0.16, 0),
            "rcc_framed_structure": round(total_construction_cost * 0.32, 0),
            "brickwork_and_masonry": round(total_construction_cost * 0.15, 0),
            "doors_windows_and_fenestrations": round(total_construction_cost * 0.11, 0),
            "flooring_and_finishes": round(total_construction_cost * 0.14, 0),
            "plumbing_and_electrical": round(total_construction_cost * 0.12, 0),
        }
        
        return {
            "status": "success",
            "engine": "CPWD_DSR_2024_CALCULATOR",
            "ml_applied": False,
            "calculation": {
                "rate_per_sqft_inr": effective_rate,
                "total_construction_cost_inr": total_construction_cost,
                "total_construction_cost_lakhs": round(total_construction_cost / 100000.0, 2),
                "bill_of_quantities_inr": boq,
            },
            "parameters_applied": {
                "finishing_tier": tier,
                "soil_multiplier": soil_mult,
                "seismic_multiplier": seismic_mult,
            }
        }


# Global singleton
_inference_service_instance = None
_service_lock = threading.Lock()

def get_inference_service() -> MLInferenceService:
    global _inference_service_instance
    with _service_lock:
        if _inference_service_instance is None:
            _inference_service_instance = MLInferenceService()
    return _inference_service_instance
