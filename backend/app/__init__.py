import os
from flask import Flask
from .extensions import db, migrate
from .config import config_map

def create_app(config_name=None):
    """Application factory for HamaraGhar."""
    app = Flask(__name__,
                template_folder=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'templates'),
                static_folder=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'static'))

    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    app.config.from_object(config_map.get(config_name, config_map['development']))

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)

    # Register blueprints
    from .routes.pages import pages_bp
    from .routes.auth import auth_bp
    from .routes.api.projects import projects_api_bp
    from .routes.api.data import data_api_bp

    app.register_blueprint(pages_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(projects_api_bp)
    app.register_blueprint(data_api_bp)

    # Route alias handler so templates with url_for('login') or url_for('index') resolve
    def build_error_handler(error, endpoint, values):
        from flask import url_for
        for prefix in ('pages', 'auth', 'projects_api', 'data_api'):
            candidate = f"{prefix}.{endpoint}"
            if candidate in app.view_functions:
                return url_for(candidate, **values)
        raise error

    app.url_build_error_handlers.append(build_error_handler)

    # Create tables if needed (for development with SQLite)
    with app.app_context():
        from .models import user, project  # noqa: F401
        db.create_all()

    return app
