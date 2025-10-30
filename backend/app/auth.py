import os
import time
from functools import wraps

import requests
from app.database import get_db_connection
from authlib.jose import jwt
from authlib.jose.errors import JoseError
from flask import jsonify, request

AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN")
AUTH0_AUDIENCE = os.getenv("AUTH0_AUDIENCE")
ALGORITHMS = ["RS256"]

# JWKS cache to avoid fetching on every request
_jwks_cache = {
    "jwks": None,
    "last_fetch": 0,
    "cache_duration": 3600,  # Cache for 1 hour
}


class AuthError(Exception):
    """Custom exception for Auth0 errors"""

    def __init__(self, error, status_code):
        self.error = error
        self.status_code = status_code


def get_token_auth_header():
    """Obtains the Access Token from the Authorization Header"""
    auth = request.headers.get("Authorization", None)
    if not auth:
        raise AuthError(
            {
                "code": "authorization_header_missing",
                "description": "Authorization header is expected.",
            },
            401,
        )

    parts = auth.split()
    if parts[0].lower() != "bearer":
        raise AuthError(
            {
                "code": "invalid_header",
                "description": 'Authorization header must start with "Bearer".',
            },
            401,
        )
    elif len(parts) == 1:
        raise AuthError(
            {"code": "invalid_header", "description": "Token not found."}, 401
        )
    elif len(parts) > 2:
        raise AuthError(
            {
                "code": "invalid_header",
                "description": "Authorization header must be bearer token.",
            },
            401,
        )

    return parts[1]


def get_jwks():
    """
    Get JWKS from Auth0 with caching and retry logic
    Cache duration: 1 hour
    """
    current_time = time.time()
    cache_age = current_time - _jwks_cache["last_fetch"]

    # Return cached JWKS if still valid
    if _jwks_cache["jwks"] and cache_age < _jwks_cache["cache_duration"]:
        return _jwks_cache["jwks"]

    # Fetch new JWKS with retry logic
    max_retries = 3
    retry_delay = 1  # seconds

    for attempt in range(max_retries):
        try:
            response = requests.get(
                f"https://{AUTH0_DOMAIN}/.well-known/jwks.json",
                timeout=15,  # Increased timeout
            )
            response.raise_for_status()
            jwks = response.json()

            # Update cache
            _jwks_cache["jwks"] = jwks
            _jwks_cache["last_fetch"] = current_time

            return jwks

        except requests.exceptions.Timeout:
            print(f"⚠️ Auth0 JWKS fetch timeout (attempt {attempt + 1}/{max_retries})")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                # If all retries fail, try to use cached version even if expired
                if _jwks_cache["jwks"]:
                    print("⚠️ Using expired JWKS cache due to timeout")
                    return _jwks_cache["jwks"]
                raise

        except requests.exceptions.RequestException as e:
            print(f"❌ Error fetching JWKS from Auth0: {str(e)}")
            # Try to use cached version even if expired
            if _jwks_cache["jwks"]:
                print("⚠️ Using expired JWKS cache due to error")
                return _jwks_cache["jwks"]
            raise


def verify_jwt(token):
    """Verifies the JWT token"""
    # Get the public key from Auth0 (cached)
    jwks = get_jwks()

    try:
        # Decode and verify the token
        claims = jwt.decode(token, jwks)
        claims.validate()

        # SECURITY: Validate audience and issuer to ensure token is for this API
        expected_issuer = f"https://{AUTH0_DOMAIN}/"

        # Validate audience claim (can be string or list)
        audience = claims.get("aud")
        if isinstance(audience, str):
            audience_list = [audience]
        else:
            audience_list = audience or []

        if AUTH0_AUDIENCE not in audience_list:
            raise AuthError(
                {
                    "code": "invalid_audience",
                    "description": "Token audience claim is invalid.",
                },
                401,
            )

        # Validate issuer claim
        if claims.get("iss") != expected_issuer:
            raise AuthError(
                {
                    "code": "invalid_issuer",
                    "description": "Token issuer claim is invalid.",
                },
                401,
            )

        return claims
    except JoseError as e:
        raise AuthError(
            {
                "code": "invalid_token",
                "description": f"Unable to parse authentication token: {str(e)}",
            },
            401,
        ) from e


def get_user_roles(auth0_id):
    """Get user roles from database"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT ARRAY_AGG(r.role_name) as roles
                    FROM users u
                    LEFT JOIN user_roles ur ON u.id = ur.user_id
                    LEFT JOIN roles r ON ur.role_id = r.role_id
                    WHERE u.auth0_user_id = %s
                    GROUP BY u.id
                    """,
                    (auth0_id,),
                )

                result = cursor.fetchone()
                return result["roles"] if result and result["roles"] else []
    except Exception as e:
        print(f"Error fetching user roles: {str(e)}")
        return []


def requires_auth(f):
    """Decorator to protect routes with Auth0 authentication"""

    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            token = get_token_auth_header()
            payload = verify_jwt(token)
            request.user = payload

            # Attach user roles to request
            auth0_id = payload.get("sub")
            request.user_roles = get_user_roles(auth0_id)

            return f(*args, **kwargs)
        except AuthError as e:
            return jsonify(e.error), e.status_code

    return decorated


def requires_role(*allowed_roles):
    """
    Decorator to restrict route access to specific roles

    Usage:
        @requires_role('admin')
        @requires_role('admin', 'provider')
    """

    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            try:
                # First verify authentication
                token = get_token_auth_header()
                payload = verify_jwt(token)
                request.user = payload

                # Get user roles from database
                auth0_id = payload.get("sub")
                user_roles = get_user_roles(auth0_id)
                request.user_roles = user_roles

                # Check if user has any of the required roles
                if not user_roles or not any(
                    role in user_roles for role in allowed_roles
                ):
                    return (
                        jsonify(
                            {
                                "code": "insufficient_permissions",
                                "description": f"This endpoint requires one of the following roles: {', '.join(allowed_roles)}",
                                "required_roles": list(allowed_roles),
                                "user_roles": user_roles,
                            }
                        ),
                        403,
                    )

                return f(*args, **kwargs)
            except AuthError as e:
                return jsonify(e.error), e.status_code

        return decorated

    return decorator
