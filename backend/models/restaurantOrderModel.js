const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const restaurant_Orders_Schema = new Schema({
    restaurantName: { type: String, required: true },
    itemsPurchased: [{
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }
    }],
    totalAmount: { type: Number, required: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    pickupTime: { type: String, required: true },
    status: { type: String, default: "Pending" },
    createdAt: { type: Date, default: Date.now },
    modifiedAt: { type: Date, default: null },
}, { timestamps: true });

const RestaurantOrder = mongoose.model('RestaurantOrder', restaurant_Orders_Schema);

module.exports = RestaurantOrder;