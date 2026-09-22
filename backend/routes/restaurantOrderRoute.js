const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware");

//insert model
const order = require("../models/restaurantOrderModel");
//insert controller
const { 
  getAllOrders, 
  addOrders, 
  getById, 
  updateorder, 
  deleteorder, 
  getOrdersByEmail, 
  getOrdersByRestaurant,
  updateOrderStatus
} = require("../controllers/restaurantOrderController");

// Order Request controller
const orderRequestController = require("../controllers/orderRequestController");

//get all orders (sensitive order-management query)
router.get("/orders", requireAuth, getAllOrders);

//get orders by email (sensitive user order history)
router.get("/orders/email/:email", requireAuth, getOrdersByEmail);

//get orders by restaurant name (sensitive restaurant order data)
router.get("/orders/restaurant/:restaurantName", requireAuth, getOrdersByRestaurant);

//add orders (sensitive order creation)
router.post("/orders", requireAuth, addOrders);

//get order by id (sensitive order detail lookup)
router.get("/orders/:id", requireAuth, getById);

//update order details (sensitive order modification)
router.patch("/orders/:id", requireAuth, updateorder);

//update order status (sensitive order status mutation)
router.patch("/orders/status/:id", requireAuth, updateOrderStatus);

//delete order (sensitive order cancellation/deletion)
router.delete("/orders/:id", requireAuth, deleteorder);

// Order modification/cancellation requests
router.post("/order-requests", requireAuth, orderRequestController.createOrderRequest);
router.get("/order-requests/restaurant/:restaurantName", requireAuth, orderRequestController.getOrderRequestsByRestaurant);
router.get("/order-requests/user/:userEmail", requireAuth, orderRequestController.getOrderRequestsByUser);
router.patch("/order-requests/:requestId", requireAuth, orderRequestController.updateOrderRequestStatus);

//export
module.exports = router;