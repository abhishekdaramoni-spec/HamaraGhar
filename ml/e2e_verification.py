import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import json
import time
from app import app
from ml.security import _RATE_LIMIT_STORE

_RATE_LIMIT_STORE.clear()
client = app.test_client()

print('=== STARTING END-TO-END VERIFICATION ===')

# 1. Health & Telemetry
t0 = time.perf_counter()
res = client.get('/api/ml/health')
assert res.status_code == 200
data = json.loads(res.data)
assert data['status'] == 'healthy'
assert data['mlops']['artifact_integrity'] == 'VERIFIED'
assert data['mlops']['integrity_verified'] == True
dt = round((time.perf_counter() - t0) * 1000, 2)
integrity = data['mlops']['artifact_integrity']
print(f'1. GET /api/ml/health: PASS ({dt}ms) - Integrity: {integrity}')

# 2. Metadata
t0 = time.perf_counter()
res = client.get('/api/ml/metadata')
assert res.status_code == 200
data = json.loads(res.data)
assert data['feature_count'] == 41
assert data['model_family'] == 'HistGradientBoostingRegressor'
dt = round((time.perf_counter() - t0) * 1000, 2)
fc = data['feature_count']
mf = data['model_family']
print(f'2. GET /api/ml/metadata: PASS ({dt}ms) - Features: {fc}, Model: {mf}')

# 3. Conversational Requirement Parser
t0 = time.perf_counter()
res = client.post('/api/ml/parse-requirements', json={'prompt': '3BHK duplex on 30x50 plot in Bangalore with pooja room and parking, budget 85 lakhs'})
assert res.status_code == 200
data = json.loads(res.data)
assert data['status'] == 'success'
assert data['requirements']['bhk'] == 3
assert data['requirements']['city'] == 'Bangalore'
dt = round((time.perf_counter() - t0) * 1000, 2)
bhk = data['requirements']['bhk']
city = data['requirements']['city']
print(f'3. POST /api/ml/parse-requirements: PASS ({dt}ms) - Parsed: {bhk}BHK in {city}')

# 4. Property Price Regressor
t0 = time.perf_counter()
res = client.post('/api/ml/predict-property-price', json={'square_ft': 1500, 'bhk': 3, 'city': 'Bangalore'})
assert res.status_code == 200
data = json.loads(res.data)
assert data['status'] == 'success'
assert data['engine'] == 'ML_MODEL'
assert data['prediction']['property_price_lakhs'] > 0
dt = round((time.perf_counter() - t0) * 1000, 2)
pr = data['prediction']['property_price_lakhs']
rate = data['prediction']['market_price_per_sqft_inr']
print(f'4. POST /api/ml/predict-property-price: PASS ({dt}ms) - Price: Rs {pr}L (Rate: Rs {rate}/sqft)')

# 5. CPWD Construction Cost
t0 = time.perf_counter()
res = client.post('/api/ml/calculate-construction-cost', json={'built_up_area_sqft': 1500, 'floors': 1, 'finishing_tier': 'Standard'})
assert res.status_code == 200
data = json.loads(res.data)
assert data['status'] == 'success'
assert data['ml_applied'] == False
assert data['calculation']['total_construction_cost_lakhs'] > 0
dt = round((time.perf_counter() - t0) * 1000, 2)
cost = data['calculation']['total_construction_cost_lakhs']
crate = data['calculation']['rate_per_sqft_inr']
print(f'5. POST /api/ml/calculate-construction-cost: PASS ({dt}ms) - Cost: Rs {cost}L (Rate: Rs {crate}/sqft)')

# 6. Unified Predict
t0 = time.perf_counter()
res = client.post('/api/ml/predict', json={'square_ft': 1500, 'built_up_area_sqft': 1500, 'bhk': 3, 'city': 'Bangalore'})
assert res.status_code == 200
data = json.loads(res.data)
assert data['status'] == 'success'
assert 'property_valuation_ml' in data
assert 'construction_cost_cpwd' in data
dt = round((time.perf_counter() - t0) * 1000, 2)
print(f'6. POST /api/ml/predict: PASS ({dt}ms)')

# 7. Hybrid Plan
t0 = time.perf_counter()
res = client.post('/api/ml/hybrid-plan', json={'plot_width': 30, 'plot_length': 50, 'bhk': 3, 'floors': 1, 'city': 'Bangalore'})
assert res.status_code == 200
data = json.loads(res.data)
assert data['status'] == 'success'
assert data['nbc_compliance']['compliance_score'] >= 80
assert data['nbc_compliance']['overlap_detected'] == False
assert 'ml_layout_assessment' in data
assert data['ml_layout_assessment']['overall_ml_score'] >= 35.0
assert 'candidate_rankings' in data
assert len(data['candidate_rankings']) >= 1
assert data['candidate_rankings'][0]['rank'] == 1
dt = round((time.perf_counter() - t0) * 1000, 2)
score = data['nbc_compliance']['compliance_score']
overlaps = data['nbc_compliance']['overlap_detected']
ml_score = data['ml_layout_assessment']['overall_ml_score']
tier = data['ml_layout_assessment']['quality_tier']
print(f'7. POST /api/ml/hybrid-plan: PASS ({dt}ms) - NBC Score: {score}/100, Overlaps: {overlaps}, ML Quality: {ml_score} ({tier})')

# 8. Authenticated UI Pages
with client.session_transaction() as sess:
    sess['user_id'] = 1

for route in ['/requirements', '/floor-plan', '/cost']:
    t0 = time.perf_counter()
    res = client.get(route)
    assert res.status_code == 200
    dt = round((time.perf_counter() - t0) * 1000, 2)
    sz = len(res.data)
    print(f'8. Page {route}: PASS ({dt}ms, {sz} bytes)')

print('=== ALL 8 END-TO-END SUBSYSTEMS VERIFIED PERFECTLY ===')
