import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
});

// Types
export interface ServicePackage {
  package_id: number;
  package_name: string;
  description: string;
  base_price: number;
  duration_minutes: number;
  category_name: string;
  category_id: number;
  package_type?: "single" | "bundle";
  discount_percentage?: number;
  is_customizable?: boolean;
  included_services_count?: number;
}

export interface BundleIncludedService {
  package_id: number;
  package_name: string;
  description: string;
  base_price: number;
  duration_minutes: number;
  category_name?: string;
  is_optional: boolean;
  display_order: number;
}

export interface BundlePackage {
  package_id: number;
  package_name: string;
  description: string;
  bundle_price: number;
  total_duration: number;
  discount_percentage: number;
  is_customizable: boolean;
  category_id: number;
  category_name: string;
  included_services: BundleIncludedService[];
  original_total_price: number;
  package_type?: string;
  matching_services?: number; // Number of work item packages this bundle covers
}

export interface ServiceProvider {
  provider_id: number;
  business_name: string;
  description: string;
  address: string;
  average_rating: number;
  is_verified: boolean;
}

export interface NearbyProvider {
  provider_id: number;
  business_name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  average_rating: number;
  is_verified: boolean;
  service_count: number;
  services: string[]; // Array of service package names
  covid_restrictions: CovidRestriction[];
}

export interface CovidRestriction {
  area: string;
  restriction: "Low" | "Medium" | "High";
  distance_km?: number;
}

export interface NearbyProvidersResponse {
  providers: NearbyProvider[];
  count: number;
  search_center: { latitude: number; longitude: number };
  radius_km: number;
}

export interface CovidRestrictionsResponse {
  restrictions: CovidRestriction[];
  count: number;
  location: { latitude: number; longitude: number };
}

export interface LocationData {
  latitude: number;
  longitude: number;
  postcode?: string;
}

export interface BookingData {
  package_id: number;
  provider_id?: number;
  booking_type: string;
  start_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM (must be on 30-min boundary)
  service_address: string;
  special_instructions?: string | null;
  inspection_id?: number; // Link to inspection if this booking is for inspection-based work
  urgent_item_id?: number; // Link to specific work item if applicable
  // Note: end_date is NOT sent - backend calculates it automatically based on service duration
}

export interface TimeSlot {
  start_time: string; // "09:00"
  provider_id?: number;
  duration_minutes: number;
}

export interface AvailabilityResponse {
  date: string;
  available_slots: TimeSlot[];
  required_slots: number;
}

export interface BookingResponse {
  booking_id: number;
  booking_reference: string;
  booking_status: string;
}

export interface PaymentIntentResponse {
  client_secret: string;
  payment_intent_id: string;
  amount: number; // SECURE: Server sends back the actual amount from database
  mock?: boolean;
}

export interface PaymentConfirmationResponse {
  payment_id: number;
  payment_reference: string;
  booking_reference: string;
  status: string;
  email_sent: boolean;
}

export interface ConfirmationDetails {
  payment_reference: string;
  booking_reference: string;
  amount: number;
  package_name: string;
  payment_status: string;
  payment_date: string;
  scheduled_date: string | null;
  service_address: string | null;
}

export interface Inspection {
  inspection_id: number;
  user_id: string;
  provider_id?: number;
  provider_name?: string;
  inspection_date: string;
  inspection_status: "scheduled" | "completed" | "cancelled";
  inspection_notes?: string;
  inspector_name?: string;
  created_at: string;
  updated_at?: string;
  work_items_count?: number;
  critical_count?: number;
  high_count?: number;
  medium_count?: number;
}

export interface UrgentWorkItem {
  urgent_item_id: number;
  inspection_id: number;
  item_description: string;
  urgency_level: "critical" | "high" | "medium";
  discount_percentage: number;
  recommended_package_id?: number;
  recommended_package?: ServicePackage;
  is_resolved: boolean;
  created_at: string;
}

export interface InspectionDetails extends Inspection {
  work_items: UrgentWorkItem[];
  recommended_bundles: BundlePackage[];
}

export interface InspectionBookingData {
  user_id: string;
  inspection_date: string; // ISO format: YYYY-MM-DDTHH:MM
  service_address: string;
  notes?: string;
  provider_id?: number;
}

