import json
import os
from datetime import datetime

import psycopg2
from app.auth import requires_auth
from flask import Blueprint, jsonify, request
from psycopg2.extras import RealDictCursor

auth_bp = Blueprint("auth", __name__)


def get_db_connection():
    """Create a database connection"""
    database_url = os.getenv("DATABASE_URL")
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)


@auth_bp.route("/sync", methods=["POST"])
@requires_auth
def sync_user():
    """
    Sync user data with database.
    Creates new user on signup or updates existing user on login.
    """
    conn = None
    cursor = None
    try:
        # SECURITY: Get auth0_id from verified JWT token, not request body
        auth0_id = request.user.get("sub")
        # auth0_id = data.get("auth0_id")
        data = request.get_json()
        email = data.get("email")
        name = data.get("name")
        picture = data.get("picture")

        # Get additional signup fields
        age = data.get("age")
        mobile = data.get("mobile")
        country_of_citizenship = data.get("country_of_citizenship")
        language_preferred = data.get("language_preferred")
        covid_vaccination_status = data.get("covid_vaccination_status")

        # Get IP address and user agent for logging
        ip_address = request.remote_addr
        user_agent = request.headers.get("User-Agent", "")

        if not auth0_id or not email:
            return (
                jsonify({"error": "Missing required fields: auth0_id and email"}),
                400,
            )

        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if user exists by auth0_user_id
        cursor.execute(
            "SELECT id, metadata FROM users WHERE auth0_user_id = %s", (auth0_id,)
        )
        existing_user = cursor.fetchone()

        if existing_user:
            # User exists - this is a LOGIN
            user_id = existing_user["id"]

            # Get current metadata and increment login count
            metadata = existing_user["metadata"] or {}
            login_count = metadata.get("login_count", 0) + 1
            metadata["login_count"] = login_count

            # Update user info and login timestamp
            cursor.execute(
                """
                UPDATE users
                SET name = %s,
                    email = %s,
                    picture = %s,
                    last_login = %s,
                    updated_at = %s,
                    metadata = %s
                WHERE auth0_user_id = %s
                RETURNING id
            """,
                (
                    name,
                    email,
                    picture,
                    datetime.now(),
                    datetime.now(),
                    json.dumps(metadata),
                    auth0_id,
                ),
            )

            # Log login event in audit_logs
            cursor.execute(
                """
                INSERT INTO audit_logs (user_id, log_type, action, action_details, severity, ip_address)
                VALUES (%s, %s, %s, %s, %s, %s)
            """,
                (
                    user_id,
                    "user_action",
                    "user_login",
                    json.dumps({"login_count": login_count, "user_agent": user_agent}),
                    "info",
                    ip_address,
                ),
            )

            conn.commit()

            return (
                jsonify(
                    {
                        "message": "User logged in successfully",
                        "event_type": "login",
                        "user_id": str(user_id),
                        "login_count": login_count,
                    }
                ),
                200,
            )
        else:
            # User doesn't exist - this is a SIGNUP
            # Extract given_name and family_name if available
            given_name = data.get("given_name") or (name.split()[0] if name else None)
            family_name = data.get("family_name") or (
                name.split()[-1] if name and len(name.split()) > 1 else None
            )
            nickname = data.get("nickname") or email.split("@")[0]

            # Initialize metadata with login count and additional fields
            metadata = {
                "login_count": 1,
                "age": age,
                "mobile": mobile,
                "country_of_citizenship": country_of_citizenship,
                "language_preferred": language_preferred,
                "covid_vaccination_status": covid_vaccination_status,
            }

            cursor.execute(
                """
                INSERT INTO users (
                    auth0_user_id, email, email_verified, name,
                    given_name, family_name, nickname, picture,
                    last_login, metadata
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """,
                (
                    auth0_id,
                    email,
                    True,
                    name,
                    given_name,
                    family_name,
                    nickname,
                    picture,
                    datetime.now(),
                    json.dumps(metadata),
                ),
            )

            user_result = cursor.fetchone()
            user_id = user_result["id"]

            # Assign both 'provider' and 'customer' roles to new user
            # This allows users to both book services and provide services
            cursor.execute(
                """
                INSERT INTO user_roles (user_id, role_id)
                SELECT %s, role_id FROM roles WHERE role_name IN ('provider', 'customer')
            """,
                (user_id,),
            )

            # Log signup event in audit_logs
            cursor.execute(
                """
                INSERT INTO audit_logs (user_id, log_type, action, action_details, severity, ip_address)
                VALUES (%s, %s, %s, %s, %s, %s)
            """,
                (
                    user_id,
                    "user_action",
                    "user_signup",
                    json.dumps(
                        {
                            "user_agent": user_agent,
                            "signup_fields": {
                                "age": age,
                                "mobile": mobile,
                                "country": country_of_citizenship,
                                "language": language_preferred,
                                "vaccination_status": covid_vaccination_status,
                            },
                        }
                    ),
                    "info",
                    ip_address,
                ),
            )

            conn.commit()

            return (
                jsonify(
                    {
                        "message": "User signed up successfully",
                        "event_type": "signup",
                        "user_id": str(user_id),
                        "login_count": 1,
                    }
                ),
                201,
            )

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error in sync_user: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@auth_bp.route("/user/profile", methods=["GET"])
@requires_auth
def get_user_profile():
    """Get the current user's profile"""
    conn = None
    cursor = None
    try:
        auth0_id = request.user.get("sub")

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                u.id, u.email, u.name, u.given_name, u.family_name,
                u.nickname, u.picture, u.email_verified,
                u.created_at, u.last_login, u.metadata,
                ARRAY_AGG(r.role_name) as roles
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.role_id
            WHERE u.auth0_user_id = %s
            GROUP BY u.id
        """,
            (auth0_id,),
        )

        user = cursor.fetchone()

        if not user:
            return jsonify({"error": "User not found"}), 404

        # Parse metadata
        metadata = user["metadata"] or {}

        profile = {
            "user_id": str(user["id"]),
            "email": user["email"],
            "name": user["name"],
            "given_name": user["given_name"],
            "family_name": user["family_name"],
            "nickname": user["nickname"],
            "picture": user["picture"],
            "email_verified": user["email_verified"],
            "created_at": (
                user["created_at"].isoformat() if user["created_at"] else None
            ),
            "last_login": (
                user["last_login"].isoformat() if user["last_login"] else None
            ),
            "login_count": metadata.get("login_count", 0),
            "roles": user["roles"] or [],
            # Additional profile fields
            "age": metadata.get("age"),
            "mobile": metadata.get("mobile"),
            "country_of_citizenship": metadata.get("country_of_citizenship"),
            "language_preferred": metadata.get("language_preferred"),
            "covid_vaccination_status": metadata.get("covid_vaccination_status"),
        }

        return jsonify(profile), 200

    except Exception as e:
        print(f"Error in get_user_profile: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@auth_bp.route("/user/auth-history", methods=["GET"])
@requires_auth
def get_auth_history():
    """Get authentication history for current user from audit logs"""
    conn = None
    cursor = None
    try:
        auth0_id = request.user.get("sub")

        conn = get_db_connection()
        cursor = conn.cursor()

        # Get user_id first
        cursor.execute("SELECT id FROM users WHERE auth0_user_id = %s", (auth0_id,))
        user = cursor.fetchone()

        if not user:
            return jsonify({"error": "User not found"}), 404

        # Get auth events from audit_logs
        cursor.execute(
            """
            SELECT
                log_type,
                action,
                action_details,
                created_at,
                ip_address
            FROM audit_logs
            WHERE user_id = %s
            AND action IN ('user_login', 'user_signup')
            ORDER BY created_at DESC
            LIMIT 50
        """,
            (user["id"],),
        )

        events = cursor.fetchall()

        formatted_events = []
        for event in events:
            formatted_events.append(
                {
                    "event_type": event["action"],
                    "timestamp": (
                        event["created_at"].isoformat() if event["created_at"] else None
                    ),
                    "ip_address": (
                        str(event["ip_address"]) if event["ip_address"] else None
                    ),
                    "details": event["action_details"],
                }
            )

        return jsonify({"events": formatted_events}), 200

    except Exception as e:
        print(f"Error in get_auth_history: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
