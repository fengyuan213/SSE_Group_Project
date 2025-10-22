/**
 * Centralized Route Configuration
 *
 * Best practice: All routes defined in one place for easy maintenance
 * Security: Minimal URL parameters, data fetched from backend
 */

export const ROUTES = {
  HOME: "/",
  BOOKING_GENERAL: "/booking/general",
  BOOKING_INSPECTION: "/booking/inspection",
  PAYMENT: "/payment",
  CONFIRMATION: "/confirmation",
  PROFILE: "/profile",
  INSPECTIONS: "/inspections",
  INSPECTION_DETAILS: "/inspections/:id",
  PROVIDER_DASHBOARD: "/provider",
  NEARBY_SERVICES: "/nearby-services",
  DATA_CONSENT: "/data-consent",
} as const;

/**
 * Route builders with type-safe parameters
 * Security: Only pass references, never sensitive data like amounts
 */

export const buildPaymentRoute = (bookingReference: string) => {
  return `${ROUTES.PAYMENT}?booking_reference=${encodeURIComponent(
    bookingReference
  )}`;
};

export const buildConfirmationRoute = (paymentReference: string) => {
  return `${ROUTES.CONFIRMATION}?payment_reference=${encodeURIComponent(
    paymentReference
  )}`;
};

/**
 * Parse route parameters
 */
export const getBookingReferenceFromUrl = (
  searchParams: URLSearchParams
): string | null => {
  return searchParams.get("booking_reference");
};

export const getPaymentReferenceFromUrl = (
  searchParams: URLSearchParams
): string | null => {
  return searchParams.get("payment_reference");
};

// Type for route keys
export type RouteKey = keyof typeof ROUTES;

// Type for route values
export type RouteValue = (typeof ROUTES)[RouteKey];
export const buildInspectionDetailsRoute = (inspectionId: number) => {
  return `/inspections/${inspectionId}`;
};
