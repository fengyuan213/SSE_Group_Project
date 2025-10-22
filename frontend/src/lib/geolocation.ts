/**
 * Geolocation Service
 * Handles browser geolocation and Australian postcode-to-coordinates conversion
 */

export interface GeolocationResult {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

// Australian major city postcodes with coordinates (for demo/fallback)
const AUSTRALIAN_POSTCODES: { [key: string]: GeolocationResult } = {
  // Sydney
  "2000": { latitude: -33.8688, longitude: 151.2093 }, // Sydney CBD
  "2010": { latitude: -33.8819, longitude: 151.2003 }, // Surry Hills
  "2060": { latitude: -33.82, longitude: 151.1833 }, // North Sydney

  // Melbourne
  "3000": { latitude: -37.8136, longitude: 144.9631 }, // Melbourne CBD
  "3004": { latitude: -37.831, longitude: 144.9631 }, // St Kilda
  "3053": { latitude: -37.7964, longitude: 144.9631 }, // Carlton

  // Brisbane
  "4000": { latitude: -27.4698, longitude: 153.0251 }, // Brisbane CBD
  "4006": { latitude: -27.4544, longitude: 153.0356 }, // Fortitude Valley

  // Adelaide (updated to match user's location)
  "5000": { latitude: -34.9285, longitude: 138.6007 }, // Adelaide CBD
  "5006": { latitude: -34.9058, longitude: 138.5965 }, // North Adelaide
  "5045": { latitude: -34.9797, longitude: 138.5141 }, // Glenelg
  "5067": { latitude: -34.919, longitude: 138.6289 }, // Norwood
  "5022": { latitude: -34.9201, longitude: 138.4972 }, // Henley Beach

  // Perth
  "6000": { latitude: -31.9505, longitude: 115.8605 }, // Perth CBD
  "6004": { latitude: -31.9559, longitude: 115.8585 }, // East Perth

  // Canberra
  "2600": { latitude: -35.2809, longitude: 149.13 }, // Canberra CBD

  // Gold Coast
  "4217": { latitude: -28.0167, longitude: 153.4 }, // Surfers Paradise

  // Newcastle
  "2300": { latitude: -32.9283, longitude: 151.7817 }, // Newcastle
};

/**
 * Get user's current location using browser geolocation API
 */
export const getCurrentPosition = (): Promise<GeolocationResult> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({
        code: 0,
        message: "Geolocation is not supported by this browser",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let message = "Unknown error occurred";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message =
              "Location permission denied. Please enter your postcode instead.";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Location information is unavailable";
            break;
          case error.TIMEOUT:
            message = "Location request timed out";
            break;
        }
        reject({
          code: error.code,
          message,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};

/**
 * Convert Australian postcode to coordinates
 * Uses Google Geocoding API if available, otherwise falls back to hardcoded data
 */
export const geocodePostcode = async (
  postcode: string
): Promise<GeolocationResult> => {
  // Validate Australian postcode format (4 digits)
  const postcodeRegex = /^\d{4}$/;
  if (!postcodeRegex.test(postcode)) {
    throw new Error("Please enter a valid 4-digit Australian postcode");
  }

  // Try Google Geocoding API if API key is available
  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (
    googleApiKey &&
    googleApiKey !== "" &&
    googleApiKey !== "your_api_key_here"
  ) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${postcode},Australia&key=${googleApiKey}`
      );
      const data = await response.json();

      if (data.status === "OK" && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return {
          latitude: location.lat,
          longitude: location.lng,
        };
      } else if (data.status === "ZERO_RESULTS") {
        // Fall back to hardcoded data
        console.warn("Google API returned no results, using fallback data");
      } else {
        console.warn("Google Geocoding API error:", data.status);
      }
    } catch (error) {
      console.warn("Error calling Google Geocoding API:", error);
    }
  }

  // Fallback: Use hardcoded postcode data
  const coordinates = AUSTRALIAN_POSTCODES[postcode];
  if (coordinates) {
    return coordinates;
  }

  throw new Error(
    `Postcode ${postcode} not found. Please try a major city postcode or use your current location.`
  );
};

/**
 * Check if browser supports geolocation
 */
export const isGeolocationSupported = (): boolean => {
  return "geolocation" in navigator;
};
