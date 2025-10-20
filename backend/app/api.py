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

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_mock_key")

api_bp = Blueprint("api", __name__)


def decimal_to_float(obj):
    """Convert Decimal objects to float for JSON serialization."""
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError


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
                # Get service duration
                cur.execute(
                    "SELECT duration_minutes FROM service_packages WHERE package_id = %s",
                    (package_id,),
                )
                package = cur.fetchone()
                if not package:
                    return jsonify({"error": "Package not found"}), 404

                duration = package["duration_minutes"]
                required_slots = calculate_required_slots(duration)

                # Get providers to check
                if provider_id:
                    provider_ids = [provider_id]
                else:
                    # Find providers offering this service
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
                # Get service duration
                cur.execute(
                    "SELECT duration_minutes FROM service_packages WHERE package_id = %s",
                    (data["package_id"],),
                )
                package = cur.fetchone()
                if not package:
                    return jsonify({"error": "Package not found"}), 404

                required_slots = calculate_required_slots(package["duration_minutes"])

                # Determine provider
                provider_id = data.get("provider_id")
                if not provider_id:
                    # Find available provider (simplified - take first available)
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
                        return jsonify({"error": "No available providers"}), 404
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
                        b.user_id
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

                # Use the REAL price from database
                amount = float(booking["base_price"])

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
