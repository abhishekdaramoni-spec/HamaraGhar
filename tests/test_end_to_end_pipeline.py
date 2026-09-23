"""
HamaraGhar End-to-End Comprehensive Verification Test Suite
Covers all 15 scenarios from Part 27:
1. New user registration & login
2. Requirement extraction via GenAI endpoint (/api/ml/parse-requirements)
3. 2BHK generation
4. 3BHK generation
5. 4BHK duplex generation
6. Different plot sizes (30x40, 30x50, 40x60, 50x80)
7. Different requirements (Standard, Premium, Luxury tiers & multiple cities)
8. Multiple candidate generation (Evaluating 3 distinct architectural variants)
9. NBC validation (Enforcing setbacks, dimensions, and zero-overlap)
10. ML inference (Supervised typology classification & confidence)
11. Similarity retrieval (Manifold proximity score & nearest CubiCasa ID)
12. Property valuation ML (Kaggle-trained HistGradientBoostingRegressor)
13. Construction estimate (CPWD DSR 2024 BoQ engine)
14. 2D floor plan layout geometry & room coordinates
15. 3D visualization scene data integrity (walls, doors, windows, multi-level floors)
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import unittest
import json
from app import app, db, User, Project

class TestEndToEndPipeline(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        app.config['WTF_CSRF_ENABLED'] = False
        self.client = app.test_client()
        with app.app_context():
            db.create_all()
            # Clean up test user if already present
            existing = User.query.filter_by(email='pooja.sharma@example.com').first()
            if existing:
                Project.query.filter_by(user_id=existing.id).delete()
                db.session.delete(existing)
                db.session.commit()

    def tearDown(self):
        with app.app_context():
            existing = User.query.filter_by(email='pooja.sharma@example.com').first()
            if existing:
                Project.query.filter_by(user_id=existing.id).delete()
                db.session.delete(existing)
                db.session.commit()
            db.session.remove()

    def test_full_system_lifecycle_and_end_to_end_pipeline(self):
        # 1. New user registration & login
        reg_res = self.client.post('/api/auth/register', json={
            'name': 'Pooja Sharma',
            'email': 'pooja.sharma@example.com',
            'password': 'StrongPassword123!'
        })
        self.assertEqual(reg_res.status_code, 201)
        reg_data = json.loads(reg_res.data)
        self.assertIn('user', reg_data)
        self.assertEqual(reg_data.get('message'), 'Registration successful')

        login_res = self.client.post('/api/auth/login', json={
            'email': 'pooja.sharma@example.com',
            'password': 'StrongPassword123!'
        })
        self.assertEqual(login_res.status_code, 200)

        # 2. Requirement extraction via GenAI endpoint
        extract_res = self.client.post('/api/ml/parse-requirements', json={
            'prompt': 'We want to build a 3BHK house on a 30x50 plot in Bangalore with 2 floors and premium finishes'
        })
        self.assertEqual(extract_res.status_code, 200)
        ext_data = json.loads(extract_res.data)
        self.assertEqual(ext_data.get('status'), 'success')
        self.assertIn('requirements', ext_data)
        reqs = ext_data['requirements']
        self.assertEqual(reqs.get('bhk'), 3)
        self.assertEqual(reqs.get('plot_width'), 30.0)
        self.assertEqual(reqs.get('plot_length'), 50.0)

        # 3, 4, 5, 6, 7: Test across 2BHK, 3BHK, 4BHK Duplex, 5BHK, multiple plot sizes and finishes
        scenarios = [
            # 3. 2BHK on 30x40 plot
            {"bhk": 2, "plot_w": 30.0, "plot_l": 40.0, "floors": 1, "tier": "standard", "city": "Bangalore"},
            # 4. 3BHK on 30x50 plot
            {"bhk": 3, "plot_w": 30.0, "plot_l": 50.0, "floors": 1, "tier": "premium", "city": "Hyderabad"},
            # 5. 4BHK Duplex on 40x60 plot
            {"bhk": 4, "plot_w": 40.0, "plot_l": 60.0, "floors": 2, "tier": "luxury", "city": "Mumbai"},
            # 6. 5BHK Duplex on 50x80 plot
            {"bhk": 5, "plot_w": 50.0, "plot_l": 80.0, "floors": 2, "tier": "luxury", "city": "Delhi"}
        ]

        for sc in scenarios:
            # 8. Multiple candidate generation via /api/ml/hybrid-plan
            plan_res = self.client.post('/api/ml/hybrid-plan', json={
                'plot_width': sc['plot_w'],
                'plot_length': sc['plot_l'],
                'bhk': sc['bhk'],
                'floors': sc['floors'],
                'city': sc['city'],
                'finishing_tier': sc['tier']
            })
            self.assertEqual(plan_res.status_code, 200, f"Hybrid plan failed for {sc}")
            plan_data = json.loads(plan_res.data)
            self.assertEqual(plan_data.get('status'), 'success')

            # Verify candidate rankings (all 3 variants evaluated)
            candidate_rankings = plan_data.get('candidate_rankings', [])
            self.assertEqual(len(candidate_rankings), 3, "Expected 3 ranked candidates")

            # 9. NBC validation check
            nbc = plan_data.get('nbc_compliance', {})
            self.assertIn('compliance_score', nbc)
            self.assertIn('is_compliant', nbc)
            self.assertTrue(nbc.get('is_compliant'), f"Plan should be NBC compliant for {sc}")

            # 10. ML inference check (typology classification)
            ml_layout = plan_data.get('ml_layout_assessment', {})
            self.assertIn('predicted_typology', ml_layout)
            self.assertIn('overall_ml_score', ml_layout)
            self.assertTrue(ml_layout.get('ml_used'))

            # 11. Similarity retrieval check (CubiCasa5K benchmark nearest neighbor)
            self.assertIn('closest_cubicasa_id', ml_layout)
            self.assertIsNotNone(ml_layout['closest_cubicasa_id'])
            self.assertIn('nearest_neighbors', ml_layout)
            self.assertGreater(len(ml_layout['nearest_neighbors']), 0)

            # 12. Property valuation ML check
            prop_ml = plan_data.get('property_valuation_ml', {})
            self.assertEqual(prop_ml.get('status'), 'success')
            self.assertEqual(prop_ml.get('engine'), 'ML_MODEL')
            prop_pred = prop_ml.get('prediction', {})
            self.assertIn('property_price_inr', prop_pred)
            self.assertGreater(prop_pred['property_price_inr'], 0)
            self.assertIn('market_price_per_sqft_inr', prop_pred)

            # 13. Construction estimate check (CPWD BoQ)
            cpwd_cost = plan_data.get('construction_cost_cpwd', {})
            self.assertEqual(cpwd_cost.get('status'), 'success')
            self.assertEqual(cpwd_cost.get('engine'), 'CPWD_DSR_2024_CALCULATOR')
            self.assertFalse(cpwd_cost.get('ml_applied'))
            calc = cpwd_cost.get('calculation', {})
            self.assertIn('total_construction_cost_inr', calc)
            self.assertGreater(calc['total_construction_cost_inr'], 0)
            self.assertIn('bill_of_quantities_inr', calc)

            # 14. 2D floor plan geometry check
            geometry = plan_data.get('geometry', {})
            rooms = geometry.get('rooms', [])
            self.assertGreaterEqual(len(rooms), sc['bhk'], "Room count must be >= BHK")
            for r in rooms:
                self.assertIn('name', r)
                self.assertIn('width', r)
                self.assertTrue('height' in r or 'length' in r)
                self.assertIn('x', r)
                self.assertIn('y', r)

            # 15. 3D visualization scene data integrity
            self.assertIn('walls', geometry)
            self.assertIn('doors', geometry)
            self.assertIn('windows', geometry)
            if sc['floors'] > 1:
                upper_res = self.client.post('/api/ml/hybrid-plan', json={
                    'plot_width': sc['plot_w'],
                    'plot_length': sc['plot_l'],
                    'bhk': sc['bhk'],
                    'floors': sc['floors'],
                    'floor': 1,
                    'city': sc['city'],
                    'finishing_tier': sc['tier']
                })
                self.assertEqual(upper_res.status_code, 200)
                upper_data = json.loads(upper_res.data)
                upper_rooms = upper_data.get('geometry', {}).get('rooms', [])
                self.assertGreater(len(upper_rooms), 0, f"Multi-floor {sc['bhk']}BHK must have upper rooms")

        # Create project in user database and generate floor plan via project endpoint
        proj_res = self.client.post('/api/projects', json={
            'name': 'Pooja Dream Villa',
            'data': {
                'plot_width': 30,
                'plot_length': 50,
                'bhk': 3,
                'floors': 1,
                'city': 'Bangalore'
            }
        })
        self.assertEqual(proj_res.status_code, 201)
        proj_data = json.loads(proj_res.data)
        project_id = proj_data['project']['id']

        gen_proj_res = self.client.post(f'/api/projects/{project_id}/floor-plan/generate', json={
            'floor': 0,
            'variant': 0
        })
        self.assertEqual(gen_proj_res.status_code, 200)
        gen_proj_data = json.loads(gen_proj_res.data)
        self.assertIn('layout', gen_proj_data)
        self.assertIn('rooms', gen_proj_data['layout'])

if __name__ == '__main__':
    unittest.main()
