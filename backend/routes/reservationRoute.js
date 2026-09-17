const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const reservationRequestController = require('../controllers/reservationRequestController');

// Reservation endpoints
router.post('/restaurant/:restaurantId/reservations', reservationController.createReservation);
router.get('/restaurant/:restaurantId/reservations', reservationController.getReservationsByRestaurant);
router.get('/reservations', reservationController.getReservationsByUserEmail); // Get reservations by user email
router.get('/reservations/:reservationId', reservationController.getReservationById); // Get a specific reservation by ID
router.patch('/reservations/:reservationId', reservationController.updateReservationStatus);
// PATCH endpoint for modifying reservation details and setting status to 'modified'
router.patch('/reservations/:reservationId/modify', reservationController.modifyReservation);

// Reservation request endpoints (modification/cancellation)
router.post('/restaurant/:restaurantId/reservation-requests', reservationRequestController.createReservationRequest);
router.post('/restaurant/:reservationId/reservation-requests', reservationRequestController.createReservationRequest); // New endpoint for direct reservation requests
router.get('/restaurant/:restaurantId/reservation-requests', reservationRequestController.getReservationRequestsByRestaurant);
router.get('/reservation-requests', reservationRequestController.getReservationRequestsByUserEmail); // Endpoint to get requests by user email
router.patch('/reservation-requests/:requestId', reservationRequestController.updateReservationRequestStatus);

module.exports = router;
