import json
from flask import Blueprint, request, jsonify, session
from ...models.project import Project
from ...extensions import db
from ...utils.auth import login_required

projects_api_bp = Blueprint('projects_api', __name__)

@projects_api_bp.route('/api/projects', methods=['GET'])
@login_required
def get_projects():
    projects = Project.query.filter_by(user_id=session['user_id']).order_by(Project.created_at.desc()).all()
    return jsonify([p.to_dict() for p in projects])

@projects_api_bp.route('/api/projects', methods=['POST'])
@login_required
def create_project():
    data = request.json
    if not data or 'name' not in data or 'data' not in data:
        return jsonify({'success': False, 'error': {'code': 'VALIDATION_ERROR', 'message': 'Missing name or data'}}), 400
    project = Project(
        user_id=session['user_id'],
        name=data['name'],
        data_json=json.dumps(data['data'])
    )
    db.session.add(project)
    db.session.commit()
    return jsonify({'success': True, 'data': {'message': 'Project created', 'id': project.id}}), 201

@projects_api_bp.route('/api/projects/<int:project_id>', methods=['GET'])
@login_required
def get_project(project_id):
    project = Project.query.filter_by(id=project_id, user_id=session['user_id']).first()
    if not project:
        return jsonify({'success': False, 'error': {'code': 'NOT_FOUND', 'message': 'Project not found'}}), 404
    return jsonify({'success': True, 'data': project.to_dict()})

@projects_api_bp.route('/api/projects/<int:project_id>', methods=['PUT'])
@login_required
def update_project(project_id):
    project = Project.query.filter_by(id=project_id, user_id=session['user_id']).first()
    if not project:
        return jsonify({'success': False, 'error': {'code': 'NOT_FOUND', 'message': 'Project not found'}}), 404
    data = request.json
    if 'name' in data:
        project.name = data['name']
    if 'data' in data:
        project.data_json = json.dumps(data['data'])
    db.session.commit()
    return jsonify({'success': True, 'data': {'message': 'Project updated'}})

@projects_api_bp.route('/api/projects/<int:project_id>', methods=['DELETE'])
@login_required
def delete_project(project_id):
    project = Project.query.filter_by(id=project_id, user_id=session['user_id']).first()
    if not project:
        return jsonify({'success': False, 'error': {'code': 'NOT_FOUND', 'message': 'Project not found'}}), 404
    db.session.delete(project)
    db.session.commit()
    return jsonify({'success': True, 'data': {'message': 'Project deleted'}})