export interface WorkItemData {
  item_description: string;
  urgency_level: "critical" | "high" | "medium";
  discount_percentage?: number;
  recommended_package_id?: number;
}

// Demo data - Expanded with more diverse services
const DEMO_PACKAGES: ServicePackage[] = [
  // Plumbing Services
  {
    package_id: 1,
    package_name: "Basic Plumbing Inspection",
    description:
      "Comprehensive plumbing inspection including pipes, fixtures, and water pressure testing",
    base_price: 150.0,
    duration_minutes: 60,
    category_name: "Plumbing",
    category_id: 1,
  },
  {
    package_id: 2,
    package_name: "Emergency Leak Repair",
    description:
      "Urgent leak repair service available 24/7 for burst pipes and major leaks",
    base_price: 300.0,
    duration_minutes: 120,
    category_name: "Plumbing",
    category_id: 1,
  },
  {
    package_id: 3,
    package_name: "Drain Cleaning & Unclogging",
    description:
      "Professional drain cleaning service for kitchen, bathroom, and main drains",
    base_price: 120.0,
    duration_minutes: 90,
    category_name: "Plumbing",
    category_id: 1,
  },
  {
    package_id: 4,
    package_name: "Water Heater Installation",
    description:
      "Complete water heater replacement and installation with warranty",
    base_price: 850.0,
    duration_minutes: 240,
    category_name: "Plumbing",
    category_id: 1,
  },

  // Electrical Services
  {
    package_id: 5,
    package_name: "Electrical Safety Check",
    description:
      "Full electrical safety inspection including outlets, wiring, and panel check",
    base_price: 200.0,
    duration_minutes: 90,
    category_name: "Electrical",
    category_id: 2,
  },
  {
    package_id: 6,
    package_name: "Smart Home Installation",
    description:
      "Smart switch, outlet, and thermostat installation with configuration",
    base_price: 350.0,
    duration_minutes: 180,
    category_name: "Electrical",
    category_id: 2,
  },
  {
    package_id: 7,
    package_name: "Ceiling Fan Installation",
    description:
      "Professional ceiling fan installation with light fixture integration",
    base_price: 180.0,
    duration_minutes: 120,
    category_name: "Electrical",
    category_id: 2,
  },
  {
    package_id: 8,
    package_name: "Panel Upgrade Service",
    description:
      "Electrical panel upgrade to modern standards with increased capacity",
    base_price: 1200.0,
    duration_minutes: 480,
    category_name: "Electrical",
    category_id: 2,
  },

  // HVAC Services
  {
    package_id: 9,
    package_name: "AC Maintenance",
    description:
      "Air conditioning service and maintenance including filter replacement",
    base_price: 180.0,
    duration_minutes: 90,
    category_name: "HVAC",
    category_id: 3,
  },
  {
    package_id: 10,
    package_name: "Heating System Tune-up",
    description:
      "Full service for heating units including efficiency optimization",
    base_price: 260.0,
    duration_minutes: 120,
    category_name: "HVAC",
    category_id: 3,
  },
  {
    package_id: 11,
    package_name: "Duct Cleaning Service",
    description:
      "Professional air duct cleaning and sanitization for better air quality",
    base_price: 380.0,
    duration_minutes: 180,
    category_name: "HVAC",
    category_id: 3,
  },
  {
    package_id: 12,
    package_name: "HVAC System Installation",
    description:
      "Complete HVAC system installation with energy efficiency consultation",
    base_price: 4500.0,
    duration_minutes: 720,
    category_name: "HVAC",
    category_id: 3,
  },

  // General Maintenance
  {
    package_id: 13,
    package_name: "Full Home Maintenance",
    description:
      "Complete home check-up and repair including minor fixes and safety inspection",
    base_price: 500.0,
    duration_minutes: 240,
    category_name: "General Maintenance",
    category_id: 4,
  },
  {
    package_id: 14,
    package_name: "Handyman Service Package",
    description:
      "General repairs, furniture assembly, and small home improvement tasks",
    base_price: 150.0,
    duration_minutes: 120,
    category_name: "General Maintenance",
    category_id: 4,
  },
  {
    package_id: 15,
    package_name: "Paint Touch-up Service",
    description: "Interior and exterior paint touch-ups and minor wall repairs",
    base_price: 220.0,
    duration_minutes: 180,
    category_name: "General Maintenance",
    category_id: 4,
  },

  // Cleaning Services
  {
    package_id: 16,
    package_name: "Deep House Cleaning",
    description:
      "Comprehensive deep cleaning service for entire home including sanitization",
    base_price: 280.0,
    duration_minutes: 240,
    category_name: "Cleaning",
    category_id: 5,
  },
  {
    package_id: 17,
    package_name: "Carpet & Upholstery Cleaning",
    description:
      "Professional steam cleaning for carpets, rugs, and furniture upholstery",
    base_price: 180.0,
    duration_minutes: 150,
    category_name: "Cleaning",
    category_id: 5,
  },
  {
    package_id: 18,
    package_name: "Post-Construction Cleanup",
    description:
      "Specialized cleaning service after renovation or construction work",
    base_price: 450.0,
    duration_minutes: 300,
    category_name: "Cleaning",
    category_id: 5,
  },
  {
    package_id: 19,
    package_name: "Window Cleaning Service",
    description:
      "Interior and exterior window cleaning with screen cleaning included",
    base_price: 120.0,
    duration_minutes: 90,
    category_name: "Cleaning",
    category_id: 5,
  },

  // Landscaping Services
  {
    package_id: 20,
    package_name: "Lawn Care & Maintenance",
    description:
      "Regular lawn mowing, edging, and basic landscaping maintenance",
    base_price: 80.0,
    duration_minutes: 60,
    category_name: "Landscaping",
    category_id: 6,
  },
  {
    package_id: 21,
    package_name: "Garden Design & Installation",
    description:
      "Custom garden design with plant selection and professional installation",
    base_price: 650.0,
    duration_minutes: 480,
    category_name: "Landscaping",
    category_id: 6,
  },
  {
    package_id: 22,
    package_name: "Tree Trimming & Removal",
    description:
      "Professional tree service including pruning, trimming, and safe removal",
    base_price: 320.0,
    duration_minutes: 180,
    category_name: "Landscaping",
    category_id: 6,
  },
  {
    package_id: 23,
    package_name: "Sprinkler System Installation",
    description:
      "Automated irrigation system design and installation with smart controls",
    base_price: 890.0,
    duration_minutes: 360,
    category_name: "Landscaping",
    category_id: 6,
  },
  {
    package_id: 24,
    package_name: "Seasonal Yard Cleanup",
    description:
      "Comprehensive seasonal cleanup including leaf removal and debris clearing",
    base_price: 150.0,
    duration_minutes: 120,
    category_name: "Landscaping",
    category_id: 6,
  },
];

