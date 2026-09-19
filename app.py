"""HamaraGhar — Legacy entry point.
This file preserves backward compatibility.
The modular application lives in backend/app/.
"""
import os
import json
from functools import wraps
from dotenv import load_dotenv
from flask import Flask, request, jsonify, session, redirect, url_for, render_template, flash, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone

load_dotenv()

app = Flask(__name__)
# Stable secret key fallback for serverless functions (Vercel/Lambda)
app.secret_key = os.environ.get('SECRET_KEY', 'hamaraghar-session-secret-key-prod-2024')

# Database URI: serverless instances have a read-only filesystem except for /tmp
default_db_uri = 'sqlite:////tmp/smartbuild.db' if (os.environ.get('VERCEL') == '1' or os.environ.get('AWS_LAMBDA_FUNCTION_NAME')) else 'sqlite:///smartbuild.db'
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', default_db_uri)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    data_json = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

with app.app_context():
    db.create_all()

# Decorators
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            if request.path.startswith('/api/'):
                return jsonify({'error': 'Authentication required'}), 401
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def get_current_user():
    if 'user_id' in session:
        return db.session.get(User, session['user_id'])
    return None

def read_json_data(filename):
    filepath = os.path.join(app.root_path, 'data', filename)
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

# --- PAGE ROUTES ---
@app.route('/')
def index():
    return render_template('landing.html', current_user=get_current_user(), page='landing')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        if not email or not password:
            flash('Please enter email and password.', 'error')
            return redirect(url_for('login'))
        user = User.query.filter_by(email=email).first()
        if user and check_password_hash(user.password_hash, password):
            session['user_id'] = user.id
            flash(f'Welcome back, {user.name}!', 'success')
            return redirect(url_for('dashboard'))
        flash('Invalid email or password. Please try again.', 'error')
        return redirect(url_for('login'))
    return render_template('login.html', current_user=get_current_user(), page='login')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        confirm = request.form.get('confirm_password', '')
        if not all([name, email, password]):
            flash('Please fill in all fields.', 'error')
            return redirect(url_for('register'))
        if password != confirm:
            flash('Passwords do not match.', 'error')
            return redirect(url_for('register'))
        if len(password) < 6:
            flash('Password must be at least 6 characters.', 'error')
            return redirect(url_for('register'))
        if User.query.filter_by(email=email).first():
            flash('An account with this email already exists. Please log in.', 'error')
            return redirect(url_for('login'))
        new_user = User(
            name=name,
            email=email,
            password_hash=generate_password_hash(password)
        )
        db.session.add(new_user)
        db.session.commit()
        session['user_id'] = new_user.id
        flash(f'Welcome to HamaraGhar, {name}! Your account has been created.', 'success')
        return redirect(url_for('dashboard'))
    return render_template('register.html', current_user=get_current_user(), page='register')

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    flash('You have been logged out.', 'info')
    return redirect(url_for('index'))

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', current_user=get_current_user(), page='dashboard')

@app.route('/requirements')
@login_required
def requirements():
    return render_template('requirements.html', current_user=get_current_user(), page='requirements')

@app.route('/floor-plan')
@login_required
def floor_plan():
    return render_template('floor-plan.html', current_user=get_current_user(), page='floor-plan')

@app.route('/builder')
@login_required
def builder():
    return render_template('builder.html', current_user=get_current_user(), page='builder')

@app.route('/interior')
@login_required
def interior():
    return render_template('interior.html', current_user=get_current_user(), page='interior')

@app.route('/cost')
@login_required
def cost():
    return render_template('cost.html', current_user=get_current_user(), page='cost')

@app.route('/risk')
@login_required
def risk():
    return render_template('risk.html', current_user=get_current_user(), page='risk')

@app.route('/summary')
@login_required
def summary():
    return render_template('summary.html', current_user=get_current_user(), page='summary')

@app.route('/data-sources')
def data_sources():
    return render_template('data-sources.html', current_user=get_current_user(), page='data-sources')

