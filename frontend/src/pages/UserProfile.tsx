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
  Button,
  TextField,
  MenuItem,
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
  Edit,
  Save,
  Cancel,
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

const countries = [
  { value: "AU", label: "Australia" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "NZ", label: "New Zealand" },
  { value: "IN", label: "India" },
  { value: "CN", label: "China" },
  { value: "JP", label: "Japan" },
  { value: "SG", label: "Singapore" },
  { value: "MY", label: "Malaysia" },
  { value: "PH", label: "Philippines" },
  { value: "ID", label: "Indonesia" },
  { value: "TH", label: "Thailand" },
  { value: "VN", label: "Vietnam" },
  { value: "KR", label: "South Korea" },
  { value: "BD", label: "Bangladesh" },
  { value: "PK", label: "Pakistan" },
  { value: "LK", label: "Sri Lanka" },
  { value: "NP", label: "Nepal" },
  { value: "OTHER", label: "Other" },
];

const languages = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "zh", label: "Chinese (Mandarin)" },
  { value: "hi", label: "Hindi" },
  { value: "ar", label: "Arabic" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "pt", label: "Portuguese" },
  { value: "ru", label: "Russian" },
  { value: "it", label: "Italian" },
  { value: "other", label: "Other" },
];

const vaccinationStatuses = [
  { value: "fully_vaccinated", label: "Fully Vaccinated (2+ doses)" },
  { value: "partially_vaccinated", label: "Partially Vaccinated (1 dose)" },
  { value: "boosted", label: "Boosted (3+ doses)" },
  { value: "not_vaccinated", label: "Not Vaccinated" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export default function UserProfile() {
  const { user, getAccessTokenSilently, isLoading: authLoading } = useAuth0();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [user, authLoading]);

  const fetchProfile = async () => {
    if (!user || authLoading) return;

    try {
      const token = await getAccessTokenSilently();
      const apiBase = import.meta.env.VITE_API_BASE || "";

      const response = await axios.get(`${apiBase}/api/auth/user/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setProfile(response.data);
      setEditedProfile(response.data);
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      setError("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProfile(profile || {});
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await getAccessTokenSilently();
      const apiBase = import.meta.env.VITE_API_BASE || "";

      await axios.put(
        `${apiBase}/api/auth/user/profile`,
        {
          given_name: editedProfile.given_name,
          family_name: editedProfile.family_name,
          nickname: editedProfile.nickname,
          age: editedProfile.age,
          mobile: editedProfile.mobile,
          country_of_citizenship: editedProfile.country_of_citizenship,
          language_preferred: editedProfile.language_preferred,
          covid_vaccination_status: editedProfile.covid_vaccination_status,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSuccess("Profile updated successfully!");
      setIsEditing(false);
      await fetchProfile(); // Reload profile
    } catch (err) {
      console.error("Failed to update profile:", err);
      setError("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof UserProfile, value: any) => {
    setEditedProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (authLoading || loading) {
    return (
      <Container sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
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
    return countries.find((c) => c.value === code)?.label || code;
  };

  const getLanguageName = (code: string) => {
    return languages.find((l) => l.value === code)?.label || code;
  };

  const getVaccinationStatus = (status: string) => {
    return vaccinationStatuses.find((v) => v.value === status)?.label || status;
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        {/* Success/Error Messages */}
        {success && (
          <Alert
            severity="success"
            sx={{ mb: 3 }}
            onClose={() => setSuccess(null)}
          >
            {success}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Header Section */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: 4,
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
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

          {/* Edit/Save/Cancel Buttons */}
          <Box>
            {!isEditing ? (
              <Button
                variant="contained"
                startIcon={<Edit />}
                onClick={handleEdit}
              >
                Edit Profile
              </Button>
            ) : (
              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<Cancel />}
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
              </Box>
            )}
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
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Given Name
                </Typography>
                {isEditing ? (
                  <TextField
                    fullWidth
                    size="small"
                    value={editedProfile.given_name || ""}
                    onChange={(e) => handleChange("given_name", e.target.value)}
                    sx={{ mt: 0.5 }}
                  />
                ) : (
                  <Typography variant="body1">
                    {profile.given_name || "N/A"}
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Person sx={{ mr: 2, color: "primary.main" }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Family Name
                </Typography>
                {isEditing ? (
                  <TextField
                    fullWidth
                    size="small"
                    value={editedProfile.family_name || ""}
                    onChange={(e) =>
                      handleChange("family_name", e.target.value)
                    }
                    sx={{ mt: 0.5 }}
                  />
                ) : (
                  <Typography variant="body1">
                    {profile.family_name || "N/A"}
                  </Typography>
                )}
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
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Nickname
                </Typography>
                {isEditing ? (
                  <TextField
                    fullWidth
                    size="small"
                    value={editedProfile.nickname || ""}
                    onChange={(e) => handleChange("nickname", e.target.value)}
                    sx={{ mt: 0.5 }}
                  />
                ) : (
                  <Typography variant="body1">
                    {profile.nickname || "N/A"}
                  </Typography>
                )}
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
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <CalendarToday sx={{ mr: 2, color: "primary.main" }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Age
                </Typography>
                {isEditing ? (
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={editedProfile.age || ""}
                    onChange={(e) =>
                      handleChange("age", parseInt(e.target.value))
                    }
                    inputProps={{ min: 16, max: 120 }}
                    sx={{ mt: 0.5 }}
                  />
                ) : (
                  <Typography variant="body1">
                    {profile.age ? `${profile.age} years old` : "N/A"}
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Phone sx={{ mr: 2, color: "primary.main" }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Mobile Number
                </Typography>
                {isEditing ? (
                  <TextField
                    fullWidth
                    size="small"
                    value={editedProfile.mobile || ""}
                    onChange={(e) => handleChange("mobile", e.target.value)}
                    sx={{ mt: 0.5 }}
                  />
                ) : (
                  <Typography variant="body1">
                    {profile.mobile || "N/A"}
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Public sx={{ mr: 2, color: "primary.main" }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Country of Citizenship
                </Typography>
                {isEditing ? (
                  <TextField
                    fullWidth
                    size="small"
                    value={editedProfile.country_of_citizenship || ""}
                    onChange={(e) =>
                      handleChange("country_of_citizenship", e.target.value)
                    }
                    placeholder="e.g., AU, US, GB"
                    helperText="Enter country code (e.g., AU for Australia)"
                    sx={{ mt: 0.5 }}
                  />
                ) : (
                  <Typography variant="body1">
                    {profile.country_of_citizenship
                      ? getCountryName(profile.country_of_citizenship)
                      : "N/A"}
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Language sx={{ mr: 2, color: "primary.main" }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Preferred Language
                </Typography>
                {isEditing ? (
                  <TextField
                    fullWidth
                    size="small"
                    value={editedProfile.language_preferred || ""}
                    onChange={(e) =>
                      handleChange("language_preferred", e.target.value)
                    }
                    placeholder="e.g., en, es, zh"
                    helperText="Enter language code (e.g., en for English)"
                    sx={{ mt: 0.5 }}
                  />
                ) : (
                  <Typography variant="body1">
                    {profile.language_preferred
                      ? getLanguageName(profile.language_preferred)
                      : "N/A"}
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Vaccines sx={{ mr: 2, color: "primary.main" }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  COVID-19 Vaccination Status
                </Typography>
                {isEditing ? (
                  <TextField
                    fullWidth
                    size="small"
                    value={editedProfile.covid_vaccination_status || ""}
                    onChange={(e) =>
                      handleChange("covid_vaccination_status", e.target.value)
                    }
                    placeholder="e.g., fully_vaccinated, boosted"
                    helperText="Options: fully_vaccinated, partially_vaccinated, boosted, not_vaccinated"
                    sx={{ mt: 0.5 }}
                  />
                ) : (
                  <Typography variant="body1">
                    {profile.covid_vaccination_status
                      ? getVaccinationStatus(profile.covid_vaccination_status)
                      : "N/A"}
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Account Information (Read-Only) */}
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
