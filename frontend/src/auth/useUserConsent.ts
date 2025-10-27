import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { consentApi } from "../lib/api";

interface UseUserConsentReturn {
  hasConsent: boolean | null; // null = loading, true/false = consent status
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to check if the current user has given data consent
 *
 * Usage:
 *   const { hasConsent, loading } = useUserConsent();
 *
 *   if (loading) return <Spinner />;
 *   if (!hasConsent) return <ConsentRequired />;
 *   return <YourComponent />;
 */
export function useUserConsent(): UseUserConsentReturn {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth0();
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConsent = async () => {
    if (!isAuthenticated || !user?.sub || authLoading) {
      setLoading(false);
      setHasConsent(null);
      return;
    }

    try {
      setError(null);
      const consent = await consentApi.getConsent(user.sub);
      setHasConsent(consent.consent_given);
    } catch (err) {
      const error = err as { response?: { status?: number } };
      // 404 means no consent record exists yet (not given)
      if (error.response?.status === 404) {
        setHasConsent(false);
      } else {
        console.error("Error fetching consent:", err);
        setError("Failed to check consent status");
        setHasConsent(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsent();
  }, [user?.sub, isAuthenticated, authLoading]);

  return {
    hasConsent,
    loading,
    error,
    refetch: fetchConsent,
  };
}

