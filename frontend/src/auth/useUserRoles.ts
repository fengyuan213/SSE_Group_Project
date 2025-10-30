import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import { authApi } from "../lib/api";

/**
 * Custom hook to get user roles from backend
 * Returns roles array and loading state
 */
export const useUserRoles = () => {
  const {
    isAuthenticated,
    isLoading: authLoading,
    getAccessTokenSilently,
  } = useAuth0();
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRoles = async () => {
      if (!isAuthenticated || authLoading) {
        setLoading(false);
        return;
      }

      try {
        const token = await getAccessTokenSilently();

        // Use centralized auth API
        const profile = await authApi.getUserProfile(token);

        setRoles(profile.roles || []);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch user roles:", err);
        setError("Failed to load user roles");
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRoles();
  }, [isAuthenticated, authLoading, getAccessTokenSilently]);

  return { roles, loading, error };
};

/**
 * Check if user has a specific role
 */
export const useHasRole = (requiredRole: string): boolean => {
  const { roles } = useUserRoles();
  return roles.includes(requiredRole);
};

/**
 * Check if user has any of the specified roles
 */
export const useHasAnyRole = (requiredRoles: string[]): boolean => {
  const { roles } = useUserRoles();
  return requiredRoles.some((role) => roles.includes(role));
};

/**
 * Check if user has all of the specified roles
 */
export const useHasAllRoles = (requiredRoles: string[]): boolean => {
  const { roles } = useUserRoles();
  return requiredRoles.every((role) => roles.includes(role));
};
