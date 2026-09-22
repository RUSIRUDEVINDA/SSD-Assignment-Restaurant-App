const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const reservationRequestController = require('../controllers/reservationRequestController');
const { requireAuth } = require('../middleware/authMiddleware');

// Reservation endpoints (protected by authentication - Member 1 scope)
router.post('/restaurant/:restaurantId/reservations', requireAuth, reservationController.createReservation);
router.get('/restaurant/:restaurantId/reservations', requireAuth, reservationController.getReservationsByRestaurant);
router.get('/reservations', requireAuth, reservationController.getReservationsByUserEmail); // Get reservations by user email
router.get('/reservations/:reservationId', requireAuth, reservationController.getReservationById); // Get a specific reservation by ID
router.patch('/reservations/:reservationId', requireAuth, reservationController.updateReservationStatus);
// PATCH endpoint for modifying reservation details and setting status to 'modified'
router.patch('/reservations/:reservationId/modify', requireAuth, reservationController.modifyReservation);

// Reservation request endpoints (modification/cancellation)
router.post('/restaurant/:restaurantId/reservation-requests', requireAuth, reservationRequestController.createReservationRequest);
router.post('/restaurant/:reservationId/reservation-requests', requireAuth, reservationRequestController.createReservationRequest); // New endpoint for direct reservation requests
router.get('/restaurant/:restaurantId/reservation-requests', requireAuth, reservationRequestController.getReservationRequestsByRestaurant);
router.get('/reservation-requests', requireAuth, reservationRequestController.getReservationRequestsByUserEmail); // Endpoint to get requests by user email
router.patch('/reservation-requests/:requestId', requireAuth, reservationRequestController.updateReservationRequestStatus);

module.exports = router;
