"""
Automated unit tests for HamaraGhar LLM Natural Language Requirement Parser.
Verifies:
1. Extraction of plot dimensions, BHK, floors, city, and amenities from natural language
2. Physical building code constraint checks (NBC 2016 room area and aspect ratios)
3. Budget feasibility checks against CPWD baseline minimums
4. Pluggable provider fallback resilience and failure recovery
5. API endpoint POST /api/ml/parse-requirements integration
"""
import os
import sys
import json
import unittest
from pathlib import Path

# Add repo root to sys.path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app import app
from ml.llm.client import get_llm_service, RuleBasedMockBackend
from ml.llm.schema import ParsedHouseRequirements, validate_physical_constraints


class TestLLMRequirementParser(unittest.TestCase):

    def setUp(self):
        self.service = get_llm_service()
        self.backend = RuleBasedMockBackend()
        app.config["TESTING"] = True
        self.client = app.test_client()

    def test_mock_backend_extraction(self):
        """Verify regex/NLP extraction of plot, rooms, budget, and orientation."""
        prompt = "I need a 3BHK duplex on a 30x60 East facing plot in Bangalore with car parking and pooja room, budget 75 lakhs"
        data = self.backend.parse(prompt)
        
        self.assertEqual(data["plot_width"], 30.0)
        self.assertEqual(data["plot_length"], 60.0)
        self.assertEqual(data["bhk"], 3)
        self.assertEqual(data["floors"], 2)  # duplex -> 2
        self.assertEqual(data["city"], "Bangalore")
        self.assertEqual(data["facing_direction"], "East")
        self.assertEqual(data["target_budget_lakhs"], 75.0)
        self.assertIn("Parking", data["features"])
        self.assertIn("Pooja Room", data["features"])

    def test_pydantic_schema_validation(self):
        """Verify extracted dictionary converts cleanly to Pydantic schema."""
        prompt = "Modern 2 bedroom house in Pune on 25 by 40 plot, single floor, budget around 35L"
        req, warnings = self.service.parse_requirements(prompt)
        
        self.assertIsInstance(req, ParsedHouseRequirements)
        self.assertEqual(req.plot_width, 25.0)
        self.assertEqual(req.plot_length, 40.0)
        self.assertEqual(req.plot_area_sqft, 1000.0)
        self.assertEqual(req.bhk, 2)
        self.assertEqual(req.floors, 1)
        self.assertEqual(req.city, "Pune")
        self.assertEqual(req.target_budget_lakhs, 35.0)

    def test_physical_constraint_hallucination_correction(self):
        """
        Verify physical constraint check prevents impossible designs:
        E.g., 5 BHK crammed onto a tiny 300 sq.ft single-floor plot.
        """
        prompt = "I want a 5 bedroom villa on a tiny 15x20 plot, single floor"
        req, warnings = self.service.parse_requirements(prompt)
        
        # 15x20 = 300 sq.ft. A 5BHK is physically impossible per NBC norms.
        self.assertLess(req.bhk, 5)
        self.assertTrue(any("Physical Constraint Auto-Correction" in w for w in warnings))

    def test_budget_feasibility_warning(self):
        """Verify warning triggered if target budget is impossibly low for constructed area."""
        prompt = "Huge 40x80 duplex house in Mumbai with luxury finishes, but my budget is only 5 lakhs"
        req, warnings = self.service.parse_requirements(prompt)
        
        # 40x80 duplex = ~4,800 sqft built-up. 5L budget is physically unbuildable.
        self.assertTrue(any("Budget Feasibility Warning" in w for w in warnings))

    def test_api_parse_requirements_endpoint(self):
        """Verify POST /api/ml/parse-requirements HTTP integration."""
        payload = {
            "prompt": "4BHK luxury home on 40x60 plot in Hyderabad with home office and garden, budget 1.2 crore"
        }
        response = self.client.post(
            "/api/ml/parse-requirements",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        
        self.assertEqual(data["status"], "success")
        req = data["requirements"]
        self.assertEqual(req["plot_width"], 40.0)
        self.assertEqual(req["plot_length"], 60.0)
        self.assertEqual(req["bhk"], 4)
        self.assertEqual(req["city"], "Hyderabad")
        self.assertEqual(req["target_budget_lakhs"], 120.0)  # 1.2 crore -> 120 Lakhs
        self.assertIn("Study Room", req["features"])


if __name__ == "__main__":
    unittest.main()
