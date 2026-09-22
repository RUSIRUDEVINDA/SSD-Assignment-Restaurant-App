import axios from 'axios';
import { Reservation } from '@/types';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

type TokenGetter = () => Promise<string | null>;
let globalTokenGetter: TokenGetter | null = null;

/**
 * Register a token getter function (from Auth0 getAccessTokenSilently).
 * Allows API utilities and axios calls to attach the Bearer token without manual token persistence.
 */
export const setAuthTokenGetter = (getter: TokenGetter) => {
  globalTokenGetter = getter;
};

/**
 * Helper to obtain authorization headers for API requests.
 */
export const getAuthHeaders = async (explicitToken?: string): Promise<Record<string, string>> => {
  const token = explicitToken || (globalTokenGetter ? await globalTokenGetter() : null);
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};

// Global axios request interceptor to automatically attach Bearer token to backend API requests
axios.interceptors.request.use(async (config) => {
  const isApiTarget = config.url && (
    config.url.startsWith(API_URL) ||
    config.url.startsWith('/api') ||
    config.url.startsWith('http://localhost:5000')
  );

  if (isApiTarget && globalTokenGetter && !config.headers.Authorization) {
    try {
      const token = await globalTokenGetter();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Continue without token if user is unauthenticated
    }
  }
  return config;
});

/**
 * Fetch a specific reservation by its ID
 * @param reservationId The ID of the reservation to fetch
 * @param token Optional Auth0 access token
 * @returns The reservation data
 */
export const getReservationById = async (reservationId: string, token?: string): Promise<Reservation> => {
  try {
    const headers = await getAuthHeaders(token);
    const response = await axios.get<Reservation>(`${API_URL}/api/reservations/${reservationId}`, { headers });
    return response.data;
  } catch (error) {
    console.error('Error fetching reservation:', error);
    throw error;
  }
};

/**
 * Fetch all reservations for a user by email
 * @param userEmail The email of the user
 * @param token Optional Auth0 access token
 * @returns Array of reservations
 */
export const getReservationsByUserEmail = async (userEmail: string, token?: string): Promise<Reservation[]> => {
  try {
    const headers = await getAuthHeaders(token);
    const response = await axios.get<Reservation[]>(`${API_URL}/api/reservations?userEmail=${userEmail}`, { headers });
    return response.data;
  } catch (error) {
    console.error('Error fetching user reservations:', error);
    throw error;
  }
};

/**
 * Fetch all reservations for a restaurant
 * @param restaurantId The ID of the restaurant
 * @param token Optional Auth0 access token
 * @returns Array of reservations
 */
export const getReservationsByRestaurant = async (restaurantId: string, token?: string): Promise<Reservation[]> => {
  try {
    const headers = await getAuthHeaders(token);
    const response = await axios.get<Reservation[]>(`${API_URL}/api/restaurant/${restaurantId}/reservations`, { headers });
    return response.data;
  } catch (error) {
    console.error('Error fetching restaurant reservations:', error);
    throw error;
  }
};
