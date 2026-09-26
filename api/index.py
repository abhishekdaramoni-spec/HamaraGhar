import os
import sys
from pathlib import Path

# Add project root and backend directory to sys.path
ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / 'backend'
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

try:
    from backend.app import app
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
