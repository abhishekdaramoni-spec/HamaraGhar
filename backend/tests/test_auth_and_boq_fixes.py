import json
import unittest
from backend.app import app, db, User, Project

class TestAuthAndBoqFixes(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.client = app.test_client()
        with app.app_context():
            db.create_all()

    def tearDown(self):
        with app.app_context():
            db.session.remove()
            db.drop_all()

    def test_unauthenticated_page_access_redirects_to_login(self):
        """Unauthenticated requests to protected pages must redirect to /login with next param."""
        protected_routes = ['/dashboard', '/requirements', '/floor-plan', '/builder', '/cost', '/risk', '/summary']
        for route in protected_routes:
            res = self.client.get(route)
            self.assertEqual(res.status_code, 302, f"Failed on route {route}")
            self.assertIn('/login', res.headers['Location'])
            self.assertIn('next=', res.headers['Location'])

    def test_unauthenticated_api_access_returns_401(self):
        """Unauthenticated requests to /api/projects must return 401 JSON error."""
        res = self.client.get('/api/projects')
        self.assertEqual(res.status_code, 401)
        data = res.get_json()
        self.assertEqual(data.get('error'), 'Authentication required')

        post_res = self.client.post('/api/projects', json={'name': 'Hack', 'data': {}})
        self.assertEqual(post_res.status_code, 401)

    def test_demo_login_creates_session_and_seeds_projects(self):
        """Demo login route provisions the architect workspace and redirects cleanly."""
        res = self.client.get('/demo-login?next=/dashboard')
        self.assertEqual(res.status_code, 302)
        self.assertEqual(res.headers['Location'], '/dashboard')

        # Now dashboard should succeed with 200
        dash_res = self.client.get('/dashboard')
        self.assertEqual(dash_res.status_code, 200)

        # Projects API should return the 3 seeded templates
        proj_res = self.client.get('/api/projects')
        self.assertEqual(proj_res.status_code, 200)
        projects = proj_res.get_json()
        self.assertGreaterEqual(len(projects), 3)
        names = [p['name'] for p in projects]
        self.assertIn('Modern Residence', names)

    def test_per_user_project_isolation(self):
        """Projects created by User A must not be visible or mutable by User B."""
        # Register User A
        self.client.post('/register', data={
            'name': 'Architect Alpha',
            'email': 'alpha@example.com',
            'password': 'password123',
            'confirm_password': 'password123'
        })
        
        # User A creates a unique project
        res_create = self.client.post('/api/projects', json={
            'name': 'Alpha Private Villa',
            'data': {'bhk': 4, 'builtup_area': 3200}
        })
        self.assertEqual(res_create.status_code, 201)
        alpha_project_id = res_create.get_json()['id']

        # Logout User A
        self.client.get('/logout')

        # Register User B
        self.client.post('/register', data={
            'name': 'Architect Beta',
            'email': 'beta@example.com',
            'password': 'password123',
            'confirm_password': 'password123'
        })

        # User B queries projects: Alpha Private Villa must NOT be returned
        res_b_list = self.client.get('/api/projects')
        self.assertEqual(res_b_list.status_code, 200)
        b_names = [p['name'] for p in res_b_list.get_json()]
        self.assertNotIn('Alpha Private Villa', b_names)

        # User B tries to view, update, or delete User A's project
        get_attempt = self.client.get(f'/api/projects/{alpha_project_id}')
        self.assertEqual(get_attempt.status_code, 404)

        put_attempt = self.client.put(f'/api/projects/{alpha_project_id}', json={'name': 'Hacked Name'})
        self.assertEqual(put_attempt.status_code, 404)

        del_attempt = self.client.delete(f'/api/projects/{alpha_project_id}')
        self.assertEqual(del_attempt.status_code, 404)

    def test_cost_calculation_pipeline_integrity(self):
        """Cost calculation endpoint must return positive itemized values with consistent totals."""
        payload = {
            'total_sqft': 1850,
            'bhk': 3,
            'bathrooms': 3,
            'city': 'Bangalore',
            'quality': 'standard'
        }
        res = self.client.post('/api/ml/calculate-construction-cost', json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'success')
        self.assertIn('calculation', data)
        calc = data['calculation']
        self.assertIn('total_construction_cost_inr', calc)
        self.assertIn('bill_of_quantities_inr', calc)
        self.assertGreater(calc['total_construction_cost_inr'], 0)
        self.assertGreater(calc['rate_per_sqft_inr'], 0)

        # Verify BOQ item sum matches total construction cost
        boq = calc['bill_of_quantities_inr']
        boq_sum = sum(boq.values())
        self.assertAlmostEqual(boq_sum, calc['total_construction_cost_inr'], delta=1.0)

if __name__ == '__main__':
    unittest.main()
