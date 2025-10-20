"""Email service using Resend."""

import os
from typing import Optional

import resend


def init_resend():
    """Initialize Resend with API key from environment."""
    api_key = os.getenv("RESEND_API_KEY")
    if api_key:
        resend.api_key = api_key
        return True
    else:
        print("Warning: RESEND_API_KEY not found in environment variables")
        return False


def send_booking_confirmation_email(
    to_email: str,
    booking_reference: str,
    package_name: str,
    scheduled_date: str,
    service_address: str,
    provider_name: Optional[str] = None,
) -> bool:
    """
    Send booking confirmation email.

    Args:
        to_email: Recipient email address
        booking_reference: Unique booking reference number
        package_name: Name of the service package
        scheduled_date: When the service is scheduled
        service_address: Where the service will be performed
        provider_name: Optional provider name

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    if not init_resend():
        print(f"Email not sent - Resend not configured")
        return False

    try:
        from_email = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")

        provider_info = f" with {provider_name}" if provider_name else ""

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #1976d2; color: white; padding: 20px; text-align: center; }}
                .content {{ background-color: #f5f5f5; padding: 20px; }}
                .booking-details {{ background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }}
                .detail-row {{ padding: 8px 0; border-bottom: 1px solid #eee; }}
                .detail-label {{ font-weight: bold; color: #555; }}
                .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #777; }}
                .reference {{ font-size: 24px; font-weight: bold; color: #1976d2; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏠 Home Services Booking Confirmed</h1>
                </div>
                <div class="content">
                    <p>Thank you for booking with Home Services!</p>

                    <p>Your booking has been confirmed. Here are your booking details:</p>

                    <div class="booking-details">
                        <div class="detail-row">
                            <span class="detail-label">Booking Reference:</span><br/>
                            <span class="reference">{booking_reference}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Service:</span><br/>
                            {package_name}{provider_info}
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Scheduled Date:</span><br/>
                            {scheduled_date}
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Service Address:</span><br/>
                            {service_address}
                        </div>
                    </div>

                    <p><strong>What's Next?</strong></p>
                    <ul>
                        <li>We'll send you a reminder 24 hours before your appointment</li>
                        <li>Our service provider will contact you to confirm details</li>
                        <li>Keep this booking reference for your records</li>
                    </ul>

                    <p>If you need to make any changes to your booking, please contact us with your booking reference.</p>
                </div>
                <div class="footer">
                    <p>Home Services - Professional Home Maintenance</p>
                    <p>This is an automated email. Please do not reply.</p>
                </div>
            </div>
        </body>
        </html>
        """

        params = {
            "from": from_email,
            "to": [to_email],
            "subject": f"Booking Confirmed - {booking_reference}",
            "html": html_content,
        }

        response = resend.Emails.send(params)
        print(f"Email sent successfully to {to_email}: {response}")
        return True

    except Exception as e:
        print(f"Error sending email: {e}")
        return False


def send_payment_confirmation_email(
    to_email: str,
    booking_reference: str,
    payment_reference: str,
    amount: float,
    package_name: str,
) -> bool:
    """
    Send payment confirmation email.

    Args:
        to_email: Recipient email address
        booking_reference: Booking reference number
        payment_reference: Payment reference/transaction ID
        amount: Payment amount
        package_name: Service package name

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    if not init_resend():
        print(f"Email not sent - Resend not configured")
        return False

    try:
        from_email = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #4caf50; color: white; padding: 20px; text-align: center; }}
                .content {{ background-color: #f5f5f5; padding: 20px; }}
                .payment-details {{ background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }}
                .detail-row {{ padding: 8px 0; border-bottom: 1px solid #eee; }}
                .detail-label {{ font-weight: bold; color: #555; }}
                .amount {{ font-size: 28px; font-weight: bold; color: #4caf50; }}
                .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #777; }}
                .success-icon {{ font-size: 48px; text-align: center; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✓ Payment Successful</h1>
                </div>
                <div class="content">
                    <div class="success-icon">✅</div>

                    <p>Your payment has been processed successfully!</p>

                    <div class="payment-details">
                        <div class="detail-row">
                            <span class="detail-label">Amount Paid:</span><br/>
                            <span class="amount">£{amount:.2f}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Payment Reference:</span><br/>
                            {payment_reference}
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Booking Reference:</span><br/>
                            {booking_reference}
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Service:</span><br/>
                            {package_name}
                        </div>
                    </div>

                    <p><strong>What's Next?</strong></p>
                    <ul>
                        <li>Your booking is now confirmed and fully paid</li>
                        <li>You'll receive a separate email with your booking details</li>
                        <li>Keep this payment receipt for your records</li>
                    </ul>

                    <p>Thank you for choosing Home Services!</p>
                </div>
                <div class="footer">
                    <p>Home Services - Professional Home Maintenance</p>
                    <p>This is an automated email. Please do not reply.</p>
                </div>
            </div>
        </body>
        </html>
        """

        params = {
            "from": from_email,
            "to": [to_email],
            "subject": f"Payment Confirmed - {payment_reference}",
            "html": html_content,
        }

        response = resend.Emails.send(params)
        print(f"Payment confirmation email sent to {to_email}: {response}")
        return True

    except Exception as e:
        print(f"Error sending payment confirmation email: {e}")
        return False
