import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid,
} from "@mui/material";
import {
  CheckCircle,
  Warning,
  Error,
  ArrowBack,
  LocalOffer,
  Build,
} from "@mui/icons-material";
import dayjs from "dayjs";
import { inspectionApi, type InspectionDetails } from "../lib/api";
import { ROUTES } from "../lib/routes";

export default function InspectionDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [inspection, setInspection] = useState<InspectionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadInspectionDetails(parseInt(id));
    }
  }, [id]);

  const loadInspectionDetails = async (inspectionId: number) => {
    try {
      setLoading(true);
      const data = await inspectionApi.getInspectionDetails(inspectionId);
      setInspection(data);
      setError(null);
    } catch (err) {
      console.error("Failed to load inspection details:", err);
      const error = err as { response?: { data?: { error?: string } } };
      setError(
        error.response?.data?.error || "Failed to load inspection details"
      );
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (
    urgency: string
  ): "error" | "warning" | "info" | "default" => {
    switch (urgency) {
      case "critical":
        return "error";
      case "high":
        return "warning";
      case "medium":
        return "info";
      default:
        return "default";
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return <Error />;
      case "high":
        return <Warning />;
      default:
        return <Warning />;
    }
  };

  const handleBookFix = (packageId: number, urgentItemId?: number) => {
    const params = new URLSearchParams({
      package: packageId.toString(),
      inspection_id: id!,
    });
    if (urgentItemId) {
      params.append("urgent_item_id", urgentItemId.toString());
    }
    navigate(`${ROUTES.BOOKING_GENERAL}?${params.toString()}`);
  };

  const handleBookBundle = (bundleId: number) => {
    const params = new URLSearchParams({
      package: bundleId.toString(),
      inspection_id: id!,
    });
    navigate(`${ROUTES.BOOKING_GENERAL}?${params.toString()}`);
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", mt: 8 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary">
          Loading inspection details...
        </Typography>
      </Box>
    );
  }

  if (error || !inspection) {
    return (
      <Box sx={{ maxWidth: 700, margin: "0 auto", mt: 4 }}>
        <Alert severity="error">{error || "Inspection not found"}</Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(ROUTES.INSPECTIONS)}
          sx={{ mt: 2 }}
        >
          Back to Inspections
        </Button>
      </Box>
    );
  }

  const unresolvedItems = inspection.work_items.filter(
    (item) => !item.is_resolved
  );
  const resolvedItems = inspection.work_items.filter(
    (item) => item.is_resolved
  );

  // Calculate total price
  const totalOriginalPrice = unresolvedItems.reduce((sum, item) => {
    return sum + (item.recommended_package?.base_price || 0);
  }, 0);

  const totalFinalPrice = unresolvedItems.reduce((sum, item) => {
    const packagePrice = item.recommended_package?.base_price || 0;
    const discount = item.discount_percentage || 0;
    return sum + packagePrice * (1 - discount / 100);
  }, 0);

  const totalSavings = totalOriginalPrice - totalFinalPrice;

  return (
    <Box sx={{ maxWidth: 1200, margin: "0 auto", mt: 4, mb: 4 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate(ROUTES.INSPECTIONS)}
        sx={{ mb: 2 }}
      >
        Back to Inspections
      </Button>

      {/* Inspection Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              spacing={2}
            >
              <Box>
                <Typography variant="h4">
                  Inspection #{inspection.inspection_id}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {dayjs(inspection.inspection_date).format(
                    "MMMM D, YYYY [at] h:mm A"
                  )}
                </Typography>
              </Box>
              <Chip
                label={inspection.inspection_status}
                color={
                  inspection.inspection_status === "completed"
                    ? "success"
                    : "warning"
                }
                sx={{ textTransform: "capitalize" }}
              />
            </Stack>

            <Divider />

            <Grid container spacing={2}>
              {inspection.provider_name && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Inspector
                  </Typography>
                  <Typography variant="body1">
                    {inspection.provider_name}
                  </Typography>
                </Grid>
              )}
              {inspection.inspector_name && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Inspector Name
                  </Typography>
                  <Typography variant="body1">
                    {inspection.inspector_name}
                  </Typography>
                </Grid>
              )}
            </Grid>

            {inspection.inspection_notes && (
              <>
                <Divider />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Inspector Notes
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {inspection.inspection_notes}
                  </Typography>
                </Box>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Recommended Bundles */}
      {inspection.recommended_bundles &&
        inspection.recommended_bundles.length > 0 &&
        unresolvedItems.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ display: "flex", alignItems: "center" }}
            >
              <LocalOffer sx={{ mr: 1 }} />
              Recommended Bundle Packages
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Save money by booking multiple services together
            </Typography>

            <Grid container spacing={2}>
              {inspection.recommended_bundles.map((bundle) => {
                const savings =
                  bundle.discount_percentage > 0
                    ? (bundle.bundle_price * bundle.discount_percentage) / 100
                    : 0;

                return (
                  <Grid item xs={12} md={6} key={bundle.package_id}>
                    <Card
                      sx={{
                        border: "2px solid",
                        borderColor: "success.main",
                        backgroundColor: "success.50",
                      }}
                    >
                      <CardContent>
                        <Stack spacing={2}>
                          <Box>
                            <Typography variant="h6">
                              {bundle.package_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {bundle.description}
                            </Typography>
                          </Box>

                          <Stack
                            direction="row"
                            spacing={2}
                            alignItems="center"
                          >
                            <Typography variant="h5" color="success.main">
                              ${bundle.bundle_price.toFixed(2)}
                            </Typography>
                            {savings > 0 && (
                              <Chip
                                label={`Save ${bundle.discount_percentage}%`}
                                color="success"
                                size="small"
                              />
                            )}
                          </Stack>

                          <Typography variant="caption" color="text.secondary">
                            Covers {bundle.matching_services} of your work items
                          </Typography>

                          <Button
                            variant="contained"
                            color="success"
                            onClick={() => handleBookBundle(bundle.package_id)}
                          >
                            Book Bundle Package
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}

      {/* Urgent Work List */}
      {unresolvedItems.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="h5"
            gutterBottom
            sx={{ display: "flex", alignItems: "center" }}
          >
            <Build sx={{ mr: 1 }} />
            Urgent Work List
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Items identified during inspection that need attention
          </Typography>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell>Urgency</TableCell>
                  <TableCell>Recommended Service</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {unresolvedItems.map((item) => {
                  const packagePrice =
                    item.recommended_package?.base_price || 0;
                  const discount = item.discount_percentage || 0;
                  const finalPrice = packagePrice * (1 - discount / 100);

                  return (
                    <TableRow key={item.urgent_item_id}>
                      <TableCell>
                        <Typography variant="body2">
                          {item.item_description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getUrgencyIcon(item.urgency_level)}
                          label={item.urgency_level}
                          color={getUrgencyColor(item.urgency_level)}
                          size="small"
                          sx={{ textTransform: "capitalize" }}
                        />
                      </TableCell>
                      <TableCell>
                        {item.recommended_package ? (
                          <Box>
                            <Typography variant="body2">
                              {item.recommended_package.package_name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {item.recommended_package.duration_minutes} min
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Contact us for quote
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {discount > 0 ? (
                          <Box>
                            <Typography
                              variant="caption"
                              sx={{ textDecoration: "line-through" }}
                              color="text.secondary"
                            >
                              ${packagePrice.toFixed(2)}
                            </Typography>
                            <Typography
                              variant="body2"
                              fontWeight="bold"
                              color="success.main"
                            >
                              ${finalPrice.toFixed(2)}
                            </Typography>
                            <Chip
                              label={`${discount}% off`}
                              color="success"
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          </Box>
                        ) : (
                          <Typography variant="body2" fontWeight="bold">
                            ${packagePrice.toFixed(2)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {item.recommended_package ? (
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() =>
                              handleBookFix(
                                item.recommended_package!.package_id,
                                item.urgent_item_id
                              )
                            }
                          >
                            Book Fix
                          </Button>
                        ) : (
                          <Button variant="outlined" size="small" disabled>
                            N/A
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Total Price Summary */}
          {unresolvedItems.length > 0 && (
            <Card sx={{ mt: 2, backgroundColor: "primary.50" }}>
              <CardContent>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">
                      Subtotal ({unresolvedItems.length} items):
                    </Typography>
                    <Typography variant="body2">
                      ${totalOriginalPrice.toFixed(2)}
                    </Typography>
                  </Stack>
                  {totalSavings > 0 && (
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="success.main">
                        Discounts Applied:
                      </Typography>
                      <Typography variant="body2" color="success.main">
                        -${totalSavings.toFixed(2)}
                      </Typography>
                    </Stack>
                  )}
                  <Divider />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="h6">Total:</Typography>
                    <Typography variant="h6" color="primary.main">
                      ${totalFinalPrice.toFixed(2)}
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* Resolved Items */}
      {resolvedItems.length > 0 && (
        <Box>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ display: "flex", alignItems: "center" }}
          >
            <CheckCircle color="success" sx={{ mr: 1 }} />
            Resolved Items
          </Typography>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell>Urgency</TableCell>
                  <TableCell align="right">Price Paid</TableCell>
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resolvedItems.map((item) => {
                  const packagePrice =
                    item.recommended_package?.base_price || 0;
                  const discount = item.discount_percentage || 0;
                  const finalPrice = packagePrice * (1 - discount / 100);

                  return (
                    <TableRow key={item.urgent_item_id} sx={{ opacity: 0.7 }}>
                      <TableCell>
                        <Typography variant="body2">
                          {item.item_description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.urgency_level}
                          size="small"
                          variant="outlined"
                          sx={{ textTransform: "capitalize" }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          ${finalPrice.toFixed(2)}
                          {discount > 0 && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ ml: 1 }}
                            >
                              ({discount}% off)
                            </Typography>
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          icon={<CheckCircle />}
                          label="Resolved"
                          color="success"
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* No Work Items */}
      {inspection.work_items.length === 0 && (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 6 }}>
            <CheckCircle sx={{ fontSize: 80, color: "success.main", mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Issues Found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {inspection.inspection_status === "completed"
                ? "Great news! The inspection didn't identify any urgent work items."
                : "Work items will appear here once the inspector completes the inspection."}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
