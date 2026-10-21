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

from backend.app import app

# Explicit top-level exports for Vercel Python runtime detection
application = app
handler = app
