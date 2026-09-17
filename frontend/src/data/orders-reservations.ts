import { Order, Reservation, ReservationRequest } from "../types";

// Mock orders
export const orders: Order[] = [
  {
    id: "order-1",
    userId: "customer1",
    restaurantId: "1",
    items: [
      { menuItemId: "1-item-1", name: "Cappuccino", price: 4.95, quantity: 2 },
      { menuItemId: "1-item-5", name: "Croissant", price: 3.25, quantity: 1 }
    ],
    status: "completed",
    total: 13.15,
    pickupTime: "2023-12-01T08:30:00Z",
    createdAt: "2023-12-01T08:00:00Z",
    customerInfo: {
      name: "John Smith",
      email: "customer@example.com",
      phone: "555-123-4567"
    }
  },
  {
    id: "order-2",
    userId: "customer1",
    restaurantId: "2",
    items: [
      { menuItemId: "2-item-1", name: "Classic Cheeseburger", price: 8.95, quantity: 1 },
      { menuItemId: "2-item-4", name: "French Fries", price: 3.95, quantity: 1 }
    ],
    status: "processing",
    total: 12.90,
    pickupTime: "2023-12-05T12:15:00Z",
    createdAt: "2023-12-05T11:45:00Z",
    customerInfo: {
      name: "John Smith",
      email: "customer@example.com",
      phone: "555-123-4567"
    }
  },
  {
    id: "order-3",
    userId: "customer1",
    restaurantId: "3",
    items: [
      { menuItemId: "3-item-2", name: "Double Whopper", price: 10.99, quantity: 1 },
      { menuItemId: "3-item-5", name: "Onion Rings", price: 4.49, quantity: 1 },
      { menuItemId: "3-item-8", name: "Chocolate Shake", price: 3.99, quantity: 1 }
    ],
    status: "completed",
    total: 19.47,
    pickupTime: "2023-12-10T18:45:00Z",
    createdAt: "2023-12-10T18:15:00Z",
    customerInfo: {
      name: "John Smith",
      email: "customer@example.com",
      phone: "555-123-4567"
    }
  }
];

// Mock reservations
export const reservations: Reservation[] = [
  {
    id: "res-1",
    userId: "customer1",
    restaurantId: "1",
    tableId: "table-1-2",
    seats: ["seat-1-2-1", "seat-1-2-2"],
    date: "2023-12-10",
    time: "09:00",
    status: "confirmed",
    customerInfo: {
      name: "John Smith",
      email: "customer@example.com",
      phone: "555-123-4567"
    }
  },
  {
    id: "res-2",
    userId: "customer1",
    restaurantId: "2",
    tableId: "table-2-1",
    seats: ["seat-2-1-1", "seat-2-1-2"],
    date: "2023-12-15",
    time: "18:30",
    status: "confirmed",
    customerInfo: {
      name: "John Smith",
      email: "customer@example.com",
      phone: "555-123-4567"
    }
  },
  {
    id: "res-3",
    userId: "customer1",
    restaurantId: "4",
    tableId: "table-4-3",
    seats: ["seat-4-3-1", "seat-4-3-2", "seat-4-3-3", "seat-4-3-4"],
    date: "2023-12-20",
    time: "14:00",
    status: "confirmed",
    customerInfo: {
      name: "John Smith",
      email: "customer@example.com",
      phone: "555-123-4567"
    }
  },
  {
    id: "res-4",
    userId: "customer1",
    restaurantId: "3",
    tableId: "table-3-2",
    seats: ["seat-3-2-1", "seat-3-2-2"],
    date: "2023-12-22",
    time: "12:30",
    status: "confirmed",
    customerInfo: {
      name: "John Smith",
      email: "customer@example.com",
      phone: "555-123-4567"
    }
  },
  {
    id: "res-5",
    userId: "customer1",
    restaurantId: "5",
    tableId: "table-5-1",
    seats: ["seat-5-1-1", "seat-5-1-2", "seat-5-1-3"],
    date: "2023-12-28",
    time: "17:00",
    status: "confirmed",
    customerInfo: {
      name: "John Smith",
      email: "customer@example.com",
      phone: "555-123-4567"
    }
  },
  {
    id: "res-6",
    userId: "customer1",
    restaurantId: "6",
    tableId: "table-6-2",
    seats: ["seat-6-2-1", "seat-6-2-2"],
    date: "2024-01-05",
    time: "19:30",
    status: "confirmed",
    customerInfo: {
      name: "John Smith",
      email: "customer@example.com",
      phone: "555-123-4567"
    }
  }
];

