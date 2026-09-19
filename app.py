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


def serialize_project(project):
    if not project:
        return None
    return {
        'id': project.id,
        'name': project.name,
        'data': json.loads(project.data_json) if project.data_json else {},
        'created_at': project.created_at.isoformat() if project.created_at else None,
        'updated_at': project.updated_at.isoformat() if project.updated_at else None
    }

def get_scoped_project(project_id_param=None):
    if 'user_id' not in session:
        return None
    project = None
    if project_id_param:
        try:
            project = Project.query.filter_by(id=int(project_id_param), user_id=session['user_id']).first()
        except (ValueError, TypeError):
            pass
    if not project:
        project = Project.query.filter_by(user_id=session['user_id']).order_by(Project.updated_at.desc(), Project.created_at.desc()).first()
    return project

def generate_deterministic_floor_plan(config, floor=0, variant=0):
    config = config or {}
    plot_width = max(20.0, float(config.get('plotWidth') or config.get('plot_width') or 40.0))
    plot_length = max(25.0, float(config.get('plotLength') or config.get('plot_length') or 50.0))
    bhk = max(1, int(config.get('bedrooms') or config.get('bhk') or 3))
    bathrooms = max(1, int(config.get('bathrooms') or 2))
    total_floors = max(1, int(config.get('floors') or 1))
    features = config.get('features')
    if not isinstance(features, list):
        features = ['Parking', 'Balcony', 'Pooja Room', 'Utility']

    setback_front = round(max(4.0, min(8.0, plot_length * 0.10)), 1)
    setback_rear = round(max(3.0, min(6.0, plot_length * 0.08)), 1)
    setback_side = round(max(2.5, min(5.0, plot_width * 0.08)), 1)

    build_width = round(max(14.0, plot_width - setback_side * 2), 1)
    build_length = round(max(16.0, plot_length - setback_front - setback_rear), 1)
    start_x = setback_side
    start_y = setback_front

    rooms = []
    doors = []
    windows = []

    COLORS = {
        'living': '#1e3a5f',
        'masterBed': '#0d9488',
        'bedroom': '#0284c7',
        'kitchen': '#d97706',
        'bath': '#475569',
        'pooja': '#7c3aed',
        'parking': '#334155',
        'balcony': '#059669',
        'corridor': '#1e293b',
        'study': '#4338ca'
    }

    VARIANT_NAMES = [
        'Vastu-Aligned Classic',
        'Modern Open-Plan Living',
        'Linear High-Efficiency Circulation'
    ]

    floor = int(floor)
    variant = int(variant) % 3

    if floor == 0:
        has_parking = ('Parking' in features or 'Car Porch' in features) and build_width >= 22.0

        if variant == 0:
            front_len = round(build_length * 0.38, 1)
            if has_parking:
                park_w = round(build_width * 0.38, 1)
                rooms.append({
                    'id': 'g_park',
                    'name': 'Car Porch',
                    'type': 'parking',
                    'zone': 'service',
                    'x': start_x,
                    'y': start_y,
                    'width': park_w,
                    'height': front_len,
                    'color': COLORS['parking'],
                    'floorName': 'Heavy Duty Pavers'
                })
                liv_w = round(build_width - park_w, 1)
                rooms.append({
                    'id': 'g_living',
                    'name': 'Living & Foyer',
                    'type': 'living',
                    'zone': 'public',
                    'x': round(start_x + park_w, 1),
                    'y': start_y,
                    'width': liv_w,
                    'height': front_len,
                    'color': COLORS['living'],
                    'floorName': 'Vitrified Tiles'
                })
            else:
                rooms.append({
                    'id': 'g_living',
                    'name': 'Living & Entrance Foyer',
                    'type': 'living',
                    'zone': 'public',
                    'x': start_x,
                    'y': start_y,
                    'width': build_width,
                    'height': front_len,
                    'color': COLORS['living'],
                    'floorName': 'Italian Marble Tiles'
                })

            mid_y = round(start_y + front_len, 1)
            mid_len = round(build_length * 0.34, 1)
            mid_split = round(build_width * 0.48, 1)

            has_pooja = ('Pooja Room' in features or 'Pooja' in features) and build_width >= 20.0
            if has_pooja:
                pooja_w = round(min(6.0, mid_split * 0.35), 1)
                pooja_l = round(min(6.0, mid_len * 0.40), 1)
                rooms.append({
                    'id': 'g_pooja',
                    'name': 'Pooja Mandir',
                    'type': 'pooja',
                    'zone': 'public',
                    'x': round(start_x + mid_split - pooja_w, 1),
                    'y': mid_y,
                    'width': pooja_w,
                    'height': pooja_l,
                    'color': COLORS['pooja'],
                    'floorName': 'White Makrana Marble'
                })
                kit_len = round(mid_len - pooja_l, 1)
                rooms.append({
                    'id': 'g_kitchen',
                    'name': 'Modular Kitchen & Dining',
                    'type': 'kitchen',
                    'zone': 'service',
                    'x': start_x,
                    'y': round(mid_y + pooja_l, 1),
                    'width': mid_split,
                    'height': kit_len,
                    'color': COLORS['kitchen'],
                    'floorName': 'Anti-Skid Vitrified'
                })
            else:
                rooms.append({
                    'id': 'g_kitchen',
                    'name': 'Kitchen & Dining Space',
                    'type': 'kitchen',
                    'zone': 'service',
                    'x': start_x,
                    'y': mid_y,
                    'width': mid_split,
                    'height': mid_len,
                    'color': COLORS['kitchen'],
                    'floorName': 'Anti-Skid Vitrified'
                })

            bed1_w = round(build_width - mid_split, 1)
            bed1_name = 'Master Bedroom (SW)' if total_floors == 1 else 'Guest / Parents Bedroom'
            rooms.append({
                'id': 'g_bed1',
                'name': bed1_name,
                'type': 'masterBed' if total_floors == 1 else 'bedroom',
                'zone': 'private',
                'x': round(start_x + mid_split, 1),
                'y': mid_y,
                'width': bed1_w,
                'height': mid_len,
                'color': COLORS['masterBed'] if total_floors == 1 else COLORS['bedroom'],
                'floorName': 'Wooden Textured Tiles'
            })

            rear_y = round(mid_y + mid_len, 1)
            rear_len = round(max(7.0, build_length - (front_len + mid_len)), 1)
            bath_w = round(min(8.0, max(5.0, build_width * 0.28)), 1)

            rooms.append({
                'id': 'g_bath',
                'name': 'Common Bath & Toilet',
                'type': 'bath',
                'zone': 'wet',
                'x': start_x,
                'y': rear_y,
                'width': bath_w,
                'height': rear_len,
                'color': COLORS['bath'],
                'floorName': 'Ceramic Matte'
            })

            rem_w = round(build_width - bath_w, 1)
            if total_floors == 1 and bhk >= 2:
                rooms.append({
                    'id': 'g_bed2',
                    'name': 'Bedroom 2',
                    'type': 'bedroom',
                    'zone': 'private',
                    'x': round(start_x + bath_w, 1),
                    'y': rear_y,
                    'width': rem_w,
                    'height': rear_len,
                    'color': COLORS['bedroom'],
                    'floorName': 'Vitrified Tiles'
                })
            else:
                util_w = round(rem_w * 0.45, 1)
                sitout_w = round(rem_w - util_w, 1)
                rooms.append({
                    'id': 'g_util',
                    'name': 'Utility & Wash Area',
                    'type': 'corridor',
                    'zone': 'service',
                    'x': round(start_x + bath_w, 1),
                    'y': rear_y,
                    'width': util_w,
                    'height': rear_len,
                    'color': COLORS['corridor'],
                    'floorName': 'Granite Slabs'
                })
                rooms.append({
                    'id': 'g_sitout',
                    'name': 'Rear Courtyard / Sit-Out',
                    'type': 'balcony',
                    'zone': 'public',
                    'x': round(start_x + bath_w + util_w, 1),
                    'y': rear_y,
                    'width': sitout_w,
                    'height': rear_len,
                    'color': COLORS['balcony'],
                    'floorName': 'Stone Decking'
                })

        elif variant == 1:
            front_len = round(build_length * 0.42, 1)
            kit_w = round(build_width * 0.38, 1)
            liv_w = round(build_width - kit_w, 1)

            rooms.append({
                'id': 'g_greatroom',
                'name': 'Grand Living & Lounge',
                'type': 'living',
                'zone': 'public',
                'x': start_x,
                'y': start_y,
                'width': liv_w,
                'height': front_len,
                'color': COLORS['living'],
                'floorName': 'Polished Italian Marble'
            })
            rooms.append({
                'id': 'g_island_kitchen',
                'name': 'Open Island Kitchen & Pantry',
                'type': 'kitchen',
                'zone': 'service',
                'x': round(start_x + liv_w, 1),
                'y': start_y,
                'width': kit_w,
                'height': front_len,
                'color': COLORS['kitchen'],
                'floorName': 'Quartz Finish Flooring'
            })

            rear_y = round(start_y + front_len, 1)
            rear_len = round(build_length - front_len, 1)
            bed_w = round(build_width * 0.58, 1)
            bath_w = round(build_width - bed_w, 1)

            rooms.append({
                'id': 'g_ground_suite',
                'name': 'Ground Floor Suite',
                'type': 'masterBed',
                'zone': 'private',
                'x': start_x,
                'y': rear_y,
                'width': bed_w,
                'height': rear_len,
                'color': COLORS['masterBed'],
                'floorName': 'Engineered Hardwood'
            })
            bath_half = round(rear_len * 0.5, 1)
            rooms.append({
                'id': 'g_suite_bath',
                'name': 'Ensuite Bath',
                'type': 'bath',
                'zone': 'wet',
                'x': round(start_x + bed_w, 1),
                'y': rear_y,
                'width': bath_w,
                'height': bath_half,
                'color': COLORS['bath'],
                'floorName': 'Porcelain Tile'
            })
            rooms.append({
                'id': 'g_powder_room',
                'name': 'Powder Room & Laundry',
                'type': 'corridor',
                'zone': 'service',
                'x': round(start_x + bed_w, 1),
                'y': round(rear_y + bath_half, 1),
                'width': bath_w,
                'height': round(rear_len - bath_half, 1),
                'color': COLORS['corridor'],
                'floorName': 'Ceramic Tile'
            })

        else:
            front_len = round(build_length * 0.32, 1)
            rooms.append({
                'id': 'g_linear_living',
                'name': 'Formal Living Room',
                'type': 'living',
                'zone': 'public',
                'x': start_x,
                'y': start_y,
                'width': build_width,
                'height': front_len,
                'color': COLORS['living'],
                'floorName': 'Vitrified Tiles'
            })

            mid_y = round(start_y + front_len, 1)
            mid_len = round(build_length * 0.38, 1)
            col_w = round(build_width / 3.0, 1)

            rooms.append({
                'id': 'g_dining_hall',
                'name': 'Dining Hall',
                'type': 'living',
                'zone': 'public',
                'x': start_x,
                'y': mid_y,
                'width': col_w,
                'height': mid_len,
                'color': COLORS['living'],
                'floorName': 'Vitrified Tiles'
            })
            rooms.append({
                'id': 'g_compact_kitchen',
                'name': 'Kitchen',
                'type': 'kitchen',
                'zone': 'service',
                'x': round(start_x + col_w, 1),
                'y': mid_y,
                'width': col_w,
                'height': mid_len,
                'color': COLORS['kitchen'],
                'floorName': 'Anti-Skid Tiles'
            })
            rooms.append({
                'id': 'g_guest_bed',
                'name': 'Bedroom (Guest)',
                'type': 'bedroom',
                'zone': 'private',
                'x': round(start_x + col_w * 2, 1),
                'y': mid_y,
                'width': round(build_width - col_w * 2, 1),
                'height': mid_len,
                'color': COLORS['bedroom'],
                'floorName': 'Wooden Flooring'
            })

            rear_y = round(mid_y + mid_len, 1)
            rear_len = round(max(6.0, build_length - (front_len + mid_len)), 1)
            half_w = round(build_width * 0.5, 1)
            rooms.append({
                'id': 'g_bath_rear',
                'name': 'Bath & Washroom',
                'type': 'bath',
                'zone': 'wet',
                'x': start_x,
                'y': rear_y,
                'width': half_w,
                'height': rear_len,
                'color': COLORS['bath'],
                'floorName': 'Anti-Skid Tiles'
            })
            rooms.append({
                'id': 'g_rear_veranda',
                'name': 'Verandah & Storage',
                'type': 'corridor',
                'zone': 'service',
                'x': round(start_x + half_w, 1),
                'y': rear_y,
                'width': round(build_width - half_w, 1),
                'height': rear_len,
                'color': COLORS['corridor'],
                'floorName': 'Kota Stone'
            })

    else:
        # FIRST FLOOR
        front_len = round(build_length * 0.35, 1)
        balcony_w = round(build_width * 0.40, 1)
        lounge_w = round(build_width - balcony_w, 1)

        rooms.append({
            'id': 'f1_lounge',
            'name': 'Upper Family Lounge',
            'type': 'living',
            'zone': 'public',
            'x': start_x,
            'y': start_y,
            'width': lounge_w,
            'height': front_len,
            'color': COLORS['living'],
            'floorName': 'Vitrified Tiles'
        })
        rooms.append({
            'id': 'f1_balcony',
            'name': 'Front Sunset Balcony',
            'type': 'balcony',
            'zone': 'public',
            'x': round(start_x + lounge_w, 1),
            'y': start_y,
            'width': balcony_w,
            'height': front_len,
            'color': COLORS['balcony'],
            'floorName': 'Weatherproof Deck Tiles'
        })

        mid_y = round(start_y + front_len, 1)
        mid_len = round(build_length * 0.40, 1)
        master_w = round(build_width * 0.60, 1)
        bath_w = round(build_width - master_w, 1)

        rooms.append({
            'id': 'f1_master_suite',
            'name': 'Master Bedroom Suite',
            'type': 'masterBed',
            'zone': 'private',
            'x': start_x,
            'y': mid_y,
            'width': master_w,
            'height': mid_len,
            'color': COLORS['masterBed'],
            'floorName': 'Solid Wood Parquet'
        })

        dress_len = round(mid_len * 0.45, 1)
        rooms.append({
            'id': 'f1_master_bath',
            'name': 'Master Ensuite Bath',
            'type': 'bath',
            'zone': 'wet',
            'x': round(start_x + master_w, 1),
            'y': mid_y,
            'width': bath_w,
            'height': dress_len,
            'color': COLORS['bath'],
            'floorName': 'Italian Porcelain Tiles'
        })
        rooms.append({
            'id': 'f1_walkin_dress',
            'name': 'Walk-In Wardrobe / Dress',
            'type': 'corridor',
            'zone': 'private',
            'x': round(start_x + master_w, 1),
            'y': round(mid_y + dress_len, 1),
            'width': bath_w,
            'height': round(mid_len - dress_len, 1),
            'color': COLORS['corridor'],
            'floorName': 'Hardwood Flooring'
        })

        rear_y = round(mid_y + mid_len, 1)
        rear_len = round(max(7.0, build_length - (front_len + mid_len)), 1)

        if bhk >= 4 or 'Study Room' in features:
            bed2_w = round(build_width * 0.58, 1)
            study_w = round(build_width - bed2_w, 1)
            rooms.append({
                'id': 'f1_bed2',
                'name': 'Bedroom 2 (Children)',
                'type': 'bedroom',
                'zone': 'private',
                'x': start_x,
                'y': rear_y,
                'width': bed2_w,
                'height': rear_len,
                'color': COLORS['bedroom'],
                'floorName': 'Laminated Wood Flooring'
            })
            rooms.append({
                'id': 'f1_study',
                'name': 'Study / Home Office',
                'type': 'study',
                'zone': 'private',
                'x': round(start_x + bed2_w, 1),
                'y': rear_y,
                'width': study_w,
                'height': rear_len,
                'color': COLORS['study'],
                'floorName': 'Acoustic Hardwood'
            })
        else:
            rooms.append({
                'id': 'f1_bed2',
                'name': 'Bedroom 2 (Kids Room)',
                'type': 'bedroom',
                'zone': 'private',
                'x': start_x,
                'y': rear_y,
                'width': build_width,
                'height': rear_len,
                'color': COLORS['bedroom'],
                'floorName': 'Laminated Wood Flooring'
            })

    total_carpet = 0.0
    for idx, r in enumerate(rooms):
        w = float(r['width'])
        h = float(r['height'])
        area = round(w * h, 1)
        r['area'] = area
        total_carpet += area

        rx = float(r['x'])
        ry = float(r['y'])

        if abs(ry - start_y) < 0.2:
            windows.append({'x': round(rx + w * 0.5, 1), 'y': ry, 'width': 4.0, 'wall': 'north'})
        if abs((ry + h) - (start_y + build_length)) < 0.2:
            windows.append({'x': round(rx + w * 0.5, 1), 'y': round(ry + h, 1), 'width': 4.0, 'wall': 'south'})
        if abs(rx - start_x) < 0.2:
            windows.append({'x': rx, 'y': round(ry + h * 0.5, 1), 'width': 3.5, 'wall': 'west'})
        if abs((rx + w) - (start_x + build_width)) < 0.2:
            windows.append({'x': round(rx + w, 1), 'y': round(ry + h * 0.5, 1), 'width': 3.5, 'wall': 'east'})

        doors.append({'x': round(rx + 2.0, 1), 'y': round(ry + h, 1), 'width': 3.0, 'swing': 'inward'})

    builtup = round(build_width * build_length, 1)
    efficiency = round((total_carpet / builtup) * 100.0, 1) if builtup > 0 else 0.0

    return {
        'floor': floor,
        'variant': variant,
        'variantName': VARIANT_NAMES[variant],
        'dimensions': {
            'width': plot_width,
            'length': plot_length,
            'buildWidth': build_width,
            'buildLength': build_length
        },
        'setbacks': {
            'front': setback_front,
            'rear': setback_rear,
            'side': setback_side
        },
        'rooms': rooms,
        'doors': doors,
        'windows': windows,
        'carpetArea': round(total_carpet),
        'builtupArea': round(builtup),
        'efficiency': efficiency,
        'roomCount': len(rooms),
        'doorCount': len(doors),
        'windowCount': len(windows)
    }

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
    project = get_scoped_project(request.args.get('project_id'))
    return render_template('floor-plan.html', current_user=get_current_user(), page='floor-plan', project=project, project_dict=serialize_project(project))

