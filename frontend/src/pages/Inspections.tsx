import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  Stack,
  Divider,
} from "@mui/material";
import {
  CalendarMonth,
  CheckCircle,
  Schedule,
  Warning,
  Add,
  ArrowForward,
} from "@mui/icons-material";
import dayjs from "dayjs";
import { inspectionApi, authApi, type Inspection } from "../lib/api";
import { ROUTES, buildInspectionDetailsRoute } from "../lib/routes";

export default function Inspections() {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    isLoading: authLoading,
    getAccessTokenSilently,
    loginWithRedirect,
  } = useAuth0();

  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch user profile to get database user_id
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!isAuthenticated || authLoading) {
        setLoading(false);
        return;
      }

      try {
        const token = await getAccessTokenSilently();
        const profile = await authApi.getUserProfile(token);
        setUserId(profile.user_id);
      } catch (err) {
        console.error("Failed to fetch user profile:", err);
        setError("Failed to load user profile. Please try again.");
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [isAuthenticated, authLoading, getAccessTokenSilently]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      loginWithRedirect({
        appState: { returnTo: ROUTES.INSPECTIONS },
      });
    }
  }, [isAuthenticated, authLoading, loginWithRedirect]);

  const loadInspections = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const data = await inspectionApi.getInspections(userId);
      setInspections(data);
      setError(null);
    } catch (err) {
      console.error("Failed to load inspections:", err);
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || "Failed to load inspections");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadInspections();
    }
  }, [userId, loadInspections]);

  const getStatusColor = (
    status: string
  ): "success" | "warning" | "error" | "default" => {
    switch (status) {
      case "completed":
        return "success";
      case "scheduled":
        return "warning";
      case "cancelled":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle />;
      case "scheduled":
        return <Schedule />;
      case "cancelled":
        return <Warning />;
      default:
        return <CalendarMonth />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", mt: 8 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary">
          Loading inspections...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, margin: "0 auto", mt: 4 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h4" gutterBottom>
            My Inspections
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View your inspection history and urgent work lists
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate(ROUTES.BOOKING_INSPECTION)}
        >
          Book New Inspection
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {inspections.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 6 }}>
            <CalendarMonth
              sx={{ fontSize: 80, color: "text.secondary", mb: 2 }}
            />
            <Typography variant="h6" gutterBottom>
              No Inspections Yet
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Book your first home inspection to get started with identifying
              urgent work needed.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate(ROUTES.BOOKING_INSPECTION)}
            >
              Book Inspection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {inspections.map((inspection) => (
            <Grid item xs={12} md={6} key={inspection.inspection_id}>
              <Card
                sx={{
                  cursor: "pointer",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: 4,
                  },
                }}
                onClick={() =>
                  navigate(
                    buildInspectionDetailsRoute(inspection.inspection_id)
                  )
                }
              >
                <CardContent>
                  <Stack spacing={2}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                    >
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Inspection #{inspection.inspection_id}
                        </Typography>
                        <Typography variant="h6">
                          {dayjs(inspection.inspection_date).format(
                            "MMMM D, YYYY"
                          )}
                        </Typography>
                      </Box>
                      <Chip
                        icon={getStatusIcon(inspection.inspection_status)}
                        label={inspection.inspection_status}
                        color={getStatusColor(inspection.inspection_status)}
                        size="small"
                        sx={{ textTransform: "capitalize" }}
                      />
                    </Stack>

                    <Divider />

                    <Stack direction="row" spacing={1} alignItems="center">
                      <CalendarMonth fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {dayjs(inspection.inspection_date).format(
                          "h:mm A, dddd"
                        )}
                      </Typography>
                    </Stack>

                    {inspection.provider_name && (
                      <Typography variant="body2" color="text.secondary">
                        Inspector: {inspection.provider_name}
                      </Typography>
                    )}

                    {inspection.inspection_status === "completed" &&
                      inspection.work_items_count !== undefined && (
                        <>
                          <Divider />
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                            >
                              Work Items Found
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                              {inspection.critical_count! > 0 && (
                                <Chip
                                  label={`${inspection.critical_count} Critical`}
                                  color="error"
                                  size="small"
                                />
                              )}
                              {inspection.high_count! > 0 && (
                                <Chip
                                  label={`${inspection.high_count} High`}
                                  color="warning"
                                  size="small"
                                />
                              )}
                              {inspection.medium_count! > 0 && (
                                <Chip
                                  label={`${inspection.medium_count} Medium`}
                                  color="info"
                                  size="small"
                                />
                              )}
                              {inspection.work_items_count === 0 && (
                                <Typography
                                  variant="body2"
                                  color="success.main"
                                >
                                  No issues found
                                </Typography>
                              )}
                            </Stack>
                          </Box>
                        </>
                      )}

                    <Button
                      variant="outlined"
                      endIcon={<ArrowForward />}
                      fullWidth
                      onClick={() =>
                        navigate(
                          buildInspectionDetailsRoute(inspection.inspection_id)
                        )
                      }
                    >
                      View Details
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
