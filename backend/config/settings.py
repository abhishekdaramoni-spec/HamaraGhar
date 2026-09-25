import os
from dotenv import load_dotenv

load_dotenv()

# Default database URI with Vercel/serverless fallback
default_db_uri = 'sqlite:////tmp/smartbuild.db' if (os.environ.get('VERCEL') == '1' or os.environ.get('AWS_LAMBDA_FUNCTION_NAME')) else 'sqlite:///smartbuild.db'

class BaseConfig:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'hamaraghar-session-secret-key-prod-2024')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data')

class DevelopmentConfig(BaseConfig):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', default_db_uri)

class TestingConfig(BaseConfig):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

class ProductionConfig(BaseConfig):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', default_db_uri)
    SESSION_COOKIE_SECURE = False  # Set True when behind HTTPS proxy with properly configured headers

config_map = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
}
