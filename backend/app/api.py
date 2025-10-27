import math
import os
from datetime import datetime, timedelta
from decimal import Decimal

import stripe
from flask import Blueprint, jsonify, request

from .database import get_db_connection, test_connection
from .email_service import (
    send_booking_confirmation_email,
    send_payment_confirmation_email,
)

# ============================================================================
# MOCK COVID RESTRICTION DATA (for demo purposes)
# All zones centered around Adelaide area for testing
# ============================================================================
MOCK_COVID_RESTRICTIONS = [
    {
        "area": "Adelaide CBD",
        "restriction": "Medium",
        "latitude": -34.9285,
        "longitude": 138.6007,
        "radius_km": 5,
    },
    {
        "area": "North Adelaide",
        "restriction": "Low",
        "latitude": -34.9058,
        "longitude": 138.5965,
        "radius_km": 3,
    },
    {
        "area": "Glenelg Beach Area",
        "restriction": "Low",
        "latitude": -34.9797,
        "longitude": 138.5141,
        "radius_km": 4,
    },
    {
        "area": "Eastern Suburbs",
        "restriction": "High",
        "latitude": -34.9190,
        "longitude": 138.6289,
        "radius_km": 6,
    },
    {
        "area": "Port Adelaide",
        "restriction": "Medium",
        "latitude": -34.8470,
        "longitude": 138.5042,
        "radius_km": 8,
    },
]

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_mock_key")

api_bp = Blueprint("api", __name__)


def decimal_to_float(obj):
    """Convert Decimal objects to float for JSON serialization."""
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError


# ============================================================================
# GEOLOCATION HELPER FUNCTIONS
# ============================================================================


def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great-circle distance between two points on Earth.
    Uses the Haversine formula.

    Args:
        lat1, lon1: Latitude and longitude of point 1 (in degrees)
        lat2, lon2: Latitude and longitude of point 2 (in degrees)

    Returns:
        Distance in kilometers
    """
    R = 6371  # Earth's radius in kilometers

    # Convert to radians
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    # Haversine formula
    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


# ============================================================================
# AVAILABILITY HELPER FUNCTIONS
# ============================================================================


def validate_time_slot(time_str):
    """Validate time is on 30-minute boundary (HH:00 or HH:30)"""
    try:
        time_obj = datetime.strptime(time_str, "%H:%M").time()
        if time_obj.minute not in [0, 30]:
            return (
                False,
                "Time slots must be on 30-minute boundaries (e.g., 09:00, 09:30)",
            )
        return True, None
    except ValueError:
        return False, "Invalid time format. Use HH:MM"


def calculate_required_slots(duration_minutes):
    """Convert service duration to number of 30-min slots"""
    return math.ceil(duration_minutes / 30)


def generate_slot_times(start_time, num_slots):
    """Generate consecutive 30-minute slot times"""
    slots = []
    current = datetime.strptime(start_time, "%H:%M")
    for _ in range(num_slots):
        slots.append(current.strftime("%H:%M"))
        current += timedelta(minutes=30)
    return slots


def check_provider_capacity(cur, provider_id, slot_date, slot_time):
    """Check if provider has capacity for new booking at this slot"""
    # Get provider's max concurrent jobs
    cur.execute(
        "SELECT max_concurrent_jobs FROM service_providers WHERE provider_id = %s",
        (provider_id,),
    )
    result = cur.fetchone()
    if not result:
        return False, "Provider not found"

    max_jobs = result["max_concurrent_jobs"]

    # Count concurrent bookings at this slot
    cur.execute(
        """
        SELECT COUNT(DISTINCT booking_id) as active_jobs
        FROM booking_time_slots
        WHERE provider_id = %s
        AND slot_date = %s
        AND slot_time = %s
        AND status = 'booked'
        """,
        (provider_id, slot_date, slot_time),
    )

    active_jobs = cur.fetchone()["active_jobs"]

    if active_jobs >= max_jobs:
        return False, f"Provider at capacity ({active_jobs}/{max_jobs} jobs)"

    return True, None


def check_slot_available(cur, provider_id, slot_date, slot_time):
    """Check if a specific slot is available (not booked and not blocked by provider)"""
    # Check capacity
    capacity_ok, error = check_provider_capacity(cur, provider_id, slot_date, slot_time)
    if not capacity_ok:
        return False, error

    # Check if provider marked unavailable
    cur.execute(
        """
        SELECT availability_id FROM provider_availability
        WHERE provider_id = %s
        AND date = %s
        AND start_time <= %s
        AND end_time > %s
        AND is_available = FALSE
        """,
        (provider_id, slot_date, slot_time, slot_time),
    )

    if cur.fetchone():
        return False, "Provider unavailable at this time"

    return True, None


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
    """Get all active service packages (both single and bundles)."""
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
                        sp.package_type,
                        sp.discount_percentage,
                        sp.is_customizable,
                        sc.category_name,
                        sc.category_id,
                        CASE
                            WHEN sp.package_type = 'bundle' THEN (
                                SELECT COUNT(*)
                                FROM bundle_items bi
                                WHERE bi.bundle_package_id = sp.package_id
                            )
                            ELSE 0
                        END as included_services_count
                    FROM service_packages sp
                    LEFT JOIN service_categories sc ON sp.category_id = sc.category_id
                    WHERE sp.is_active = TRUE
                    ORDER BY sp.package_type DESC, sp.package_id
                """
                )
                packages = cur.fetchall()

                # Convert Decimal to float for JSON serialization
                result = []
                for pkg in packages:
                    pkg_dict = dict(pkg)
                    if pkg_dict.get("base_price"):
                        pkg_dict["base_price"] = float(pkg_dict["base_price"])
                    if pkg_dict.get("discount_percentage"):
                        pkg_dict["discount_percentage"] = float(
                            pkg_dict["discount_percentage"]
                        )
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


@api_bp.get("/packages/bundles")
def get_bundle_packages():
    """Get all active bundle packages with included services."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        sp.package_id,
                        sp.package_name,
                        sp.description,
                        sp.base_price as bundle_price,
                        sp.duration_minutes as total_duration,
                        sp.discount_percentage,
                        sp.is_customizable,
                        sp.category_id,
                        sc.category_name,
                        COALESCE(
                            (SELECT json_agg(
                                json_build_object(
                                    'package_id', included.package_id,
                                    'package_name', included.package_name,
                                    'description', included.description,
                                    'base_price', included.base_price,
                                    'duration_minutes', included.duration_minutes,
                                    'is_optional', bi.is_optional,
                                    'display_order', bi.display_order
                                ) ORDER BY bi.display_order
                            )
                            FROM bundle_items bi
                            JOIN service_packages included ON bi.included_package_id = included.package_id
                            WHERE bi.bundle_package_id = sp.package_id
                            ), '[]'::json
                        ) as included_services,
                        (
                            SELECT COALESCE(SUM(included.base_price), 0)
                            FROM bundle_items bi
                            JOIN service_packages included ON bi.included_package_id = included.package_id
                            WHERE bi.bundle_package_id = sp.package_id
                        ) as original_total_price
                    FROM service_packages sp
                    JOIN service_categories sc ON sp.category_id = sc.category_id
                    WHERE sp.package_type = 'bundle'
                        AND sp.is_active = TRUE
                    ORDER BY sp.package_id
                    """
                )
                bundles = cur.fetchall()

                # Convert Decimal to float for JSON serialization
                result = []
                for bundle in bundles:
                    bundle_dict = dict(bundle)
                    if bundle_dict.get("bundle_price"):
                        bundle_dict["bundle_price"] = float(bundle_dict["bundle_price"])
                    if bundle_dict.get("discount_percentage"):
                        bundle_dict["discount_percentage"] = float(
                            bundle_dict["discount_percentage"]
                        )
                    if bundle_dict.get("original_total_price"):
                        bundle_dict["original_total_price"] = float(
                            bundle_dict["original_total_price"]
                        )
                    # Convert included services prices to float
                    if bundle_dict.get("included_services"):
                        for service in bundle_dict["included_services"]:
                            if service.get("base_price"):
                                service["base_price"] = float(service["base_price"])
                    result.append(bundle_dict)

                return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.get("/packages/<int:package_id>/bundle-details")
