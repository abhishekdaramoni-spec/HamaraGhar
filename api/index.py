import os
import sys
import urllib.parse
from pathlib import Path

# Add project root and backend directory to sys.path
ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / 'backend'
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

try:
    from backend.app import app as flask_app

    class VercelPathMiddleware:
        def __init__(self, wsgi_app):
            self.wsgi_app = wsgi_app

        def __call__(self, environ, start_response):
            path = environ.get('PATH_INFO', '')
            if path.startswith('/api/index.py'):
                remainder = path[len('/api/index.py'):]
                environ['PATH_INFO'] = remainder if remainder else '/'
            elif path.startswith('/api/index'):
                remainder = path[len('/api/index'):]
                environ['PATH_INFO'] = remainder if remainder else '/'

            qs = environ.get('QUERY_STRING', '')
            params = urllib.parse.parse_qs(qs, keep_blank_values=True)
            if '__path' in params:
                p = params['__path'][0].strip('/')
                environ['PATH_INFO'] = '/' + p if p else '/'
                params.pop('__path', None)
                environ['QUERY_STRING'] = urllib.parse.urlencode(params, doseq=True)
            else:
                matched = (
                    environ.get('HTTP_X_MATCHED_PATH') or
                    environ.get('HTTP_X_FORWARDED_URI') or
                    environ.get('REQUEST_URI')
                )
                if matched:
                    clean = matched.split('?')[0].strip()
                    if clean and clean not in ('/api/index.py', '/api/index'):
                        environ['PATH_INFO'] = clean

            environ['SCRIPT_NAME'] = ''
            return self.wsgi_app(environ, start_response)

    app = VercelPathMiddleware(flask_app.wsgi_app)
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