# --- API AUTH ---
@app.route('/api/auth/register', methods=['POST'])
def api_register():
    data = request.json or {}
    name = str(data.get('name', '')).strip()
    email = str(data.get('email', '')).strip().lower()
    password = str(data.get('password', ''))
    
    if not name or not email or not password:
        return jsonify({'error': 'Name, email, and password are required'}), 400
    if len(name) < 2 or len(name) > 100:
        return jsonify({'error': 'Name must be between 2 and 100 characters'}), 400
    import re
    if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email):
        return jsonify({'error': 'Invalid email address format'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    if len(password) > 128:
        return jsonify({'error': 'Password exceeds maximum length'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'An account with this email already exists'}), 400
    user = User(
        name=name,
        email=email,
        password_hash=generate_password_hash(password)
    )
    db.session.add(user)
    db.session.commit()
    session['user_id'] = user.id
    return jsonify({
        'message': 'Registration successful',
        'user': {'id': user.id, 'name': user.name, 'email': user.email}
    }), 201

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.json or {}
    email = str(data.get('email', '')).strip().lower()
    password = str(data.get('password', ''))
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    user = User.query.filter_by(email=email).first()
    if user and check_password_hash(user.password_hash, password):
        session['user_id'] = user.id
        return jsonify({
            'message': 'Login successful',
            'user': {'id': user.id, 'name': user.name, 'email': user.email}
        }), 200
    return jsonify({'error': 'Invalid email or password'}), 401

@app.route('/api/auth/logout', methods=['GET'])
def api_logout():
    session.pop('user_id', None)
    return jsonify({'message': 'Logged out successfully'})

@app.route('/api/auth/me', methods=['GET'])
def api_me():
    user = get_current_user()
    if user:
        return jsonify({'id': user.id, 'name': user.name, 'email': user.email})
    return jsonify({'error': 'Not authenticated'}), 401

# --- API PROJECTS ---
@app.route('/api/projects', methods=['GET'])
@login_required
def api_get_projects():
    projects = Project.query.filter_by(user_id=session['user_id']).order_by(Project.created_at.desc()).all()
    return jsonify([{
        'id': p.id,
        'name': p.name,
        'data': json.loads(p.data_json) if p.data_json else {},
        'created_at': p.created_at.isoformat() if p.created_at else None,
        'updated_at': p.updated_at.isoformat() if p.updated_at else None
    } for p in projects])

@app.route('/api/projects', methods=['POST'])
@login_required
def api_create_project():
    data = request.json or {}
    if 'name' not in data or 'data' not in data:
        return jsonify({'error': 'Missing name or data'}), 400
    name = str(data.get('name', '')).strip()
    if not name:
        return jsonify({'error': 'Project name cannot be empty'}), 400
    if len(name) > 100:
        return jsonify({'error': 'Project name cannot exceed 100 characters'}), 400
    
    project_data = data.get('data')
    if not isinstance(project_data, (dict, list)):
        return jsonify({'error': 'Project data must be a valid JSON object or array'}), 400
        
    raw_json = json.dumps(project_data)
    if len(raw_json) > 5 * 1024 * 1024:
        return jsonify({'error': 'Project payload exceeds size limit (5MB)'}), 413
        
    project = Project(
        user_id=session['user_id'],
        name=name,
        data_json=raw_json
    )
    db.session.add(project)
    db.session.commit()
    return jsonify({
        'message': 'Project created',
        'id': project.id,
        'project': {'id': project.id, 'name': project.name}
    }), 201

@app.route('/api/projects/<int:project_id>', methods=['GET'])
@login_required
def api_get_project(project_id):
    project = Project.query.filter_by(id=project_id, user_id=session['user_id']).first()
    if not project:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({
        'id': project.id,
        'name': project.name,
        'data': json.loads(project.data_json) if project.data_json else {}
    })

@app.route('/api/projects/<int:project_id>', methods=['PUT'])
@login_required
def api_update_project(project_id):
    project = Project.query.filter_by(id=project_id, user_id=session['user_id']).first()
    if not project:
        return jsonify({'error': 'Not found'}), 404
    data = request.json or {}
    if 'name' in data:
        name = str(data['name']).strip()
        if not name:
            return jsonify({'error': 'Project name cannot be empty'}), 400
        if len(name) > 100:
            return jsonify({'error': 'Project name cannot exceed 100 characters'}), 400
        project.name = name
    if 'data' in data:
        project_data = data['data']
        if not isinstance(project_data, (dict, list)):
            return jsonify({'error': 'Project data must be a valid JSON object or array'}), 400
        project.data_json = json.dumps(project_data)
    project.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify({
        'message': 'Project updated',
        'id': project.id,
        'project': {'id': project.id, 'name': project.name}
    }), 200

@app.route('/api/projects/<int:project_id>', methods=['DELETE'])
@login_required
def api_delete_project(project_id):
    project = Project.query.filter_by(id=project_id, user_id=session['user_id']).first()
    if not project:
        return jsonify({'error': 'Not found'}), 404
    db.session.delete(project)
    db.session.commit()
    return jsonify({'message': 'Project deleted'})

# --- API DATA ---
@app.route('/api/data/materials', methods=['GET'])
def api_materials():
    return jsonify(read_json_data('materials.json'))

@app.route('/api/data/cost-rates', methods=['GET'])
def api_cost_rates():
    return jsonify(read_json_data('cost_rates.json'))

@app.route('/api/data/risk/<city>', methods=['GET'])
def api_risk(city):
    risk_data = read_json_data('location_risk.json')
    cities = risk_data.get('cities', {})
    city_aliases = {
        'bangalore': 'Bengaluru',
        'bombay': 'Mumbai',
        'madras': 'Chennai',
        'calcutta': 'Kolkata',
        'gurgaon': 'Faridabad',
        'noida': 'Ghaziabad'
    }
    lookup_city = city_aliases.get(city.lower(), city)
    # Case-insensitive lookup
    for key, value in cities.items():
        if key.lower() == lookup_city.lower():
            return jsonify(value)
    return jsonify({'error': 'City not found'}), 404

@app.route('/api/data/layouts', methods=['GET'])
def api_layouts():
    return jsonify(read_json_data('house_layouts.json'))

@app.route('/static/<path:filename>')
def serve_static_assets(filename):
    public_dir = os.path.join(app.root_path, 'public', 'static')
    if os.path.exists(os.path.join(public_dir, filename)):
        return send_from_directory(public_dir, filename)
    return send_from_directory(os.path.join(app.root_path, 'static'), filename)

if __name__ == '__main__':
    debug = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 'yes')
    host = os.environ.get('HOST', '127.0.0.1')
    port = int(os.environ.get('PORT', 5000))
    app.run(host=host, port=port, debug=debug)
