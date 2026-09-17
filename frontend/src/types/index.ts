// Restaurant Types
export interface Restaurant {
  logo: any;
  id: string;
  name: string;
  category: string;
  terminal: string;
  description: string;
  location: {
    shopNumber: string;
    mapUrl: string; // Google Maps URL
  };
  contact: {
    phone: string;
    email: string;
  };
  hours: {
    open: string;
    close: string;
    days: string;
  };
  images: string[];
  hasReservation: boolean;
  adminId: string;
}

// Menu Types
export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  isSpecial: boolean;
  isSeasonal: boolean;
}

// Cart Types
export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  restaurantId: string | null;
  pickupTime: string | null;
}

// Order Types
export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface OrderData {
  _id: string;
  restaurantName: string;
  itemsPurchased: OrderItem[];
  totalAmount: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  pickupTime: string;
  createdAt: string;
  status?: 'confirmed' | 'processing' | 'ready for pickup' | 'pending' | 'cancelled' | 'picked up' | 'completed';
  modifiedAt?: string | null;
}

export interface Order {
  id: string;
  userId: string;
  restaurantId: string;
  items: {
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  status: 'processing' | 'ready' | 'completed' | 'cancelled';
  total: number;
  pickupTime: string;
  createdAt: string;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
  };
}

// Reservation Types
export interface Seat {
  id: string;
  tableId: string;
  number: number;
  isAvailable: boolean;
}

export interface Table {
  id: string;
  restaurantId: string;
  number: number;
  capacity: number;
  seats: Seat[];
}

export interface Reservation {
  id?: string;
  _id?: string; // MongoDB returns _id instead of id
  userId: string;
  restaurantId: string;
  tableId: string;
  seats?: string[]; // Seat IDs
  date: string;
  time: string;
  status: ReservationStatus;
  // Direct customer properties from MongoDB
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  partySize?: number;
  restaurantName?: string; // Added for storing restaurant name directly
  // Legacy customerInfo object
  customerInfo?: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface ReservationRequest {
  id?: string;
  _id?: string; // MongoDB returns _id instead of id
  reservationId: string;
  type: 'modification' | 'cancellation';
  requestDetails: string;
  newDate?: string;
  newTime?: string;
  newPartySize?: number; // Added for party size modifications
  newSeats?: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  restaurantName?: string; // Added to support displaying restaurant name in admin panel
  customerName?: string; // Added to support displaying customer name when reservation is deleted
}

// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'customer' | 'admin' | 'mainAdmin';
  restaurantId?: string; // If admin
}

// Auth Types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
