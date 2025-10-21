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
