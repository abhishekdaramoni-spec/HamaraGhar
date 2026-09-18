from functools import wraps
from flask import session, redirect, url_for
from ..models.user import User

def login_required(f):
    """Decorator that redirects to login if user is not authenticated."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

def get_current_user():
    """Get the currently authenticated user, or None."""
    if 'user_id' in session:
        return User.query.get(session['user_id'])
    return None