@app.route('/builder')
@login_required
def builder():
    project = get_scoped_project(request.args.get('project_id'))
    return render_template('builder.html', current_user=get_current_user(), page='builder', project=project, project_dict=serialize_project(project))

@app.route('/interior')
@login_required
def interior():
    project = get_scoped_project(request.args.get('project_id'))
    return render_template('interior.html', current_user=get_current_user(), page='interior', project=project, project_dict=serialize_project(project))

@app.route('/cost')
@login_required
def cost():
    project = get_scoped_project(request.args.get('project_id'))
    return render_template('cost.html', current_user=get_current_user(), page='cost', project=project, project_dict=serialize_project(project))

@app.route('/risk')
@login_required
def risk():
    project = get_scoped_project(request.args.get('project_id'))
    return render_template('risk.html', current_user=get_current_user(), page='risk', project=project, project_dict=serialize_project(project))

@app.route('/summary')
@login_required
def summary():
    project = get_scoped_project(request.args.get('project_id'))
    return render_template('summary.html', current_user=get_current_user(), page='summary', project=project, project_dict=serialize_project(project))

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

# --- API FLOOR PLAN ---
@app.route('/api/projects/<int:project_id>/floor-plan', methods=['GET'])
@login_required
def api_get_project_floor_plan(project_id):
    project = Project.query.filter_by(id=project_id, user_id=session['user_id']).first()
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    data = json.loads(project.data_json) if project.data_json else {}
    floor = request.args.get('floor', default=0, type=int)
    variant = request.args.get('variant', default=0, type=int)
    force = request.args.get('force', default='false').lower() == 'true'

    floor_plans = data.get('floor_plans', {})
    floor_key = f"floor_{floor}"

    layout = floor_plans.get(floor_key)
    if not layout or force or layout.get('variant') != variant:
        layout = generate_deterministic_floor_plan(data, floor=floor, variant=variant)
        floor_plans[floor_key] = layout
        data['floor_plans'] = floor_plans
        project.data_json = json.dumps(data)
        project.updated_at = datetime.now(timezone.utc)
        db.session.commit()

    return jsonify({
        'projectId': project.id,
        'projectName': project.name,
        'floor': floor,
        'variant': variant,
        'layout': layout
    })

