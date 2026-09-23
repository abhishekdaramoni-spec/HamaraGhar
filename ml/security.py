"""
Security, Rate Limiting & Input Sanitization for HamaraGhar ML & AI Endpoints.
Protects against:
- Compute abuse / DoS (Sliding-window IP rate limiter)
- Memory exhaustion / Large payload bombs
- Out-of-bounds / NaN / Infinite numeric injection
- Reflected & Stored XSS
- Prompt injection & adversarial LLM jailbreaks
"""
import time
import re
import html
import math
from typing import Dict, Tuple, Optional, Any
from functools import wraps
from flask import request, jsonify

# In-memory sliding window rate limiter: { ip: [timestamp1, timestamp2, ...] }
_RATE_LIMIT_STORE: Dict[str, list] = {}
_MAX_REQUESTS_PER_MINUTE = 60
_CLEANUP_INTERVAL_SECONDS = 300
_LAST_CLEANUP = time.time()


def rate_limit(max_per_minute: int = 60):
    """Decorator to enforce sliding-window rate limit per client IP."""
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            global _LAST_CLEANUP
            now = time.time()
            client_ip = request.headers.get("X-Forwarded-For", request.remote_addr or "127.0.0.1").split(",")[0].strip()
            
            # Periodic cleanup of stale IPs
            if now - _LAST_CLEANUP > _CLEANUP_INTERVAL_SECONDS:
                cutoff = now - 60.0
                for ip in list(_RATE_LIMIT_STORE.keys()):
                    _RATE_LIMIT_STORE[ip] = [t for t in _RATE_LIMIT_STORE[ip] if t > cutoff]
                    if not _RATE_LIMIT_STORE[ip]:
                        del _RATE_LIMIT_STORE[ip]
                _LAST_CLEANUP = now

            timestamps = _RATE_LIMIT_STORE.get(client_ip, [])
            cutoff = now - 60.0
            timestamps = [t for t in timestamps if t > cutoff]
            
            if len(timestamps) >= max_per_minute:
                response = jsonify({
                    "status": "error",
                    "error_code": "RATE_LIMIT_EXCEEDED",
                    "message": f"Too many requests. Limit is {max_per_minute} requests per minute."
                })
                response.status_code = 429
                response.headers["Retry-After"] = "60"
                return response

            timestamps.append(now)
            _RATE_LIMIT_STORE[client_ip] = timestamps
            return f(*args, **kwargs)
        return wrapped
    return decorator


def sanitize_text(text: str, max_chars: int = 500) -> str:
    """Sanitizes user input string: strips script/style blocks, HTML tags, escapes dangerous characters, truncates."""
    if not text:
        return ""
    text = str(text)[:max_chars]
    # Strip script and style blocks completely along with their inner content
    text = re.sub(r"(?is)<script[^>]*?>.*?</script>", "", text)
    text = re.sub(r"(?is)<style[^>]*?>.*?</style>", "", text)
    # Strip any remaining HTML tags
    text = re.sub(r"<[^>]*?>", "", text)
    # Neutralize dangerous characters
    text = html.escape(text, quote=True)
    return text.strip()


def sanitize_prompt_for_llm(prompt: str) -> str:
    """Detects and neutralizes prompt injection / adversarial jailbreaks."""
    clean = sanitize_text(prompt, max_chars=500)
    # Check for adversarial jailbreak phrases
    adversarial_patterns = [
        r"ignore (all )?previous instructions",
        r"system prompt override",
        r"you are now in developer mode",
        r"jailbreak",
        r"bypass (all )?rules",
        r"drop (table|database)",
        r"<script>",
    ]
    for pattern in adversarial_patterns:
        clean = re.sub(pattern, "[FILTERED]", clean, flags=re.IGNORECASE)
    return clean


def validate_ml_numeric_input(payload: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """
    Validates physical numeric bounds for ML inference & CPWD BoQ estimation.
    Ensures values are finite numbers and within physical engineering envelopes.
    """
    def is_valid_float(val, min_v, max_v):
        try:
            f = float(val)
            if math.isnan(f) or math.isinf(f):
                return False, f"Value must be finite, received {val}."
            if f < min_v or f > max_v:
                return False, f"Value {f} out of valid bounds [{min_v}, {max_v}]."
            return True, None
        except (ValueError, TypeError):
            return False, f"Value '{val}' must be numeric."

    # 1. Square footage / Builtup area
    sqft = payload.get("square_ft") or payload.get("built_up_area_sqft") or payload.get("plot_area_sqft")
    if sqft is not None:
        valid, err = is_valid_float(sqft, 50.0, 500000.0)
        if not valid:
            return False, f"Invalid area: {err}"

    # 2. Plot Width & Length
    for key, (min_v, max_v) in [("plot_width", (10.0, 500.0)), ("plot_length", (15.0, 1000.0)),
                               ("plotWidth", (10.0, 500.0)), ("plotLength", (15.0, 1000.0))]:
        if key in payload and payload[key] is not None:
            valid, err = is_valid_float(payload[key], min_v, max_v)
            if not valid:
                return False, f"Invalid {key}: {err}"

    # 3. BHK / Bedrooms
    bhk = payload.get("bhk") or payload.get("bedrooms")
    if bhk is not None:
        valid, err = is_valid_float(bhk, 1.0, 12.0)
        if not valid:
            return False, f"Invalid BHK/Bedrooms: {err}"

    # 4. Floors
    floors = payload.get("floors")
    if floors is not None:
        valid, err = is_valid_float(floors, 1.0, 10.0)
        if not valid:
            return False, f"Invalid Floors: {err}"

    # 5. Target Budget
    budget = payload.get("target_budget_lakhs") or payload.get("budget")
    if budget is not None:
        valid, err = is_valid_float(budget, 1.0, 500000000.0)
        if not valid:
            return False, f"Invalid Budget: {err}"

    return True, None
