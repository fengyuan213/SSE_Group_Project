import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { buildPaymentRoute } from "../lib/routes";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  Chip,
  Paper,
  Divider,
  Stack,
  Autocomplete,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import TimeSlotPicker from "../components/TimeSlotPicker";
import {
  bookingApi,
  type ServicePackage,
  type ServiceProvider,
} from "../lib/api";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LocationOnIcon from "@mui/icons-material/LocationOn";

const steps = ["Select Service", "Choose Date & Time", "Enter Details"];

export default function Booking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Stepper
  const [activeStep, setActiveStep] = useState(0);

  // UI State
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);

  // Form Data
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(
    null
  );
  const [selectedProvider, setSelectedProvider] =
    useState<ServiceProvider | null>(null);
  const [scheduledDate, setScheduledDate] = useState<Dayjs | null>(
    dayjs().add(1, "day")
  );
  const [serviceAddress, setServiceAddress] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(
    null
  );

  // Get inspection context from URL
  const inspectionId = searchParams.get("inspection_id");
  const urgentItemId = searchParams.get("urgent_item_id");

  // Fetch service packages and providers on mount
  useEffect(() => {
    const loadData = async () => {
      setInitialLoading(true);
      try {
        const [packagesData, providersData] = await Promise.all([
          bookingApi.getPackages(),
          bookingApi.getProviders(),
        ]);
        setPackages(packagesData);
        setProviders(providersData);

        // Pre-select package if specified in URL
        const urlPackageId = searchParams.get("package");
        if (urlPackageId) {
          const pkg = packagesData.find(
            (p) => p.package_id.toString() === urlPackageId
          );
          if (pkg) {
            setSelectedPackage(pkg);
          }
        }
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load data. Please refresh the page.");
      } finally {
        setInitialLoading(false);
      }
    };
    loadData();
  }, [searchParams]);

  const handleNext = () => {
    setError(null);
    if (activeStep === 0 && !selectedPackage) {
      setError("Please select a service package");
      return;
    }
    if (activeStep === 1 && !selectedStartTime) {
      setError("Please select a time slot");
      return;
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!serviceAddress.trim()) {
      setError("Please enter a service address");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const bookingData = {
        package_id: selectedPackage!.package_id,
        ...(selectedProvider && { provider_id: selectedProvider.provider_id }),
        booking_type: inspectionId ? "inspection-based" : "non-urgent",
        start_date: scheduledDate!.format("YYYY-MM-DD"),
        start_time: selectedStartTime!,
        service_address: serviceAddress,
        special_instructions: specialInstructions || null,
        ...(inspectionId && { inspection_id: parseInt(inspectionId) }),
        ...(urgentItemId && { urgent_item_id: parseInt(urgentItemId) }),
      };

      const response = await bookingApi.createBooking(bookingData);
      navigate(buildPaymentRoute(response.booking_reference));
    } catch (err) {
      console.error("Error creating booking:", err);
      setError("Failed to create booking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
    return `${mins} min`;
  };

  if (initialLoading) {
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

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: "center" }}>
        <Typography variant="h3" gutterBottom fontWeight="bold">
          Book Your Home Service
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Fast, reliable, and professional services at your doorstep
        </Typography>
      </Box>

      {/* Inspection Context Alert */}
      {inspectionId && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">
            Booking from Inspection #{inspectionId}
          </Typography>
          <Typography variant="body2">
            This booking is linked to your inspection and will mark the related
            work item as resolved when completed.
          </Typography>
        </Alert>
      )}

      {/* Stepper */}
      <Card sx={{ mb: 4, overflow: "visible" }}>
        <CardContent sx={{ pt: 4, pb: 4 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Step Content */}
      <Card>
        <CardContent sx={{ p: 4 }}>
          {/* Step 1: Select Service */}
          {activeStep === 0 && (
            <Box>
              <Typography variant="h5" gutterBottom fontWeight="bold">
                Choose Your Service
              </Typography>
              <Typography color="text.secondary" paragraph>
                Select the service you need from our available packages
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={12}>
                  <Autocomplete
                    options={packages}
                    value={selectedPackage}
                    onChange={(_, newValue) => setSelectedPackage(newValue)}
                    getOptionLabel={(option) => option.package_name}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Service Package"
                        placeholder="Search for a service..."
                        required
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props} key={option.package_id}>
                        <Box sx={{ width: "100%" }}>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              mb: 0.5,
                            }}
                          >
                            <Typography variant="body1" fontWeight="medium">
                              {option.package_name}
                            </Typography>
                            <Chip
                              label={`$${option.base_price} AUD`}
                              size="small"
                              color="primary"
                            />
                          </Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            {option.description}
                          </Typography>
                          <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                            <Chip
                              label={formatDuration(option.duration_minutes)}
                              size="small"
                              variant="outlined"
                            />
                            <Chip
                              label={option.category_name}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                      </li>
                    )}
                  />
                </Grid>

                {/* Optional: Select Provider */}
                <Grid size={12}>
                  <Divider sx={{ my: 2 }}>
                    <Chip label="Optional" size="small" />
                  </Divider>
                </Grid>

                <Grid size={12}>
                  <Autocomplete
                    options={providers}
                    value={selectedProvider}
                    onChange={(_, newValue) => setSelectedProvider(newValue)}
                    getOptionLabel={(option) => option.business_name}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Preferred Provider (Optional)"
                        placeholder="Leave blank for automatic matching..."
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props} key={option.provider_id}>
                        <Box sx={{ width: "100%" }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              mb: 0.5,
                            }}
                          >
                            <Typography variant="body1" fontWeight="medium">
                              {option.business_name}
                            </Typography>
                            {option.is_verified && (
                              <CheckCircleIcon
                                color="success"
                                fontSize="small"
                              />
                            )}
                            <Chip
                              label={`⭐ ${option.average_rating}`}
                              size="small"
                            />
                          </Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            {option.description} • {option.address}
                          </Typography>
                        </Box>
                      </li>
                    )}
                  />
                </Grid>
              </Grid>

              {/* Package Summary */}
              {selectedPackage && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    bgcolor: "primary.50",
                    border: "1px solid",
                    borderColor: "primary.200",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    color="primary"
                    gutterBottom
                    fontWeight="bold"
                  >
                    Selected Service
                  </Typography>
                  <Typography variant="h6" gutterBottom>
                    {selectedPackage.package_name}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <Chip
                      icon={<AccessTimeIcon />}
                      label={formatDuration(selectedPackage.duration_minutes)}
                      size="small"
                    />
                    <Chip
                      label={selectedPackage.category_name}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      label={`$${selectedPackage.base_price} AUD`}
                      size="small"
                      color="primary"
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {selectedPackage.description}
                  </Typography>
                </Paper>
              )}
            </Box>
          )}

          {/* Step 2: Date & Time */}
          {activeStep === 1 && (
            <Box>
              <Typography variant="h5" gutterBottom fontWeight="bold">
                Pick Your Date & Time
              </Typography>
              <Typography color="text.secondary" paragraph>
                Choose when you'd like the service to be performed
              </Typography>

              <Grid container spacing={3}>
                <Grid size={12}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Service Date"
                      value={scheduledDate}
                      onChange={(newValue) => {
                        setScheduledDate(newValue);
                        setSelectedStartTime(null);
                      }}
                      minDate={dayjs()}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          required: true,
                        },
                      }}
                    />
                  </LocalizationProvider>
                </Grid>

                {scheduledDate &&
                  scheduledDate.isValid() &&
                  selectedPackage && (
                    <Grid size={12}>
                      <TimeSlotPicker
                        packageId={selectedPackage.package_id}
                        date={scheduledDate.toDate()}
                        providerId={selectedProvider?.provider_id}
                        onSlotSelect={(time) => setSelectedStartTime(time)}
                      />
                    </Grid>
                  )}

                {/* Booking Summary */}
                {selectedStartTime && scheduledDate && (
                  <Grid size={12}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        bgcolor: "success.50",
                        border: "1px solid",
                        borderColor: "success.200",
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CalendarMonthIcon color="success" />
                        <Typography variant="h6">
                          {scheduledDate.format("dddd, MMMM D, YYYY")} at{" "}
                          {selectedStartTime}
                        </Typography>
                      </Stack>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 1 }}
                      >
                        Duration:{" "}
                        {formatDuration(selectedPackage!.duration_minutes)}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}

          {/* Step 3: Enter Details */}
          {activeStep === 2 && (
            <Box>
              <Typography variant="h5" gutterBottom fontWeight="bold">
                Service Details
              </Typography>
              <Typography color="text.secondary" paragraph>
                Tell us where and provide any special instructions
              </Typography>

              <Grid container spacing={3}>
                {/* Booking Summary */}
                <Grid size={12}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      bgcolor: "grey.50",
                      border: "1px solid",
                      borderColor: "grey.200",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Booking Summary
                    </Typography>
                    <Typography variant="h6" gutterBottom>
                      {selectedPackage?.package_name}
                    </Typography>
                    <Stack spacing={1}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <CalendarMonthIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {scheduledDate?.format("dddd, MMMM D, YYYY")} at{" "}
                          {selectedStartTime}
                        </Typography>
                      </Box>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <AccessTimeIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          Duration:{" "}
                          {formatDuration(selectedPackage!.duration_minutes)}
                        </Typography>
                      </Box>
                      {selectedProvider && (
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <CheckCircleIcon fontSize="small" color="success" />
                          <Typography variant="body2">
                            Provider: {selectedProvider.business_name}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h5" fontWeight="bold">
                      ${selectedPackage?.base_price} AUD
                    </Typography>
                  </Paper>
                </Grid>

                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="Service Address"
                    value={serviceAddress}
                    onChange={(e) => setServiceAddress(e.target.value)}
                    required
                    multiline
                    rows={2}
                    placeholder="Enter the complete address where service is needed"
                    InputProps={{
                      startAdornment: (
                        <LocationOnIcon
                          sx={{ mr: 1, color: "action.active" }}
                        />
                      ),
                    }}
                  />
                </Grid>

                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="Special Instructions (Optional)"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    multiline
                    rows={4}
                    placeholder="Any specific requirements, access instructions, or notes for the service provider..."
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Navigation Buttons */}
          <Box sx={{ display: "flex", gap: 2, mt: 4 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              size="large"
              sx={{ minWidth: 120 }}
            >
              Back
            </Button>
            <Box sx={{ flex: 1 }} />
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading || !serviceAddress.trim()}
                size="large"
                sx={{ minWidth: 200 }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Confirm & Pay"
                )}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                size="large"
                sx={{ minWidth: 120 }}
              >
                Next
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Help Text */}
      <Box sx={{ mt: 3, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          Need help? All bookings are subject to provider availability. You'll
          receive a confirmation email once your booking is confirmed.
        </Typography>
      </Box>
    </Box>
  );
}