@app.route('/api/projects/<int:project_id>/floor-plan/generate', methods=['POST'])
@login_required
def api_generate_project_floor_plan(project_id):
    project = Project.query.filter_by(id=project_id, user_id=session['user_id']).first()
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    req_data = request.json or {}
    floor = int(req_data.get('floor', 0))
    variant = int(req_data.get('variant', 0))

    data = json.loads(project.data_json) if project.data_json else {}
    layout = generate_deterministic_floor_plan(data, floor=floor, variant=variant)

    floor_plans = data.get('floor_plans', {})
    floor_plans[f"floor_{floor}"] = layout
    data['floor_plans'] = floor_plans
    project.data_json = json.dumps(data)
    project.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({
        'message': 'Floor plan generated successfully',
        'projectId': project.id,
        'floor': floor,
        'variant': variant,
        'layout': layout
    })

@app.route('/api/projects/<int:project_id>/floor-plan', methods=['PUT'])
@login_required
def api_update_project_floor_plan(project_id):
    project = Project.query.filter_by(id=project_id, user_id=session['user_id']).first()
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    req_data = request.json or {}
    floor = int(req_data.get('floor', 0))
    updated_layout = req_data.get('layout')
    if not updated_layout:
        return jsonify({'error': 'Missing layout data'}), 400

    data = json.loads(project.data_json) if project.data_json else {}
    floor_plans = data.get('floor_plans', {})
    floor_plans[f"floor_{floor}"] = updated_layout
    data['floor_plans'] = floor_plans
    project.data_json = json.dumps(data)
    project.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({
        'message': 'Floor plan updated successfully',
        'projectId': project.id,
        'floor': floor
    })

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
