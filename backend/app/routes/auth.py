from flask import Blueprint, request, jsonify, session, redirect, url_for, render_template, flash
from werkzeug.security import generate_password_hash, check_password_hash
from ..models.user import User
from ..extensions import db
from ..utils.auth import login_required, get_current_user

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        if not email or not password:
            flash('Please enter email and password.', 'error')
            return redirect(url_for('auth.login'))
        user = User.query.filter_by(email=email).first()
        if user and check_password_hash(user.password_hash, password):
            session['user_id'] = user.id
            flash(f'Welcome back, {user.name}!', 'success')
            return redirect(url_for('pages.dashboard'))
        flash('Invalid email or password. Please try again.', 'error')
        return redirect(url_for('auth.login'))
    return render_template('login.html', current_user=get_current_user(), page='login')

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        confirm = request.form.get('confirm_password', '')
        if not all([name, email, password]):
            flash('Please fill in all fields.', 'error')
            return redirect(url_for('auth.register'))
        if password != confirm:
            flash('Passwords do not match.', 'error')
            return redirect(url_for('auth.register'))
        if len(password) < 6:
            flash('Password must be at least 6 characters.', 'error')
            return redirect(url_for('auth.register'))
        if User.query.filter_by(email=email).first():
            flash('An account with this email already exists. Please log in.', 'error')
            return redirect(url_for('auth.login'))
        new_user = User(
            name=name,
            email=email,
            password_hash=generate_password_hash(password)
        )
        db.session.add(new_user)
        db.session.commit()
        session['user_id'] = new_user.id
        flash(f'Welcome to HamaraGhar, {name}! Your account has been created.', 'success')
        return redirect(url_for('pages.dashboard'))
    return render_template('register.html', current_user=get_current_user(), page='register')

@auth_bp.route('/logout')
def logout():
    session.pop('user_id', None)
    flash('You have been logged out.', 'info')
    return redirect(url_for('pages.index'))

# --- API Auth Routes ---
@auth_bp.route('/api/auth/register', methods=['POST'])
def api_register():
    data = request.json
    if not data or not all(k in data for k in ('name', 'email', 'password')):
        return jsonify({'success': False, 'error': {'code': 'VALIDATION_ERROR', 'message': 'Missing required fields: name, email, password'}}), 400
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'success': False, 'error': {'code': 'CONFLICT', 'message': 'User already exists'}}), 409
    user = User(
        name=data['name'],
        email=data['email'],
        password_hash=generate_password_hash(data['password'])
    )
    db.session.add(user)
    db.session.commit()
    session['user_id'] = user.id
    return jsonify({'success': True, 'data': {'message': 'Registration successful', 'user': user.to_dict()}}), 201

@auth_bp.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.json
    if not data or not all(k in data for k in ('email', 'password')):
        return jsonify({'success': False, 'error': {'code': 'VALIDATION_ERROR', 'message': 'Missing required fields'}}), 400
    user = User.query.filter_by(email=data['email']).first()
    if user and check_password_hash(user.password_hash, data['password']):
        session['user_id'] = user.id
        return jsonify({'success': True, 'data': {'message': 'Login successful', 'user': user.to_dict()}})
    return jsonify({'success': False, 'error': {'code': 'AUTH_FAILED', 'message': 'Invalid credentials'}}), 401

@auth_bp.route('/api/auth/logout', methods=['GET'])
def api_logout():
    session.pop('user_id', None)
    return jsonify({'success': True, 'data': {'message': 'Logged out successfully'}})

@auth_bp.route('/api/auth/me', methods=['GET'])
def api_me():
    user = get_current_user()
    if user:
        return jsonify({'success': True, 'data': user.to_dict()})
    return jsonify({'success': False, 'error': {'code': 'UNAUTHORIZED', 'message': 'Not authenticated'}}), 401
