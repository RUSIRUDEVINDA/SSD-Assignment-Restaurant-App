const RestaurantOrder = require("../models/restaurantOrderModel");
const whatsappService = require("../services/whatsappService");
const emailService = require("../services/emailService");
const { formatPhoneNumber } = require("../utils/phoneUtils");
const { isUserInRestaurantScope } = require("../utils/restaurantMapping");

//data display
const getAllOrders = async (req, res, next) => {
    try {
        console.log('Fetching all orders');
        const orders = await RestaurantOrder.find();
        console.log('Fetched all orders:', orders.length);
        return res.status(200).json(orders);
    } catch (err) {
        console.error('Error fetching all orders:', err);
        return res.status(500).json({ message: "Failed to fetch orders" });
    }
};

//data insert
const addOrders = async (req, res, next) => {
    try {
        const {
            restaurantName,
            itemsPurchased,
            totalAmount,
            fullName,
            email,
            phoneNumber,
            pickupTime
        } = req.body;

        // Calculate total amount from items if not provided
        if (!totalAmount) {
            const calculatedTotal = itemsPurchased.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
            totalAmount = calculatedTotal;
        }

        const orderData = {
            restaurantName,
            itemsPurchased,
            totalAmount,
            fullName,
            email,
            phoneNumber: formatPhoneNumber(phoneNumber),
            pickupTime
        };

        const newOrder = await RestaurantOrder.create(orderData);

        // Send confirmation email
        if (email) {
            try {
                await emailService.sendOrderConfirmation(email, newOrder);
                console.log('Order confirmation email sent to', email);
            } catch (emailErr) {
                console.error('Failed to send order confirmation email:', emailErr);
            }
        }

        return res.status(201).json({
            _id: newOrder._id,
            restaurantName: newOrder.restaurantName,
            itemsPurchased: newOrder.itemsPurchased,
            totalAmount: newOrder.totalAmount,
            fullName: newOrder.fullName,
            email: newOrder.email,
            phoneNumber: newOrder.phoneNumber,
            pickupTime: newOrder.pickupTime,
            createdAt: newOrder.createdAt
        });
    } catch (err) {
        console.error('Error adding order:', err);
        return res.status(500).json({ message: "Failed to add order" });
    }
};

//get by id
const getById = async (req, res, next) => {
    try {
        console.log('Fetching order by ID:', req.params.id);
        const order = await RestaurantOrder.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        console.log('Found order:', order._id);
        return res.status(200).json(order);
    } catch (err) {
        console.error('Error fetching order by ID:', err);
        return res.status(500).json({ message: "Failed to fetch order" });
    }
}

//get orders by email
const getOrdersByEmail = async (req, res, next) => {
    try {
        console.log('Fetching orders for email:', req.params.email);
        const orders = await RestaurantOrder.find({ email: req.params.email }).sort({ createdAt: -1 });
        console.log('Found orders:', orders.length);
        return res.status(200).json(orders);
    } catch (err) {
        console.error('Error fetching orders by email:', err);
        return res.status(500).json({ message: "Failed to fetch orders" });
    }
};

// get orders by restaurant name
const getOrdersByRestaurant = async (req, res, next) => {
    try {
        const { restaurantName } = req.params;
        const orders = await RestaurantOrder.find({ restaurantName });
        return res.status(200).json(orders);
    } catch (err) {
        console.error('Error fetching orders by restaurant:', err);
        return res.status(500).json({ message: "Failed to fetch orders by restaurant" });
    }
};

