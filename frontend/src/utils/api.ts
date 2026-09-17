import axios from 'axios';
import { Reservation } from '@/types';

const API_URL = 'http://localhost:5000';

/**
 * Fetch a specific reservation by its ID
 * @param reservationId The ID of the reservation to fetch
 * @returns The reservation data
 */
export const getReservationById = async (reservationId: string): Promise<Reservation> => {
  try {
    const response = await axios.get<Reservation>(`${API_URL}/api/reservations/${reservationId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching reservation:', error);
    throw error;
  }
};

/**
 * Fetch all reservations for a user by email
 * @param userEmail The email of the user
 * @returns Array of reservations
 */
export const getReservationsByUserEmail = async (userEmail: string): Promise<Reservation[]> => {
  try {
    const response = await axios.get<Reservation[]>(`${API_URL}/api/reservations?userEmail=${userEmail}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user reservations:', error);
    throw error;
  }
};

/**
 * Fetch all reservations for a restaurant
 * @param restaurantId The ID of the restaurant
 * @returns Array of reservations
 */
export const getReservationsByRestaurant = async (restaurantId: string): Promise<Reservation[]> => {
  try {
    const response = await axios.get<Reservation[]>(`${API_URL}/api/restaurant/${restaurantId}/reservations`);
    return response.data;
  } catch (error) {
    console.error('Error fetching restaurant reservations:', error);
    throw error;
  }
};
