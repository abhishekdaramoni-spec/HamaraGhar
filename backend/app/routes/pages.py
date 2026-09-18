from flask import Blueprint, render_template
from ..utils.auth import login_required, get_current_user

pages_bp = Blueprint('pages', __name__)

@pages_bp.route('/')
def index():
    return render_template('landing.html', current_user=get_current_user(), page='landing')

@pages_bp.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', current_user=get_current_user(), page='dashboard')

@pages_bp.route('/requirements')
@login_required
def requirements():
    return render_template('requirements.html', current_user=get_current_user(), page='requirements')

@pages_bp.route('/floor-plan')
@login_required
def floor_plan():
    return render_template('floor-plan.html', current_user=get_current_user(), page='floor-plan')

@pages_bp.route('/builder')
@login_required
def builder():
    return render_template('builder.html', current_user=get_current_user(), page='builder')

@pages_bp.route('/interior')
@login_required
def interior():
    return render_template('interior.html', current_user=get_current_user(), page='interior')

@pages_bp.route('/cost')
@login_required
def cost():
    return render_template('cost.html', current_user=get_current_user(), page='cost')

@pages_bp.route('/risk')
@login_required
def risk():
    return render_template('risk.html', current_user=get_current_user(), page='risk')

@pages_bp.route('/summary')
@login_required
def summary():
    return render_template('summary.html', current_user=get_current_user(), page='summary')

@pages_bp.route('/data-sources')
def data_sources():
    return render_template('data-sources.html', current_user=get_current_user(), page='data-sources')