const DEMO_PROVIDERS: ServiceProvider[] = [
  {
    provider_id: 1,
    business_name: "PlumberPro Ltd",
    description: "Expert plumbing and emergency repairs",
    address: "London, UK",
    average_rating: 4.8,
    is_verified: true,
  },
  {
    provider_id: 2,
    business_name: "ElectroFix Co.",
    description: "Electrical installation and troubleshooting",
    address: "Birmingham, UK",
    average_rating: 4.5,
    is_verified: true,
  },
  {
    provider_id: 3,
    business_name: "HVAC Expert Solutions",
    description: "Air conditioning and heating systems",
    address: "Manchester, UK",
    average_rating: 4.7,
    is_verified: true,
  },
  {
    provider_id: 4,
    business_name: "CleanHome Services",
    description: "Home deep cleaning and sanitation",
    address: "Bristol, UK",
    average_rating: 4.6,
    is_verified: true,
  },
  {
    provider_id: 5,
    business_name: "Quick Maintenance",
    description: "General repairs and maintenance",
    address: "Edinburgh, UK",
    average_rating: 4.9,
    is_verified: true,
  },
];

// API Functions
export const bookingApi = {
  // Get all service packages (single and bundles)
  getPackages: async (): Promise<ServicePackage[]> => {
    try {
      const response = await api.get<ServicePackage[]>("/packages");
      return response.data;
    } catch (error) {
      console.warn("API call failed, using demo data for packages", error);
      return DEMO_PACKAGES;
    }
  },

  // Get all bundle packages
  getBundles: async (): Promise<BundlePackage[]> => {
    try {
      const response = await api.get<BundlePackage[]>("/packages/bundles");
      return response.data;
    } catch (error) {
      console.warn("API call failed for bundles", error);
      return [];
    }
  },

  // Get bundle details by ID
  getBundleDetails: async (packageId: number): Promise<BundlePackage> => {
    const response = await api.get<BundlePackage>(
      `/packages/${packageId}/bundle-details`
    );
    return response.data;
  },

  // Get all service providers
  getProviders: async (): Promise<ServiceProvider[]> => {
    try {
      const response = await api.get<ServiceProvider[]>("/providers");
      return response.data;
    } catch (error) {
      console.warn("API call failed, using demo data for providers", error);
      return DEMO_PROVIDERS;
    }
  },

  // Create a new booking
  createBooking: async (bookingData: BookingData): Promise<BookingResponse> => {
    try {
      const response = await api.post<BookingResponse>(
        "/bookings",
        bookingData
      );
      return response.data;
    } catch (error) {
      console.warn("API call failed, using mock booking response", error);
      // Return mock response for demo
      return {
        booking_id: Math.floor(Math.random() * 10000),
        booking_reference: `BK-${new Date()
          .toISOString()
          .split("T")[0]
          .replace(/-/g, "")}-${Math.floor(Math.random() * 100000)
          .toString()
          .padStart(6, "0")}`,
        booking_status: "pending",
      };
    }
  },

  // Get booking by ID
  getBooking: async (bookingId: number) => {
    const response = await api.get(`/bookings/${bookingId}`);
    return response.data;
  },
};

