const express = require('express');
const router = express.Router();

const reservationController = require('../controllers/reservationController');
const reservationRequestController = require('../controllers/reservationRequestController');

const { requireAuth } = require('../middleware/authMiddleware');

const {
  requireRole,
  requireRestaurantScopeById
} = require('../middleware/authorization');

// Reservation endpoints

// Create reservation - authenticated user
router.post(
  '/restaurant/:restaurantId/reservations',
  requireAuth,
  reservationController.createReservation
);

// Reservations by restaurant - authenticated authorized restaurant admin or mainAdmin
router.get(
  '/restaurant/:restaurantId/reservations',
  requireAuth,
  requireRole('admin', 'mainAdmin'),
  requireRestaurantScopeById('restaurantId'),
  reservationController.getReservationsByRestaurant
);

// Customer reservation retrieval
// Authentication is Member 1 scope.
// Ownership / IDOR protection remains authorization scope.
router.get(
  '/reservations',
  requireAuth,
  reservationController.getReservationsByUserEmail
);

router.get(
  '/reservations/:reservationId',
  requireAuth,
  reservationController.getReservationById
);

// Reservation modification - authenticated authorized restaurant admin or mainAdmin
router.patch(
  '/reservations/:reservationId/modify',
  requireAuth,
  requireRole('admin', 'mainAdmin'),
  reservationController.modifyReservation
);

// Reservation status update - authenticated authorized restaurant admin or mainAdmin
router.patch(
  '/reservations/:reservationId',
  requireAuth,
  requireRole('admin', 'mainAdmin'),
  reservationController.updateReservationStatus
);

// Reservation request endpoints

router.post(
  '/reservation-requests',
  requireAuth,
  reservationRequestController.createReservationRequest
);

router.post(
  '/restaurant/:restaurantId/reservation-requests',
  requireAuth,
  reservationRequestController.createReservationRequest
);

// Reservation requests by restaurant - authenticated authorized restaurant admin or mainAdmin
router.get(
  '/restaurant/:restaurantId/reservation-requests',
  requireAuth,
  requireRole('admin', 'mainAdmin'),
  requireRestaurantScopeById('restaurantId'),
  reservationRequestController.getReservationRequestsByRestaurant
);

// Customer reservation requests listing
router.get(
  '/reservation-requests',
  requireAuth,
  reservationRequestController.getReservationRequestsByUserEmail
);

// Reservation request approval/rejection - authenticated authorized restaurant admin or mainAdmin
router.patch(
  '/reservation-requests/:requestId',
  requireAuth,
  requireRole('admin', 'mainAdmin'),
  reservationRequestController.updateReservationRequestStatus
);

module.exports = router;