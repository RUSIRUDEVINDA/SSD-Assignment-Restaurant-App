const RestaurantOrder = require("../models/restaurantOrderModel");
const whatsappService = require("../services/whatsappService");
const emailService = require("../services/emailService");
const { formatPhoneNumber } = require("../utils/phoneUtils");

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
        if (!restaurantName || !itemsPurchased || !totalAmount || !fullName || !email || !phoneNumber || !pickupTime) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Format pickup time to HH:mm format
        const formattedPickupTime = pickupTime.replace(/\s+/g, '') // Remove any spaces
            .replace(/AM|PM/gi, '') // Remove AM/PM
            .replace(/:/g, '') // Remove existing colon
            .padStart(4, '0'); // Ensure 4 digits
        // Add colon between hours and minutes
        const finalTime = formattedPickupTime.slice(0, 2) + ':' + formattedPickupTime.slice(2);

        const updatedOrder = await RestaurantOrder.findByIdAndUpdate(
            id,
            {
                restaurantName,
                itemsPurchased,
                totalAmount: parseFloat(totalAmount.toFixed(2)),
                fullName,
                email,
                phoneNumber: formatPhoneNumber(phoneNumber),
                pickupTime: finalTime,
                modifiedAt: new Date()
            },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ message: "Order not found" });
        }

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
        const deletedOrder = await RestaurantOrder.findByIdAndDelete(id);
        
        if (!deletedOrder) {
            return res.status(404).json({ message: "Order not found" });
        }

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
    // Accept 'picked up' as a valid status
    const validStatuses = ['confirmed', 'processing', 'ready for pickup', 'picked up'];

    // Validate status
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // First get the current order to have all details for notification
    const currentOrder = await RestaurantOrder.findById(id);
    if (!currentOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Update the order status
    const updatedOrder = await RestaurantOrder.findByIdAndUpdate(
      id,
      { 
        status,
        modifiedAt: new Date() 
      },
      { new: true }
    );

    // Only send WhatsApp notification for ready for pickup
    if (status === 'ready for pickup') {
      console.log(`Order ${id} marked as ready for pickup. Sending WhatsApp notification...`);
      try {
        // Ensure phone number is properly formatted
        if (!updatedOrder.phoneNumber) {
          console.warn(`Order ${id} has no phone number. Cannot send WhatsApp notification.`);
        } else {
          console.log(`Sending notification to ${updatedOrder.phoneNumber}`);
          const notificationResult = await whatsappService.sendOrderReadyNotification(updatedOrder);
          // Enhanced logging for debugging WhatsApp notification issues
          if (notificationResult.success) {
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