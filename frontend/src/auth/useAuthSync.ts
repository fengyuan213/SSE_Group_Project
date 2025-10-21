import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import axios from "axios";

export const useAuthSync = () => {
  const { isAuthenticated, isLoading, user, getAccessTokenSilently } =
    useAuth0();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    const syncUserWithBackend = async () => {
      if (isAuthenticated && user && !isLoading) {
        setIsSyncing(true);
        setSyncError(null);

        try {
          const token = await getAccessTokenSilently();

          // Use VITE_API_BASE for Codespaces, fallback to relative URL
          const apiBase = import.meta.env.VITE_API_BASE || "";

          // Get user_metadata from the custom claim
          const userMetadata =
            (user as any)["user_metadata"] || user.user_metadata || {};

          console.log("User object:", user);
          console.log("User metadata:", userMetadata);

          // Send user data to backend including additional fields from user_metadata
          const response = await axios.post(
            `${apiBase}/api/auth/sync`,
            {
              auth0_id: user.sub,
              email: user.email,
              name: user.name,
              picture: user.picture,
              given_name: user.given_name || userMetadata.given_name, // Add this
              family_name: user.family_name || userMetadata.family_name, // Add this
              // Additional fields from user_metadata
              age: userMetadata.age,
              mobile: userMetadata.mobile,
              country_of_citizenship: userMetadata.country_of_citizenship,
              language_preferred: userMetadata.language_preferred,
              covid_vaccination_status: userMetadata.covid_vaccination_status,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          console.log("User sync result:", response.data);
        } catch (error) {
          console.error("Failed to sync user with backend:", error);
          setSyncError("Failed to sync user data");
        } finally {
          setIsSyncing(false);
        }
      }
    };

    syncUserWithBackend();
  }, [isAuthenticated, user, isLoading, getAccessTokenSilently]);

  return { isSyncing, syncError };
};
