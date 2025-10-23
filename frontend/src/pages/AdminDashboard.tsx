import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
} from "@mui/material";
import {
  People,
  BookOnline,
  AttachMoney,
  VerifiedUser,
} from "@mui/icons-material";
import { adminApi, type SystemStats, type AdminUser } from "../lib/api";
import { useUserRoles } from "../auth/useUserRoles";

/**
 * Admin Dashboard - Only accessible to users with 'admin' role
 */
export default function AdminDashboard() {
  const { getAccessTokenSilently } = useAuth0();
  const { roles } = useUserRoles();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const token = await getAccessTokenSilently();

        // Fetch system stats using centralized adminApi
        const statsData = await adminApi.getSystemStats(token);
        setStats(statsData);

        // Fetch users using centralized adminApi
        const usersData = await adminApi.getUsers(token, 1, 10);
        setUsers(usersData.users);
      } catch (err) {
        console.error("Failed to fetch admin data:", err);
        const error = err as { response?: { status?: number } };
        if (error.response?.status === 403) {
          setError("Access denied. Admin role required.");
        } else {
          setError("Failed to load admin dashboard");
        }
      } finally {
        setLoading(false);
      }
    };

    if (roles.includes("admin")) {
      fetchAdminData();
    } else {
      setLoading(false);
    }
  }, [getAccessTokenSilently, roles]);

  if (loading) {
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

  if (!roles.includes("admin")) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">
          Access Denied. This page requires admin role.
          <br />
          Your roles: {roles.join(", ")}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" gutterBottom>
        Admin Dashboard
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        System Overview and Management
      </Typography>

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <People color="primary" fontSize="large" />
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Total Users
                    </Typography>
                    <Typography variant="h4">{stats.total_users}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <BookOnline color="secondary" fontSize="large" />
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Active Bookings
                    </Typography>
                    <Typography variant="h4">
                      {stats.active_bookings}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <AttachMoney color="success" fontSize="large" />
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Total Revenue
                    </Typography>
                    <Typography variant="h4">
                      ${stats.total_revenue.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <VerifiedUser color="info" fontSize="large" />
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Active (7 days)
                    </Typography>
                    <Typography variant="h4">
                      {stats.active_users_7_days}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Users by Role */}
      {stats && (
        <Paper sx={{ mt: 4, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Users by Role
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {Object.entries(stats.users_by_role).map(([role, count]) => (
              <Grid item key={role}>
                <Chip
                  label={`${role}: ${count}`}
                  color={role === "admin" ? "error" : "default"}
                  variant={role === "admin" ? "filled" : "outlined"}
                />
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Recent Users Table */}
      <Paper sx={{ mt: 4, p: 3 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h6">Recent Users</Typography>
          <Button variant="outlined" size="small">
            View All
          </Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.name || "-"}</TableCell>
                  <TableCell>
                    {user.roles?.map((role) => (
                      <Chip
                        key={role}
                        label={role}
                        size="small"
                        sx={{ mr: 0.5 }}
                        color={role === "admin" ? "error" : "default"}
                      />
                    ))}
                  </TableCell>
                  <TableCell>
                    {user.last_login
                      ? new Date(user.last_login).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
}
