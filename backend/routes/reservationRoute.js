const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const reservationRequestController = require('../controllers/reservationRequestController');

const {
  requireRole,
  requireRestaurantScopeById
} = require('../middleware/authorization');

// Reservation endpoints
router.post('/restaurant/:restaurantId/reservations', reservationController.createReservation);

// Reservations by restaurant - restricted to authorized restaurant admin or mainAdmin
router.get(
  '/restaurant/:restaurantId/reservations',
  requireRole('admin', 'mainAdmin'),
  requireRestaurantScopeById('restaurantId'),
  reservationController.getReservationsByRestaurant
);

// Customer reservation retrieval (V04 scope)
router.get('/reservations', reservationController.getReservationsByUserEmail);
router.get('/reservations/:reservationId', reservationController.getReservationById);

// Reservation modification - restricted to authorized restaurant admin or mainAdmin
router.patch(
  '/reservations/:reservationId/modify',
  requireRole('admin', 'mainAdmin'),
  reservationController.modifyReservation
);

// Reservation status update - administrative action restricted to authorized restaurant admin or mainAdmin
router.patch(
  '/reservations/:reservationId',
  requireRole('admin', 'mainAdmin'),
  reservationController.updateReservationStatus
);

// Reservation request endpoints (modification/cancellation)
router.post('/reservation-requests', reservationRequestController.createReservationRequest);
router.post('/restaurant/:restaurantId/reservation-requests', reservationRequestController.createReservationRequest);

// Reservation requests by restaurant - restricted to authorized restaurant admin or mainAdmin
router.get(
  '/restaurant/:restaurantId/reservation-requests',
  requireRole('admin', 'mainAdmin'),
  requireRestaurantScopeById('restaurantId'),
  reservationRequestController.getReservationRequestsByRestaurant
);

// Customer reservation requests listing (by user email query)
router.get('/reservation-requests', reservationRequestController.getReservationRequestsByUserEmail);

// Reservation request approval/rejection - restricted to authorized restaurant admin or mainAdmin
router.patch(
  '/reservation-requests/:requestId',
  requireRole('admin', 'mainAdmin'),
  reservationRequestController.updateReservationRequestStatus
);

module.exports = router;
