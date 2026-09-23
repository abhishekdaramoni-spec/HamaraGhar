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
            qs = environ.get('QUERY_STRING', '')
            params = urllib.parse.parse_qs(qs, keep_blank_values=True)
            if '__path' in params:
                p = params['__path'][0].strip('/')
                environ['PATH_INFO'] = '/' + p if p else '/'
                params.pop('__path', None)
                environ['QUERY_STRING'] = urllib.parse.urlencode(params, doseq=True)
            elif '_route' in params:
                p = params['_route'][0].strip('/')
                environ['PATH_INFO'] = '/' + p if p else '/'
                params.pop('_route', None)
                environ['QUERY_STRING'] = urllib.parse.urlencode(params, doseq=True)
            else:
                real_path = (
                    environ.get('HTTP_X_MATCHED_PATH') or
                    environ.get('HTTP_X_FORWARDED_URI') or
                    environ.get('HTTP_X_ORIGINAL_URI') or
                    environ.get('HTTP_X_REWRITE_URL')
                )
                if real_path:
                    path_only = real_path.split('?', 1)[0]
                    environ['PATH_INFO'] = path_only if path_only else '/'
                elif environ.get('PATH_INFO') in ('/api/index.py', '/api/index', '/api'):
                    environ['PATH_INFO'] = '/'

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
