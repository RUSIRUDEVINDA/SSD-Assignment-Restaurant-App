const OrderRequest = require('../models/orderRequestModel');
const RestaurantOrder = require('../models/restaurantOrderModel');
const { isUserInRestaurantScope } = require('../utils/restaurantMapping');

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
        const requestId = req.params.requestId || req.params.id;
        const { status, adminResponse } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Bad Request', message: 'Invalid status. Must be "approved" or "rejected".' });
        }

        const request = await OrderRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({ error: 'Not Found', message: 'Order request not found' });
        }

        // Prevent repeated or contradictory processing
        if (request.status !== 'pending') {
            return res.status(400).json({
                error: 'Bad Request',
                message: `Order request has already been processed with status: ${request.status}`
            });
        }

        // Resolve parent order to verify restaurant scope authoritatively
        const parentOrder = await RestaurantOrder.findById(request.orderId);
        if (!parentOrder) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Parent order for this request could not be found; operation denied without mutation.'
            });
        }

        // Scope verification against parent order's restaurant
        if (!isUserInRestaurantScope(req.user, { restaurantName: parentOrder.restaurantName })) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Access denied: parent order belongs to a different restaurant.'
            });
        }

        // Concurrency-safe atomic state transition: only transition if still pending
        const updateFields = {
            status,
            updatedAt: new Date()
        };
        if (adminResponse) {
            updateFields.adminResponse = adminResponse;
        }

        const updatedRequest = await OrderRequest.findOneAndUpdate(
            { _id: requestId, status: 'pending' },
            { $set: updateFields },
            { new: true }
        );

        if (!updatedRequest) {
            return res.status(409).json({
                error: 'Conflict',
                message: 'Order request was already processed concurrently'
            });
        }

        return res.status(200).json(updatedRequest);
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
