const express = require("express");
const router = express.Router();
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

//get all orders
router.get("/orders", getAllOrders);

//get orders by email
router.get("/orders/email/:email", getOrdersByEmail);

//get orders by restaurant name
router.get("/orders/restaurant/:restaurantName", getOrdersByRestaurant);

//add orders
router.post("/orders", addOrders);

//get order by id
router.get("/orders/:id", getById);

//update order details
router.patch("/orders/:id", updateorder);

//update order status
router.patch("/orders/status/:id", updateOrderStatus);

//delete order
router.delete("/orders/:id", deleteorder);

// Order modification/cancellation requests
router.post("/order-requests", orderRequestController.createOrderRequest);
router.get("/order-requests/restaurant/:restaurantName", orderRequestController.getOrderRequestsByRestaurant);
router.get("/order-requests/user/:userEmail", orderRequestController.getOrderRequestsByUser);
router.patch("/order-requests/:requestId", orderRequestController.updateOrderRequestStatus);

//export
module.exports = router;