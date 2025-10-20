from datetime import datetime
from decimal import Decimal

from flask import Blueprint, jsonify, request

from .database import get_db_connection, test_connection

api_bp = Blueprint("api", __name__)


def decimal_to_float(obj):
    """Convert Decimal objects to float for JSON serialization."""
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError


@api_bp.get("/health")
def health():
    """Health check endpoint."""
    db_connected = test_connection()
    return jsonify(
        {
            "status": "ok" if db_connected else "degraded",
            "database": "connected" if db_connected else "disconnected",
        }
    )


@api_bp.get("/packages")
def get_packages():
    """Get all active service packages."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        sp.package_id,
                        sp.package_name,
                        sp.description,
                        sp.base_price,
                        sp.duration_minutes,
                        sc.category_name,
                        sc.category_id
                    FROM service_packages sp
                    LEFT JOIN service_categories sc ON sp.category_id = sc.category_id
                    WHERE sp.is_active = TRUE
                    ORDER BY sp.package_id
                """
                )
                packages = cur.fetchall()

                # Convert Decimal to float for JSON serialization
                result = []
                for pkg in packages:
                    pkg_dict = dict(pkg)
                    if pkg_dict.get("base_price"):
                        pkg_dict["base_price"] = float(pkg_dict["base_price"])
                    result.append(pkg_dict)

                return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.get("/providers")
def get_providers():
    """Get all active service providers."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        provider_id,
                        business_name,
                        description,
                        address,
                        average_rating,
                        is_verified
                    FROM service_providers
                    WHERE is_active = TRUE
                    ORDER BY average_rating DESC
                """
                )
                providers = cur.fetchall()

                # Convert Decimal to float for JSON serialization
                result = []
                for provider in providers:
                    provider_dict = dict(provider)
                    if provider_dict.get("average_rating"):
                        provider_dict["average_rating"] = float(
                            provider_dict["average_rating"]
                        )
                    result.append(provider_dict)

                return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.post("/bookings")
def create_booking():
    """Create a new booking."""
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = [
            "package_id",
            "booking_type",
            "scheduled_date",
            "service_address",
        ]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # For now, we'll use a default user since auth isn't implemented
        # In production, this would come from the authenticated user
        default_user_id = None

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get a default user for testing (first customer user)
                cur.execute(
                    """
                    SELECT u.id
                    FROM users u
                    JOIN user_roles ur ON u.id = ur.user_id
                    WHERE ur.role_id = (SELECT role_id FROM roles WHERE role_name = 'customer')
                    LIMIT 1
                """
                )
                user_result = cur.fetchone()
                if user_result:
                    default_user_id = user_result["id"]
                else:
                    return (
                        jsonify({"error": "No customer users found in database"}),
                        500,
                    )

                # Insert booking
                cur.execute(
                    """
                    INSERT INTO bookings (
                        user_id,
                        package_id,
                        provider_id,
                        booking_type,
                        booking_status,
                        scheduled_date,
                        service_address,
                        special_instructions
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s
                    )
                    RETURNING booking_id, booking_reference, booking_status
                """,
                    (
                        default_user_id,
                        data["package_id"],
                        data.get("provider_id"),
                        data["booking_type"],
                        "pending",
                        data["scheduled_date"],
                        data["service_address"],
                        data.get("special_instructions"),
                    ),
                )

                result = cur.fetchone()

                return (
                    jsonify(
                        {
                            "booking_id": result["booking_id"],
                            "booking_reference": result["booking_reference"],
                            "booking_status": result["booking_status"],
                        }
                    ),
                    201,
                )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.get("/bookings/<int:booking_id>")
def get_booking(booking_id):
    """Get booking details by ID."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        b.booking_id,
                        b.booking_reference,
                        b.booking_status,
                        b.scheduled_date,
                        b.service_address,
                        b.special_instructions,
                        sp.package_name,
                        sp.base_price,
                        prov.business_name as provider_name
                    FROM bookings b
                    JOIN service_packages sp ON b.package_id = sp.package_id
                    LEFT JOIN service_providers prov ON b.provider_id = prov.provider_id
                    WHERE b.booking_id = %s
                """,
                    (booking_id,),
                )

                booking = cur.fetchone()

                if not booking:
                    return jsonify({"error": "Booking not found"}), 404

                # Convert Decimal to float
                booking_dict = dict(booking)
                if booking_dict.get("base_price"):
                    booking_dict["base_price"] = float(booking_dict["base_price"])

                return jsonify(booking_dict)

    except Exception as e:
        return jsonify({"error": str(e)}), 500
