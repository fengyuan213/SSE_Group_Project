import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  TextField,
  Select,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  CardActions,
  Chip,
  Rating,
  Alert,
  CircularProgress,
  Stack,
  Container,
  Paper,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import {
  MyLocation,
  Search,
  Warning,
  Verified,
  LocationOn,
  FilterList,
} from "@mui/icons-material";
import {
  locationApi,
  type NearbyProvider,
  type CovidRestriction,
} from "../lib/api";
import {
  getCurrentPosition,
  geocodePostcode,
  isGeolocationSupported,
} from "../lib/geolocation";
import { ROUTES } from "../lib/routes";

export default function NearbyServices() {
  const navigate = useNavigate();

  // Location state
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [postcode, setPostcode] = useState("");
  const [locationSource, setLocationSource] = useState<
    "geolocation" | "postcode" | null
  >(null);

  // Search parameters
  const [radius, setRadius] = useState(30);
  const [categoryFilter] = useState<number | "">(""); // Optional category filter

  // Results state
  const [providers, setProviders] = useState<NearbyProvider[]>([]);
  const [covidRestrictions, setCovidRestrictions] = useState<
    CovidRestriction[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Handle browser geolocation
  const handleUseMyLocation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const position = await getCurrentPosition();
      setUserLocation({
        latitude: position.latitude,
        longitude: position.longitude,
      });
      setLocationSource("geolocation");
      setPostcode(""); // Clear postcode if using geolocation
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to get your location");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle postcode search
  const handlePostcodeSearch = async () => {
    if (!postcode.trim()) {
      setError("Please enter a postcode");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const coordinates = await geocodePostcode(postcode.trim());
      setUserLocation({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });
      setLocationSource("postcode");
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to geocode postcode");
    } finally {
      setIsLoading(false);
    }
  };

  // Search for nearby providers whenever location or filters change
  useEffect(() => {
    if (userLocation) {
      searchNearbyProviders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, radius, categoryFilter]);

  const searchNearbyProviders = async () => {
    if (!userLocation) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch nearby providers
      const response = await locationApi.searchNearbyProviders(
        userLocation.latitude,
        userLocation.longitude,
        radius,
        categoryFilter ? Number(categoryFilter) : undefined
      );

      setProviders(response.providers);
      setHasSearched(true);

      // Fetch COVID restrictions
      const restrictionsResponse = await locationApi.getCovidRestrictions(
        userLocation.latitude,
        userLocation.longitude
      );
      setCovidRestrictions(restrictionsResponse.restrictions);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to search for providers");
      setProviders([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Get restriction color
  const getRestrictionColor = (
    level: "Low" | "Medium" | "High"
  ): "success" | "warning" | "error" => {
    switch (level) {
      case "Low":
        return "success";
      case "Medium":
        return "warning";
      case "High":
        return "error";
      default:
        return "warning";
    }
  };

  // Navigate to booking with pre-selected provider
  const handleBookProvider = (providerId: number) => {
    navigate(`${ROUTES.BOOKING_GENERAL}?provider_id=${providerId}`);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Find Nearby Services
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Discover service providers in your area. Use your current location or
          enter an Australian postcode.
        </Typography>
      </Box>

      {/* Location Input Section */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Your Location
        </Typography>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          {/* Use My Location Button */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<MyLocation />}
              onClick={handleUseMyLocation}
              disabled={isLoading || !isGeolocationSupported()}
              size="large"
            >
              Use My Location
            </Button>
          </Grid>

          {/* Postcode Input */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Stack direction="row" spacing={1}>
              <TextField
                label="Australian Postcode"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handlePostcodeSearch();
                  }
                }}
                placeholder="e.g., 2000"
                fullWidth
                disabled={isLoading}
                inputProps={{ maxLength: 4 }}
              />
              <IconButton
                color="primary"
                onClick={handlePostcodeSearch}
                disabled={isLoading}
                size="large"
              >
                <Search />
              </IconButton>
            </Stack>
          </Grid>

          {/* Radius Selector */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel shrink>Search Radius</InputLabel>
              <Select
                native
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                disabled={isLoading}
                inputProps={{
                  id: "radius-select",
                }}
                sx={{ mt: 2 }}
              >
                <option value={2}>2 km</option>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={15}>15 km</option>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Current Location Display */}
        {userLocation && (
          <Alert severity="info" icon={<LocationOn />}>
            {locationSource === "geolocation"
              ? "Using your current location"
              : `Searching near postcode ${postcode}`}{" "}
            ({userLocation.latitude.toFixed(4)},{" "}
            {userLocation.longitude.toFixed(4)})
          </Alert>
        )}

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {/* COVID Restriction Alerts */}
      {covidRestrictions.length > 0 && (
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            <Warning sx={{ mr: 1, verticalAlign: "middle" }} />
            COVID-19 Restrictions in Your Area
          </Typography>
          <Stack spacing={2}>
            {covidRestrictions.map((restriction, index) => (
              <Alert
                key={index}
                severity={getRestrictionColor(restriction.restriction)}
                icon={<Warning />}
              >
                <Typography variant="body2">
                  <strong>{restriction.area}</strong>: {restriction.restriction}{" "}
                  restriction level
                  {restriction.distance_km !== undefined &&
                    ` (${restriction.distance_km.toFixed(1)} km away)`}
                </Typography>
              </Alert>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Loading State */}
      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Results Section */}
      {!isLoading && hasSearched && (
        <>
          <Box
            sx={{
              mb: 3,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h5" fontWeight="bold">
              {providers.length > 0
                ? `Found ${providers.length} provider${
                    providers.length !== 1 ? "s" : ""
                  }`
                : "No providers found"}
            </Typography>
            {providers.length > 0 && (
              <Chip
                icon={<FilterList />}
                label={`Within ${radius} km`}
                color="primary"
                variant="outlined"
              />
            )}
          </Box>

          {/* Provider Cards */}
          {providers.length > 0 ? (
            <Grid container spacing={3}>
              {providers.map((provider) => (
                <Grid size={{ xs: 12, md: 6 }} key={provider.provider_id}>
                  <Card
                    elevation={3}
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      {/* Provider Name & Verification */}
                      <Box
                        sx={{ display: "flex", alignItems: "center", mb: 1 }}
                      >
                        <Typography
                          variant="h6"
                          component="h3"
                          sx={{ flexGrow: 1 }}
                        >
                          {provider.business_name}
                        </Typography>
                        {provider.is_verified && (
                          <Tooltip title="Verified Provider">
                            <Verified color="primary" />
                          </Tooltip>
                        )}
                      </Box>

                      {/* Rating & Distance */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          mb: 2,
                          gap: 2,
                        }}
                      >
                        <Rating
                          value={provider.average_rating}
                          precision={0.1}
                          readOnly
                          size="small"
                        />
                        <Typography variant="body2" color="text.secondary">
                          ({provider.average_rating.toFixed(1)})
                        </Typography>
                        <Chip
                          icon={<LocationOn />}
                          label={`${provider.distance_km} km`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Box>

                      {/* Description */}
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2 }}
                      >
                        {provider.description}
                      </Typography>

                      {/* Address */}
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2 }}
                      >
                        📍 {provider.address}
                      </Typography>

                      <Divider sx={{ my: 2 }} />

                      {/* Services Offered */}
                      <Typography variant="subtitle2" gutterBottom>
                        Services Offered ({provider.service_count}):
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 1,
                          mb: 2,
                        }}
                      >
                        {provider.services.slice(0, 5).map((service, idx) => (
                          <Chip key={idx} label={service} size="small" />
                        ))}
                        {provider.services.length > 5 && (
                          <Chip
                            label={`+${provider.services.length - 5} more`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>

                      {/* COVID Restriction Badge */}
                      {provider.covid_restrictions.length > 0 && (
                        <Alert
                          severity={getRestrictionColor(
                            provider.covid_restrictions[0].restriction
                          )}
                          icon={<Warning />}
                          sx={{ mt: 2 }}
                        >
                          <Typography variant="caption">
                            {provider.covid_restrictions[0].restriction} COVID
                            restriction zone
                          </Typography>
                        </Alert>
                      )}
                    </CardContent>

                    <CardActions>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={() => handleBookProvider(provider.provider_id)}
                      >
                        View Services & Book
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            /* Empty State */
            <Paper elevation={1} sx={{ p: 6, textAlign: "center" }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No providers found within {radius} km
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Try increasing your search radius or searching from a different
                location.
              </Typography>
              <Button
                variant="outlined"
                onClick={() => setRadius(Math.min(radius + 10, 100))}
              >
                Increase Radius to {Math.min(radius + 10, 100)} km
              </Button>
            </Paper>
          )}
        </>
      )}

      {/* Initial State - No Search Yet */}
      {!isLoading && !hasSearched && !error && (
        <Paper elevation={1} sx={{ p: 6, textAlign: "center" }}>
          <LocationOn sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Ready to find nearby service providers?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Use your current location or enter an Australian postcode to get
            started.
          </Typography>
        </Paper>
      )}
    </Container>
  );
}
