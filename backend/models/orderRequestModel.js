const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderRequestSchema = new Schema({
    orderId: { type: Schema.Types.ObjectId, ref: 'RestaurantOrder', required: true },
    type: { type: String, enum: ['modification', 'cancellation'], required: true },
    requestDetails: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    userEmail: { type: String, required: true },
    // Optionally, store modification fields
    modification: {
        itemsPurchased: [{
            name: String,
            quantity: Number,
            price: Number
        }],
        pickupTime: String
    },
    adminResponse: { type: String }
});

const OrderRequest = mongoose.model('OrderRequest', orderRequestSchema);

module.exports = OrderRequest;