// Payment API
export const paymentApi = {
  // Create payment intent
  // SECURE: Only sends booking_id, backend calculates price from database
  createPaymentIntent: async (
    bookingId: number
  ): Promise<PaymentIntentResponse> => {
    const response = await api.post<PaymentIntentResponse>(
      "/payments/create-intent",
      {
        booking_id: bookingId,
      }
    );
    return response.data;
  },

  // Confirm payment
  // SECURE: Only sends booking_id and payment_intent_id, backend validates everything
  confirmPayment: async (
    bookingId: number,
    paymentIntentId: string
  ): Promise<PaymentConfirmationResponse> => {
    const response = await api.post<PaymentConfirmationResponse>(
      "/payments/confirm",
      {
        booking_id: bookingId,
        payment_intent_id: paymentIntentId,
      }
    );
    return response.data;
  },

  // Get payment by booking ID
  getPaymentByBooking: async (bookingId: number) => {
    const response = await api.get(`/payments/booking/${bookingId}`);
    return response.data;
  },

  // Get confirmation details by payment reference
  // SECURE: Backend validates payment_reference and returns all data from DB
  getConfirmationDetails: async (
    paymentReference: string
  ): Promise<ConfirmationDetails> => {
    const response = await api.get<ConfirmationDetails>(
      `/payments/confirmation/${encodeURIComponent(paymentReference)}`
    );
    return response.data;
  },
};

// Availability API
export const availabilityApi = {
  getAvailableSlots: async (
    packageId: number,
    date: string,
    providerId?: number
  ): Promise<AvailabilityResponse> => {
    const params = new URLSearchParams({
      package_id: packageId.toString(),
      date: date,
    });
    if (providerId) {
      params.append("provider_id", providerId.toString());
    }
    const response = await api.get<AvailabilityResponse>(
      `/availability/slots?${params}`
    );
    return response.data;
  },
};

