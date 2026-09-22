const mongoose = require('mongoose');
const ReservationRequest = require('../models/reservationRequestModel');
const Reservation = require('../models/reservationModel');
const { isUserInRestaurantScope } = require('../utils/restaurantMapping');

// Create a new modification or cancellation request
exports.createReservationRequest = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { 
      reservationId, 
      type, 
      newTime, 
      newDate, 
      newPartySize, 
      requestDetails 
    } = req.body;
    
    console.log('[Reservation Request] Creating new request:', req.body);
    
    // Get the reservation to get the restaurant ID and other details
    let reservation;
    try {
      reservation = await Reservation.findById(reservationId);
      if (!reservation) {
        console.log('[Reservation Request] Reservation not found with ID:', reservationId);
        return res.status(404).json({ error: 'Reservation not found' });
      }
      console.log('[Reservation Request] Found reservation:', {
        id: reservation._id,
        restaurantId: reservation.restaurantId,
        restaurantName: reservation.restaurantName
      });
    } catch (err) {
      console.error('[Reservation Request] Error finding reservation:', err);
      return res.status(404).json({ error: 'Invalid reservation ID format' });
    }
    
    const request = new ReservationRequest({
      reservationId,
      restaurantId: reservation.restaurantId,
      restaurantName: reservation.restaurantName || 'Restaurant',
      type,
      newTime,
      newDate,
      newPartySize,
      requestDetails,
      status: 'pending',
      createdAt: new Date()
    });
    
    await request.save();
    console.log('[Reservation Request] Request created successfully:', request);
    res.status(201).json(request);
  } catch (err) {
    console.error('[Reservation Request Error]', err);
    res.status(500).json({ error: err.message });
  }
};

// Get all reservation requests for a restaurant
exports.getReservationRequestsByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    console.log('[Reservation Request] Fetching requests for restaurant ID:', restaurantId);
    
    if (!restaurantId) {
      return res.status(400).json({ error: 'Restaurant ID is required' });
    }
    
    // First, find all reservations for this specific restaurant
    const restaurantReservations = await Reservation.find({ restaurantId: restaurantId });
    console.log(`[Reservation Request] Found ${restaurantReservations.length} reservations for restaurant ${restaurantId}`);
    
    if (restaurantReservations.length === 0) {
      return res.json([]);
    }
    
    // Extract reservation IDs (both ObjectId and string representations)
    const reservationIds = [];
    restaurantReservations.forEach(reservation => {
      if (reservation._id) {
        reservationIds.push(reservation._id);
        reservationIds.push(reservation._id.toString());
      }
      if (reservation.id) {
        reservationIds.push(reservation.id);
      }
    });
    
    console.log(`[Reservation Request] Looking for requests with reservationIds for restaurant ${restaurantId}`);
    
    // Find only requests for this restaurant's reservations
    const requests = await ReservationRequest.find({ reservationId: { $in: reservationIds } });
    console.log(`[Reservation Request] Found ${requests.length} requests for restaurant ${restaurantId}`);
    
    res.json(requests);
  } catch (err) {
    console.error('[Reservation Request Error]', err);
    res.status(500).json({ error: err.message });
  }
};

// Approve or reject a reservation request
exports.updateReservationRequestStatus = async (req, res) => {
  try {
    const requestId = req.params.requestId || req.params.id;
    const { status } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid status. Must be "approved" or "rejected".' });
    }

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid request ID format' });
    }

    const request = await ReservationRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Not Found', message: 'Reservation request not found' });
    }

    // Prevent repeated or contradictory processing
    if (request.status !== 'pending') {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Reservation request has already been processed with status: ${request.status}`
      });
    }

    // Resolve parent reservation to verify restaurant scope authoritatively
    const reservation = await Reservation.findById(request.reservationId);
    if (!reservation) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Parent reservation not found; operation denied without mutation.'
      });
    }

    // Scope verification against parent reservation's restaurant
    if (!isUserInRestaurantScope(req.user, { restaurantId: reservation.restaurantId, restaurantName: reservation.restaurantName })) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: parent reservation belongs to a different restaurant.'
      });
    }

    // Concurrency-safe atomic state transition: only transition if still pending
    const updatedRequest = await ReservationRequest.findOneAndUpdate(
      { _id: requestId, status: 'pending' },
      { $set: { status, updatedAt: Date.now() } },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Reservation request was already processed concurrently'
      });
    }

    // If approved and it's a cancellation, delete the reservation from the database
    if (status === 'approved' && updatedRequest.type === 'cancellation') {
      console.log(`[Reservation Request] Deleting reservation: ${updatedRequest.reservationId}`);
      await Reservation.findByIdAndDelete(updatedRequest.reservationId);
    }

    // If approved and it's a modification, set parent reservation status to 'approved' (matching original workflow)
    if (status === 'approved' && updatedRequest.type === 'modification') {
      await Reservation.findByIdAndUpdate(updatedRequest.reservationId, {
        status: 'approved',
        updatedAt: Date.now()
      });
    }

    res.status(200).json(updatedRequest);
  } catch (err) {
    console.error('[Reservation Request Error]', err);
    res.status(500).json({ error: err.message });
  }
};

// Get reservation requests by user email
exports.getReservationRequestsByUserEmail = async (req, res) => {
  try {
    const { userEmail } = req.query;
    
    if (!userEmail) {
      return res.status(400).json({ error: 'User email is required' });
    }
    
    console.log('[Reservation Request] Fetching requests for user email:', userEmail);
    
    // First, find all reservations made by this user
    const userReservations = await Reservation.find({ 
      $or: [
        { customerEmail: userEmail },
        { 'customerInfo.email': userEmail }
      ]
    });
    
    console.log(`[Reservation Request] Found ${userReservations.length} reservations for user`);
    
    if (userReservations.length === 0) {
      return res.json([]);
    }
    
    // Extract both the string ID and ObjectId for matching
    const reservationIds = [];
    userReservations.forEach(reservation => {
      if (reservation._id) {
        reservationIds.push(reservation._id);
        // Also push the string representation for string-based comparisons
        reservationIds.push(reservation._id.toString());
      }
    });
    
    console.log('[Reservation Request] Reservation IDs to search for:', reservationIds);
    
    // Then find all requests for those reservations
    const requests = await ReservationRequest.find({ reservationId: { $in: reservationIds } });
    console.log(`[Reservation Request] Found ${requests.length} requests for user's reservations`);
    
    res.json(requests);
  } catch (err) {
    console.error('[Reservation Request Error]', err);
    res.status(500).json({ error: err.message });
  }
};
