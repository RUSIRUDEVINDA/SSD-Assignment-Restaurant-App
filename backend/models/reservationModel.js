const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  restaurantId: {
    type: String, // Changed from ObjectId to String to support both formats
    required: true
  },
  restaurantName: {
    type: String,
    required: true // Not required for backward compatibility
  },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  customerPhone: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  partySize: { type: Number, required: true },
  status: { type: String, enum: ['booked', 'approved', 'cancelled', 'completed', 'modified'], default: 'booked' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reservation', reservationSchema);
