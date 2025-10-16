import { useState, useEffect } from "react";
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
  Grid,
  Alert,
  CircularProgress,
  Chip,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";

interface ServicePackage {
  package_id: number;
  package_name: string;
  description: string;
  base_price: number;
  duration_minutes: number;
  category_name: string;
}

interface ServiceProvider {
  provider_id: number;
  business_name: string;
  description: string;
  address: string;
  average_rating: number;
  is_verified: boolean;
}

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
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Service packages and providers
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<ServiceProvider[]>([]);

  // Form data
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<Dayjs | null>(
    dayjs().add(1, "day")
  );
  const [serviceAddress, setServiceAddress] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Fetch service packages on mount
  useEffect(() => {
    fetchPackages();
    fetchProviders();
  }, []);

  const fetchPackages = async () => {
    try {
      // Mock data for now - replace with actual API call
      const mockPackages: ServicePackage[] = [
        {
          package_id: 1,
          package_name: "Basic Plumbing Inspection",
          description: "Comprehensive plumbing inspection",
          base_price: 150.0,
          duration_minutes: 60,
          category_name: "Plumbing",
        },
        {
          package_id: 2,
          package_name: "Emergency Leak Repair",
          description: "Urgent leak repair service",
          base_price: 300.0,
          duration_minutes: 120,
          category_name: "Plumbing",
        },
        {
          package_id: 3,
          package_name: "Electrical Safety Check",
          description: "Full electrical safety inspection",
          base_price: 200.0,
          duration_minutes: 90,
          category_name: "Electrical",
        },
        {
          package_id: 4,
          package_name: "AC Maintenance",
          description: "Air conditioning service and maintenance",
          base_price: 180.0,
          duration_minutes: 90,
          category_name: "HVAC",
        },
      ];
      setPackages(mockPackages);
    } catch (err) {
      setError("Failed to load service packages");
    }
  };

  const fetchProviders = async () => {
    try {
      // Mock data for now - replace with actual API call
      const mockProviders: ServiceProvider[] = [
        {
          provider_id: 1,
          business_name: "PlumberPro Ltd",
          description: "Expert plumbing and emergency repairs",
          address: "London, UK",
          average_rating: 4.8,
          is_verified: true,
        },
        {
          provider_id: 2,
          business_name: "ElectroFix Co.",
          description: "Electrical installation and troubleshooting",
          address: "Birmingham, UK",
          average_rating: 4.5,
          is_verified: true,
        },
        {
          provider_id: 3,
          business_name: "HVAC Expert Solutions",
          description: "Air conditioning and heating systems",
          address: "Manchester, UK",
          average_rating: 4.7,
          is_verified: true,
        },
        {
          provider_id: 4,
          business_name: "CleanHome Services",
          description: "Home deep cleaning and sanitation",
          address: "Bristol, UK",
          average_rating: 4.6,
          is_verified: true,
        },
        {
          provider_id: 5,
          business_name: "Quick Maintenance",
          description: "General repairs and maintenance",
          address: "Edinburgh, UK",
          average_rating: 4.9,
          is_verified: true,
        },
      ];
      setProviders(mockProviders);
      setFilteredProviders(mockProviders);
    } catch (err) {
      setError("Failed to load service providers");
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError(null);
    setSuccess(null);
    resetForm();
  };

  const handlePackageChange = (event: SelectChangeEvent<string>) => {
    const packageId = event.target.value;
    setSelectedPackage(packageId);
    
    // Filter providers based on selected package category
    const selectedPkg = packages.find(
      (pkg) => pkg.package_id.toString() === packageId
    );
    if (selectedPkg) {
      // In a real app, filter providers by the service category
      setFilteredProviders(providers);
    }
  };

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

      // Mock booking submission - replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSuccess(
        `Booking created successfully! We'll match you with a provider for ${selectedPkg?.package_name}.`
      );
      resetForm();
    } catch (err) {
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

      // Mock booking submission - replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSuccess(
        `Booking created successfully with ${selectedProv?.business_name} for ${selectedPkg?.package_name}!`
      );
      resetForm();
    } catch (err) {
      setError("Failed to create booking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderCommonFields = () => (
    <>
      <Grid item xs={12}>
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

      <Grid item xs={12}>
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

      <Grid item xs={12}>
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

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Book a Home Service
      </Typography>
      <Typography color="text.secondary" paragraph>
        Choose between booking a general service or selecting a specific service provider
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
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          {/* General Service Booking Tab */}
          <TabPanel value={tabValue} index={0}>
            <form onSubmit={handleGeneralBooking}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Alert severity="info">
                    Select a service package and we'll match you with an available provider
                    in your area.
                  </Alert>
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Service Package</InputLabel>
                    <Select
                      value={selectedPackage}
                      onChange={handlePackageChange}
                      label="Service Package"
                    >
                      {packages.map((pkg) => (
                        <MenuItem key={pkg.package_id} value={pkg.package_id.toString()}>
                          <Box sx={{ width: "100%" }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Typography variant="body1">
                                {pkg.package_name}
                              </Typography>
                              <Chip
                                label={`£${pkg.base_price}`}
                                size="small"
                                color="primary"
                              />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {pkg.description} • {pkg.duration_minutes} min • {pkg.category_name}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {renderCommonFields()}

                <Grid item xs={12}>
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
                <Grid item xs={12}>
                  <Alert severity="info">
                    Choose a specific service provider and the service you need.
                  </Alert>
                </Grid>

                <Grid item xs={12}>
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
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
                            <Typography variant="caption" color="text.secondary">
                              {provider.description} • {provider.address}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Service Package</InputLabel>
                    <Select
                      value={selectedPackage}
                      onChange={handlePackageChange}
                      label="Service Package"
                    >
                      {packages.map((pkg) => (
                        <MenuItem key={pkg.package_id} value={pkg.package_id.toString()}>
                          <Box sx={{ width: "100%" }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Typography variant="body1">
                                {pkg.package_name}
                              </Typography>
                              <Chip
                                label={`£${pkg.base_price}`}
                                size="small"
                                color="primary"
                              />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {pkg.description} • {pkg.duration_minutes} min • {pkg.category_name}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {renderCommonFields()}

                <Grid item xs={12}>
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
                    {loading ? <CircularProgress size={24} /> : "Book with Provider"}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </TabPanel>
        </CardContent>
      </Card>

      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Note:</strong> All bookings are subject to provider availability and
          COVID-19 safety checks. You'll receive a confirmation email once your booking is
          confirmed.
        </Typography>
      </Box>
    </Box>
  );
}

