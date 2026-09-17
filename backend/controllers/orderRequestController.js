const OrderRequest = require('../models/orderRequestModel');
const RestaurantOrder = require('../models/restaurantOrderModel');

// Create a new order modification/cancellation request
const createOrderRequest = async (req, res) => {
    try {
        const { orderId, type, requestDetails, userEmail, modification } = req.body;
        if (!orderId || !type || !requestDetails || !userEmail) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        const newRequest = new OrderRequest({
            orderId,
            type,
            requestDetails,
            userEmail,
            modification: modification || undefined
        });
        await newRequest.save();
        return res.status(201).json(newRequest);
    } catch (err) {
        console.error('Error creating order request:', err);
        return res.status(500).json({ message: 'Failed to create order request' });
    }
};

// Get all requests for a restaurant (by restaurant name)
const getOrderRequestsByRestaurant = async (req, res) => {
    try {
        const { restaurantName } = req.params;
        // Find orders for this restaurant
        const orders = await RestaurantOrder.find({ restaurantName });
        const orderIds = orders.map(o => o._id);
        const requests = await OrderRequest.find({ orderId: { $in: orderIds } });
        return res.status(200).json(requests);
    } catch (err) {
        console.error('Error fetching order requests:', err);
        return res.status(500).json({ message: 'Failed to fetch order requests' });
    }
};

// Get all requests for a user
const getOrderRequestsByUser = async (req, res) => {
    try {
        const { userEmail } = req.params;
        const requests = await OrderRequest.find({ userEmail });
        return res.status(200).json(requests);
    } catch (err) {
        console.error('Error fetching user order requests:', err);
        return res.status(500).json({ message: 'Failed to fetch user order requests' });
    }
};

// Admin approves/rejects a request
const updateOrderRequestStatus = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { status, adminResponse } = req.body;
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        const request = await OrderRequest.findByIdAndUpdate(
            requestId,
            { status, adminResponse, updatedAt: new Date() },
            { new: true }
        );
        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }
        return res.status(200).json(request);
    } catch (err) {
        console.error('Error updating order request:', err);
        return res.status(500).json({ message: 'Failed to update order request' });
    }
};

module.exports = {
    createOrderRequest,
    getOrderRequestsByRestaurant,
    getOrderRequestsByUser,
    updateOrderRequestStatus
};
