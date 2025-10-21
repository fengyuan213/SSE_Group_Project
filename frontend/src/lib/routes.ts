/**
 * Centralized Route Configuration
 *
 * Best practice: All routes defined in one place for easy maintenance
 * Security: Minimal URL parameters, data fetched from backend
 */

export const ROUTES = {
  HOME: "/",
  BOOKING_GENERAL: "/booking/general",
  PAYMENT: "/payment",
  CONFIRMATION: "/confirmation",
  PROFILE: "/profile",
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
