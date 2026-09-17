const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  id: String,
  number: Number,
  capacity: Number,
  isAvailable: Boolean
});

const restaurantSchema = new mongoose.Schema({
  name: String,
  description: String,
  location: {
    shopNumber: String,
    mapUrl: String
  },
  contact: {
    phone: String,
    email: String
  },
  hours: {
    open: String,
    close: String,
    days: String
  },
  images: [String],
  hasReservation: Boolean,
  adminId: String,
  adminCode: String,
  logo: String,
  tables: [tableSchema],
  reservations: [{
    id: String,
    tableId: String,
    date: String,
    time: String,
    name: String,
    email: String,
    phone: String,
    userId: String,
    status: String,
    createdAt: { type: Date, default: Date.now }
  }]
});

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

module.exports = { Restaurant };
