import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Stack,
} from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { inspectionApi, authApi } from "../lib/api";
import { ROUTES } from "../lib/routes";
import { CheckCircle } from "@mui/icons-material";

export default function InspectionBooking() {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    isLoading: authLoading,
    getAccessTokenSilently,
    loginWithRedirect,
  } = useAuth0();

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [inspectionDate, setInspectionDate] = useState<Dayjs | null>(
    dayjs().add(1, "day").hour(10).minute(0)
  );
  const [notes, setNotes] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [bookingResult, setBookingResult] = useState<{
    inspection_id: number;
    inspection_date: string;
    inspection_status: string;
  } | null>(null);

  // User ID from backend
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfileLoading, setUserProfileLoading] = useState(true);

  // Fetch user profile to get database user_id
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!isAuthenticated || authLoading) {
        setUserProfileLoading(false);
        return;
      }

      try {
        const token = await getAccessTokenSilently();
        const profile = await authApi.getUserProfile(token);

        setUserId(profile.user_id);
        setName(profile.name || "");
        setEmail(profile.email || "");
        setPhone(profile.mobile || "");
      } catch (err) {
        console.error("Failed to fetch user profile:", err);
        setError("Failed to load user profile. Please try again.");
      } finally {
        setUserProfileLoading(false);
      }
    };

    fetchUserProfile();
  }, [isAuthenticated, authLoading, getAccessTokenSilently]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      loginWithRedirect({
        appState: { returnTo: ROUTES.INSPECTION_BOOKING },
      });
    }
  }, [isAuthenticated, authLoading, loginWithRedirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate form
      if (!name || !email || !address || !inspectionDate) {
        setError("Please fill in all required fields");
        setLoading(false);
        return;
      }

      // Ensure userId is available
      if (!userId) {
        setError(
          "User authentication failed. Please refresh the page and try again."
        );
        setLoading(false);
        return;
      }

      // Create inspection booking
      const result = await inspectionApi.createInspection({
        user_id: userId,
        inspection_date: inspectionDate.format("YYYY-MM-DDTHH:mm"),
        service_address: address,
        notes: `Contact: ${name}, Email: ${email}, Phone: ${phone}${
          notes ? `, Notes: ${notes}` : ""
        }`,
      });

      setBookingResult(result);
      setSuccess(true);

      // Mock notification (in production, backend sends real email/SMS)
      console.log("Inspection booked!", result);
    } catch (err) {
      console.error("Booking error:", err);
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || "Failed to book inspection");
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking authentication and fetching user profile
  if (authLoading || userProfileLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (success && bookingResult) {
    return (
      <Box sx={{ maxWidth: 700, margin: "0 auto", mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: "center" }}>
          <CheckCircle color="success" sx={{ fontSize: 80, mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Inspection Booked Successfully!
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Your home inspection has been scheduled.
          </Typography>

          <Card sx={{ mt: 3, backgroundColor: "#f5f5f5" }}>
            <CardContent>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Inspection ID
                  </Typography>
                  <Typography variant="h6">
                    #{bookingResult.inspection_id}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Scheduled Date
                  </Typography>
                  <Typography variant="body1">
                    {dayjs(bookingResult.inspection_date).format(
                      "dddd, MMMM D, YYYY [at] h:mm A"
                    )}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ textTransform: "capitalize" }}
                  >
                    {bookingResult.inspection_status}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Alert severity="info" sx={{ mt: 3, textAlign: "left" }}>
            <Typography variant="subtitle2" gutterBottom>
              What happens next:
            </Typography>
            <Typography variant="body2" component="div">
              1. You'll receive a confirmation email/SMS shortly
              <br />
              2. A reminder will be sent 24-48 hours before your inspection
              <br />
              3. After the inspection, you'll get a detailed report with urgent
              work items
              <br />
              4. You can then book individual fixes or discounted bundle
              packages
            </Typography>
          </Alert>

          <Stack
            direction="row"
            spacing={2}
            sx={{ mt: 4 }}
            justifyContent="center"
          >
            <Button
              variant="contained"
              onClick={() => navigate(ROUTES.INSPECTIONS)}
            >
              View My Inspections
            </Button>
            <Button variant="outlined" onClick={() => navigate(ROUTES.HOME)}>
              Back to Home
            </Button>
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ maxWidth: 800, margin: "0 auto", mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Book Home Inspection
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Schedule a comprehensive inspection to identify urgent work needed in
          your home. Our inspector will assess safety, water, power, HVAC, and
          structure, then provide a detailed report with cost estimates and
          recommended services.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Card>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <Typography variant="h6">Contact Information</Typography>

                <TextField
                  label="Full Name"
                  required
                  fullWidth
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Email"
                    type="email"
                    required
                    fullWidth
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <TextField
                    label="Phone"
                    type="tel"
                    fullWidth
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </Stack>

                <Typography variant="h6" sx={{ pt: 2 }}>
                  Inspection Details
                </Typography>

                <TextField
                  label="Service Address"
                  required
                  fullWidth
                  multiline
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  helperText="Full address where inspection will take place"
                />

                <DateTimePicker
                  label="Preferred Date & Time"
                  value={inspectionDate}
                  onChange={(newValue) => setInspectionDate(newValue)}
                  minDateTime={dayjs().add(1, "day")}
                  slotProps={{
                    textField: {
                      required: true,
                      fullWidth: true,
                      helperText:
                        "Select your preferred inspection date and time",
                    },
                  }}
                />

                <TextField
                  label="Additional Notes"
                  fullWidth
                  multiline
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  helperText="Any specific concerns? (e.g., 'water stain in ceiling', 'flickering lights')"
                />

                <Box sx={{ pt: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        Booking...
                      </>
                    ) : (
                      "Book Inspection"
                    )}
                  </Button>
                </Box>

                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Inspection Fee: $150 AUD</strong> (approximately 3
                    hours)
                    <br />
                    Payment will be collected after the inspection is completed.
                  </Typography>
                </Alert>
              </Stack>
            </form>
          </CardContent>
        </Card>
      </Box>
    </LocalizationProvider>
  );
}
