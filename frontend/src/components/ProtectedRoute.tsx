import { useAuth0 } from "@auth0/auth0-react";
import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { CircularProgress, Container, Alert, Box } from "@mui/material";
import { useUserRoles } from "../auth/useUserRoles";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[]; // If specified, user must have at least one of these roles
  requireAllRoles?: boolean; // If true, user must have ALL specified roles
  fallbackPath?: string; // Where to redirect if unauthorized
}

/**
 * Component to protect routes based on authentication and roles
 *
 * Usage:
 *   <ProtectedRoute>
 *     <MyPage />
 *   </ProtectedRoute>
 *
 *   <ProtectedRoute requiredRoles={['admin']}>
 *     <AdminDashboard />
 *   </ProtectedRoute>
 *
 *   <ProtectedRoute requiredRoles={['admin', 'provider']}>
 *     <ManagementPage />
 *   </ProtectedRoute>
 */
export const ProtectedRoute = ({
  children,
  requiredRoles = [],
  requireAllRoles = false,
  fallbackPath = "/",
}: ProtectedRouteProps) => {
  const {
    isAuthenticated,
    isLoading: authLoading,
    loginWithRedirect,
  } = useAuth0();
  const { roles, loading: rolesLoading } = useUserRoles();

  // Show loading spinner while checking authentication
  if (authLoading || rolesLoading) {
    return (
      <Container sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    loginWithRedirect({
      appState: { returnTo: window.location.pathname },
    });
    return null;
  }

  // Check role-based authorization
  if (requiredRoles.length > 0) {
    const hasRequiredRoles = requireAllRoles
      ? requiredRoles.every((role) => roles.includes(role))
      : requiredRoles.some((role) => roles.includes(role));

    if (!hasRequiredRoles) {
      return (
        <Container sx={{ mt: 4 }}>
          <Alert severity="error">
            <Box>
              <strong>Access Denied</strong>
            </Box>
            <Box sx={{ mt: 1 }}>
              You don't have permission to access this page.
              {requiredRoles.length > 0 && (
                <>
                  <br />
                  Required role{requiredRoles.length > 1 ? "s" : ""}:{" "}
                  <strong>{requiredRoles.join(", ")}</strong>
                </>
              )}
              {roles.length > 0 && (
                <>
                  <br />
                  Your role{roles.length > 1 ? "s" : ""}:{" "}
                  <strong>{roles.join(", ")}</strong>
                </>
              )}
            </Box>
          </Alert>
        </Container>
      );
    }
  }

  // User is authenticated and authorized
  return <>{children}</>;
};

/**
 * Higher-order component version of ProtectedRoute
 */
export const withProtectedRoute = (
  Component: React.ComponentType,
  requiredRoles?: string[]
) => {
  return (props: any) => (
    <ProtectedRoute requiredRoles={requiredRoles}>
      <Component {...props} />
    </ProtectedRoute>
  );
};