// Inspection API
export const inspectionApi = {
  // Book a new inspection
  createInspection: async (
    data: InspectionBookingData
  ): Promise<Inspection> => {
    const response = await api.post<Inspection>("/inspections", data);
    return response.data;
  },

  // Get list of inspections for a user or provider
  getInspections: async (
    userId?: string,
    providerId?: number
  ): Promise<Inspection[]> => {
    const params = new URLSearchParams();
    if (userId) params.append("user_id", userId);
    if (providerId) params.append("provider_id", providerId.toString());

    const response = await api.get<Inspection[]>(
      `/inspections?${params.toString()}`
    );
    return response.data;
  },

  // Get detailed inspection with work items and bundle recommendations
  getInspectionDetails: async (
    inspectionId: number
  ): Promise<InspectionDetails> => {
    const response = await api.get<InspectionDetails>(
      `/inspections/${inspectionId}`
    );
    return response.data;
  },

  // Update inspection (mark complete, add notes, etc.)
  updateInspection: async (
    inspectionId: number,
    data: Partial<{
      inspection_status: "scheduled" | "completed" | "cancelled";
      inspection_notes: string;
      inspector_name: string;
    }>
  ): Promise<Inspection> => {
    const response = await api.put<Inspection>(
      `/inspections/${inspectionId}`,
      data
    );
    return response.data;
  },

  // Create a work item for an inspection
  createWorkItem: async (
    inspectionId: number,
    data: WorkItemData
  ): Promise<UrgentWorkItem> => {
    const response = await api.post<UrgentWorkItem>(
      `/inspections/${inspectionId}/work-items`,
      data
    );
    return response.data;
  },

  // Update a work item
  updateWorkItem: async (
    inspectionId: number,
    itemId: number,
    data: Partial<WorkItemData>
  ): Promise<UrgentWorkItem> => {
    const response = await api.put<UrgentWorkItem>(
      `/inspections/${inspectionId}/work-items/${itemId}`,
      data
    );
    return response.data;
  },

  // Delete a work item
  deleteWorkItem: async (
    inspectionId: number,
    itemId: number
  ): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(
      `/inspections/${inspectionId}/work-items/${itemId}`
    );
    return response.data;
  },
};

// Nearby Providers & Location API
export const locationApi = {
  // Search for nearby providers
  searchNearbyProviders: async (
    latitude: number,
    longitude: number,
    radius?: number,
    categoryId?: number
  ): Promise<NearbyProvidersResponse> => {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
    });
    if (radius) params.append("radius", radius.toString());
    if (categoryId) params.append("service_category_id", categoryId.toString());

    const response = await api.get<NearbyProvidersResponse>(
      `/nearby-providers?${params.toString()}`
    );
    return response.data;
  },

  // Get COVID restrictions for a location
  getCovidRestrictions: async (
    latitude: number,
    longitude: number
  ): Promise<CovidRestrictionsResponse> => {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
    });

    const response = await api.get<CovidRestrictionsResponse>(
      `/covid-restrictions?${params.toString()}`
    );
    return response.data;
  },
};

// User Consent API
export interface ConsentData {
  consent_id: number;
  user_id: string;
  consent_given: boolean;
  consent_date: string;
}

export interface ConsentSaveResponse {
  success: boolean;
  consent_id: number;
  consent_date: string;
  message: string;
}

export const consentApi = {
  // Save user consent
  saveConsent: async (
    userId: string,
    consentGiven: boolean
  ): Promise<ConsentSaveResponse> => {
    const response = await api.post<ConsentSaveResponse>("/consent", {
      user_id: userId,
      consent_given: consentGiven,
    });
    return response.data;
  },

  // Get user consent status
  getConsent: async (userId: string): Promise<ConsentData> => {
    const response = await api.get<ConsentData>(`/consent/${userId}`);
    return response.data;
  },
};

// ============================================================================
// Auth API - Authentication and Authorization
// ============================================================================

export interface UserSyncData {
  auth0_id: string;
  email: string;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  age?: number;
  mobile?: string;
  country_of_citizenship?: string;
  language_preferred?: string;
  covid_vaccination_status?: string;
}

export interface UserSyncResponse {
  message: string;
  event_type: "login" | "signup";
  user_id: string;
  login_count: number;
}

