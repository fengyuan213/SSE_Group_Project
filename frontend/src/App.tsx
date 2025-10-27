import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuthSync } from "./auth/useAuthSync";
import { api } from "./lib/api";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Button,
  Box,
  Chip,
  Avatar,
  Menu,
  MenuItem,
  CircularProgress,
  Divider,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { AccountCircle, Logout } from "@mui/icons-material";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
  useNavigate,
} from "react-router-dom";
import Booking from "./pages/Booking.tsx";
import Payment from "./pages/Payment.tsx";
import Confirmation from "./pages/Confirmation.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import UserProfile from "./pages/UserProfile.tsx";
import ErrorBoundary from "./components/ErrorBoundary";
import { ROUTES } from "./lib/routes";
import InspectionBooking from "./pages/InspectionBooking";
import Inspections from "./pages/Inspections";
import InspectionDetails from "./pages/InspectionDetails";
import ProviderDashboard from "./pages/ProviderDashboard";
import NearbyServices from "./pages/NearbyServices";
import DataConsent from "./pages/DataConsent";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import { ProtectedRoute } from "./components/ProtectedRoute.tsx";
import { RoleGate } from "./components/RoleGate.tsx";
import AuditPage from "./pages/AuditPage.tsx";

function AppContent() {
  const [status, setStatus] = useState("checking...");
  const { loginWithRedirect, logout, isAuthenticated, isLoading, user } =
    useAuth0();
  const { isSyncing, syncError } = useAuthSync();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/health")
      .then((r) => setStatus((r.data as { status?: string })?.status ?? "down"))
      .catch(() => setStatus("down"));
  }, []);

  const apiUp = status === "ok" || status === "up";

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    handleMenuClose();
    navigate(ROUTES.PROFILE);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  return (
    <>
      <AppBar
        position="fixed"
        sx={{ backgroundColor: "white", color: "text.primary" }}
        elevation={1}
      >
        <Toolbar>
          <Typography
            variant="h6"
            sx={{ flexGrow: 1, fontWeight: "bold", color: "primary.main" }}
          >
            🏠 HomeService Hub
          </Typography>
          <Button color="inherit" component={Link} to={ROUTES.HOME}>
            Home
          </Button>
          <RoleGate requiredRoles={["admin"]}>
            <Button
              color="inherit"
              component={Link}
              to={ROUTES.ADMIN_DASHBOARD}
            >
              Admin
            </Button>
          </RoleGate>
          <Button color="inherit" component={Link} to={ROUTES.NEARBY_SERVICES}>
            Find Nearby
          </Button>
          <Button color="inherit" component={Link} to={ROUTES.BOOKING_GENERAL}>
            Book Service
          </Button>
          <Button
            color="inherit"
            component={Link}
            to={ROUTES.BOOKING_INSPECTION}
          >
            Book Inspection
          </Button>
          <Button color="inherit" component={Link} to={ROUTES.INSPECTIONS}>
            My Inspections
          </Button>
          <RoleGate requiredRoles={["provider"]}>
            <Button
              color="inherit"
              component={Link}
              to={ROUTES.PROVIDER_DASHBOARD}
            >
              Provider
            </Button>
          </RoleGate>
          <Button color="inherit" component={Link} to={ROUTES.DATA_CONSENT}>
            Data Consent
          </Button>

          <Box sx={{ ml: 2, display: "flex", alignItems: "center", gap: 1 }}>

          {/* Navigate to the audit log */}
          <Button color="inherit" component={Link} to="/audit">
            Audit Logs
          </Button>

          <Box sx={{ ml: 2 }}>
            <Chip
              size="small"
              label={`API: ${status}`}
              color={
                apiUp
                  ? "success"
                  : status === "checking..."
                  ? "default"
                  : "error"
              }
              variant={apiUp ? "filled" : "outlined"}
            />

            {isLoading ? (
              <CircularProgress size={24} color="primary" />
            ) : isAuthenticated && user ? (
              <>
                {isSyncing && (
                  <Chip
                    size="small"
                    label="Syncing..."
                    color="info"
                    variant="outlined"
                  />
                )}
                {syncError && (
                  <Chip
                    size="small"
                    label="Sync Error"
                    color="error"
                    variant="outlined"
                  />
                )}
                <Button
                  color="inherit"
                  onClick={handleMenuOpen}
                  startIcon={
                    <Avatar
                      src={user.picture}
                      alt={user.name}
                      sx={{ width: 32, height: 32 }}
                    />
                  }
                  aria-controls={anchorEl ? "user-menu" : undefined}
                  aria-haspopup="true"
                  aria-expanded={anchorEl ? "true" : undefined}
                >
                  {user.name}
                </Button>
                <Menu
                  id="user-menu"
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  disableScrollLock={true}
                  container={() => document.body}
                  anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "right",
                  }}
                  transformOrigin={{
                    vertical: "top",
                    horizontal: "right",
                  }}
                  MenuListProps={{
                    "aria-labelledby": "user-button",
                  }}
                  slotProps={{
                    paper: {
                      elevation: 3,
                      sx: {
                        mt: 1.5,
                        minWidth: 200,
                        overflow: "visible", // Add this too
                      },
                    },
                  }}
                >
                  <MenuItem disabled sx={{ opacity: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {user.email}
                    </Typography>
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={handleProfileClick}>
                    <ListItemIcon>
                      <AccountCircle fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>My Profile</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                      <Logout fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Logout</ListItemText>
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button
                color="primary"
                variant="outlined"
                onClick={() => loginWithRedirect()}
                sx={{ ml: 1 }}
              >
                Login or Sign Up
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      <Toolbar />
      <Container sx={{ py: 3 }}>
        {syncError && (
          <Box sx={{ mb: 2, p: 2, bgcolor: "error.light", borderRadius: 1 }}>
            <Typography color="error.contrastText">
              Error syncing user: {syncError}
            </Typography>
          </Box>
        )}
        <ErrorBoundary>
          <Routes>
            <Route path={ROUTES.HOME} element={<Dashboard />} />
            <Route path={ROUTES.NEARBY_SERVICES} element={<NearbyServices />} />
            <Route path={ROUTES.BOOKING_GENERAL} element={<Booking />} />
            <Route
              path={ROUTES.BOOKING_INSPECTION}
              element={<InspectionBooking />}
            />
            <Route path={ROUTES.INSPECTIONS} element={<Inspections />} />
            <Route
              path={ROUTES.INSPECTION_DETAILS}
              element={<InspectionDetails />}
            />
            <Route
              path={ROUTES.PROVIDER_DASHBOARD}
              element={
                <ProtectedRoute requiredRoles={["provider"]}>
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />
            <Route path={ROUTES.DATA_CONSENT} element={<DataConsent />} />
            <Route path={ROUTES.PAYMENT} element={<Payment />} />
            <Route path={ROUTES.CONFIRMATION} element={<Confirmation />} />
            <Route path={ROUTES.PROFILE} element={<UserProfile />} />
            <Route
              path={ROUTES.ADMIN_DASHBOARD}
              element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path={ROUTES.AUDIT}
              element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <AuditPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
          </Routes>
        </ErrorBoundary>
      </Container>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
