import os
import json
from functools import wraps
from flask import Flask, request, jsonify, session, redirect, url_for, render_template, flash
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone

app = Flask(__name__)
app.secret_key = 'smartbuild-secret-key-2024'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///smartbuild.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))

class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    data_json = db.Column(db.Text, nullable=False)  # Store project config as JSON string
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

with app.app_context():
    db.create_all()

# Decorators
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def get_current_user():
    if 'user_id' in session:
        return User.query.get(session['user_id'])
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
        flash(f'Welcome to SmartBuild 3D, {name}! Your account has been created.', 'success')
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


@app.route('/api/auth/register', methods=['POST'])
def api_register():
    data = request.json
    if not data or not all(k in data for k in ('name', 'email', 'password')):
        return jsonify({'error': 'Missing data'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'User already exists'}), 400
    
    user = User(
        name=data['name'],
        email=data['email'],
        password_hash=generate_password_hash(data['password'])
    )
    db.session.add(user)
    db.session.commit()
    session['user_id'] = user.id
    return jsonify({'message': 'Registration successful', 'user': {'id': user.id, 'name': user.name}})

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.json
    if not data or not all(k in data for k in ('email', 'password')):
        return jsonify({'error': 'Missing data'}), 400
    
    user = User.query.filter_by(email=data['email']).first()
    if user and check_password_hash(user.password_hash, data['password']):
        session['user_id'] = user.id
        return jsonify({'message': 'Login successful', 'user': {'id': user.id, 'name': user.name}})
    
    return jsonify({'error': 'Invalid credentials'}), 401

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

@app.route('/api/projects', methods=['GET'])
@login_required
def api_get_projects():
    projects = Project.query.filter_by(user_id=session['user_id']).order_by(Project.created_at.desc()).all()
    return jsonify([{
        'id': p.id,
        'name': p.name,
        'data': json.loads(p.data_json),
        'created_at': p.created_at.isoformat() if p.created_at else None,
        'updated_at': p.updated_at.isoformat() if p.updated_at else None
    } for p in projects])

@app.route('/api/projects', methods=['POST'])
@login_required
def api_create_project():
    data = request.json
    if not data or 'name' not in data or 'data' not in data:
        return jsonify({'error': 'Missing name or data'}), 400
    
    project = Project(
        user_id=session['user_id'],
        name=data['name'],
        data_json=json.dumps(data['data'])
    )
    db.session.add(project)
    db.session.commit()
    return jsonify({'message': 'Project created', 'id': project.id})

@app.route('/api/projects/<int:project_id>', methods=['GET'])
@login_required
def api_get_project(project_id):
    project = Project.query.filter_by(id=project_id, user_id=session['user_id']).first()
    if not project:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({'id': project.id, 'name': project.name, 'data': json.loads(project.data_json)})

@app.route('/api/projects/<int:project_id>', methods=['PUT'])
@login_required
def api_update_project(project_id):
    project = Project.query.filter_by(id=project_id, user_id=session['user_id']).first()
    if not project:
        return jsonify({'error': 'Not found'}), 404
    
    data = request.json
    if 'name' in data:
        project.name = data['name']
    if 'data' in data:
        project.data_json = json.dumps(data['data'])
    
    db.session.commit()
    return jsonify({'message': 'Project updated'})

@app.route('/api/projects/<int:project_id>', methods=['DELETE'])
@login_required
def api_delete_project(project_id):
    project = Project.query.filter_by(id=project_id, user_id=session['user_id']).first()
    if not project:
        return jsonify({'error': 'Not found'}), 404
    
    db.session.delete(project)
    db.session.commit()
    return jsonify({'message': 'Project deleted'})

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
    if city in cities:
        return jsonify(cities[city])
    return jsonify({'error': 'City not found'}), 404

@app.route('/api/data/layouts', methods=['GET'])
def api_layouts():
    return jsonify(read_json_data('house_layouts.json'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