// Mock reservation requests
export const reservationRequests: ReservationRequest[] = [
  // Modification requests
  {
    id: "req-1",
    reservationId: "res-1",
    type: "modification",
    requestDetails: "Would like to change the reservation time due to a flight delay.",
    newDate: "2023-12-10",
    newTime: "10:30",
    status: "pending",
    createdAt: "2023-12-07T14:25:00Z"
  },
  {
    id: "req-3",
    reservationId: "res-3",
    type: "modification",
    requestDetails: "Need to add one more person to our reservation.",
    newDate: "2023-12-20",
    newTime: "14:30",
    status: "approved",
    createdAt: "2023-12-15T10:15:00Z"
  },
  {
    id: "req-5",
    reservationId: "res-5",
    type: "modification",
    requestDetails: "Would like to move the reservation one hour earlier if possible.",
    newDate: "2023-12-28",
    newTime: "16:00",
    status: "rejected",
    createdAt: "2023-12-22T09:45:00Z"
  },
  {
    id: "req-8",
    reservationId: "res-6",
    type: "modification",
    requestDetails: "We need to change our reservation to a later time due to a flight delay.",
    newDate: "2024-01-05",
    newTime: "20:30",
    status: "pending",
    createdAt: "2024-01-03T16:10:00Z"
  },
  {
    id: "req-9",
    reservationId: "res-2",
    type: "modification",
    requestDetails: "We'd like to add two more guests to our reservation, total of 4 people now.",
    newDate: "2023-12-15",
    newTime: "18:30",
    status: "pending",
    createdAt: "2023-12-13T11:25:00Z"
  },
  
  // Cancellation requests
  {
    id: "req-2",
    reservationId: "res-2",
    type: "cancellation",
    requestDetails: "Need to cancel due to change in travel plans.",
    status: "pending",
    createdAt: "2023-12-12T09:15:00Z"
  },
  {
    id: "req-4",
    reservationId: "res-4",
    type: "cancellation",
    requestDetails: "Unfortunately I need to cancel my reservation due to a medical emergency.",
    status: "approved",
    createdAt: "2023-12-18T16:30:00Z"
  },
  {
    id: "req-6",
    reservationId: "res-1",
    type: "cancellation",
    requestDetails: "Flight has been cancelled, so I need to cancel my dining reservation.",
    status: "pending",
    createdAt: "2023-12-09T08:45:00Z"
  },
  {
    id: "req-7",
    reservationId: "res-3",
    type: "cancellation",
    requestDetails: "My connecting flight is delayed, and I won't be able to make it.",
    status: "rejected",
    createdAt: "2023-12-19T12:15:00Z"
  },
  {
    id: "req-10",
    reservationId: "res-6",
    type: "cancellation",
    requestDetails: "Unfortunately our flight has been rescheduled and we won't be able to make this reservation.",
    status: "pending",
    createdAt: "2024-01-04T09:30:00Z"
  },
  {
    id: "req-11",
    reservationId: "res-5",
    type: "cancellation",
    requestDetails: "We had an unexpected change in plans and need to cancel our dining reservation.",
    status: "pending",
    createdAt: "2023-12-26T14:20:00Z"
  }
];

export const getOrdersByUser = (userId: string): Order[] => {
  return orders.filter(order => order.userId === userId);
};

export const getOrdersByRestaurant = (restaurantId: string): Order[] => {
  return orders.filter(order => order.restaurantId === restaurantId);
};

export const getReservationsByUser = (userId: string): Reservation[] => {
  return reservations.filter(res => res.userId === userId);
};

export const getReservationsByRestaurant = (restaurantId: string): Reservation[] => {
  return reservations.filter(res => res.restaurantId === restaurantId);
};

export const getReservationRequestsByUser = (userId: string): ReservationRequest[] => {
  const userReservations = getReservationsByUser(userId);
  const userReservationIds = userReservations.map(res => res.id);
  return reservationRequests.filter(req => userReservationIds.includes(req.reservationId));
};

export const getReservationRequestsByRestaurant = (restaurantId: string): ReservationRequest[] => {
  const restaurantReservations = getReservationsByRestaurant(restaurantId);
  const restaurantReservationIds = restaurantReservations.map(res => res.id);
  return reservationRequests.filter(req => restaurantReservationIds.includes(req.reservationId));
};

// Get requests by type (modification or cancellation)
export const getRequestsByType = (requests: ReservationRequest[], type: "modification" | "cancellation"): ReservationRequest[] => {
  return requests.filter(req => req.type === type);
};

// Get requests by status
export const getRequestsByStatus = (requests: ReservationRequest[], status: "pending" | "approved" | "rejected"): ReservationRequest[] => {
  return requests.filter(req => req.status === status);
};

// Get request by ID
export const getRequestById = (requestId: string): ReservationRequest | undefined => {
  return reservationRequests.find(req => req.id === requestId);
};
