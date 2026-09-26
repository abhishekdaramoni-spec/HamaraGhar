import os
import sys
from pathlib import Path

# Add backend directory to sys.path
ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / 'backend'
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from backend.app import app

if __name__ == '__main__':
    debug = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 'yes')
    host = os.environ.get('HOST', '127.0.0.1')
    port = int(os.environ.get('PORT', 5000))
    app.run(host=host, port=port, debug=debug)