export interface UserProfile {
  user_id: string;
  email: string;
  name: string;
  given_name?: string;
  family_name?: string;
  nickname?: string;
  picture?: string;
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

export interface AuthHistoryEvent {
  event_type: string;
  timestamp: string;
  ip_address: string | null;
  details: Record<string, unknown>;
}

export interface AuthHistoryResponse {
  events: AuthHistoryEvent[];
}

export const authApi = {
  /**
   * Sync user data with backend (creates or updates user)
   * Called automatically on login via useAuthSync hook
   */
  syncUser: async (
    userData: UserSyncData,
    token: string
  ): Promise<UserSyncResponse> => {
    const response = await api.post<UserSyncResponse>("/auth/sync", userData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  /**
   * Get current user's profile including roles
   * Used by useUserRoles hook
   */
  getUserProfile: async (token: string): Promise<UserProfile> => {
    const response = await api.get<UserProfile>("/auth/user/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  /**
   * Get user's authentication history (login/signup events)
   */
  getAuthHistory: async (token: string): Promise<AuthHistoryResponse> => {
    const response = await api.get<AuthHistoryResponse>(
      "/auth/user/auth-history",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },
};

// ============================================================================
// ADMIN API TYPES
// ============================================================================

export interface SystemStats {
  total_users: number;
  total_bookings: number;
  active_bookings: number;
  total_revenue: number;
  users_by_role: Record<string, number>;
  active_users_7_days: number;
}

export interface AdminUser {
  user_id: string;
  auth0_id: string;
  email: string;
  name: string;
  email_verified: boolean;
  created_at: string;
  last_login: string;
  roles: string[];
  metadata: Record<string, unknown>;
}

export interface UsersResponse {
  users: AdminUser[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface AuditLog {
  log_id: number;
  log_type: string;
  action: string;
  action_details: Record<string, unknown>;
  severity: string;
  ip_address: string | null;
  created_at: string;
  user_email: string | null;
  user_name: string | null;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
}

export interface AssignRoleRequest {
  role_name: string;
}

export interface AssignRoleResponse {
  message: string;
  role: string;
}

export interface RemoveRoleResponse {
  message: string;
}

export interface Provider {
  provider_id: number;
  business_name: string;
  description: string;
  address: string;
  average_rating: number;
  is_verified: boolean;
  is_active: boolean;
  contact_email: string;
  contact_name: string;
}

export interface ProvidersResponse {
  providers: Provider[];
}

// ============================================================================
// ADMIN API FUNCTIONS
// ============================================================================

/**
 * Admin API - Functions for admin-only operations
 * All functions require admin role and valid access token
 */
export const adminApi = {
  /**
   * Get system overview statistics
   * Requires: admin role
   */
  getSystemStats: async (token: string): Promise<SystemStats> => {
    const response = await api.get<SystemStats>("/admin/stats/overview", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  /**
   * Get all users with pagination
   * Requires: admin role
   */
  getUsers: async (
    token: string,
    page: number = 1,
    perPage: number = 20
  ): Promise<UsersResponse> => {
    const response = await api.get<UsersResponse>(
      `/admin/users?page=${page}&per_page=${perPage}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Assign a role to a user
   * Requires: admin role
   */
  assignRole: async (
    token: string,
    userId: string,
    roleName: string
  ): Promise<AssignRoleResponse> => {
    const response = await api.post<AssignRoleResponse>(
      `/admin/users/${userId}/roles`,
      { role_name: roleName },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Remove a role from a user
   * Requires: admin role
   */
  removeRole: async (
    token: string,
    userId: string,
    roleName: string
  ): Promise<RemoveRoleResponse> => {
    const response = await api.delete<RemoveRoleResponse>(
      `/admin/users/${userId}/roles/${roleName}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Get audit logs with optional filters
   * Requires: admin role
   */
  getAuditLogs: async (
    token: string,
    options?: {
      logType?: string;
      severity?: string;
      page?: number;
      perPage?: number;
    }
  ): Promise<AuditLogsResponse> => {
    const params = new URLSearchParams();
    if (options?.logType) params.append("log_type", options.logType);
    if (options?.severity) params.append("severity", options.severity);
    if (options?.page) params.append("page", options.page.toString());
    if (options?.perPage) params.append("per_page", options.perPage.toString());

    const response = await api.get<AuditLogsResponse>(
      `/admin/audit-logs?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Get all service providers
   * Requires: admin or provider role
   */
  getProviders: async (token: string): Promise<ProvidersResponse> => {
    const response = await api.get<ProvidersResponse>("/admin/providers", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
};
