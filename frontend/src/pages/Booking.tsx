import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { buildPaymentRoute } from "../lib/routes";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Chip,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import type { SelectChangeEvent } from "@mui/material";
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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`booking-tabpanel-${index}`}
      aria-labelledby={`booking-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Booking() {
  const navigate = useNavigate();

  // UI State
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);

  // Form State
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<Dayjs | null>(
    dayjs().add(1, "day")
  );
  const [serviceAddress, setServiceAddress] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(
    null
  );

  // Load initial data
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
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load data. Please refresh the page.");
      } finally {
        setInitialLoading(false);
      }
    };
    loadData();
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError(null);
    resetForm();
  };

  const resetForm = () => {
    setSelectedPackage("");
    setSelectedProvider("");
    setScheduledDate(dayjs().add(1, "day"));
    setServiceAddress("");
    setSpecialInstructions("");
    setSelectedStartTime(null);
  };

  const handlePackageChange = (event: SelectChangeEvent<string>) => {
    setSelectedPackage(event.target.value);
    setSelectedStartTime(null); // Reset time when package changes
  };

  const handleProviderChange = (event: SelectChangeEvent<string>) => {
    setSelectedProvider(event.target.value);
    setSelectedStartTime(null); // Reset time when provider changes
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStartTime) {
      setError("Please select a time slot");
      return;
    }

    if (!scheduledDate || !scheduledDate.isValid()) {
      setError("Please select a valid date");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const bookingData = {
        package_id: Number(selectedPackage),
        ...(tabValue === 1 &&
          selectedProvider && { provider_id: Number(selectedProvider) }),
        booking_type: "non-urgent",
        start_date: scheduledDate.format("YYYY-MM-DD"),
        start_time: selectedStartTime,
        service_address: serviceAddress,
        special_instructions: specialInstructions || null,
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

  const selectedPackageData = packages.find(
    (pkg) => pkg.package_id.toString() === selectedPackage
  );

  if (initialLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Book a Home Service
      </Typography>
      <Typography color="text.secondary" paragraph>
        Choose between booking a general service or selecting a specific service
        provider
      </Typography>

      <Card>
        <CardContent>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="booking tabs"
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <Tab label="General Service Booking" />
            <Tab label="Book by Provider" />
          </Tabs>

          {error && (
            <Alert
              severity="error"
              sx={{ mt: 2 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {/* General Service Booking Tab */}
          <TabPanel value={tabValue} index={0}>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid size={12}>
                  <Alert severity="info">
                    Select a service package and we'll match you with an
                    available provider in your area.
                  </Alert>
                </Grid>

                <Grid size={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Service Package</InputLabel>
                    <Select
                      value={selectedPackage}
                      onChange={handlePackageChange}
                      label="Service Package"
                    >
                      {packages.map((pkg) => (
                        <MenuItem
                          key={pkg.package_id}
                          value={pkg.package_id.toString()}
                        >
                          <Box sx={{ width: "100%" }}>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <Typography variant="body1">
                                {pkg.package_name}
                              </Typography>
                              <Chip
                                label={`$${pkg.base_price} AUD`}
                                size="small"
                                color="primary"
                              />
                            </Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {pkg.description} • {pkg.duration_minutes} min •{" "}
                              {pkg.category_name}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {selectedPackageData && (
                  <Grid size={12}>
                    <Alert severity="info" icon={<Typography>⏱️</Typography>}>
                      <Typography variant="body2">
                        <strong>Service duration:</strong>{" "}
                        {formatDuration(selectedPackageData.duration_minutes)}
                        {selectedPackageData.duration_minutes > 480 &&
                          " - May span multiple days"}
                      </Typography>
                    </Alert>
                  </Grid>
                )}

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

                {selectedPackage &&
                  scheduledDate &&
                  scheduledDate.isValid() && (
                    <Grid size={12}>
                      <TimeSlotPicker
                        packageId={Number(selectedPackage)}
                        date={scheduledDate.toDate()}
                        onSlotSelect={(time) => setSelectedStartTime(time)}
                      />
                    </Grid>
                  )}

                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="Service Address"
                    value={serviceAddress}
                    onChange={(e) => setServiceAddress(e.target.value)}
                    required
                    multiline
                    rows={2}
                    placeholder="Enter the address where service is needed"
                  />
                </Grid>

                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="Special Instructions (Optional)"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    multiline
                    rows={3}
                    placeholder="Any specific requirements or notes for the service provider"
                  />
                </Grid>

                <Grid size={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={
                      loading ||
                      !selectedPackage ||
                      !serviceAddress ||
                      !selectedStartTime
                    }
                  >
                    {loading ? <CircularProgress size={24} /> : "Book Service"}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </TabPanel>

          {/* Book by Provider Tab */}
          <TabPanel value={tabValue} index={1}>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid size={12}>
                  <Alert severity="info">
                    Choose a specific service provider and the service you need.
                  </Alert>
                </Grid>

                <Grid size={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Service Provider</InputLabel>
                    <Select
                      value={selectedProvider}
                      onChange={handleProviderChange}
                      label="Service Provider"
                    >
                      {providers.map((provider) => (
                        <MenuItem
                          key={provider.provider_id}
                          value={provider.provider_id.toString()}
                        >
                          <Box sx={{ width: "100%" }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Typography variant="body1">
                                {provider.business_name}
                              </Typography>
                              {provider.is_verified && (
                                <Chip
                                  label="Verified"
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                />
                              )}
                              <Chip
                                label={`⭐ ${provider.average_rating}`}
                                size="small"
                              />
                            </Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {provider.description} • {provider.address}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Service Package</InputLabel>
                    <Select
                      value={selectedPackage}
                      onChange={handlePackageChange}
                      label="Service Package"
                    >
                      {packages.map((pkg) => (
                        <MenuItem
                          key={pkg.package_id}
                          value={pkg.package_id.toString()}
                        >
                          <Box sx={{ width: "100%" }}>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <Typography variant="body1">
                                {pkg.package_name}
                              </Typography>
                              <Chip
                                label={`$${pkg.base_price} AUD`}
                                size="small"
                                color="primary"
                              />
                            </Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {pkg.description} • {pkg.duration_minutes} min •{" "}
                              {pkg.category_name}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {selectedPackageData && (
                  <Grid size={12}>
                    <Alert severity="info" icon={<Typography>⏱️</Typography>}>
                      <Typography variant="body2">
                        <strong>Service duration:</strong>{" "}
                        {formatDuration(selectedPackageData.duration_minutes)}
                        {selectedPackageData.duration_minutes > 480 &&
                          " - May span multiple days"}
                      </Typography>
                    </Alert>
                  </Grid>
                )}

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

                {selectedPackage &&
                  scheduledDate &&
                  scheduledDate.isValid() && (
                    <Grid size={12}>
                      <TimeSlotPicker
                        packageId={Number(selectedPackage)}
                        date={scheduledDate.toDate()}
                        providerId={
                          selectedProvider
                            ? Number(selectedProvider)
                            : undefined
                        }
                        onSlotSelect={(time) => setSelectedStartTime(time)}
                      />
                    </Grid>
                  )}

                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="Service Address"
                    value={serviceAddress}
                    onChange={(e) => setServiceAddress(e.target.value)}
                    required
                    multiline
                    rows={2}
                    placeholder="Enter the address where service is needed"
                  />
                </Grid>

                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="Special Instructions (Optional)"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    multiline
                    rows={3}
                    placeholder="Any specific requirements or notes for the service provider"
                  />
                </Grid>

                <Grid size={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={
                      loading ||
                      !selectedPackage ||
                      !selectedProvider ||
                      !serviceAddress ||
                      !selectedStartTime
                    }
                  >
                    {loading ? (
                      <CircularProgress size={24} />
                    ) : (
                      "Book with Provider"
                    )}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </TabPanel>
        </CardContent>
      </Card>

      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Note:</strong> All bookings are subject to provider
          availability and COVID-19 safety checks. You'll receive a confirmation
          email once your booking is confirmed.
        </Typography>
      </Box>
    </Box>
  );
}