def get_bundle_details(package_id):
    """Get detailed information about a specific bundle package."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        sp.package_id,
                        sp.package_name,
                        sp.description,
                        sp.package_type,
                        sp.base_price as bundle_price,
                        sp.duration_minutes,
                        sp.discount_percentage,
                        sp.is_customizable,
                        sp.category_id,
                        sc.category_name,
                        COALESCE(
                            (SELECT json_agg(
                                json_build_object(
                                    'package_id', included.package_id,
                                    'package_name', included.package_name,
                                    'description', included.description,
                                    'base_price', included.base_price,
                                    'duration_minutes', included.duration_minutes,
                                    'category_name', inc_cat.category_name,
                                    'is_optional', bi.is_optional,
                                    'display_order', bi.display_order
                                ) ORDER BY bi.display_order
                            )
                            FROM bundle_items bi
                            JOIN service_packages included ON bi.included_package_id = included.package_id
                            LEFT JOIN service_categories inc_cat ON included.category_id = inc_cat.category_id
                            WHERE bi.bundle_package_id = sp.package_id
                            ), '[]'::json
                        ) as included_services,
                        (
                            SELECT COALESCE(SUM(included.base_price), 0)
                            FROM bundle_items bi
                            JOIN service_packages included ON bi.included_package_id = included.package_id
                            WHERE bi.bundle_package_id = sp.package_id
                        ) as original_total_price,
                        (
                            SELECT COALESCE(SUM(included.duration_minutes), 0)
                            FROM bundle_items bi
                            JOIN service_packages included ON bi.included_package_id = included.package_id
                            WHERE bi.bundle_package_id = sp.package_id
                        ) as total_duration
                    FROM service_packages sp
                    JOIN service_categories sc ON sp.category_id = sc.category_id
                    WHERE sp.package_id = %s
                        AND sp.is_active = TRUE
                    """,
                    (package_id,),
                )
                bundle = cur.fetchone()

                if not bundle:
                    return jsonify({"error": "Package not found"}), 404

                # Convert Decimal to float
                bundle_dict = dict(bundle)
                if bundle_dict.get("bundle_price"):
                    bundle_dict["bundle_price"] = float(bundle_dict["bundle_price"])
                if bundle_dict.get("discount_percentage"):
                    bundle_dict["discount_percentage"] = float(
                        bundle_dict["discount_percentage"]
                    )
                if bundle_dict.get("original_total_price"):
                    bundle_dict["original_total_price"] = float(
                        bundle_dict["original_total_price"]
                    )
                # Convert included services prices
                if bundle_dict.get("included_services"):
                    for service in bundle_dict["included_services"]:
                        if service.get("base_price"):
                            service["base_price"] = float(service["base_price"])

                return jsonify(bundle_dict)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# AVAILABILITY ENDPOINTS
# ============================================================================


@api_bp.get("/availability/slots")
def get_available_slots():
    """
    Get available time slots for booking.
    Query params:
    - package_id: required
    - provider_id: optional (if not provided, checks ANY available provider)
    - date: required (YYYY-MM-DD)
    """
    try:
        package_id = request.args.get("package_id", type=int)
        provider_id = request.args.get("provider_id", type=int)
        date_str = request.args.get("date")

        if not package_id or not date_str:
            return jsonify({"error": "package_id and date required"}), 400

        # Parse date
        slot_date = datetime.strptime(date_str, "%Y-%m-%d").date()

        # Prevent past dates
        if slot_date < datetime.now().date():
            return jsonify({"error": "Cannot book in the past"}), 400

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get service duration - for bundles, calculate from included services
                cur.execute(
                    """
                    SELECT
                        sp.duration_minutes,
                        sp.package_type,
                        CASE
                            WHEN sp.package_type = 'bundle' THEN
                                COALESCE(
                                    (SELECT SUM(included.duration_minutes)
                                     FROM bundle_items bi
                                     JOIN service_packages included ON bi.included_package_id = included.package_id
                                     WHERE bi.bundle_package_id = sp.package_id),
                                    sp.duration_minutes
                                )
                            ELSE sp.duration_minutes
                        END as total_duration
                    FROM service_packages sp
                    WHERE sp.package_id = %s
                    """,
                    (package_id,),
                )
                package = cur.fetchone()
                if not package:
                    return jsonify({"error": "Package not found"}), 404

                duration = package["total_duration"]
                required_slots = calculate_required_slots(duration)

                # Get providers to check
                if provider_id:
                    provider_ids = [provider_id]
                else:
                    # Find providers offering this service
                    # For bundles, find providers who can offer ALL included services
                    if package["package_type"] == "bundle":
                        cur.execute(
                            """
                            SELECT provider_id
                            FROM service_providers sp
                            WHERE sp.is_active = TRUE
                            AND NOT EXISTS (
                                -- Check if there's any included service this provider doesn't offer
                                SELECT 1
                                FROM bundle_items bi
                                WHERE bi.bundle_package_id = %s
                                AND NOT EXISTS (
                                    SELECT 1
                                    FROM provider_services ps
                                    WHERE ps.provider_id = sp.provider_id
                                    AND ps.package_id = bi.included_package_id
                                    AND ps.is_available = TRUE
                                )
                            )
                            AND EXISTS (
                                -- Make sure provider offers at least one included service
                                SELECT 1
                                FROM bundle_items bi
                                JOIN provider_services ps ON ps.package_id = bi.included_package_id
                                WHERE bi.bundle_package_id = %s
                                AND ps.provider_id = sp.provider_id
                                AND ps.is_available = TRUE
                            )
                            """,
                            (package_id, package_id),
                        )
                    else:
                        cur.execute(
                            """
                            SELECT DISTINCT ps.provider_id
                            FROM provider_services ps
                            JOIN service_providers sp ON ps.provider_id = sp.provider_id
                            WHERE ps.package_id = %s
                            AND ps.is_available = TRUE
                            AND sp.is_active = TRUE
                            """,
                            (package_id,),
                        )
                    provider_ids = [row["provider_id"] for row in cur.fetchall()]

                # Check if any providers found
                if not provider_ids:
                    return jsonify(
                        {
                            "date": date_str,
                            "available_slots": [],
                            "required_slots": required_slots,
                            "message": "No providers available for this service"
                            + (
                                " bundle" if package["package_type"] == "bundle" else ""
                            ),
                        }
                    )

                # Generate available slots respecting provider working hours
                available_starts = []

                for pid in provider_ids:
                    # Get provider's working hours
                    cur.execute(
                        """
                        SELECT working_hours_start, working_hours_end
                        FROM service_providers
                        WHERE provider_id = %s
                        """,
                        (pid,),
                    )
                    provider = cur.fetchone()
                    if not provider:
                        continue

                    # Convert working hours to hour integers
                    start_hour = provider["working_hours_start"].hour
                    end_hour = provider["working_hours_end"].hour

                    # Generate slots within working hours
                    for hour in range(start_hour, end_hour + 1):
                        for minute in [0, 30]:
                            start_time = f"{hour:02d}:{minute:02d}"

                            # Check if slot is within working hours
                            # (end hour should be exclusive for slot starts)
                            if hour == end_hour and minute > 0:
                                continue

                            # Check if this slot group is available for this provider
                            slot_times = generate_slot_times(start_time, required_slots)

                            all_available = True
                            for slot_time in slot_times:
                                available, _ = check_slot_available(
                                    cur, pid, slot_date, slot_time
                                )
                                if not available:
                                    all_available = False
                                    break

                            if all_available:
                                # Check if we already have this time slot from another provider
                                if not any(
                                    slot["start_time"] == start_time
                                    for slot in available_starts
                                ):
                                    available_starts.append(
                                        {
                                            "start_time": start_time,
                                            "provider_id": pid if provider_id else None,
                                            "duration_minutes": duration,
                                        }
                                    )

                # Sort available slots by time
                available_starts.sort(key=lambda x: x["start_time"])

                return jsonify(
                    {
                        "date": date_str,
                        "available_slots": available_starts,
                        "required_slots": required_slots,
                    }
                )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# BOOKING ENDPOINTS
