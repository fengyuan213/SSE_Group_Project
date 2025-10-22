import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import {
  Container,
  Paper,
  Typography,
  Box,
  Avatar,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Divider,
} from "@mui/material";
import {
  Person,
  Email,
  Phone,
  Language,
  Public,
  Vaccines,
  CalendarToday,
  Login,
} from "@mui/icons-material";
import axios from "axios";

interface UserProfile {
  user_id: string;
  email: string;
  name: string;
  given_name: string;
  family_name: string;
  nickname: string;
  picture: string;
  email_verified: boolean;
  created_at: string;
  last_login: string;
  login_count: number;
  roles: string[];
  age?: number;
  mobile?: string;
  country_of_citizenship?: string;
  language_preferred?: string;
  covid_vaccination_status?: string;
}

export default function UserProfile() {
  const { user, getAccessTokenSilently, isLoading: authLoading } = useAuth0();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await getAccessTokenSilently();
        const apiBase = import.meta.env.VITE_API_BASE || "";

        const response = await axios.get(`${apiBase}/api/auth/user/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setProfile(response.data);
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        setError("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchProfile();
    }
  }, [user, authLoading, getAccessTokenSilently]);

  if (authLoading || loading) {
    return (
      <Container sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!profile) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="warning">No profile data available</Alert>
      </Container>
    );
  }

  const getCountryName = (code: string) => {
    const countries: { [key: string]: string } = {
      AU: "Australia",
      US: "United States",
      GB: "United Kingdom",
      CA: "Canada",
      NZ: "New Zealand",
      IN: "India",
      CN: "China",
      JP: "Japan",
      SG: "Singapore",
      MY: "Malaysia",
      PH: "Philippines",
      ID: "Indonesia",
      TH: "Thailand",
      VN: "Vietnam",
      KR: "South Korea",
      BD: "Bangladesh",
      PK: "Pakistan",
      LK: "Sri Lanka",
      NP: "Nepal",
      OTHER: "Other",
    };
    return countries[code] || code;
  };

  const getLanguageName = (code: string) => {
    const languages: { [key: string]: string } = {
      en: "English",
      es: "Spanish",
      zh: "Chinese (Mandarin)",
      hi: "Hindi",
      ar: "Arabic",
      fr: "French",
      de: "German",
      ja: "Japanese",
      ko: "Korean",
      pt: "Portuguese",
      ru: "Russian",
      it: "Italian",
      other: "Other",
    };
    return languages[code] || code;
  };

  const getVaccinationStatus = (status: string) => {
    const statuses: { [key: string]: string } = {
      fully_vaccinated: "Fully Vaccinated (2+ doses)",
      partially_vaccinated: "Partially Vaccinated (1 dose)",
      boosted: "Boosted (3+ doses)",
      not_vaccinated: "Not Vaccinated",
      prefer_not_to_say: "Prefer not to say",
    };
    return statuses[status] || status;
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        {/* Header Section */}
        <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
          <Avatar
            src={profile.picture}
            alt={profile.name}
            sx={{ width: 100, height: 100, mr: 3 }}
          />
          <Box>
            <Typography variant="h4" gutterBottom>
              {profile.name}
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              {profile.email}
            </Typography>
            <Box sx={{ mt: 1 }}>
              {profile.roles.map((role) => (
                <Chip
                  key={role}
                  label={role.toUpperCase()}
                  color="primary"
                  size="small"
                  sx={{ mr: 1 }}
                />
              ))}
              {profile.email_verified && (
                <Chip
                  label="Email Verified"
                  color="success"
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Basic Information */}
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Basic Information
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Person sx={{ mr: 2, color: "primary.main" }} />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Given Name
                </Typography>
                <Typography variant="body1">
                  {profile.given_name || "N/A"}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Person sx={{ mr: 2, color: "primary.main" }} />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Family Name
                </Typography>
                <Typography variant="body1">
                  {profile.family_name || "N/A"}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Email sx={{ mr: 2, color: "primary.main" }} />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1">{profile.email}</Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Person sx={{ mr: 2, color: "primary.main" }} />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Nickname
                </Typography>
                <Typography variant="body1">
                  {profile.nickname || "N/A"}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Additional Information */}
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Additional Information
        </Typography>
        <Grid container spacing={3}>
          {profile.age && (
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <CalendarToday sx={{ mr: 2, color: "primary.main" }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Age
                  </Typography>
                  <Typography variant="body1">
                    {profile.age} years old
                  </Typography>
                </Box>
              </Box>
            </Grid>
          )}

          {profile.mobile && (
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Phone sx={{ mr: 2, color: "primary.main" }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Mobile Number
                  </Typography>
                  <Typography variant="body1">{profile.mobile}</Typography>
                </Box>
              </Box>
            </Grid>
          )}

          {profile.country_of_citizenship && (
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Public sx={{ mr: 2, color: "primary.main" }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Country of Citizenship
                  </Typography>
                  <Typography variant="body1">
                    {getCountryName(profile.country_of_citizenship)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          )}

          {profile.language_preferred && (
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Language sx={{ mr: 2, color: "primary.main" }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Preferred Language
                  </Typography>
                  <Typography variant="body1">
                    {getLanguageName(profile.language_preferred)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          )}

          {profile.covid_vaccination_status && (
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Vaccines sx={{ mr: 2, color: "primary.main" }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    COVID-19 Vaccination Status
                  </Typography>
                  <Typography variant="body1">
                    {getVaccinationStatus(profile.covid_vaccination_status)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          )}
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Account Information */}
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Account Information
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <CalendarToday sx={{ mr: 2, color: "primary.main" }} />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Account Created
                </Typography>
                <Typography variant="body1">
                  {new Date(profile.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Login sx={{ mr: 2, color: "primary.main" }} />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Last Login
                </Typography>
                <Typography variant="body1">
                  {new Date(profile.last_login).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Login sx={{ mr: 2, color: "primary.main" }} />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Total Logins
                </Typography>
                <Typography variant="body1">
                  {profile.login_count} times
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Person sx={{ mr: 2, color: "primary.main" }} />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  User ID
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                  {profile.user_id}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}
