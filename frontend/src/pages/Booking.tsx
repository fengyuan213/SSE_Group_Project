import { useState, useEffect, useCallback } from "react";
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
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { useSearchParams } from "react-router-dom";
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
  const [searchParams] = useSearchParams();
  const preSelectedPackage = searchParams.get("package");

  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Service packages and providers
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<ServiceProvider[]>(
    []
  );

  // Form data
  const [selectedPackage, setSelectedPackage] = useState<string>(
    preSelectedPackage || ""
  );
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<Dayjs | null>(
    dayjs().add(1, "day")
  );
  const [serviceAddress, setServiceAddress] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Sync selectedPackage with URL parameter changes
  useEffect(() => {
    const urlPackage = searchParams.get("package");
    if (urlPackage && urlPackage !== selectedPackage) {
      setSelectedPackage(urlPackage);
    }
  }, [searchParams]);

  // Fetch data functions using centralized API
  const fetchPackages = useCallback(async () => {
    try {
      const data = await bookingApi.getPackages();
      setPackages(data);
    } catch (err) {
      console.error("Error fetching packages:", err);
      setError("Failed to load service packages.");
    }
  }, []);

  const fetchProviders = useCallback(async () => {
    try {
      const data = await bookingApi.getProviders();
      setProviders(data);
      setFilteredProviders(data);
    } catch (err) {
      console.error("Error fetching providers:", err);
      setError("Failed to load service providers.");
    }
  }, []);

  // Fetch service packages and providers on mount
  useEffect(() => {
    const loadData = async () => {
      setInitialLoading(true);
      await Promise.all([fetchPackages(), fetchProviders()]);
      setInitialLoading(false);
    };
    loadData();
  }, [fetchPackages, fetchProviders]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError(null);
    setSuccess(null);
    resetForm();
  };

  const handlePackageChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      const packageId = event.target.value;
      setSelectedPackage(packageId);

      // Filter providers based on selected package category
      const selectedPkg = packages.find(
        (pkg) => pkg.package_id.toString() === packageId
      );

      if (selectedPkg && selectedPkg.category_id) {
        // Filter providers that offer services in the selected category
        // For now, show all providers - in production this would filter by category
        setFilteredProviders(providers);
      } else {
        setFilteredProviders(providers);
      }
    },
    [packages, providers]
  );

  const resetForm = () => {
    setSelectedPackage("");
    setSelectedProvider("");
    setScheduledDate(dayjs().add(1, "day"));
    setServiceAddress("");
    setSpecialInstructions("");
  };

  const handleGeneralBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const selectedPkg = packages.find(
        (pkg) => pkg.package_id.toString() === selectedPackage
      );

      const bookingData = {
        package_id: Number(selectedPackage),
        booking_type: "non-urgent",
        scheduled_date: scheduledDate?.toISOString() || "",
        service_address: serviceAddress,
        special_instructions: specialInstructions || null,
      };

      const response = await bookingApi.createBooking(bookingData);

      setSuccess(
        `Booking created successfully! Reference: ${response.booking_reference}. We'll match you with a provider for ${selectedPkg?.package_name}.`
      );
      resetForm();
    } catch (err) {
      console.error("Error creating booking:", err);
      setError("Failed to create booking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleProviderBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const selectedProv = providers.find(
        (prov) => prov.provider_id.toString() === selectedProvider
      );
      const selectedPkg = packages.find(
        (pkg) => pkg.package_id.toString() === selectedPackage
      );

      const bookingData = {
        package_id: Number(selectedPackage),
        provider_id: Number(selectedProvider),
        booking_type: "non-urgent",
        scheduled_date: scheduledDate?.toISOString() || "",
        service_address: serviceAddress,
        special_instructions: specialInstructions || null,
      };

      const response = await bookingApi.createBooking(bookingData);

      setSuccess(
        `Booking created successfully! Reference: ${response.booking_reference}. Booked with ${selectedProv?.business_name} for ${selectedPkg?.package_name}!`
      );
      resetForm();
    } catch (err) {
      console.error("Error creating booking:", err);
      setError("Failed to create booking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderCommonFields = () => (
    <>
      <Grid size={12}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DateTimePicker
            label="Preferred Date & Time"
            value={scheduledDate}
            onChange={(newValue) => setScheduledDate(newValue)}
            minDateTime={dayjs()}
            slotProps={{
              textField: {
                fullWidth: true,
                required: true,
              },
            }}
          />
        </LocalizationProvider>
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
    </>
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

          {success && (
            <Alert
              severity="success"
              sx={{ mt: 2 }}
              onClose={() => setSuccess(null)}
            >
              {success}
            </Alert>
          )}

          {/* General Service Booking Tab */}
          <TabPanel value={tabValue} index={0}>
            <form onSubmit={handleGeneralBooking}>
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
                                label={`£${pkg.base_price}`}
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

                {renderCommonFields()}

                <Grid size={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={loading || !selectedPackage || !serviceAddress}
                  >
                    {loading ? <CircularProgress size={24} /> : "Book Service"}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </TabPanel>

          {/* Book by Provider Tab */}
          <TabPanel value={tabValue} index={1}>
            <form onSubmit={handleProviderBooking}>
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
                      onChange={(e) => setSelectedProvider(e.target.value)}
                      label="Service Provider"
                    >
                      {filteredProviders.map((provider) => (
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
                                label={`£${pkg.base_price}`}
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

                {renderCommonFields()}

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
                      !serviceAddress
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
