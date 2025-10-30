import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Divider,
  TextField,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { paymentApi, bookingApi } from "../lib/api";
import {
  getBookingReferenceFromUrl,
  buildConfirmationRoute,
  ROUTES,
} from "../lib/routes";

export default function Payment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SECURE: Only get booking reference from URL, fetch everything else from backend
  const bookingReference = getBookingReferenceFromUrl(searchParams);

  // Booking data from backend
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [packageName, setPackageName] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);

  // Mock card details (since we're using mock Stripe)
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [cardExpiry, setCardExpiry] = useState("12/25");
  const [cardCvc, setCardCvc] = useState("123");
  const [cardName, setCardName] = useState("John Doe");

  useEffect(() => {
    if (!bookingReference) {
      setError("Invalid payment details. Please create a booking first.");
      setLoading(false);
    } else {
      fetchBookingDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingReference]);

  const fetchBookingDetails = async () => {
    if (!bookingReference) return;

    try {
      setLoading(true);
      // Parse booking ID from reference (format: BK-20251020-000013)
      // For now, we'll add a backend endpoint to fetch by reference
      // Temporary: extract numeric ID from the end
      const parts = bookingReference.split("-");
      const numericId = parseInt(parts[parts.length - 1]);

      if (isNaN(numericId)) {
        throw new Error("Invalid booking reference format");
      }

      // Fetch booking details from backend
      const booking = await bookingApi.getBooking(numericId);
      setBookingId(booking.booking_id);
      setPackageName(booking.package_name || "Service Package");
      setAmount(booking.amount || 0);
      setError(null);
    } catch (err: unknown) {
      console.error("Failed to fetch booking:", err);
      let errorMessage = "Failed to load booking details.";
      if (err && typeof err === "object" && "response" in err) {
        const response = err.response as { data?: { error?: string } };
        errorMessage = response.data?.error || errorMessage;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!bookingId) {
      setError("Missing payment details");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      setLoading(true);

      // Step 1: Get actual price from backend (NEVER send amount to server)
      // SECURITY: Backend calculates price from database
      const intentResponse = await paymentApi.createPaymentIntent(bookingId);

      // Update UI with real price from server
      setAmount(intentResponse.amount);

      console.log("Payment intent created:", intentResponse);

      // In a real Stripe integration, you would use Stripe.js here
      // to confirm the payment with the client_secret
      // For now, we'll simulate a successful payment

      // Simulate payment processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Step 2: Confirm payment on backend
      // SECURE: Backend validates everything, we only send booking_id and payment_intent_id
      const confirmResponse = await paymentApi.confirmPayment(
        bookingId,
        intentResponse.payment_intent_id
      );

      console.log("Payment confirmed:", confirmResponse);

      // Redirect to confirmation page
      // SECURE: Only pass payment_reference, page will fetch details from backend
      navigate(buildConfirmationRoute(confirmResponse.payment_reference));
    } catch (err: unknown) {
      console.error("Payment error:", err);
      let errorMessage = "Payment failed. Please try again.";
      if (err && typeof err === "object" && "response" in err) {
        const response = err.response as { data?: { error?: string } };
        errorMessage = response.data?.error || errorMessage;
      }
      setError(errorMessage);
    } finally {
      setProcessing(false);
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Box sx={{ maxWidth: 600, margin: "0 auto", mt: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary">
          Loading payment details...
        </Typography>
      </Box>
    );
  }

  // Error or missing booking
  if (!bookingReference || error || !bookingId) {
    return (
      <Box sx={{ maxWidth: 600, margin: "0 auto", mt: 4 }}>
        <Alert severity="error">
          {error || "Invalid payment details. Please create a booking first."}
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate(ROUTES.BOOKING_GENERAL)}
          sx={{ mt: 2 }}
        >
          Create a Booking
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, margin: "0 auto", mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Complete Your Payment
      </Typography>

      <Grid container spacing={3}>
        {/* Order Summary */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Order Summary
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Booking Reference
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {bookingReference}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Service
                </Typography>
                <Typography variant="body1">{packageName}</Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h6">Total Amount</Typography>
                <Typography variant="h5" color="primary" fontWeight="bold">
                  ${amount.toFixed(2)} AUD
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Payment Form */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Payment Details
              </Typography>

              <Grid container spacing={2}>
                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="Cardholder Name"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    disabled={processing}
                  />
                </Grid>

                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="Card Number"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    disabled={processing}
                    placeholder="4242 4242 4242 4242"
                  />
                </Grid>

                <Grid size={6}>
                  <TextField
                    fullWidth
                    label="Expiry Date"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    disabled={processing}
                    placeholder="MM/YY"
                  />
                </Grid>

                <Grid size={6}>
                  <TextField
                    fullWidth
                    label="CVC"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    disabled={processing}
                    placeholder="123"
                  />
                </Grid>
              </Grid>

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}

              <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate(-1)}
                  disabled={processing}
                  sx={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handlePayment}
                  disabled={processing || loading}
                  sx={{ flex: 2 }}
                >
                  {processing ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Processing...
                    </>
                  ) : (
                    `Pay $${amount.toFixed(2)} AUD`
                  )}
                </Button>
              </Box>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 2, display: "block" }}
              >
                🔒 Your payment information is secure and encrypted
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
