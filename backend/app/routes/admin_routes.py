"""
Admin-only routes for managing users, services, and system operations
Uses proper database context manager from app.database
"""

import json

from app.auth import requires_role
from app.database import get_db_connection
from flask import Blueprint, jsonify, request

admin_bp = Blueprint("admin", __name__)


# ============================================================================
# USER MANAGEMENT (Admin only)
# ============================================================================


@admin_bp.route("/users", methods=["GET"])
@requires_role("admin")
def list_all_users():
    """Get all users with their roles (Admin only)"""
    try:
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        offset = (page - 1) * per_page

        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) as total FROM users")
                total = cursor.fetchone()["total"]

                cursor.execute(
                    """
                    SELECT
                        u.id, u.auth0_user_id, u.email, u.name,
                        u.email_verified, u.created_at, u.last_login, u.metadata,
                        ARRAY_AGG(r.role_name) as roles
                    FROM users u
                    LEFT JOIN user_roles ur ON u.id = ur.user_id
                    LEFT JOIN roles r ON ur.role_id = r.role_id
                    GROUP BY u.id
                    ORDER BY u.created_at DESC
                    LIMIT %s OFFSET %s
                """,
                    (per_page, offset),
                )

                users = cursor.fetchall()

                return (
                    jsonify(
                        {
                            "users": [
                                {
                                    "user_id": str(user["id"]),
                                    "auth0_id": user["auth0_user_id"],
                                    "email": user["email"],
                                    "name": user["name"],
                                    "email_verified": user["email_verified"],
                                    "created_at": (
                                        user["created_at"].isoformat()
                                        if user["created_at"]
                                        else None
                                    ),
                                    "last_login": (
                                        user["last_login"].isoformat()
                                        if user["last_login"]
                                        else None
                                    ),
                                    "roles": user["roles"] or [],
                                    "metadata": user["metadata"] or {},
                                }
                                for user in users
                            ],
                            "pagination": {
                                "page": page,
                                "per_page": per_page,
                                "total": total,
                                "total_pages": (total + per_page - 1) // per_page,
                            },
                        }
                    ),
                    200,
                )

    except Exception as e:
        print(f"Error in list_all_users: {str(e)}")
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/users/<user_id>/roles", methods=["POST"])
@requires_role("admin")
def assign_role(user_id):
    """Assign a role to a user (Admin only)"""
    try:
        data = request.get_json()
        role_name = data.get("role_name")

        if not role_name:
            return jsonify({"error": "role_name is required"}), 400

        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT role_id FROM roles WHERE role_name = %s", (role_name,)
                )
                role = cursor.fetchone()

                if not role:
                    return jsonify({"error": f"Role '{role_name}' does not exist"}), 404

                cursor.execute(
                    """
                    INSERT INTO user_roles (user_id, role_id)
                    VALUES (%s, %s)
                    ON CONFLICT (user_id, role_id) DO NOTHING
                """,
                    (user_id, role["role_id"]),
                )

                admin_id = request.user.get("sub")
                cursor.execute(
                    """
                    INSERT INTO audit_logs (user_id, log_type, action, action_details, severity)
                    VALUES (
                        (SELECT id FROM users WHERE auth0_user_id = %s),
                        'admin_action',
                        'role_assigned',
                        %s,
                        'info'
                    )
                """,
                    (
                        admin_id,
                        json.dumps(
                            {
                                "target_user_id": str(user_id),
                                "role_assigned": role_name,
                            }
                        ),
                    ),
                )

        return (
            jsonify(
                {
                    "message": f"Role '{role_name}' assigned successfully",
                    "role": role_name,
                }
            ),
            200,
        )

    except Exception as e:
        print(f"Error in assign_role: {str(e)}")
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/users/<user_id>/roles/<role_name>", methods=["DELETE"])
@requires_role("admin")
def remove_role(user_id, role_name):
    """Remove a role from a user (Admin only)"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    DELETE FROM user_roles
                    WHERE user_id = %s
                    AND role_id = (SELECT role_id FROM roles WHERE role_name = %s)
                """,
                    (user_id, role_name),
                )

                if cursor.rowcount == 0:
                    return (
                        jsonify(
                            {
                                "error": f"User does not have role '{role_name}' or role doesn't exist"
                            }
                        ),
                        404,
                    )

                admin_id = request.user.get("sub")
                cursor.execute(
                    """
                    INSERT INTO audit_logs (user_id, log_type, action, action_details, severity)
                    VALUES (
                        (SELECT id FROM users WHERE auth0_user_id = %s),
                        'admin_action',
                        'role_removed',
                        %s,
                        'warning'
                    )
                """,
                    (
                        admin_id,
                        json.dumps(
                            {"target_user_id": str(user_id), "role_removed": role_name}
                        ),
                    ),
                )

        return jsonify({"message": f"Role '{role_name}' removed successfully"}), 200

    except Exception as e:
        print(f"Error in remove_role: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ============================================================================
# SYSTEM STATISTICS (Admin only)
# ============================================================================


@admin_bp.route("/stats/overview", methods=["GET"])
@requires_role("admin")
def get_system_stats():
    """Get system overview statistics (Admin only)"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                stats = {}

                cursor.execute("SELECT COUNT(*) as total FROM users")
                stats["total_users"] = cursor.fetchone()["total"]

                cursor.execute("SELECT COUNT(*) as total FROM bookings")
                stats["total_bookings"] = cursor.fetchone()["total"]

                cursor.execute(
                    """
                    SELECT COUNT(*) as total FROM bookings
                    WHERE booking_status IN ('pending', 'confirmed', 'in-progress')
                """
                )
                stats["active_bookings"] = cursor.fetchone()["total"]

                cursor.execute(
                    """
                    SELECT COALESCE(SUM(final_amount), 0) as total
                    FROM payments
                    WHERE payment_status = 'completed'
                """
                )
                stats["total_revenue"] = float(cursor.fetchone()["total"])

                cursor.execute(
                    """
                    SELECT r.role_name, COUNT(ur.user_id) as count
                    FROM roles r
                    LEFT JOIN user_roles ur ON r.role_id = ur.role_id
                    GROUP BY r.role_name
                """
                )
                stats["users_by_role"] = {
                    row["role_name"]: row["count"] for row in cursor.fetchall()
                }

                cursor.execute(
                    """
                    SELECT COUNT(*) as count
                    FROM users
                    WHERE last_login > NOW() - INTERVAL '7 days'
                """
                )
                stats["active_users_7_days"] = cursor.fetchone()["count"]

        return jsonify(stats), 200

    except Exception as e:
        print(f"Error in get_system_stats: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ============================================================================
# AUDIT LOGS (Admin only)
# ============================================================================


@admin_bp.route("/audit-logs", methods=["GET"])
@requires_role("admin")
def get_audit_logs():
    """Get system audit logs (Admin only)"""
    try:
        log_type = request.args.get("log_type")
        severity = request.args.get("severity")
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 50, type=int)
        offset = (page - 1) * per_page

        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                    SELECT
                        al.log_id, al.log_type, al.action, al.action_details,
                        al.severity, al.ip_address, al.created_at,
                        u.email as user_email, u.name as user_name
                    FROM audit_logs al
                    LEFT JOIN users u ON al.user_id = u.id
                    WHERE 1=1
                """
                params = []

                if log_type:
                    query += " AND al.log_type = %s"
                    params.append(log_type)

                if severity:
                    query += " AND al.severity = %s"
                    params.append(severity)

                query += " ORDER BY al.created_at DESC LIMIT %s OFFSET %s"
                params.extend([per_page, offset])

                cursor.execute(query, params)
                logs = cursor.fetchall()

                return (
                    jsonify(
                        {
                            "logs": [
                                {
                                    "log_id": log["log_id"],
                                    "log_type": log["log_type"],
                                    "action": log["action"],
                                    "action_details": log["action_details"],
                                    "severity": log["severity"],
                                    "ip_address": (
                                        str(log["ip_address"])
                                        if log["ip_address"]
                                        else None
                                    ),
                                    "created_at": (
                                        log["created_at"].isoformat()
                                        if log["created_at"]
                                        else None
                                    ),
                                    "user_email": log["user_email"],
                                    "user_name": log["user_name"],
                                }
                                for log in logs
                            ]
                        }
                    ),
                    200,
                )

    except Exception as e:
        print(f"Error in get_audit_logs: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ============================================================================
# PROVIDER MANAGEMENT (Admin or Provider)
# ============================================================================


@admin_bp.route("/providers", methods=["GET"])
@requires_role("admin", "provider")
def list_providers():
    """List all service providers"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                        sp.provider_id, sp.business_name, sp.description,
                        sp.address, sp.average_rating, sp.is_verified, sp.is_active,
                        u.email as contact_email, u.name as contact_name
                    FROM service_providers sp
                    JOIN users u ON sp.user_id = u.id
                    ORDER BY sp.average_rating DESC
                """
                )

                providers = cursor.fetchall()

                return (
                    jsonify(
                        {
                            "providers": [
                                {
                                    "provider_id": p["provider_id"],
                                    "business_name": p["business_name"],
                                    "description": p["description"],
                                    "address": p["address"],
                                    "average_rating": (
                                        float(p["average_rating"])
                                        if p["average_rating"]
                                        else 0.0
                                    ),
                                    "is_verified": p["is_verified"],
                                    "is_active": p["is_active"],
                                    "contact_email": p["contact_email"],
                                    "contact_name": p["contact_name"],
                                }
                                for p in providers
                            ]
                        }
                    ),
                    200,
                )

    except Exception as e:
        print(f"Error in list_providers: {str(e)}")
        return jsonify({"error": str(e)}), 500
