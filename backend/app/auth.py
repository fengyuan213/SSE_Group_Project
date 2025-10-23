import os
from functools import wraps

import requests
from authlib.jose import jwt
from authlib.jose.errors import JoseError
from flask import jsonify, request

AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN")
AUTH0_AUDIENCE = os.getenv("AUTH0_AUDIENCE")
ALGORITHMS = ["RS256"]


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


def verify_jwt(token):
    """Verifies the JWT token"""
    # Get the public key from Auth0
    jsonurl = requests.get(f"https://{AUTH0_DOMAIN}/.well-known/jwks.json", timeout=10)
    jwks = jsonurl.json()

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


def requires_auth(f):
    """Decorator to protect routes with Auth0 authentication"""

    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            token = get_token_auth_header()
            payload = verify_jwt(token)
            request.user = payload
            return f(*args, **kwargs)
        except AuthError as e:
            return jsonify(e.error), e.status_code

    return decorated
