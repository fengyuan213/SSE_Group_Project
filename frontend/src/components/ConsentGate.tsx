import type { ReactNode } from "react";
import { useEffect } from "react";
import { Alert, Box, Button, CircularProgress } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { useUserConsent } from "../auth/useUserConsent";
import WarningIcon from "@mui/icons-material/Warning";
import { ROUTES } from "../lib/routes";

interface ConsentGateProps {
  children: ReactNode;
  fallback?: ReactNode; // Custom fallback if consent not given
  showButton?: boolean; // Show "Give Consent" button in default fallback
  redirectMode?: "alert" | "auto"; // "alert" shows message, "auto" redirects immediately
}

/**
 * Component to conditionally render content based on user consent
 *
 * Usage:
 *   <ConsentGate>
 *     <BookingForm />
 *   </ConsentGate>
 *
 *   <ConsentGate fallback={<p>Please give consent first</p>}>
 *     <PaymentForm />
 *   </ConsentGate>
 *
 *   <ConsentGate redirectMode="auto">
 *     <ProtectedFeature />
 *   </ConsentGate>
 */
export const ConsentGate = ({
  children,
  fallback,
  showButton = true,
  redirectMode = "alert",
}: ConsentGateProps) => {
  const { hasConsent, loading } = useUserConsent();
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-redirect if consent not given and redirectMode is "auto"
  useEffect(() => {
    if (!loading && !hasConsent && redirectMode === "auto") {
      // Save current location to return after consent
      navigate(ROUTES.DATA_CONSENT, {
        state: { returnTo: location.pathname + location.search },
      });
    }
  }, [loading, hasConsent, redirectMode, navigate, location]);

  // Show loading spinner while checking consent
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
        <CircularProgress />
      </Box>
    );
  }

  // If consent not given and auto-redirect, show loading while redirecting
  if (!hasConsent && redirectMode === "auto") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
        <CircularProgress />
      </Box>
    );
  }

  // If consent not given and alert mode, show fallback or default message
  if (!hasConsent) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
        <Box>
          <strong>Consent Required</strong>
        </Box>
        <Box sx={{ mt: 1 }}>
          You must give consent to data collection to access this feature.
        </Box>
        {showButton && (
          <Button
            variant="outlined"
            size="small"
            onClick={() =>
              navigate(ROUTES.DATA_CONSENT, {
                state: { returnTo: location.pathname + location.search },
              })
            }
            sx={{ mt: 2 }}
          >
            Give Consent
          </Button>
        )}
      </Alert>
    );
  }

  // User has given consent
  return <>{children}</>;
};
