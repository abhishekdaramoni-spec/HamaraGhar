"""
Automated MLOps Integrity & Telemetry Test Suite for HamaraGhar.
Verifies:
1. Artifact manifest.json presence and cryptographic schema.
2. SHA256 file checksum matches between on-disk artifacts and manifest.
3. Boot-time integrity validation within MLInferenceService.
4. Tamper detection simulation (flags corrupted or modified artifacts).
5. Health and metadata telemetry API exposure (/api/ml/health, /api/ml/metadata).
"""
import unittest
import json
import hashlib
import tempfile
import shutil
from pathlib import Path
from app import app
from ml.inference.predictor import MLInferenceService


class TestMLOpsIntegrity(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
        self.artifacts_dir = Path(__file__).resolve().parent.parent / "ml" / "artifacts"
        self.manifest_path = self.artifacts_dir / "manifest.json"

    def test_manifest_schema_and_presence(self):
        """Verify manifest.json exists and conforms to MLOps specification."""
        self.assertTrue(self.manifest_path.exists(), "manifest.json must exist in ml/artifacts")
        with open(self.manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
            
        self.assertIn("manifest_version", manifest)
        self.assertIn("generated_at_utc", manifest)
        self.assertIn("artifacts", manifest)
        
        required_models = [
            "property_price_regressor_v1.joblib",
            "property_preprocessor_v1.joblib"
        ]
        for model_file in required_models:
            self.assertIn(model_file, manifest["artifacts"])
            entry = manifest["artifacts"][model_file]
            self.assertIn("sha256", entry)
            self.assertEqual(len(entry["sha256"]), 64)
            self.assertIn("size_bytes", entry)
            self.assertIn("algorithm", entry)
            self.assertIn("dataset", entry)

    def test_actual_files_match_manifest_hashes(self):
        """Verify live disk artifacts calculate to identical SHA256 hashes in manifest."""
        with open(self.manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)

        for fname, meta in manifest["artifacts"].items():
            fpath = self.artifacts_dir / fname
            self.assertTrue(fpath.exists(), f"Artifact file {fname} must exist on disk")
            
            # Compute live SHA256
            h = hashlib.sha256()
            with open(fpath, "rb") as af:
                while chunk := af.read(8192):
                    h.update(chunk)
            live_hash = h.hexdigest()
            
            self.assertEqual(
                live_hash, meta["sha256"],
                f"Cryptographic hash mismatch for {fname}! Disk={live_hash}, Manifest={meta['sha256']}"
            )
            self.assertEqual(fpath.stat().st_size, meta["size_bytes"])

    def test_inference_service_verifies_integrity(self):
        """Verify MLInferenceService reports VERIFIED integrity status upon initialization."""
        svc = MLInferenceService()
        health = svc.get_health_status()
        self.assertEqual(health["status"], "healthy")
        self.assertIn("mlops", health)
        self.assertEqual(health["mlops"]["artifact_integrity"], "VERIFIED")
        self.assertTrue(health["mlops"]["integrity_verified"])

    def test_tamper_detection_simulation(self):
        """Verify that modifying an artifact or manifest triggers INTEGRITY_MISMATCH."""
        temp_dir = Path(tempfile.mkdtemp())
        try:
            # Create a corrupted model and manifest with mismatched hash
            dummy_model = temp_dir / "property_price_regressor_v1.joblib"
            with open(dummy_model, "wb") as f:
                f.write(b"corrupted_tampered_model_payload")

            dummy_prep = temp_dir / "property_preprocessor_v1.joblib"
            with open(dummy_prep, "wb") as f:
                f.write(b"dummy_prep_payload")

            tampered_manifest = {
                "manifest_version": "1.0.0",
                "artifacts": {
                    "property_price_regressor_v1.joblib": {
                        "sha256": "0000000000000000000000000000000000000000000000000000000000000000",
                        "size_bytes": 1234
                    }
                }
            }
            with open(temp_dir / "manifest.json", "w", encoding="utf-8") as f:
                json.dump(tampered_manifest, f)

            # Test dedicated instance with tampered directory
            tampered_svc = MLInferenceService.__new__(MLInferenceService)
            tampered_svc.artifacts_dir = temp_dir
            integrity = tampered_svc._verify_integrity()

            self.assertFalse(integrity["verified"])
            self.assertEqual(integrity["status"], "INTEGRITY_MISMATCH")
            self.assertFalse(integrity["details"]["property_price_regressor_v1.joblib"]["verified"])
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    def test_health_and_metadata_telemetry_endpoints(self):
        """Verify GET /api/ml/health and GET /api/ml/metadata expose MLOps telemetry."""
        health_res = self.app.get("/api/ml/health")
        self.assertEqual(health_res.status_code, 200)
        h_data = json.loads(health_res.data)
        self.assertEqual(h_data["status"], "healthy")
        self.assertIn("mlops", h_data)
        self.assertEqual(h_data["mlops"]["artifact_integrity"], "VERIFIED")
        self.assertTrue(h_data["mlops"]["integrity_verified"])

        meta_res = self.app.get("/api/ml/metadata")
        self.assertEqual(meta_res.status_code, 200)
        m_data = json.loads(meta_res.data)
        self.assertIn("mlops_telemetry", m_data)
        self.assertEqual(m_data["mlops_telemetry"]["integrity"]["status"], "VERIFIED")
        self.assertIn("uptime_seconds", m_data["mlops_telemetry"])


if __name__ == "__main__":
    unittest.main()
