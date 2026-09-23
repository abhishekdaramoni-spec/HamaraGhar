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
class ServerlessDebugMiddleware:
    """Catches any uncaught exception in serverless environments and displays the Python traceback."""
    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        try:
            return self.wsgi_app(environ, start_response)
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            error_html = f"<!DOCTYPE html><html><body style='background:#0f172a;color:#f8fafc;padding:2rem;font-family:sans-serif;'><h2>Serverless Runtime Exception</h2><pre style='background:#1e293b;padding:1rem;color:#f87171;overflow:auto;'>{tb}</pre></body></html>"
            response_body = error_html.encode('utf-8')
            start_response('500 Internal Server Error', [
                ('Content-Type', 'text/html; charset=utf-8'),
                ('Content-Length', str(len(response_body)))
            ])
            return [response_body]

app.wsgi_app = ServerlessDebugMiddleware(app.wsgi_app)

# Stable secret key fallback for serverless functions (Vercel/Lambda)
app.secret_key = os.environ.get('SECRET_KEY', 'hamaraghar-session-secret-key-prod-2024')

# Database URI: serverless instances have a read-only filesystem except for /tmp
is_serverless = bool(
    os.environ.get('VERCEL') or
    os.environ.get('VERCEL_ENV') or
    os.environ.get('AWS_LAMBDA_FUNCTION_NAME') or
    os.environ.get('LAMBDA_TASK_ROOT') or
    (os.path.exists('/tmp') and os.name != 'nt')
)
default_db_uri = 'sqlite:////tmp/smartbuild.db' if is_serverless else 'sqlite:///smartbuild.db'
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
    try:
        db.create_all()
    except Exception as e:
        app.logger.warning(f"Initial db.create_all() failed: {e}. Switching to /tmp/smartbuild.db")
        try:
            app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////tmp/smartbuild.db'
            db.create_all()
        except Exception as inner_e:
            app.logger.warning(f"Serverless SQLite initialization fallback skipped: {inner_e}")

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
    plot_width = max(18.0, float(config.get('plotWidth') or config.get('plot_width') or 30.0))
    plot_length = max(22.0, float(config.get('plotLength') or config.get('plot_length') or 40.0))
    bhk = max(1, int(config.get('bedrooms') or config.get('bhk') or 2))
    bathrooms = max(1, int(config.get('bathrooms') or 2))
    total_floors = max(1, int(config.get('floors') or 1))
    features = config.get('features')
    if not isinstance(features, list):
        features = ['Parking', 'Balcony', 'Pooja Room', 'Utility']

    setback_front = round(max(3.5, min(8.0, plot_length * 0.10)), 1)
    setback_rear = round(max(2.5, min(6.0, plot_length * 0.08)), 1)
    setback_side = round(max(2.0, min(5.0, plot_width * 0.08)), 1)

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
        has_pooja = ('Pooja Room' in features or 'Pooja' in features) and build_width >= 20.0

        if bhk == 1:
            # 1 BHK Specialized Architectural Typology
            front_len = round(build_length * 0.42, 1)
            rear_len = round(build_length - front_len, 1)

            if variant == 0:  # Vastu 1BHK
                kit_w = round(build_width * 0.42, 1)
                liv_w = round(build_width - kit_w, 1)
                rooms.append({'id': 'g_liv', 'name': 'Living & Foyer', 'type': 'living', 'zone': 'public',
                              'x': start_x, 'y': start_y, 'width': liv_w, 'height': front_len, 'color': COLORS['living'], 'floorName': 'Vitrified Tiles'})
                rooms.append({'id': 'g_kit', 'name': 'Kitchen (SE)', 'type': 'kitchen', 'zone': 'service',
                              'x': round(start_x + liv_w, 1), 'y': start_y, 'width': kit_w, 'height': front_len, 'color': COLORS['kitchen'], 'floorName': 'Anti-Skid Vitrified'})
                bath_w = round(min(7.0, build_width * 0.35), 1)
                bed_w = round(build_width - bath_w, 1)
                rooms.append({'id': 'g_bath', 'name': 'Bath & WC', 'type': 'bath', 'zone': 'wet',
                              'x': start_x, 'y': round(start_y + front_len, 1), 'width': bath_w, 'height': rear_len, 'color': COLORS['bath'], 'floorName': 'Ceramic Matte'})
                rooms.append({'id': 'g_bed', 'name': 'Master Bedroom (SW)', 'type': 'masterBed', 'zone': 'private',
                              'x': round(start_x + bath_w, 1), 'y': round(start_y + front_len, 1), 'width': bed_w, 'height': rear_len, 'color': COLORS['masterBed'], 'floorName': 'Laminated Wooden'})
            elif variant == 1:  # Open Plan 1BHK
                liv_w = round(build_width * 0.60, 1)
                kit_w = round(build_width - liv_w, 1)
                rooms.append({'id': 'g_liv', 'name': 'Open Great Room', 'type': 'living', 'zone': 'public',
                              'x': start_x, 'y': start_y, 'width': liv_w, 'height': front_len, 'color': COLORS['living'], 'floorName': 'Italian Porcelain'})
                rooms.append({'id': 'g_kit', 'name': 'Modular Kitchen', 'type': 'kitchen', 'zone': 'service',
                              'x': round(start_x + liv_w, 1), 'y': start_y, 'width': kit_w, 'height': front_len, 'color': COLORS['kitchen'], 'floorName': 'Quartz Tiles'})
                bed_w = round(build_width * 0.65, 1)
                bath_w = round(build_width - bed_w, 1)
                rooms.append({'id': 'g_bed', 'name': 'Bedroom Suite', 'type': 'masterBed', 'zone': 'private',
                              'x': start_x, 'y': round(start_y + front_len, 1), 'width': bed_w, 'height': rear_len, 'color': COLORS['masterBed'], 'floorName': 'Engineered Hardwood'})
                rooms.append({'id': 'g_bath', 'name': 'Ensuite Bath', 'type': 'bath', 'zone': 'wet',
                              'x': round(start_x + bed_w, 1), 'y': round(start_y + front_len, 1), 'width': bath_w, 'height': rear_len, 'color': COLORS['bath'], 'floorName': 'Ceramic Matte'})
            else:  # Linear 1BHK
                col_w = round(build_width / 2.0, 1)
                rooms.append({'id': 'g_liv', 'name': 'Front Living Room', 'type': 'living', 'zone': 'public',
                              'x': start_x, 'y': start_y, 'width': build_width, 'height': front_len, 'color': COLORS['living'], 'floorName': 'Vitrified Tiles'})
                rooms.append({'id': 'g_kit', 'name': 'Kitchen', 'type': 'kitchen', 'zone': 'service',
                              'x': start_x, 'y': round(start_y + front_len, 1), 'width': col_w, 'height': round(rear_len * 0.6, 1), 'color': COLORS['kitchen'], 'floorName': 'Anti-Skid Vitrified'})
                rooms.append({'id': 'g_bath', 'name': 'Bathroom', 'type': 'bath', 'zone': 'wet',
                              'x': start_x, 'y': round(start_y + front_len + rear_len * 0.6, 1), 'width': col_w, 'height': round(rear_len * 0.4, 1), 'color': COLORS['bath'], 'floorName': 'Ceramic Matte'})
                rooms.append({'id': 'g_bed', 'name': 'Master Bedroom', 'type': 'masterBed', 'zone': 'private',
                              'x': round(start_x + col_w, 1), 'y': round(start_y + front_len, 1), 'width': round(build_width - col_w, 1), 'height': rear_len, 'color': COLORS['masterBed'], 'floorName': 'Laminated Wooden'})

        elif bhk == 2:
            # 2 BHK Specialized Architectural Typology across Variants
            front_len = round(build_length * 0.38, 1)
            mid_len = round(build_length * 0.34, 1)
            rear_len = round(build_length - front_len - mid_len, 1)

            if variant == 0:
                # Variant 0: Vastu-Aligned Classic 2BHK
                if has_parking:
                    park_w = round(build_width * 0.38, 1)
                    liv_w = round(build_width - park_w, 1)
                    rooms.append({'id': 'g_park', 'name': 'Car Porch', 'type': 'parking', 'zone': 'service',
                                  'x': start_x, 'y': start_y, 'width': park_w, 'height': front_len, 'color': COLORS['parking'], 'floorName': 'Heavy Duty Pavers'})
                    rooms.append({'id': 'g_liv', 'name': 'Living & Foyer', 'type': 'living', 'zone': 'public',
                                  'x': round(start_x + park_w, 1), 'y': start_y, 'width': liv_w, 'height': front_len, 'color': COLORS['living'], 'floorName': 'Vitrified Tiles'})
                else:
                    rooms.append({'id': 'g_liv', 'name': 'Living & Entrance Foyer', 'type': 'living', 'zone': 'public',
                                  'x': start_x, 'y': start_y, 'width': build_width, 'height': front_len, 'color': COLORS['living'], 'floorName': 'Italian Marble Tiles'})

                mid_split = round(build_width * 0.46, 1)
                rooms.append({'id': 'g_kit', 'name': 'Kitchen & Dining Space', 'type': 'kitchen', 'zone': 'service',
                              'x': start_x, 'y': round(start_y + front_len, 1), 'width': mid_split, 'height': mid_len, 'color': COLORS['kitchen'], 'floorName': 'Anti-Skid Vitrified'})
                rooms.append({'id': 'g_mbed', 'name': 'Master Bedroom (SW)', 'type': 'masterBed', 'zone': 'private',
                              'x': round(start_x + mid_split, 1), 'y': round(start_y + front_len, 1), 'width': round(build_width - mid_split, 1), 'height': mid_len, 'color': COLORS['masterBed'], 'floorName': 'Wooden Textured Tiles'})

                bath_w = round(min(7.0, build_width * 0.25), 1)
                bed2_w = round(build_width - (bath_w * 2), 1)
                rooms.append({'id': 'g_bath1', 'name': 'Common Bath', 'type': 'bath', 'zone': 'wet',
                              'x': start_x, 'y': round(start_y + front_len + mid_len, 1), 'width': bath_w, 'height': rear_len, 'color': COLORS['bath'], 'floorName': 'Ceramic Matte'})
                rooms.append({'id': 'g_bed2', 'name': 'Bedroom 2', 'type': 'bedroom', 'zone': 'private',
                              'x': round(start_x + bath_w, 1), 'y': round(start_y + front_len + mid_len, 1), 'width': bed2_w, 'height': rear_len, 'color': COLORS['bedroom'], 'floorName': 'Vitrified Tiles'})
                rooms.append({'id': 'g_bath2', 'name': 'Attached Bath', 'type': 'bath', 'zone': 'wet',
                              'x': round(start_x + bath_w + bed2_w, 1), 'y': round(start_y + front_len + mid_len, 1), 'width': bath_w, 'height': rear_len, 'color': COLORS['bath'], 'floorName': 'Ceramic Matte'})

            elif variant == 1:
                # Variant 1: Modern Open-Plan 2BHK
                kit_w = round(build_width * 0.40, 1)
                liv_w = round(build_width - kit_w, 1)
                rooms.append({'id': 'g_liv', 'name': 'Open Great Room & Lounge', 'type': 'living', 'zone': 'public',
                              'x': start_x, 'y': start_y, 'width': liv_w, 'height': front_len, 'color': COLORS['living'], 'floorName': 'Polished Marble'})
                rooms.append({'id': 'g_kit', 'name': 'Open Island Kitchen', 'type': 'kitchen', 'zone': 'service',
                              'x': round(start_x + liv_w, 1), 'y': start_y, 'width': kit_w, 'height': front_len, 'color': COLORS['kitchen'], 'floorName': 'Quartz Stone'})

                bed_split = round(build_width * 0.58, 1)
                suite_bath_w = round(build_width - bed_split, 1)
                rooms.append({'id': 'g_mbed', 'name': 'Master Bedroom Suite', 'type': 'masterBed', 'zone': 'private',
                              'x': start_x, 'y': round(start_y + front_len, 1), 'width': bed_split, 'height': mid_len, 'color': COLORS['masterBed'], 'floorName': 'Wooden Parquet'})
                rooms.append({'id': 'g_bath1', 'name': 'Ensuite Master Bath', 'type': 'bath', 'zone': 'wet',
                              'x': round(start_x + bed_split, 1), 'y': round(start_y + front_len, 1), 'width': suite_bath_w, 'height': mid_len, 'color': COLORS['bath'], 'floorName': 'Ceramic Matte'})

                bed2_w = round(build_width * 0.65, 1)
                bath2_w = round(build_width - bed2_w, 1)
                rooms.append({'id': 'g_bed2', 'name': 'Bedroom 2', 'type': 'bedroom', 'zone': 'private',
                              'x': start_x, 'y': round(start_y + front_len + mid_len, 1), 'width': bed2_w, 'height': rear_len, 'color': COLORS['bedroom'], 'floorName': 'Vitrified Tiles'})
                rooms.append({'id': 'g_bath2', 'name': 'Powder Bath', 'type': 'bath', 'zone': 'wet',
                              'x': round(start_x + bed2_w, 1), 'y': round(start_y + front_len + mid_len, 1), 'width': bath2_w, 'height': rear_len, 'color': COLORS['bath'], 'floorName': 'Ceramic Matte'})

            else:
                # Variant 2: Linear Circulation 2BHK
                rooms.append({'id': 'g_liv', 'name': 'Formal Living Hall', 'type': 'living', 'zone': 'public',
                              'x': start_x, 'y': start_y, 'width': build_width, 'height': front_len, 'color': COLORS['living'], 'floorName': 'Italian Tiles'})

                col_w = round(build_width * 0.42, 1)
                mbed_w = round(build_width - col_w, 1)
                rooms.append({'id': 'g_kit', 'name': 'Linear Kitchen', 'type': 'kitchen', 'zone': 'service',
                              'x': start_x, 'y': round(start_y + front_len, 1), 'width': col_w, 'height': mid_len, 'color': COLORS['kitchen'], 'floorName': 'Anti-Skid Vitrified'})
                rooms.append({'id': 'g_mbed', 'name': 'Master Bedroom Suite', 'type': 'masterBed', 'zone': 'private',
                              'x': round(start_x + col_w, 1), 'y': round(start_y + front_len, 1), 'width': mbed_w, 'height': mid_len, 'color': COLORS['masterBed'], 'floorName': 'Laminated Wood'})

                b_w = round(min(7.0, build_width * 0.30), 1)
                b2_w = round(build_width - b_w, 1)
                rooms.append({'id': 'g_bath', 'name': 'Central Bath', 'type': 'bath', 'zone': 'wet',
                              'x': start_x, 'y': round(start_y + front_len + mid_len, 1), 'width': b_w, 'height': rear_len, 'color': COLORS['bath'], 'floorName': 'Ceramic Matte'})
                rooms.append({'id': 'g_bed2', 'name': 'Bedroom 2', 'type': 'bedroom', 'zone': 'private',
                              'x': round(start_x + b_w, 1), 'y': round(start_y + front_len + mid_len, 1), 'width': b2_w, 'height': rear_len, 'color': COLORS['bedroom'], 'floorName': 'Vitrified Tiles'})

        else:
            # 3 BHK / 4+ BHK Multi-Space Typology across Variants
            front_len = round(build_length * 0.36, 1)
            mid_len = round(build_length * 0.34, 1)
            rear_len = round(build_length - front_len - mid_len, 1)

            if variant == 0:
                # Variant 0: Vastu-Aligned Classic
                if has_parking:
                    park_w = round(build_width * 0.38, 1)
                    liv_w = round(build_width - park_w, 1)
                    rooms.append({'id': 'g_park', 'name': 'Car Porch', 'type': 'parking', 'zone': 'service',
                                  'x': start_x, 'y': start_y, 'width': park_w, 'height': front_len, 'color': COLORS['parking'], 'floorName': 'Heavy Duty Pavers'})
                    rooms.append({'id': 'g_liv', 'name': 'Living & Foyer', 'type': 'living', 'zone': 'public',
                                  'x': round(start_x + park_w, 1), 'y': start_y, 'width': liv_w, 'height': front_len, 'color': COLORS['living'], 'floorName': 'Vitrified Tiles'})
                else:
                    rooms.append({'id': 'g_liv', 'name': 'Grand Living Hall', 'type': 'living', 'zone': 'public',
                                  'x': start_x, 'y': start_y, 'width': build_width, 'height': front_len, 'color': COLORS['living'], 'floorName': 'Italian Marble Tiles'})

                mid_split = round(build_width * 0.46, 1)
                if has_pooja:
                    pooja_w = round(min(5.5, mid_split * 0.35), 1)
                    rooms.append({'id': 'g_pooja', 'name': 'Pooja Mandir', 'type': 'pooja', 'zone': 'public',
                                  'x': start_x, 'y': round(start_y + front_len, 1), 'width': pooja_w, 'height': round(mid_len * 0.45, 1), 'color': COLORS['pooja'], 'floorName': 'White Makrana Marble'})
                    rooms.append({'id': 'g_kit', 'name': 'Modular Kitchen & Dining', 'type': 'kitchen', 'zone': 'service',
                                  'x': start_x, 'y': round(start_y + front_len + mid_len * 0.45, 1), 'width': mid_split, 'height': round(mid_len * 0.55, 1), 'color': COLORS['kitchen'], 'floorName': 'Anti-Skid Vitrified'})
                else:
                    rooms.append({'id': 'g_kit', 'name': 'Modular Kitchen & Dining', 'type': 'kitchen', 'zone': 'service',
                                  'x': start_x, 'y': round(start_y + front_len, 1), 'width': mid_split, 'height': mid_len, 'color': COLORS['kitchen'], 'floorName': 'Anti-Skid Vitrified'})

                bed1_name = 'Master Bedroom (SW)' if total_floors == 1 else 'Parents / Guest Bedroom'
                rooms.append({'id': 'g_bed1', 'name': bed1_name, 'type': 'masterBed' if total_floors == 1 else 'bedroom', 'zone': 'private',
                              'x': round(start_x + mid_split, 1), 'y': round(start_y + front_len, 1), 'width': round(build_width - mid_split, 1), 'height': mid_len, 'color': COLORS['masterBed'] if total_floors == 1 else COLORS['bedroom'], 'floorName': 'Wooden Textured Tiles'})

                bath_w = round(min(7.5, build_width * 0.25), 1)
                bed2_w = round(build_width - bath_w * 2, 1)
                bed2_name = 'Bedroom 2' if total_floors == 1 else 'Study / Bedroom 2'
                rooms.append({'id': 'g_bath1', 'name': 'Common Bath', 'type': 'bath', 'zone': 'wet',
                              'x': start_x, 'y': round(start_y + front_len + mid_len, 1), 'width': bath_w, 'height': rear_len, 'color': COLORS['bath'], 'floorName': 'Ceramic Matte'})
                rooms.append({'id': 'g_bed2', 'name': bed2_name, 'type': 'bedroom', 'zone': 'private',
                              'x': round(start_x + bath_w, 1), 'y': round(start_y + front_len + mid_len, 1), 'width': bed2_w, 'height': rear_len, 'color': COLORS['bedroom'], 'floorName': 'Vitrified Tiles'})
                rooms.append({'id': 'g_bath2', 'name': 'Attached Bath', 'type': 'bath', 'zone': 'wet',
                              'x': round(start_x + bath_w + bed2_w, 1), 'y': round(start_y + front_len + mid_len, 1), 'width': bath_w, 'height': rear_len, 'color': COLORS['bath'], 'floorName': 'Ceramic Matte'})

            elif variant == 1:
                # Variant 1: Modern Open-Plan Living
                kit_w = round(build_width * 0.38, 1)
                liv_w = round(build_width - kit_w, 1)
                rooms.append({'id': 'g_liv', 'name': 'Open Great Room & Lounge', 'type': 'living', 'zone': 'public',
                              'x': start_x, 'y': start_y, 'width': liv_w, 'height': front_len, 'color': COLORS['living'], 'floorName': 'Polished Italian Marble'})
                rooms.append({'id': 'g_kit', 'name': 'Open Island Kitchen & Dining', 'type': 'kitchen', 'zone': 'service',
                              'x': round(start_x + liv_w, 1), 'y': start_y, 'width': kit_w, 'height': front_len, 'color': COLORS['kitchen'], 'floorName': 'Quartz Stone'})

                bed_w = round(build_width * 0.58, 1)
                suite_bath_w = round(build_width - bed_w, 1)
                bed1_name = 'Master Bedroom Suite' if total_floors == 1 else 'Ground Guest Suite'
                rooms.append({'id': 'g_bed1', 'name': bed1_name, 'type': 'masterBed' if total_floors == 1 else 'bedroom', 'zone': 'private',
                              'x': start_x, 'y': round(start_y + front_len, 1), 'width': bed_w, 'height': mid_len, 'color': COLORS['masterBed'], 'floorName': 'Solid Hardwood'})
                rooms.append({'id': 'g_bath1', 'name': 'Ensuite Bath', 'type': 'bath', 'zone': 'wet',
                              'x': round(start_x + bed_w, 1), 'y': round(start_y + front_len, 1), 'width': suite_bath_w, 'height': mid_len, 'color': COLORS['bath'], 'floorName': 'Porcelain Tiles'})

                bath_w = round(min(7.0, build_width * 0.25), 1)
                bed2_w = round(build_width - bath_w, 1)
                rooms.append({'id': 'g_bath2', 'name': 'Powder / Common Bath', 'type': 'bath', 'zone': 'wet',
                              'x': start_x, 'y': round(start_y + front_len + mid_len, 1), 'width': bath_w, 'height': rear_len, 'color': COLORS['bath'], 'floorName': 'Ceramic Matte'})
                rooms.append({'id': 'g_bed2', 'name': 'Bedroom 2', 'type': 'bedroom', 'zone': 'private',
                              'x': round(start_x + bath_w, 1), 'y': round(start_y + front_len + mid_len, 1), 'width': bed2_w, 'height': rear_len, 'color': COLORS['bedroom'], 'floorName': 'Vitrified Tiles'})

            else:
                # Variant 2: Linear High-Efficiency Circulation
                rooms.append({'id': 'g_liv', 'name': 'Formal Living Room', 'type': 'living', 'zone': 'public',
                              'x': start_x, 'y': start_y, 'width': build_width, 'height': front_len, 'color': COLORS['living'], 'floorName': 'Vitrified Tiles'})

                col_w = round(build_width / 3.0, 1)
                rooms.append({'id': 'g_dining', 'name': 'Central Dining Spine', 'type': 'living', 'zone': 'public',
                              'x': start_x, 'y': round(start_y + front_len, 1), 'width': col_w, 'height': mid_len, 'color': COLORS['living'], 'floorName': 'Vitrified Tiles'})
                rooms.append({'id': 'g_kit', 'name': 'Enclosed Kitchen', 'type': 'kitchen', 'zone': 'service',
                              'x': round(start_x + col_w, 1), 'y': round(start_y + front_len, 1), 'width': col_w, 'height': mid_len, 'color': COLORS['kitchen'], 'floorName': 'Anti-Skid Vitrified'})
                rooms.append({'id': 'g_bed1', 'name': 'Guest / Study Bedroom', 'type': 'bedroom', 'zone': 'private',
                              'x': round(start_x + col_w * 2, 1), 'y': round(start_y + front_len, 1), 'width': round(build_width - col_w * 2, 1), 'height': mid_len, 'color': COLORS['bedroom'], 'floorName': 'Wooden Flooring'})

                bath_w = round(min(7.0, build_width * 0.25), 1)
                mbed_w = round(build_width - bath_w, 1)
                rooms.append({'id': 'g_bath1', 'name': 'Common Bath', 'type': 'bath', 'zone': 'wet',
                              'x': start_x, 'y': round(start_y + front_len + mid_len, 1), 'width': bath_w, 'height': rear_len, 'color': COLORS['bath'], 'floorName': 'Anti-Skid Tiles'})
                rooms.append({'id': 'g_mbed', 'name': 'Master Bedroom Suite', 'type': 'masterBed', 'zone': 'private',
                              'x': round(start_x + bath_w, 1), 'y': round(start_y + front_len + mid_len, 1), 'width': mbed_w, 'height': rear_len, 'color': COLORS['masterBed'], 'floorName': 'Laminated Hardwood'})

    else:
        # First Floor (Upper Level Duplex)
        front_len = round(build_length * 0.35, 1)
        balcony_w = round(build_width * 0.38, 1)
        lounge_w = round(build_width - balcony_w, 1)

        rooms.append({'id': 'f1_lounge', 'name': 'Upper Family Lounge', 'type': 'living', 'zone': 'public',
                      'x': start_x, 'y': start_y, 'width': lounge_w, 'height': front_len, 'color': COLORS['living'], 'floorName': 'Vitrified Tiles'})
        rooms.append({'id': 'f1_balcony', 'name': 'Open Terrace Balcony', 'type': 'balcony', 'zone': 'public',
                      'x': round(start_x + lounge_w, 1), 'y': start_y, 'width': balcony_w, 'height': front_len, 'color': COLORS['balcony'], 'floorName': 'Weatherproof Deck Tiles'})

        mid_y = round(start_y + front_len, 1)
        mid_len = round(build_length * 0.38, 1)
        master_w = round(build_width * 0.60, 1)
        bath_w = round(build_width - master_w, 1)

        rooms.append({'id': 'f1_master_suite', 'name': 'Master Bedroom Suite', 'type': 'masterBed', 'zone': 'private',
                      'x': start_x, 'y': mid_y, 'width': master_w, 'height': mid_len, 'color': COLORS['masterBed'], 'floorName': 'Solid Wood Parquet'})
        rooms.append({'id': 'f1_master_bath', 'name': 'Master Ensuite Bath', 'type': 'bath', 'zone': 'wet',
                      'x': round(start_x + master_w, 1), 'y': mid_y, 'width': bath_w, 'height': mid_len, 'color': COLORS['bath'], 'floorName': 'Italian Porcelain Tiles'})

        rear_y = round(mid_y + mid_len, 1)
        rear_len = round(max(7.0, build_length - (front_len + mid_len)), 1)
        if bhk >= 5:
            half_w = round(build_width / 2.0, 1)
            rooms.append({'id': 'f1_bed3', 'name': 'Bedroom 4', 'type': 'bedroom', 'zone': 'private',
                          'x': start_x, 'y': rear_y, 'width': half_w, 'height': rear_len, 'color': COLORS['bedroom'], 'floorName': 'Laminated Wood Flooring'})
            rooms.append({'id': 'f1_bed4', 'name': 'Bedroom 5 / Study', 'type': 'bedroom', 'zone': 'private',
                          'x': round(start_x + half_w, 1), 'y': rear_y, 'width': round(build_width - half_w, 1), 'height': rear_len, 'color': COLORS['bedroom'], 'floorName': 'Laminated Wood Flooring'})
        else:
            rooms.append({'id': 'f1_bed2', 'name': 'Children / Bedroom 3', 'type': 'bedroom', 'zone': 'private',
                          'x': start_x, 'y': rear_y, 'width': build_width, 'height': rear_len, 'color': COLORS['bedroom'], 'floorName': 'Laminated Wood Flooring'})

    # Compute Canonical Walls, Doors, Windows, and Areas
    total_carpet = 0.0
    walls = []
    
    # 4 Perimeter Structural Walls
    walls.append({'id': 'wall_ext_north', 'x1': start_x, 'y1': start_y, 'x2': round(start_x + build_width, 1), 'y2': start_y, 'thickness': 0.75, 'type': 'exterior'})
    walls.append({'id': 'wall_ext_south', 'x1': start_x, 'y1': round(start_y + build_length, 1), 'x2': round(start_x + build_width, 1), 'y2': round(start_y + build_length, 1), 'thickness': 0.75, 'type': 'exterior'})
    walls.append({'id': 'wall_ext_west', 'x1': start_x, 'y1': start_y, 'x2': start_x, 'y2': round(start_y + build_length, 1), 'thickness': 0.75, 'type': 'exterior'})
    walls.append({'id': 'wall_ext_east', 'x1': round(start_x + build_width, 1), 'y1': start_y, 'x2': round(start_x + build_width, 1), 'y2': round(start_y + build_length, 1), 'thickness': 0.75, 'type': 'exterior'})

    wall_counter = 1
    for r in rooms:
        w = float(r['width'])
        h = float(r['height'])
        area = round(w * h, 1)
        r['area'] = area
        if r['type'] not in ['parking', 'balcony']:
            total_carpet += area

        rx = float(r['x'])
        ry = float(r['y'])

        # Internal partition walls
        if abs((rx + w) - (start_x + build_width)) > 0.3:
            walls.append({'id': f'wall_int_{wall_counter}', 'x1': round(rx + w, 1), 'y1': ry, 'x2': round(rx + w, 1), 'y2': round(ry + h, 1), 'thickness': 0.38, 'type': 'interior'})
            wall_counter += 1
        if abs((ry + h) - (start_y + build_length)) > 0.3:
            walls.append({'id': f'wall_int_{wall_counter}', 'x1': rx, 'y1': round(ry + h, 1), 'x2': round(rx + w, 1), 'y2': round(ry + h, 1), 'thickness': 0.38, 'type': 'interior'})
            wall_counter += 1

        # Windows on external boundaries
        if abs(ry - start_y) < 0.3:
            windows.append({'x': round(rx + w * 0.5, 1), 'y': ry, 'width': 4.0, 'wall': 'north'})
        if abs((ry + h) - (start_y + build_length)) < 0.3:
            windows.append({'x': round(rx + w * 0.5, 1), 'y': round(ry + h, 1), 'width': 4.0, 'wall': 'south'})
        if abs(rx - start_x) < 0.3:
            windows.append({'x': rx, 'y': round(ry + h * 0.5, 1), 'width': 3.5, 'wall': 'west'})
        if abs((rx + w) - (start_x + build_width)) < 0.3:
            windows.append({'x': round(rx + w, 1), 'y': round(ry + h * 0.5, 1), 'width': 3.5, 'wall': 'east'})

        doors.append({'x': round(rx + 2.0, 1), 'y': round(ry + h, 1), 'width': 3.0, 'swing': 'inward'})

    builtup = round(build_width * build_length, 1)
    efficiency = round((total_carpet / builtup) * 100.0, 1) if builtup > 0 else 0.0

    return {
        'floor': floor,
        'floors': list(range(total_floors)),
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
        'walls': walls,
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
@app.errorhandler(404)
def handle_404(e):
    return jsonify({
        'error': '404 Not Found',
        'request_path': request.path,
        'request_full_path': request.full_path,
        'environ_PATH_INFO': request.environ.get('PATH_INFO'),
        'environ_SCRIPT_NAME': request.environ.get('SCRIPT_NAME'),
        'environ_HTTP_X_MATCHED_PATH': request.environ.get('HTTP_X_MATCHED_PATH'),
        'environ_HTTP_X_FORWARDED_URI': request.environ.get('HTTP_X_FORWARDED_URI'),
        'headers': dict(request.headers)
    }), 404

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

# --- ML INFERENCE API ---
from ml.security import rate_limit, validate_ml_numeric_input, sanitize_prompt_for_llm

@app.route('/favicon.ico')
def favicon():
    return '', 204

@app.route('/api/ml/health', methods=['GET'])
def api_ml_health():
    from ml.inference.predictor import get_inference_service
    service = get_inference_service()
    return jsonify(service.get_health_status())

@app.route('/api/ml/metadata', methods=['GET'])
def api_ml_metadata():
    from ml.inference.predictor import get_inference_service
    service = get_inference_service()
    return jsonify(service.get_metadata())

@app.route('/api/ml/predict-property-price', methods=['POST'])
@app.route('/api/ml/predict-cost', methods=['POST'])  # Backward compatibility alias
@rate_limit(max_per_minute=120)
def api_ml_predict_property_price():
    payload = request.get_json(silent=True) or {}
    is_valid, error_msg = validate_ml_numeric_input(payload)
    if not is_valid:
        return jsonify({'status': 'error', 'error_code': 'INVALID_INPUT_BOUNDS', 'message': error_msg}), 400
    from ml.inference.predictor import get_inference_service
    service = get_inference_service()
    result = service.predict_property_price(payload)
    return jsonify(result)

@app.route('/api/ml/calculate-construction-cost', methods=['POST'])
@rate_limit(max_per_minute=120)
def api_ml_calculate_construction_cost():
    payload = request.get_json(silent=True) or {}
    is_valid, error_msg = validate_ml_numeric_input(payload)
    if not is_valid:
        return jsonify({'status': 'error', 'error_code': 'INVALID_INPUT_BOUNDS', 'message': error_msg}), 400
    from ml.inference.predictor import get_inference_service
    service = get_inference_service()
    result = service.calculate_construction_cost(payload)
    return jsonify(result)

@app.route('/api/ml/predict', methods=['POST'])
@rate_limit(max_per_minute=120)
def api_ml_predict():
    payload = request.get_json(silent=True) or {}
    is_valid, error_msg = validate_ml_numeric_input(payload)
    if not is_valid:
        return jsonify({'status': 'error', 'error_code': 'INVALID_INPUT_BOUNDS', 'message': error_msg}), 400
    from ml.inference.predictor import get_inference_service
    service = get_inference_service()
    property_res = service.predict_property_price(payload)
    construction_res = service.calculate_construction_cost(payload)
    return jsonify({
        'status': 'success',
        'property_valuation_ml': property_res,
        'construction_cost_cpwd': construction_res,
    })

# --- LLM NATURAL LANGUAGE REQUIREMENT PARSER ---
@app.route('/api/ml/parse-requirements', methods=['POST'])
@rate_limit(max_per_minute=60)
def api_ml_parse_requirements():
    payload = request.get_json(silent=True) or {}
    raw_prompt = payload.get('prompt', '')
    prompt = sanitize_prompt_for_llm(raw_prompt)
    if not prompt:
        return jsonify({'status': 'error', 'error_code': 'EMPTY_PROMPT', 'message': 'Prompt cannot be empty.'}), 400
    from ml.llm.client import get_llm_service
    service = get_llm_service()
    parsed_req, warnings = service.parse_requirements(prompt)
    return jsonify({
        'status': 'success',
        'requirements': parsed_req.model_dump(),
        'physical_constraint_warnings': warnings,
    })

# --- HYBRID ARCHITECTURAL PLANNING ENGINE ---
@app.route('/api/ml/hybrid-plan', methods=['POST'])
@rate_limit(max_per_minute=120)
def api_ml_hybrid_plan():
    payload = request.get_json(silent=True) or {}
    is_valid, error_msg = validate_ml_numeric_input(payload)
    if not is_valid:
        return jsonify({'status': 'error', 'error_code': 'INVALID_INPUT_BOUNDS', 'message': error_msg}), 400
    floor = int(payload.get('floor', 0))
    variant = int(payload.get('variant', 0))
    from ml.planner.hybrid_engine import generate_hybrid_plan
    result = generate_hybrid_plan(payload, floor=floor, variant=variant)
    return jsonify(result)


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
