import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Divider,
  Chip,
  CircularProgress,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EmailIcon from "@mui/icons-material/Email";
import ReceiptIcon from "@mui/icons-material/Receipt";
import HomeIcon from "@mui/icons-material/Home";
import { paymentApi, type ConfirmationDetails } from "../lib/api";
import { getPaymentReferenceFromUrl, ROUTES } from "../lib/routes";

export default function Confirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmationData, setConfirmationData] =
    useState<ConfirmationDetails | null>(null);

  // SECURE: Only get payment reference from URL, fetch everything else from backend
  const paymentReference = getPaymentReferenceFromUrl(searchParams);

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);

    // Fetch confirmation details from backend
    if (paymentReference) {
      fetchConfirmationDetails();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentReference]);

  const fetchConfirmationDetails = async () => {
    if (!paymentReference) return;

    try {
      setLoading(true);
      // SECURE: Backend validates payment_reference and returns all data from DB
      const data = await paymentApi.getConfirmationDetails(paymentReference);
      setConfirmationData(data);
      setError(null);
    } catch (err: unknown) {
      console.error("Failed to fetch confirmation:", err);
      let errorMessage = "Failed to load confirmation details.";
      if (err && typeof err === "object" && "response" in err) {
        const response = err.response as { data?: { error?: string } };
        errorMessage = response.data?.error || errorMessage;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Loading state
  if (loading) {
    return (
      <Box sx={{ maxWidth: 600, margin: "0 auto", mt: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary">
          Loading confirmation details...
        </Typography>
      </Box>
    );
  }

  // Error or missing payment reference
  if (!paymentReference || error || !confirmationData) {
    return (
      <Box sx={{ maxWidth: 600, margin: "0 auto", mt: 4 }}>
        <Alert severity="error">
          {error ||
            "No payment confirmation found. Please complete a payment first."}
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate(ROUTES.BOOKING_GENERAL)}
          sx={{ mt: 2 }}
        >
          Make a Booking
        </Button>
      </Box>
    );
  }

  // Extract data from confirmed data
  const { booking_reference, amount, package_name } = confirmationData;

  return (
    <Box sx={{ maxWidth: 800, margin: "0 auto", mt: 4, mb: 4 }}>
      {/* Success Header */}
      <Card sx={{ mb: 3, bgcolor: "success.main", color: "white" }}>
        <CardContent sx={{ textAlign: "center", py: 4 }}>
          <CheckCircleIcon sx={{ fontSize: 80, mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Payment Successful!
          </Typography>
          <Typography variant="body1">
            Thank you for your booking. Your payment has been processed.
          </Typography>
        </CardContent>
      </Card>

      {/* Email Confirmation Alert */}
      <Alert icon={<EmailIcon />} severity="info" sx={{ mb: 3 }}>
        A confirmation email has been sent to your email address with all the
        booking details and receipt.
      </Alert>

      {/* Payment Details */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography
            variant="h6"
            gutterBottom
            display="flex"
            alignItems="center"
            gap={1}
          >
            <ReceiptIcon />
            Payment Details
          </Typography>
          <Divider sx={{ my: 2 }} />

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Payment Reference
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography
                variant="h6"
                fontWeight="bold"
                sx={{ fontFamily: "monospace" }}
              >
                {paymentReference}
              </Typography>
              <Button
                size="small"
                onClick={() => copyToClipboard(paymentReference)}
                sx={{ textTransform: "none" }}
              >
                {copied ? "Copied!" : "Copy"}
              </Button>
            </Box>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Booking Reference
            </Typography>
            <Typography
              variant="h6"
              fontWeight="bold"
              sx={{ fontFamily: "monospace" }}
            >
              {booking_reference}
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Service
            </Typography>
            <Typography variant="body1">{package_name}</Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6">Amount Paid</Typography>
            <Chip
              label={`$${amount.toFixed(2)} AUD`}
              color="success"
              sx={{ fontSize: "1.2rem", fontWeight: "bold", px: 2, py: 2.5 }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* What's Next Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            What Happens Next?
          </Typography>
          <Divider sx={{ my: 2 }} />

          <Box component="ul" sx={{ pl: 2 }}>
            <li>
              <Typography variant="body1" sx={{ mb: 1 }}>
                ✅ Your booking is now <strong>confirmed</strong>
              </Typography>
            </li>
            <li>
              <Typography variant="body1" sx={{ mb: 1 }}>
                📧 Check your email for booking and payment confirmation
              </Typography>
            </li>
            <li>
              <Typography variant="body1" sx={{ mb: 1 }}>
                👷 Our service provider will contact you to confirm the
                appointment
              </Typography>
            </li>
            <li>
              <Typography variant="body1" sx={{ mb: 1 }}>
                ⏰ You'll receive a reminder 24 hours before your service
              </Typography>
            </li>
          </Box>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box display="flex" gap={2} flexWrap="wrap">
        <Button
          variant="contained"
          size="large"
          startIcon={<HomeIcon />}
          onClick={() => navigate(ROUTES.HOME)}
          sx={{ flex: 1, minWidth: "200px" }}
        >
          Back to Home
        </Button>
        <Button
          variant="outlined"
          size="large"
          onClick={() => navigate(ROUTES.BOOKING_GENERAL)}
          sx={{ flex: 1, minWidth: "200px" }}
        >
          Make Another Booking
        </Button>
      </Box>

      {/* Support Note */}
      <Box sx={{ mt: 3, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary" align="center">
          Need help? Contact us with your booking reference:{" "}
          <strong>{booking_reference}</strong>
        </Typography>
      </Box>
    </Box>
  );
}
