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

// Demo data
const DEMO_PACKAGES: ServicePackage[] = [
  {
    package_id: 1,
    package_name: "Basic Plumbing Inspection",
    description: "Comprehensive plumbing inspection",
    base_price: 150.0,
    duration_minutes: 60,
    category_name: "Plumbing",
    category_id: 1,
  },
  {
    package_id: 2,
    package_name: "Emergency Leak Repair",
    description: "Urgent leak repair service",
    base_price: 300.0,
    duration_minutes: 120,
    category_name: "Plumbing",
    category_id: 1,
  },
  {
    package_id: 3,
    package_name: "Electrical Safety Check",
    description: "Full electrical safety inspection",
    base_price: 200.0,
    duration_minutes: 90,
    category_name: "Electrical",
    category_id: 2,
  },
  {
    package_id: 4,
    package_name: "AC Maintenance",
    description: "Air conditioning service and maintenance",
    base_price: 180.0,
    duration_minutes: 90,
    category_name: "HVAC",
    category_id: 3,
  },
  {
    package_id: 5,
    package_name: "Heating System Tune-up",
    description: "Full service for heating units",
    base_price: 260.0,
    duration_minutes: 120,
    category_name: "HVAC",
    category_id: 3,
  },
  {
    package_id: 6,
    package_name: "Full Home Maintenance",
    description: "Complete home check-up and repair",
    base_price: 500.0,
    duration_minutes: 240,
    category_name: "General Maintenance",
    category_id: 4,
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
  // Get all service packages
  getPackages: async (): Promise<ServicePackage[]> => {
    try {
      const response = await api.get<ServicePackage[]>("/packages");
      return response.data;
    } catch (error) {
      console.warn("API call failed, using demo data for packages", error);
      return DEMO_PACKAGES;
    }
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
