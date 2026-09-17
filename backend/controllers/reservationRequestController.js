const mongoose = require('mongoose');
const ReservationRequest = require('../models/reservationRequestModel');
const Reservation = require('../models/reservationModel');

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
    const { requestId } = req.params;
    const { status } = req.body;
    
    console.log(`[Reservation Request] Updating request ${requestId} to ${status}`);
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      console.error(`[Reservation Request] Invalid ObjectId: ${requestId}`);
      return res.status(400).json({ error: 'Invalid request ID format' });
    }
    
    const request = await ReservationRequest.findByIdAndUpdate(
      requestId,
      { status, updatedAt: Date.now() },
      { new: true }
    );
    
    if (!request) {
      console.error(`[Reservation Request] Request not found: ${requestId}`);
      return res.status(404).json({ error: 'Request not found' });
    }
    
    console.log(`[Reservation Request] Request updated:`, request);
    
    // If approved and it's a cancellation, DELETE the reservation from the database
    if (request && status === 'approved' && request.type === 'cancellation') {
      console.log(`[Reservation Request] Deleting reservation: ${request.reservationId}`);
      await Reservation.findByIdAndDelete(request.reservationId);
    }
    
    // If approved and it's a modification, set status to 'approved' (do NOT modify reservation yet)
    if (request && status === 'approved' && request.type === 'modification') {
      await Reservation.findByIdAndUpdate(request.reservationId, {
        status: 'approved',
        updatedAt: Date.now()
      });
    }
    
    res.json(request);
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
