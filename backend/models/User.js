const mongoose = require('mongoose');
const { getRestaurantNameById } = require('../utils/restaurantMapping');

const VALID_ROLES = ['customer', 'admin', 'mainAdmin'];

const userSchema = new mongoose.Schema(
  {
    authIssuer: {
      type: String,
      required: [true, 'authIssuer is required'],
      trim: true,
    },
    authSubject: {
      type: String,
      required: [true, 'authSubject is required'],
      trim: true,
    },
    role: {
      type: String,
      required: [true, 'role is required'],
      enum: {
        values: VALID_ROLES,
        message: 'Invalid user role: {VALUE}',
      },
    },
    restaurantId: {
      type: String,
      trim: true,
      required: [
        function () {
          return this.role === 'admin';
        },
        'restaurantId is required for restaurant administrators',
      ],
      validate: {
        validator: function (val) {
          if (this.role === 'admin') {
            return typeof val === 'string' && !!getRestaurantNameById(val.trim());
          }
          return true;
        },
        message: (props) =>
          `Invalid restaurantId '${props.value}'. Must match an authoritative restaurant ID.`,
      },
    },
    active: {
      type: Boolean,
      default: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index on authIssuer and authSubject
userSchema.index({ authIssuer: 1, authSubject: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.User = User;
module.exports.VALID_ROLES = VALID_ROLES;
