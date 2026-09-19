import json
from flask import Blueprint, render_template, request, session
from ..models.project import Project
from ..utils.auth import login_required, get_current_user

pages_bp = Blueprint('pages', __name__)

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
    project = get_scoped_project(request.args.get('project_id'))
    return render_template('floor-plan.html', current_user=get_current_user(), page='floor-plan', project=project, project_dict=serialize_project(project))

@pages_bp.route('/builder')
@login_required
def builder():
    project = get_scoped_project(request.args.get('project_id'))
    return render_template('builder.html', current_user=get_current_user(), page='builder', project=project, project_dict=serialize_project(project))

@pages_bp.route('/interior')
@login_required
def interior():
    project = get_scoped_project(request.args.get('project_id'))
    return render_template('interior.html', current_user=get_current_user(), page='interior', project=project, project_dict=serialize_project(project))

@pages_bp.route('/cost')
@login_required
def cost():
    project = get_scoped_project(request.args.get('project_id'))
    return render_template('cost.html', current_user=get_current_user(), page='cost', project=project, project_dict=serialize_project(project))

@pages_bp.route('/risk')
@login_required
def risk():
    project = get_scoped_project(request.args.get('project_id'))
    return render_template('risk.html', current_user=get_current_user(), page='risk', project=project, project_dict=serialize_project(project))

@pages_bp.route('/summary')
@login_required
def summary():
    project = get_scoped_project(request.args.get('project_id'))
    return render_template('summary.html', current_user=get_current_user(), page='summary', project=project, project_dict=serialize_project(project))

@pages_bp.route('/data-sources')
def data_sources():
    return render_template('data-sources.html', current_user=get_current_user(), page='data-sources')
