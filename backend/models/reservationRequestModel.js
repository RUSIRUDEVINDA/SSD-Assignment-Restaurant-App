const mongoose = require('mongoose');

const reservationRequestSchema = new mongoose.Schema({
  reservationId: {
    type: String,
    required: true
  },
  restaurantId: {
    type: String,
    required: true
  },
  restaurantName: {
    type: String,
    required: false
  },
  type: { type: String, enum: ['modification', 'cancellation'], required: true },
  newDate: { type: String },
  newTime: { type: String },
  newPartySize: { type: Number },
  requestDetails: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ReservationRequest', reservationRequestSchema);
