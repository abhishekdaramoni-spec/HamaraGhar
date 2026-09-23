import os
import sys
from pathlib import Path

# Add project root directory to sys.path
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

try:
    from app import app as flask_app

    import urllib.parse

    class VercelPathMiddleware:
        def __init__(self, wsgi_app):
            self.wsgi_app = wsgi_app

        def __call__(self, environ, start_response):
            # Check Vercel edge reverse proxy headers for real client path
            real_path = (
                environ.get('HTTP_X_MATCHED_PATH') or
                environ.get('HTTP_X_FORWARDED_URI') or
                environ.get('HTTP_X_ORIGINAL_URI') or
                environ.get('HTTP_X_REWRITE_URL')
            )
            if real_path:
                path_only = real_path.split('?', 1)[0]
                environ['PATH_INFO'] = path_only if path_only else '/'
            else:
                qs = environ.get('QUERY_STRING', '')
                params = urllib.parse.parse_qs(qs, keep_blank_values=True)
                if '_route' in params:
                    route_val = params['_route'][0].strip('/')
                    params.pop('_route', None)
                    new_qs = urllib.parse.urlencode(params, doseq=True)
                    environ['QUERY_STRING'] = new_qs
                    environ['PATH_INFO'] = '/' + route_val if route_val else '/'
                else:
                    path = environ.get('PATH_INFO', '')
                    if path in ('/api/index.py', '/api/index', '/api'):
                        environ['PATH_INFO'] = '/'
                    elif path.startswith('/api/index.py/'):
                        environ['PATH_INFO'] = path[len('/api/index.py'):]
                    elif path.startswith('/api/index/'):
                        environ['PATH_INFO'] = path[len('/api/index'):]

            # Ensure SCRIPT_NAME is clean so url_for builds clean root URLs
            environ['SCRIPT_NAME'] = ''

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
