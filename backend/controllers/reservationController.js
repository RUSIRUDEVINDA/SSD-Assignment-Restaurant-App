const Reservation = require('../models/reservationModel');
const emailService = require('../services/emailService');
const mongoose = require('mongoose');

// Create a new reservation
exports.createReservation = async (req, res) => {
  try {
    let { restaurantId } = req.params;
    const { customerName, customerEmail, customerPhone, date, time, partySize, restaurantName } = req.body;

    // Handle both numeric IDs and MongoDB ObjectIds
    // For development/testing, allow simple numeric IDs
    if (mongoose.Types.ObjectId.isValid(restaurantId)) {
      restaurantId = new mongoose.Types.ObjectId(restaurantId);
    } else {
      // For simple numeric IDs, we'll use them as strings
      console.log('[Reservation] Using non-ObjectId restaurantId:', restaurantId);
      // No conversion needed, use as is
    }
    
    // Log the restaurant name if provided
    if (restaurantName) {
      console.log('[Reservation] Restaurant name:', restaurantName);
    }

    // Validate date
    const reservationDate = new Date(date);
    if (isNaN(reservationDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Validate partySize
    const size = Number(partySize);
    if (isNaN(size)) {
      return res.status(400).json({ error: 'Invalid partySize' });
    }

    // Debug logging
    console.log('[Reservation] Creating reservation for restaurantId:', restaurantId);
    console.log('[Reservation] Payload:', { customerName, customerEmail, customerPhone, date, time, partySize });

    const reservation = new Reservation({
      restaurantId,
      restaurantName, // Include restaurant name in the saved document
      customerName,
      customerEmail,
      customerPhone,
      date: reservationDate,
      time,
      partySize: size
    });
    await reservation.save();

    // Send confirmation email
    if (customerEmail) {
      try {
        await emailService.sendReservationConfirmation(customerEmail, reservation);
        console.log('Reservation confirmation email sent to', customerEmail);
      } catch (emailErr) {
        console.error('Failed to send reservation confirmation email:', emailErr);
      }
    }

    res.status(201).json(reservation);
  } catch (err) {
    console.error('[Reservation Error]', err);
    res.status(500).json({ error: err.message });
  }
};

// Get all reservations for a restaurant
exports.getReservationsByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const reservations = await Reservation.find({ restaurantId });
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update reservation details and set status to 'modified' (used when user modifies reservation)
exports.modifyReservation = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const updates = req.body;
    // Always set status to 'modified' on user modification
    updates.status = 'modified';
    updates.updatedAt = Date.now();
    const reservation = await Reservation.findByIdAndUpdate(reservationId, updates, { new: true });
    res.json(reservation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update reservation status (e.g., cancel, complete)
exports.updateReservationStatus = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const { status } = req.body;
    
    // If status is 'cancelled', delete the reservation instead of updating it
    if (status === 'cancelled') {
      console.log(`[Reservation] Deleting cancelled reservation: ${reservationId}`);
      const deletedReservation = await Reservation.findByIdAndDelete(reservationId);
      
      if (!deletedReservation) {
        return res.status(404).json({ error: 'Reservation not found' });
      }
      
      return res.json({ 
        message: 'Reservation cancelled and deleted successfully',
        _id: deletedReservation._id,
        status: 'cancelled'
      });
    }
    
    // For other statuses, update as normal
    const reservation = await Reservation.findByIdAndUpdate(
      reservationId,
      { status, updatedAt: Date.now() },
      { new: true }
    );
    
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    
    res.json(reservation);
  } catch (err) {
    console.error('[Reservation Error]', err);
    res.status(500).json({ error: err.message });
  }
};

// Get reservations by user email
exports.getReservationsByUserEmail = async (req, res) => {
  try {
    const { userEmail } = req.query;
    
    if (!userEmail) {
      return res.status(400).json({ error: 'User email is required' });
    }
    
    console.log('[Reservation] Fetching reservations for user email:', userEmail);
    const reservations = await Reservation.find({ customerEmail: userEmail });
    res.json(reservations);
  } catch (err) {
    console.error('[Reservation Error]', err);
    res.status(500).json({ error: err.message });
  }
};

// Get a reservation by ID
exports.getReservationById = async (req, res) => {
  try {
    const { reservationId } = req.params;
    
    if (!reservationId) {
      return res.status(400).json({ error: 'Reservation ID is required' });
    }
    
    console.log('[Reservation] Fetching reservation by ID:', reservationId);
    
    // Try to find by MongoDB ObjectId first
    let reservation = null;
    if (mongoose.Types.ObjectId.isValid(reservationId)) {
      reservation = await Reservation.findById(reservationId);
    }
    
    // If not found, try to find by the id field
    if (!reservation) {
      reservation = await Reservation.findOne({ id: reservationId });
    }
    
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    
    res.json(reservation);
  } catch (err) {
    console.error('[Reservation Error]', err);
    res.status(500).json({ error: err.message });
  }
};