//update order details
const updateorder = async (req, res, next) => {
    const id = req.params.id;
    const {
        restaurantName,
        itemsPurchased,
        totalAmount,
        fullName,
        email,
        phoneNumber,
        pickupTime
    } = req.body;

    try {
        // Validate required fields
        if (!itemsPurchased || !totalAmount || !fullName || !phoneNumber || !pickupTime) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Fetch existing order to verify target existence and tenant scope
        const existingOrder = await RestaurantOrder.findById(id);
        if (!existingOrder) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Verify caller's restaurant scope against target order's authoritative restaurant
        if (!isUserInRestaurantScope(req.user, { restaurantName: existingOrder.restaurantName })) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Access denied: order belongs to another restaurant'
            });
        }

        // Prevent ordinary updates from reassigning restaurant or ownership fields
        if (restaurantName && restaurantName.trim().toLowerCase() !== existingOrder.restaurantName.toLowerCase()) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Reassigning order restaurant is not permitted'
            });
        }
        if (email && email.trim().toLowerCase() !== existingOrder.email.toLowerCase()) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Reassigning order customer ownership email is not permitted'
            });
        }

        // Format pickup time to HH:mm format
        const formattedPickupTime = pickupTime.replace(/\s+/g, '') // Remove any spaces
            .replace(/AM|PM/gi, '') // Remove AM/PM
            .replace(/:/g, '') // Remove existing colon
            .padStart(4, '0'); // Ensure 4 digits
        // Add colon between hours and minutes
        const finalTime = formattedPickupTime.slice(0, 2) + ':' + formattedPickupTime.slice(2);

        // Update record while preserving authoritative restaurantName and email
        const updatedOrder = await RestaurantOrder.findByIdAndUpdate(
            id,
            {
                restaurantName: existingOrder.restaurantName,
                itemsPurchased,
                totalAmount: parseFloat(totalAmount.toFixed(2)),
                fullName,
                email: existingOrder.email,
                phoneNumber: formatPhoneNumber(phoneNumber),
                pickupTime: finalTime,
                modifiedAt: new Date()
            },
            { new: true }
        );

        return res.status(200).json(updatedOrder);
    } catch (err) {
        console.error('Error updating order:', err);
        return res.status(500).json({ message: "Failed to update order" });
    }
};

//delete order
const deleteorder = async (req, res, next) => {
    const id = req.params.id;

    try {
        const currentOrder = await RestaurantOrder.findById(id);
        if (!currentOrder) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Scope verification: admin can only delete within assigned restaurant
        if (!isUserInRestaurantScope(req.user, { restaurantName: currentOrder.restaurantName })) {
            return res.status(403).json({
                error: "Forbidden",
                message: "Access denied: order is outside your assigned restaurant scope."
            });
        }

        await RestaurantOrder.findByIdAndDelete(id);
        return res.status(200).json({ message: "Order deleted successfully" });
    } catch (err) {
        console.error('Error deleting order:', err);
        return res.status(500).json({ message: "Failed to delete order" });
    }
};

// update order status
const updateOrderStatus = async (req, res, next) => {
  const id = req.params.id;
  const { status } = req.body;

  try {
    // First get the current order to verify target existence and tenant scope
    const currentOrder = await RestaurantOrder.findById(id);
    if (!currentOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Scope verification: admin can only update within assigned restaurant
    if (!isUserInRestaurantScope(req.user, { restaurantName: currentOrder.restaurantName })) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Access denied: order is outside your assigned restaurant scope."
      });
    }

    // Accept 'picked up' as a valid status
    const validStatuses = ['confirmed', 'processing', 'ready for pickup', 'picked up'];

    // Validate status
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Update only status and modifiedAt to prevent ownership/restaurant tampering
    const updatedOrder = await RestaurantOrder.findByIdAndUpdate(
      id,
      { 
        status,
        modifiedAt: new Date() 
      },
      { new: true }
    );

    // Only send WhatsApp notification for ready for pickup when authorized
    if (status === 'ready for pickup') {
      console.log(`Order ${id} marked as ready for pickup. Sending WhatsApp notification...`);
      try {
        if (!updatedOrder.phoneNumber) {
          console.warn(`Order ${id} has no phone number. Cannot send WhatsApp notification.`);
        } else {
          console.log(`Sending notification to ${updatedOrder.phoneNumber}`);
          const notificationResult = await whatsappService.sendOrderReadyNotification(updatedOrder);
          if (notificationResult && notificationResult.success) {
            console.log('WhatsApp notification sent successfully:', notificationResult);
          } else {
            console.error('WhatsApp notification failed:', notificationResult);
          }
        }
      } catch (notifyError) {
        console.error('Exception while sending WhatsApp notification:', notifyError);
      }
    }

    return res.status(200).json(updatedOrder);
  } catch (err) {
    console.error('Error updating order status:', err);
    return res.status(500).json({ message: "Failed to update order status" });
  }
};

module.exports = {
    getAllOrders,
    addOrders,
    getById,
    getOrdersByEmail,
    updateorder,
    deleteorder,
    getOrdersByRestaurant,
    updateOrderStatus
};