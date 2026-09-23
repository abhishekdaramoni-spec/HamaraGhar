import os
import sys
from pathlib import Path

# Add project root directory to sys.path
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

try:
    from app import app as flask_app

    class VercelPathMiddleware:
        def __init__(self, wsgi_app):
            self.wsgi_app = wsgi_app

        def __call__(self, environ, start_response):
            path = environ.get('PATH_INFO', '')
            # If Vercel rewrites forwarded /api/index.py or /api/index as the path
            if path in ('/api/index.py', '/api/index', '/api'):
                environ['PATH_INFO'] = '/'
            elif path.startswith('/api/index.py/'):
                environ['PATH_INFO'] = path[len('/api/index.py'):]
            elif path.startswith('/api/index/'):
                environ['PATH_INFO'] = path[len('/api/index'):]
            return self.wsgi_app(environ, start_response)

    app = VercelPathMiddleware(flask_app)
except Exception as e:
    import traceback
    tb = traceback.format_exc()
    def app(environ, start_response):
        error_html = (
            "<!DOCTYPE html><html><body style='background:#0f172a;color:#f8fafc;padding:2rem;font-family:sans-serif;'>"
            "<h2>Failed to initialize HamaraGhar WSGI App</h2>"
            "<p>Cold start import failed with the following traceback:</p>"
            f"<pre style='background:#1e293b;padding:1rem;color:#f87171;overflow:auto;border-radius:0.5rem;'>{tb}</pre>"
            "</body></html>"
        )
        response_body = error_html.encode('utf-8')
        start_response('500 Internal Server Error', [
            ('Content-Type', 'text/html; charset=utf-8'),
            ('Content-Length', str(len(response_body)))
        ])
        return [response_body]