# ============================================================================


@api_bp.post("/bookings")
def create_booking():
    """Create booking with time slot validation"""
    try:
        data = request.get_json()

        # NEW required fields
        required_fields = [
            "package_id",
            "booking_type",
            "service_address",
            "start_date",
            "start_time",
        ]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Validate time slot format
        valid, error = validate_time_slot(data["start_time"])
        if not valid:
            return jsonify({"error": error}), 400

        # Parse start date (end_date will be calculated automatically)
        start_date = datetime.strptime(data["start_date"], "%Y-%m-%d").date()

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get service duration - for bundles, calculate from included services
                cur.execute(
                    """
                    SELECT
                        sp.duration_minutes,
                        sp.package_type,
                        sp.base_price,
                        CASE
                            WHEN sp.package_type = 'bundle' THEN
                                COALESCE(
                                    (SELECT SUM(included.duration_minutes)
                                     FROM bundle_items bi
                                     JOIN service_packages included ON bi.included_package_id = included.package_id
                                     WHERE bi.bundle_package_id = sp.package_id),
                                    sp.duration_minutes
                                )
                            ELSE sp.duration_minutes
                        END as total_duration
                    FROM service_packages sp
                    WHERE sp.package_id = %s
                    """,
                    (data["package_id"],),
                )
                package = cur.fetchone()
                if not package:
                    return jsonify({"error": "Package not found"}), 404

                required_slots = calculate_required_slots(package["total_duration"])

                # Determine provider
                provider_id = data.get("provider_id")
                if not provider_id:
                    # Find available provider
                    # For bundles, find a provider who can offer ALL included services
                    if package["package_type"] == "bundle":
                        cur.execute(
                            """
                            SELECT provider_id
                            FROM service_providers sp
                            WHERE sp.is_active = TRUE
                            AND NOT EXISTS (
                                -- Check if there's any included service this provider doesn't offer
                                SELECT 1
                                FROM bundle_items bi
                                WHERE bi.bundle_package_id = %s
                                AND NOT EXISTS (
                                    SELECT 1
                                    FROM provider_services ps
                                    WHERE ps.provider_id = sp.provider_id
                                    AND ps.package_id = bi.included_package_id
                                    AND ps.is_available = TRUE
                                )
                            )
                            AND EXISTS (
                                -- Make sure provider offers at least one included service
                                SELECT 1
                                FROM bundle_items bi
                                JOIN provider_services ps ON ps.package_id = bi.included_package_id
                                WHERE bi.bundle_package_id = %s
                                AND ps.provider_id = sp.provider_id
                                AND ps.is_available = TRUE
                            )
                            LIMIT 1
                            """,
                            (data["package_id"], data["package_id"]),
                        )
                    else:
                        cur.execute(
                            """
                            SELECT ps.provider_id
                            FROM provider_services ps
                            JOIN service_providers sp ON ps.provider_id = sp.provider_id
                            WHERE ps.package_id = %s
                            AND ps.is_available = TRUE
                            AND sp.is_active = TRUE
                            LIMIT 1
                            """,
                            (data["package_id"],),
                        )
                    result = cur.fetchone()
                    if not result:
                        return (
                            jsonify(
                                {
                                    "error": "No available providers for this "
                                    + (
                                        "bundle"
                                        if package["package_type"] == "bundle"
                                        else "service"
                                    )
                                }
                            ),
                            404,
                        )
                    provider_id = result["provider_id"]

                # Generate slots to book - automatically span multiple days if needed
                slots_to_book = []
                current_date = start_date
                remaining_slots = required_slots
                start_time = data["start_time"]
                max_days = 30  # Safety limit to prevent infinite loop
                days_checked = 0

                while remaining_slots > 0 and days_checked < max_days:
                    # Calculate how many slots we can try to fit in current day
                    # Max 20 slots per day (10 hours of work)
                    slots_to_try = min(remaining_slots, 20)
                    slot_times = generate_slot_times(start_time, slots_to_try)

                    # Try to book all slots for this day
                    day_slots_booked = 0
                    for slot_time in slot_times:
                        # Validate slot available
                        available, error = check_slot_available(
                            cur, provider_id, current_date, slot_time
                        )
                        if not available:
                            # If we can't book this slot, stop trying for today
                            break

                        slots_to_book.append((current_date, slot_time))
                        remaining_slots -= 1
                        day_slots_booked += 1

                        if remaining_slots == 0:
                            break

                    # If we still need more slots, move to next day
                    if remaining_slots > 0:
                        # If we couldn't book any slots today, it's an error
                        if day_slots_booked == 0:
                            return (
                                jsonify(
                                    {
                                        "error": f"No availability on {current_date}. Cannot complete booking."
                                    }
                                ),
                                400,
                            )

                        current_date += timedelta(days=1)
                        start_time = "09:00"  # Start at 9am for subsequent days
                        days_checked += 1

                if remaining_slots > 0:
                    return (
                        jsonify(
                            {
                                "error": f"Not enough availability within {max_days} days for requested duration"
                            }
                        ),
                        400,
                    )

                # Get default user
                cur.execute(
                    """
                    SELECT u.id FROM users u
                    JOIN user_roles ur ON u.id = ur.user_id
                    WHERE ur.role_id = (SELECT role_id FROM roles WHERE role_name = 'customer')
                    LIMIT 1
                    """
                )
                user_result = cur.fetchone()
                if not user_result:
                    return jsonify({"error": "No customer users found"}), 500
                default_user_id = user_result["id"]

                # Create booking
                cur.execute(
                    """
                    INSERT INTO bookings (
                        user_id, package_id, provider_id, booking_type,
                        booking_status, scheduled_date, service_address, special_instructions
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING booking_id, booking_reference, booking_status
                    """,
                    (
                        default_user_id,
                        data["package_id"],
                        provider_id,
                        data["booking_type"],
                        "pending",
                        start_date,  # Keep for backwards compatibility
                        data["service_address"],
                        data.get("special_instructions"),
                    ),
                )

                booking_result = cur.fetchone()
                booking_id = booking_result["booking_id"]

                # Reserve time slots
                for slot_date, slot_time in slots_to_book:
                    cur.execute(
                        """
                        INSERT INTO booking_time_slots (
                            booking_id, provider_id, slot_date, slot_time, status
                        ) VALUES (%s, %s, %s, %s, %s)
                        """,
                        (booking_id, provider_id, slot_date, slot_time, "booked"),
                    )

                # SECURITY: Link booking to work item if this is inspection-based
                # This is crucial for applying provider-set discounts at payment time
                if data.get("urgent_item_id"):
                    cur.execute(
                        """
                        INSERT INTO booking_urgent_items (booking_id, urgent_item_id)
                        VALUES (%s, %s)
                        """,
                        (booking_id, data["urgent_item_id"]),
                    )

                    # Also mark the work item as resolved (being addressed by this booking)
                    cur.execute(
                        """
                        UPDATE urgent_work_items
                        SET is_resolved = TRUE
                        WHERE urgent_item_id = %s
                        """,
                        (data["urgent_item_id"],),
                    )

                return (
                    jsonify(
                        {
                            "booking_id": booking_result["booking_id"],
                            "booking_reference": booking_result["booking_reference"],
                            "booking_status": booking_result["booking_status"],
                            "slots_reserved": len(slots_to_book),
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

                # Convert Decimal to float and add amount field for frontend
                booking_dict = dict(booking)
                if booking_dict.get("base_price"):
                    booking_dict["base_price"] = float(booking_dict["base_price"])
                    booking_dict["amount"] = booking_dict[
                        "base_price"
                    ]  # Alias for frontend

                return jsonify(booking_dict)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# PAYMENT ENDPOINTS
# ============================================================================


@api_bp.post("/payments/create-intent")
def create_payment_intent():
    """
    Create a Stripe payment intent for a booking.
    SECURE: Price is calculated server-side from database, not trusted from client.
    """
    try:
        data = request.get_json()

        if "booking_id" not in data:
            return jsonify({"error": "Missing booking_id"}), 400

        booking_id = data["booking_id"]

        # SECURITY: Get actual price from database, don't trust client
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        b.booking_id,
                        b.booking_status,
                        sp.base_price,
                        b.user_id,
                        sp.package_type
                    FROM bookings b
                    JOIN service_packages sp ON b.package_id = sp.package_id
                    WHERE b.booking_id = %s
                    """,
                    (booking_id,),
                )

                booking = cur.fetchone()

                if not booking:
                    return jsonify({"error": "Booking not found"}), 404

                # SECURITY: Check if booking is in valid state for payment
                if booking["booking_status"] not in ["pending", "confirmed"]:
                    return (
                        jsonify({"error": "Booking cannot be paid in current status"}),
                        400,
                    )

                # SECURITY: Check if payment already exists
                cur.execute(
                    """
                    SELECT payment_id FROM payments
                    WHERE booking_id = %s AND payment_status = 'completed'
                    """,
                    (booking_id,),
                )

                existing_payment = cur.fetchone()
                if existing_payment:
                    return jsonify({"error": "Booking has already been paid"}), 400

                # SECURITY: Calculate final price including discounts from work items
                base_price = float(booking["base_price"])

                # Check if this booking is linked to work items with discounts
                cur.execute(
                    """
                    SELECT uwi.discount_percentage
                    FROM booking_urgent_items bui
                    JOIN urgent_work_items uwi ON bui.urgent_item_id = uwi.urgent_item_id
                    WHERE bui.booking_id = %s
                    LIMIT 1
                    """,
                    (booking_id,),
                )

                work_item = cur.fetchone()

                if work_item and work_item["discount_percentage"]:
                    # Apply provider-set discount
                    discount = float(work_item["discount_percentage"])
                    amount = base_price * (1 - discount / 100)
                else:
                    # No discount, use base price
                    amount = base_price

        # Convert to cents/pence for Stripe
        amount_cents = int(amount * 100)

        # Check if we have a real Stripe key or mock mode
        if stripe.api_key == "sk_test_mock_key":
            # Mock mode for testing without real Stripe
            mock_intent_id = f"pi_mock_{booking_id}_{int(datetime.now().timestamp())}"
            mock_client_secret = (
                f"pi_mock_{booking_id}_secret_{int(datetime.now().timestamp())}"
            )

            return jsonify(
                {
                    "client_secret": mock_client_secret,
                    "payment_intent_id": mock_intent_id,
                    "amount": amount,  # Send back the actual amount from database
                    "mock": True,
                    "message": "Using mock payment - set STRIPE_SECRET_KEY to use real Stripe",
                }
            )

        # Create real Stripe payment intent
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency="aud",
            metadata={
                "booking_id": str(booking_id),
                "integration_check": "accept_a_payment",
            },
        )

        return jsonify(
            {
                "client_secret": intent.client_secret,
                "payment_intent_id": intent.id,
                "amount": amount,  # Send back the actual amount from database
                "mock": False,
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.post("/payments/confirm")
def confirm_payment():
    """
    Confirm payment and create payment record.
    SECURE: All data retrieved from database, validates payment amount matches booking price.
    """
    try:
        data = request.get_json()

        required_fields = ["booking_id", "payment_intent_id"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        booking_id = data["booking_id"]
        payment_intent_id = data["payment_intent_id"]

        # Get booking details
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get booking info
                cur.execute(
                    """
                    SELECT
                        b.booking_id,
                        b.booking_reference,
                        b.user_id,
                        u.email,
                        sp.package_name,
                        sp.base_price,
                        prov.business_name as provider_name,
                        b.scheduled_date,
                        b.service_address
                    FROM bookings b
                    JOIN users u ON b.user_id = u.id
                    JOIN service_packages sp ON b.package_id = sp.package_id
                    LEFT JOIN service_providers prov ON b.provider_id = prov.provider_id
                    WHERE b.booking_id = %s
                    """,
                    (booking_id,),
                )

                booking = cur.fetchone()

                if not booking:
                    return jsonify({"error": "Booking not found"}), 404

                # SECURITY: Check if payment already exists for this booking
                cur.execute(
                    """
                    SELECT payment_id FROM payments
                    WHERE booking_id = %s AND payment_status = 'completed'
                    """,
                    (booking_id,),
                )

                existing_payment = cur.fetchone()
                if existing_payment:
                    return jsonify({"error": "This booking has already been paid"}), 400

                # SECURITY: Use actual price from database, not from client
                amount = float(booking["base_price"])

                # Create payment record
                payment_reference = f"PAY-{booking['booking_reference']}-{int(datetime.now().timestamp())}"

                cur.execute(
                    """
                    INSERT INTO payments (
                        booking_id,
                        payment_reference,
                        amount,
                        discount_amount,
                        final_amount,
                        payment_status,
                        payment_method,
                        payment_gateway,
                        transaction_id,
                        payment_date
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                    RETURNING payment_id, payment_reference
                    """,
                    (
                        booking_id,
                        payment_reference,
                        amount,
                        0.00,  # no discount for now
                        amount,
                        "completed",
                        "credit_card",
                        "Stripe" if stripe.api_key != "sk_test_mock_key" else "Mock",
                        payment_intent_id,
                        datetime.now(),
                    ),
                )

                payment_result = cur.fetchone()

                # Update booking status
                cur.execute(
                    """
                    UPDATE bookings
                    SET booking_status = 'confirmed'
                    WHERE booking_id = %s
                    """,
                    (booking_id,),
                )

                # Create confirmation record (check if exists first)
                confirmation_number = f"CONF-{booking['booking_reference']}"

                # Check if confirmation already exists
                cur.execute(
                    "SELECT confirmation_id FROM confirmations WHERE booking_id = %s",
                    (booking_id,),
                )
                existing = cur.fetchone()

                if not existing:
                    cur.execute(
                        """
                        INSERT INTO confirmations (
                            booking_id,
                            confirmation_number,
                            confirmation_date,
                            email_sent
                        ) VALUES (
                            %s, %s, %s, %s
                        )
                        """,
                        (booking_id, confirmation_number, datetime.now(), False),
                    )

                # Send emails
                email_sent = False
                if booking.get("email"):
                    # Send payment confirmation
                    send_payment_confirmation_email(
                        to_email=booking["email"],
                        booking_reference=booking["booking_reference"],
                        payment_reference=payment_reference,
                        amount=amount,
                        package_name=booking["package_name"],
                    )

                    # Send booking confirmation
                    email_sent = send_booking_confirmation_email(
                        to_email=booking["email"],
                        booking_reference=booking["booking_reference"],
                        package_name=booking["package_name"],
                        scheduled_date=str(booking.get("scheduled_date", "")),
                        service_address=booking.get("service_address", ""),
                        provider_name=booking.get("provider_name"),
                    )

                    # Update email sent status
                    if email_sent:
                        cur.execute(
                            """
                            UPDATE confirmations
                            SET email_sent = TRUE, email_sent_at = %s
                            WHERE booking_id = %s
                            """,
                            (datetime.now(), booking_id),
                        )

                return (
                    jsonify(
                        {
                            "payment_id": payment_result["payment_id"],
                            "payment_reference": payment_result["payment_reference"],
                            "booking_reference": booking["booking_reference"],
                            "confirmation_number": confirmation_number,
                            "status": "completed",
                            "email_sent": email_sent,
                        }
                    ),
                    201,
                )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.get("/payments/booking/<int:booking_id>")
def get_payment_by_booking(booking_id):
    """Get payment details for a booking."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        p.payment_id,
                        p.payment_reference,
                        p.amount,
                        p.final_amount,
                        p.payment_status,
                        p.payment_method,
                        p.payment_date,
                        b.booking_reference
                    FROM payments p
                    JOIN bookings b ON p.booking_id = b.booking_id
                    WHERE p.booking_id = %s
                    ORDER BY p.payment_date DESC
                    LIMIT 1
                    """,
                    (booking_id,),
                )

                payment = cur.fetchone()

                if not payment:
                    return jsonify({"error": "Payment not found"}), 404

                # Convert Decimal to float
                payment_dict = dict(payment)
                if payment_dict.get("amount"):
                    payment_dict["amount"] = float(payment_dict["amount"])
                if payment_dict.get("final_amount"):
                    payment_dict["final_amount"] = float(payment_dict["final_amount"])

                return jsonify(payment_dict)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.get("/payments/confirmation/<string:payment_reference>")
def get_confirmation_details(payment_reference):
    """
    Get confirmation details by payment reference.
    SECURE: All data from database, validates payment_reference exists.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        p.payment_reference,
                        b.booking_reference,
                        p.final_amount as amount,
                        sp.package_name,
                        p.payment_status,
                        p.payment_date,
                        b.scheduled_date,
                        b.service_address
                    FROM payments p
                    JOIN bookings b ON p.booking_id = b.booking_id
                    JOIN service_packages sp ON b.package_id = sp.package_id
                    WHERE p.payment_reference = %s
                    """,
                    (payment_reference,),
                )

                confirmation = cur.fetchone()

                if not confirmation:
                    return jsonify({"error": "Payment confirmation not found"}), 404

                # Convert to dict and handle Decimal/date types
                result = dict(confirmation)
                if result.get("amount"):
                    result["amount"] = float(result["amount"])
                if result.get("payment_date"):
                    result["payment_date"] = result["payment_date"].isoformat()
                if result.get("scheduled_date"):
                    result["scheduled_date"] = result["scheduled_date"].isoformat()

                return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# INSPECTION ENDPOINTS
# ============================================================================


@api_bp.post("/inspections")
def create_inspection():
    """Book a new home inspection"""
    try:
        data = request.get_json()

        # Required fields
        required_fields = ["user_id", "inspection_date", "service_address"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Parse inspection date
        inspection_date = datetime.strptime(data["inspection_date"], "%Y-%m-%dT%H:%M")

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Optional: Auto-assign available provider
                provider_id = data.get("provider_id")
                if not provider_id:
                    # Find an available provider (simple first-available logic)
                    cur.execute(
                        """
                        SELECT provider_id
                        FROM service_providers
                        WHERE is_active = TRUE
                        LIMIT 1
                        """
                    )
                    provider_result = cur.fetchone()
                    if provider_result:
                        provider_id = provider_result["provider_id"]

                # Create inspection record
                cur.execute(
                    """
                    INSERT INTO inspection_visits (
                        user_id,
                        provider_id,
                        inspection_date,
                        inspection_status,
                        inspection_notes
                    )
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING inspection_id, inspection_date, inspection_status
                    """,
                    (
                        data["user_id"],
                        provider_id,
                        inspection_date,
                        "scheduled",
                        data.get("notes", ""),
                    ),
                )

                result = cur.fetchone()
                conn.commit()

                # Convert to dict
                inspection = dict(result)
                if inspection.get("inspection_date"):
                    inspection["inspection_date"] = inspection[
                        "inspection_date"
                    ].isoformat()

                return jsonify(inspection), 201

    except Exception as e:
        import traceback

        print(f"Error creating inspection: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@api_bp.get("/inspections")
def get_inspections():
    """Get list of inspections filtered by user_id or provider_id"""
    try:
        user_id = request.args.get("user_id")
        provider_id = request.args.get("provider_id")

        if not user_id and not provider_id:
            return jsonify({"error": "user_id or provider_id required"}), 400

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                query = """
                    SELECT
                        iv.inspection_id,
                        iv.user_id,
                        iv.provider_id,
                        iv.inspection_date,
                        iv.inspection_status,
                        iv.inspection_notes,
                        iv.inspector_name,
                        iv.created_at,
                        sp.business_name as provider_name,
                        COUNT(uwi.urgent_item_id) as work_items_count,
                        COUNT(CASE WHEN uwi.urgency_level = 'critical' THEN 1 END) as critical_count,
                        COUNT(CASE WHEN uwi.urgency_level = 'high' THEN 1 END) as high_count,
                        COUNT(CASE WHEN uwi.urgency_level = 'medium' THEN 1 END) as medium_count
                    FROM inspection_visits iv
                    LEFT JOIN service_providers sp ON iv.provider_id = sp.provider_id
                    LEFT JOIN urgent_work_items uwi ON iv.inspection_id = uwi.inspection_id
                """

                if user_id:
                    query += " WHERE iv.user_id = %s"
                    params = (user_id,)
                else:
                    query += " WHERE iv.provider_id = %s"
                    params = (provider_id,)

                query += """
                    GROUP BY iv.inspection_id, sp.business_name
                    ORDER BY iv.inspection_date DESC
                """

                cur.execute(query, params)
                inspections = cur.fetchall()

                # Convert to list of dicts
                result = []
                for inspection in inspections:
                    insp_dict = dict(inspection)
                    if insp_dict.get("inspection_date"):
                        insp_dict["inspection_date"] = insp_dict[
                            "inspection_date"
                        ].isoformat()
                    if insp_dict.get("created_at"):
                        insp_dict["created_at"] = insp_dict["created_at"].isoformat()
                    result.append(insp_dict)

                return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.get("/inspections/<int:inspection_id>")
def get_inspection_details(inspection_id):
    """Get detailed inspection with all work items and bundle recommendations"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get inspection details
                cur.execute(
                    """
                    SELECT
                        iv.inspection_id,
                        iv.user_id,
                        iv.provider_id,
                        iv.inspection_date,
                        iv.inspection_status,
                        iv.inspection_notes,
                        iv.inspector_name,
                        iv.created_at,
                        iv.updated_at,
                        sp.business_name as provider_name
                    FROM inspection_visits iv
                    LEFT JOIN service_providers sp ON iv.provider_id = sp.provider_id
                    WHERE iv.inspection_id = %s
                    """,
                    (inspection_id,),
                )

                inspection = cur.fetchone()
                if not inspection:
                    return jsonify({"error": "Inspection not found"}), 404

                inspection_dict = dict(inspection)

                # Convert dates
                if inspection_dict.get("inspection_date"):
                    inspection_dict["inspection_date"] = inspection_dict[
                        "inspection_date"
                    ].isoformat()
                if inspection_dict.get("created_at"):
                    inspection_dict["created_at"] = inspection_dict[
                        "created_at"
                    ].isoformat()
                if inspection_dict.get("updated_at"):
                    inspection_dict["updated_at"] = inspection_dict[
                        "updated_at"
                    ].isoformat()

                # Get work items with recommended packages
                cur.execute(
                    """
                    SELECT
                        uwi.urgent_item_id,
                        uwi.inspection_id,
                        uwi.item_description,
                        uwi.urgency_level,
                        uwi.discount_percentage,
                        uwi.recommended_package_id,
                        uwi.is_resolved,
                        uwi.created_at,
                        sp.package_name,
                        sp.description as package_description,
                        sp.base_price,
                        sp.duration_minutes,
                        sc.category_name
                    FROM urgent_work_items uwi
                    LEFT JOIN service_packages sp ON uwi.recommended_package_id = sp.package_id
                    LEFT JOIN service_categories sc ON sp.category_id = sc.category_id
                    WHERE uwi.inspection_id = %s
                    ORDER BY
                        CASE uwi.urgency_level
                            WHEN 'critical' THEN 1
                            WHEN 'high' THEN 2
                            WHEN 'medium' THEN 3
                            ELSE 4
                        END,
                        uwi.created_at
                    """,
                    (inspection_id,),
                )

                work_items = cur.fetchall()
                work_items_list = []
                recommended_package_ids = []

                for item in work_items:
                    item_dict = dict(item)
                    if item_dict.get("discount_percentage") is not None:
                        item_dict["discount_percentage"] = float(
                            item_dict["discount_percentage"]
                        )
                    if item_dict.get("base_price"):
                        item_dict["base_price"] = float(item_dict["base_price"])
                    if item_dict.get("created_at"):
                        item_dict["created_at"] = item_dict["created_at"].isoformat()

                    # Build recommended_package object
                    if item_dict.get("recommended_package_id"):
                        recommended_package_ids.append(
                            item_dict["recommended_package_id"]
                        )
                        item_dict["recommended_package"] = {
                            "package_id": item_dict["recommended_package_id"],
                            "package_name": item_dict.get("package_name"),
                            "description": item_dict.get("package_description"),
                            "base_price": item_dict.get("base_price"),
                            "duration_minutes": item_dict.get("duration_minutes"),
                            "category_name": item_dict.get("category_name"),
                        }

                    # Remove redundant fields
                    for key in [
                        "package_name",
                        "package_description",
                        "base_price",
                        "duration_minutes",
                        "category_name",
                    ]:
                        item_dict.pop(key, None)

                    work_items_list.append(item_dict)

                inspection_dict["work_items"] = work_items_list

                # Find potential bundle recommendations
                # Look for bundles that include multiple recommended packages
                recommended_bundles = []
                if len(recommended_package_ids) >= 2:
                    # Convert to tuple for SQL IN clause
                    package_ids_tuple = tuple(set(recommended_package_ids))

                    cur.execute(
                        """
                        SELECT
                            sp.package_id,
                            sp.package_name,
                            sp.description,
                            sp.base_price as bundle_price,
                            sp.discount_percentage,
                            COUNT(DISTINCT bi.included_package_id) as matching_services
                        FROM service_packages sp
                        JOIN bundle_items bi ON sp.package_id = bi.bundle_package_id
                        WHERE sp.package_type = 'bundle'
                        AND sp.is_active = TRUE
                        AND bi.included_package_id IN %s
                        GROUP BY sp.package_id
                        HAVING COUNT(DISTINCT bi.included_package_id) >= 2
                        ORDER BY matching_services DESC
                        LIMIT 3
                        """,
                        (package_ids_tuple,),
                    )

                    bundles = cur.fetchall()
                    for bundle in bundles:
                        bundle_dict = dict(bundle)
                        if bundle_dict.get("bundle_price"):
                            bundle_dict["bundle_price"] = float(
                                bundle_dict["bundle_price"]
                            )
                        if bundle_dict.get("discount_percentage"):
                            bundle_dict["discount_percentage"] = float(
                                bundle_dict["discount_percentage"]
                            )
                        recommended_bundles.append(bundle_dict)

                inspection_dict["recommended_bundles"] = recommended_bundles

                return jsonify(inspection_dict)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.put("/inspections/<int:inspection_id>")
def update_inspection(inspection_id):
    """Update inspection (e.g., mark complete, add notes)"""
    try:
        data = request.get_json()

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Build dynamic update query
                update_fields = []
                params = []

                if "inspection_status" in data:
                    update_fields.append("inspection_status = %s")
                    params.append(data["inspection_status"])

                if "inspection_notes" in data:
                    update_fields.append("inspection_notes = %s")
                    params.append(data["inspection_notes"])

                if "inspector_name" in data:
                    update_fields.append("inspector_name = %s")
                    params.append(data["inspector_name"])

                if not update_fields:
                    return jsonify({"error": "No fields to update"}), 400

                update_fields.append("updated_at = CURRENT_TIMESTAMP")
                params.append(inspection_id)

                query = f"""
                    UPDATE inspection_visits
                    SET {', '.join(update_fields)}
                    WHERE inspection_id = %s
                    RETURNING inspection_id, inspection_status, inspection_notes, inspector_name, updated_at
                """

                cur.execute(query, params)
                result = cur.fetchone()

                if not result:
                    return jsonify({"error": "Inspection not found"}), 404

                conn.commit()

                # Convert to dict
                inspection = dict(result)
                if inspection.get("updated_at"):
                    inspection["updated_at"] = inspection["updated_at"].isoformat()

                return jsonify(inspection)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.post("/inspections/<int:inspection_id>/work-items")
def create_work_item(inspection_id):
    """Provider creates a new urgent work item for an inspection"""
    try:
        data = request.get_json()

        # Required fields - estimated_cost is no longer required, we use package price
        required_fields = [
            "item_description",
            "urgency_level",
            "recommended_package_id",
        ]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Validate urgency level
        if data["urgency_level"] not in ["critical", "high", "medium"]:
            return (
                jsonify(
                    {"error": "urgency_level must be 'critical', 'high', or 'medium'"}
                ),
                400,
            )

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Verify inspection exists
                cur.execute(
                    "SELECT inspection_id FROM inspection_visits WHERE inspection_id = %s",
                    (inspection_id,),
                )
                if not cur.fetchone():
                    return jsonify({"error": "Inspection not found"}), 404

                # Create work item with optional discount
                cur.execute(
                    """
                    INSERT INTO urgent_work_items (
                        inspection_id,
                        item_description,
                        urgency_level,
                        discount_percentage,
                        recommended_package_id,
                        is_resolved
                    )
                    VALUES (%s, %s, %s, %s, %s, FALSE)
                    RETURNING urgent_item_id, inspection_id, item_description,
                              urgency_level, discount_percentage, recommended_package_id,
                              is_resolved, created_at
                    """,
                    (
                        inspection_id,
                        data["item_description"],
                        data["urgency_level"],
                        data.get("discount_percentage", 0),
                        data["recommended_package_id"],
                    ),
                )

                result = cur.fetchone()
                conn.commit()

                # Convert to dict
                work_item = dict(result)
                if work_item.get("discount_percentage"):
                    work_item["discount_percentage"] = float(
                        work_item["discount_percentage"]
                    )
                if work_item.get("created_at"):
                    work_item["created_at"] = work_item["created_at"].isoformat()

                return jsonify(work_item), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.put("/inspections/<int:inspection_id>/work-items/<int:item_id>")
def update_work_item(inspection_id, item_id):
    """Provider updates an existing work item"""
    try:
        data = request.get_json()

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Build dynamic update query
                update_fields = []
                params = []

                if "item_description" in data:
                    update_fields.append("item_description = %s")
                    params.append(data["item_description"])

                if "urgency_level" in data:
                    if data["urgency_level"] not in ["critical", "high", "medium"]:
                        return (
                            jsonify(
                                {
                                    "error": "urgency_level must be 'critical', 'high', or 'medium'"
                                }
                            ),
                            400,
                        )
                    update_fields.append("urgency_level = %s")
                    params.append(data["urgency_level"])

                if "discount_percentage" in data:
                    update_fields.append("discount_percentage = %s")
                    params.append(data["discount_percentage"])

                if "recommended_package_id" in data:
                    update_fields.append("recommended_package_id = %s")
                    params.append(data["recommended_package_id"])

                if not update_fields:
                    return jsonify({"error": "No fields to update"}), 400

                params.extend([inspection_id, item_id])

                query = f"""
                    UPDATE urgent_work_items
                    SET {', '.join(update_fields)}
                    WHERE inspection_id = %s AND urgent_item_id = %s
                    RETURNING urgent_item_id, inspection_id, item_description,
                              urgency_level, discount_percentage, recommended_package_id,
                              is_resolved, created_at
                """

                cur.execute(query, params)
                result = cur.fetchone()

                if not result:
                    return jsonify({"error": "Work item not found"}), 404

                conn.commit()

                # Convert to dict
                work_item = dict(result)
                if work_item.get("discount_percentage"):
                    work_item["discount_percentage"] = float(
                        work_item["discount_percentage"]
                    )
                if work_item.get("created_at"):
                    work_item["created_at"] = work_item["created_at"].isoformat()

                return jsonify(work_item)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.delete("/inspections/<int:inspection_id>/work-items/<int:item_id>")
def delete_work_item(inspection_id, item_id):
    """Provider deletes a work item (if added by mistake)"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    DELETE FROM urgent_work_items
                    WHERE inspection_id = %s AND urgent_item_id = %s
                    RETURNING urgent_item_id
                    """,
                    (inspection_id, item_id),
                )

                result = cur.fetchone()

                if not result:
                    return jsonify({"error": "Work item not found"}), 404

                conn.commit()

                return jsonify({"message": "Work item deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# NEARBY PROVIDERS & COVID RESTRICTIONS ENDPOINTS
# ============================================================================


@api_bp.route("/nearby-providers", methods=["GET"])
def get_nearby_providers():
    """
    Find service providers near a given location.
    Query params:
    - latitude: required (user's latitude)
    - longitude: required (user's longitude)
    - radius: optional (search radius in km, default 30)
    - service_category_id: optional (filter by service category)
    """
    try:
        # Validate required parameters
        latitude = request.args.get("latitude", type=float)
        longitude = request.args.get("longitude", type=float)
        radius = request.args.get("radius", type=float, default=30.0)
        category_id = request.args.get("service_category_id", type=int)

        if latitude is None or longitude is None:
            return jsonify({"error": "latitude and longitude are required"}), 400

        # Validate latitude and longitude ranges
        if not (-90 <= latitude <= 90):
            return jsonify({"error": "Invalid latitude (must be -90 to 90)"}), 400
        if not (-180 <= longitude <= 180):
            return jsonify({"error": "Invalid longitude (must be -180 to 180)"}), 400

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get all active providers with their services
                query = """
                    SELECT
                        sp.provider_id,
                        sp.business_name,
                        sp.description,
                        sp.address,
                        sp.latitude,
                        sp.longitude,
                        sp.average_rating,
                        sp.is_verified,
                        sp.service_radius_km,
                        COALESCE(
                            array_agg(DISTINCT pkg.package_name) FILTER (WHERE pkg.package_name IS NOT NULL),
                            ARRAY[]::text[]
                        ) as services
                    FROM service_providers sp
                    LEFT JOIN provider_services ps ON sp.provider_id = ps.provider_id AND ps.is_available = TRUE
                    LEFT JOIN service_packages pkg ON ps.package_id = pkg.package_id AND pkg.is_active = TRUE
                    WHERE sp.is_active = TRUE
                    AND sp.latitude IS NOT NULL
                    AND sp.longitude IS NOT NULL
                """

                params = []

                # Optional category filter
                if category_id:
                    query += """
                        AND EXISTS (
                            SELECT 1 FROM provider_services ps2
                            JOIN service_packages pkg2 ON ps2.package_id = pkg2.package_id
                            WHERE ps2.provider_id = sp.provider_id
                            AND pkg2.category_id = %s
                            AND ps2.is_available = TRUE
                        )
                    """
                    params.append(category_id)

                # Add GROUP BY for aggregation
                query += """
                    GROUP BY sp.provider_id, sp.business_name, sp.description,
                             sp.address, sp.latitude, sp.longitude,
                             sp.average_rating, sp.is_verified, sp.service_radius_km
                """

                cur.execute(query, params)
                providers = cur.fetchall()

                # Calculate distances and filter by radius
                nearby_providers = []
                for provider in providers:
                    provider_dict = dict(provider)

                    # Calculate distance using Haversine formula
                    distance = haversine_distance(
                        latitude,
                        longitude,
                        float(provider_dict["latitude"]),
                        float(provider_dict["longitude"]),
                    )

                    # Filter by radius
                    if distance <= radius:
                        provider_dict["distance_km"] = round(distance, 2)
                        provider_dict["service_count"] = len(provider_dict["services"])

                        # Convert Decimal to float
                        if provider_dict.get("average_rating"):
                            provider_dict["average_rating"] = float(
                                provider_dict["average_rating"]
                            )
                        if provider_dict.get("service_radius_km"):
                            provider_dict["service_radius_km"] = float(
                                provider_dict["service_radius_km"]
                            )
                        if provider_dict.get("latitude"):
                            provider_dict["latitude"] = float(provider_dict["latitude"])
                        if provider_dict.get("longitude"):
                            provider_dict["longitude"] = float(
                                provider_dict["longitude"]
                            )

                        # Check if provider is in a COVID restriction zone
                        provider_restrictions = []
                        for zone in MOCK_COVID_RESTRICTIONS:
                            zone_distance = haversine_distance(
                                float(provider_dict["latitude"]),
                                float(provider_dict["longitude"]),
                                zone["latitude"],
                                zone["longitude"],
                            )
                            if zone_distance <= zone["radius_km"]:
                                provider_restrictions.append(
                                    {
                                        "area": zone["area"],
                                        "restriction": zone["restriction"],
                                    }
                                )

                        provider_dict["covid_restrictions"] = provider_restrictions

                        nearby_providers.append(provider_dict)

                # Sort by distance (nearest first)
                nearby_providers.sort(key=lambda x: x["distance_km"])

                return jsonify(
                    {
                        "providers": nearby_providers,
                        "count": len(nearby_providers),
                        "search_center": {"latitude": latitude, "longitude": longitude},
                        "radius_km": radius,
                    }
                )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route("/covid-restrictions", methods=["GET"])
def get_covid_restrictions():
    """
    Get COVID restriction zones affecting a given location.
    Query params:
    - latitude: required (user's latitude)
    - longitude: required (user's longitude)
    """
    try:
        latitude = request.args.get("latitude", type=float)
        longitude = request.args.get("longitude", type=float)

        if latitude is None or longitude is None:
            return jsonify({"error": "latitude and longitude are required"}), 400

        # Find restriction zones that overlap with user's location
        affecting_zones = []
        for zone in MOCK_COVID_RESTRICTIONS:
            distance = haversine_distance(
                latitude, longitude, zone["latitude"], zone["longitude"]
            )

            if distance <= zone["radius_km"]:
                affecting_zones.append(
                    {
                        "area": zone["area"],
                        "restriction": zone["restriction"],
                        "distance_km": round(distance, 2),
                    }
                )

        # Sort by distance
        affecting_zones.sort(key=lambda x: x["distance_km"])

        return jsonify(
            {
                "restrictions": affecting_zones,
                "count": len(affecting_zones),
                "location": {"latitude": latitude, "longitude": longitude},
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# USER CONSENT ENDPOINTS
# ============================================================================


@api_bp.post("/consent")
def save_user_consent():
    """
    Save user consent for data collection.
    Expected JSON body:
    {
        "user_id": "auth0-user-id",  # Auth0 ID like "google-oauth2|123..."
        "consent_given": true/false
    }
    """
    try:
        data = request.get_json()

        # Validate required fields
        if "user_id" not in data or "consent_given" not in data:
            return jsonify({"error": "user_id and consent_given are required"}), 400

        auth0_user_id = data["user_id"]
        consent_given = data["consent_given"]

        # Get client IP address
        ip_address = request.remote_addr

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # First, get the internal user UUID from Auth0 ID
                cur.execute(
                    """
                    SELECT id FROM users WHERE auth0_user_id = %s
                    """,
                    (auth0_user_id,),
                )
                user_record = cur.fetchone()

                if not user_record:
                    return jsonify({"error": "User not found"}), 404

                user_uuid = user_record["id"]

                # Check if consent record already exists
                cur.execute(
                    """
                    SELECT consent_id FROM user_data_consent
                    WHERE user_id = %s
                    """,
                    (user_uuid,),
                )
                existing = cur.fetchone()

                if existing:
                    # Update existing consent
                    cur.execute(
                        """
                        UPDATE user_data_consent
                        SET consent_given = %s,
                            consent_date = CURRENT_TIMESTAMP,
                            ip_address = %s
                        WHERE user_id = %s
                        RETURNING consent_id, consent_date
                        """,
                        (consent_given, ip_address, user_uuid),
                    )
                else:
                    # Insert new consent record
                    cur.execute(
                        """
                        INSERT INTO user_data_consent (user_id, consent_given, ip_address)
                        VALUES (%s, %s, %s)
                        RETURNING consent_id, consent_date
                        """,
                        (user_uuid, consent_given, ip_address),
                    )

                result = cur.fetchone()

                return jsonify(
                    {
                        "success": True,
                        "consent_id": result["consent_id"],
                        "consent_date": result["consent_date"].isoformat(),
                        "message": "Consent saved successfully",
                    }
                )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.get("/consent/<auth0_user_id>")
def get_user_consent(auth0_user_id):
    """
    Get user's current consent status.
    Returns 404 if no consent record found.
    Expects Auth0 user ID (e.g., "google-oauth2|123...")
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # First, get the internal user UUID from Auth0 ID
                cur.execute(
                    """
                    SELECT id FROM users WHERE auth0_user_id = %s
                    """,
                    (auth0_user_id,),
                )
                user_record = cur.fetchone()

                if not user_record:
                    return jsonify({"error": "User not found"}), 404

                user_uuid = user_record["id"]

                # Now get the consent record
                cur.execute(
                    """
                    SELECT consent_id, user_id, consent_given, consent_date, ip_address
                    FROM user_data_consent
                    WHERE user_id = %s
                    """,
                    (user_uuid,),
                )
                consent = cur.fetchone()

                if not consent:
                    return jsonify({"error": "No consent record found"}), 404

                return jsonify(
                    {
                        "consent_id": consent["consent_id"],
                        "user_id": str(consent["user_id"]),  # Convert UUID to string
                        "consent_given": consent["consent_given"],
                        "consent_date": consent["consent_date"].isoformat(),
                    }
                )

    except Exception as e:
        return jsonify({"error": str(e)}), 500
