import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Checkbox,
  FormControlLabel,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  CircularProgress,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import HomeIcon from "@mui/icons-material/Home";
import PaymentIcon from "@mui/icons-material/Payment";
import PersonIcon from "@mui/icons-material/Person";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import WarningIcon from "@mui/icons-material/Warning";
import { consentApi } from "../lib/api";

export default function DataConsent() {
  const [consentGiven, setConsentGiven] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // For demo purposes, using a mock user ID
  // In production, this would come from authentication context
  const mockUserId = "550e8400-e29b-41d4-a716-446655440000";

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await consentApi.saveConsent(mockUserId, consentGiven);
      setSubmitted(true);
      if (consentGiven) {
        setSuccessMessage(
          "Thank you for consenting! You can now use all features of our application."
        );
      } else {
        setError(
          "You must consent to data collection to use this application. Without consent, we cannot provide our services."
        );
      }
    } catch (err) {
      console.error("Error saving consent:", err);
      setError("Failed to save consent. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const dataCollectionItems = [
    {
      icon: <EmailIcon color="primary" />,
      title: "Email Address",
      description:
        "Used for account creation, booking confirmations, and important service notifications.",
    },
    {
      icon: <HomeIcon color="primary" />,
      title: "Service Address",
      description:
        "The physical location where services will be performed. Required for booking fulfillment.",
    },
    {
      icon: <LocationOnIcon color="primary" />,
      title: "Location Data (GPS Coordinates)",
      description:
        "Used to find nearby service providers, calculate distances, and check COVID-19 restrictions in your area.",
    },
    {
      icon: <PaymentIcon color="primary" />,
      title: "Payment Information",
      description:
        "Credit/debit card information processed securely through Stripe for payment transactions. We do not store your full card details.",
    },
    {
      icon: <PersonIcon color="primary" />,
      title: "Profile Information",
      description:
        "Your name and preferences to provide personalized service and improve user experience.",
    },
  ];

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <VerifiedUserIcon
            sx={{ fontSize: 60, color: "primary.main", mb: 2 }}
          />
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Data Collection & Privacy Consent
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Your privacy matters to us. Please review how we collect and use
            your data.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Card variant="outlined" sx={{ mb: 4, bgcolor: "primary.50" }}>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Why We Need Your Consent
            </Typography>
            <Typography variant="body2" paragraph>
              To provide you with home services, we need to collect and process
              certain personal data. This consent form ensures transparency
              about what data we collect and how we use it.
            </Typography>
          </CardContent>
        </Card>

        <Typography variant="h6" gutterBottom fontWeight="bold">
          Data We Collect
        </Typography>

        <List sx={{ mb: 3 }}>
          {dataCollectionItems.map((item, index) => (
            <ListItem
              key={index}
              sx={{
                bgcolor: "background.paper",
                mb: 2,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="subtitle1" fontWeight="bold">
                    {item.title}
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" color="text.secondary">
                    {item.description}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>

        <Card variant="outlined" sx={{ mb: 4, bgcolor: "info.50" }}>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              How We Protect Your Data
            </Typography>
            <Typography variant="body2" paragraph>
              • All data is encrypted in transit and at rest
            </Typography>
            <Typography variant="body2" paragraph>
              • Payment information is processed securely via Stripe (PCI-DSS
              compliant)
            </Typography>
            <Typography variant="body2" paragraph>
              • We never share your personal data with third parties without
              your consent
            </Typography>
            <Typography variant="body2">
              • You can request data deletion at any time by contacting support
            </Typography>
          </CardContent>
        </Card>

        {!submitted ? (
          <>
            <FormControlLabel
              control={
                <Checkbox
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  disabled={loading}
                  color="primary"
                />
              }
              label={
                <Typography variant="body1">
                  I consent to the collection, processing, and storage of my
                  personal data as described above. I understand this is
                  necessary to use the HomeService Hub application.
                </Typography>
              }
              sx={{ mb: 3 }}
            />

            {error && (
              <Alert severity="error" icon={<WarningIcon />} sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleSubmit}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                {loading ? "Submitting..." : "Submit Consent"}
              </Button>
            </Box>

            {!consentGiven && (
              <Alert severity="warning" sx={{ mt: 3 }}>
                <strong>Important:</strong> You must consent to data collection
                to use this application. Without your consent, we cannot provide
                our services as they require processing of personal information.
              </Alert>
            )}
          </>
        ) : (
          <Box>
            {successMessage && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {successMessage}
              </Alert>
            )}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Button
              variant="outlined"
              fullWidth
              onClick={() => {
                setSubmitted(false);
                setSuccessMessage(null);
                setError(null);
              }}
            >
              Update Consent Preferences
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
