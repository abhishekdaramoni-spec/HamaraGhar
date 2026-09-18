import os
import json
from flask import Blueprint, jsonify, current_app

data_api_bp = Blueprint('data_api', __name__)

# Simple in-memory cache for static JSON data
_data_cache = {}

def read_json_data(filename):
    """Read JSON data file with simple caching."""
    if filename in _data_cache:
        return _data_cache[filename]
    filepath = os.path.join(current_app.config.get('DATA_DIR', 'data'), filename)
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            _data_cache[filename] = data
            return data
    return {}

@data_api_bp.route('/api/data/materials', methods=['GET'])
def get_materials():
    return jsonify(read_json_data('materials.json'))

@data_api_bp.route('/api/data/cost-rates', methods=['GET'])
def get_cost_rates():
    return jsonify(read_json_data('cost_rates.json'))

@data_api_bp.route('/api/data/risk/<city>', methods=['GET'])
def get_risk(city):
    risk_data = read_json_data('location_risk.json')
    cities = risk_data.get('cities', {})
    # Case-insensitive lookup
    for key, value in cities.items():
        if key.lower() == city.lower():
            return jsonify(value)
    return jsonify({'success': False, 'error': {'code': 'NOT_FOUND', 'message': f'City "{city}" not found in risk database'}}), 404

@data_api_bp.route('/api/data/layouts', methods=['GET'])
def get_layouts():
    return jsonify(read_json_data('house_layouts.json'))
