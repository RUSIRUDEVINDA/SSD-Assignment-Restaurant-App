const express = require("express");
const router = express.Router();

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

const orderRequestController = require("../controllers/orderRequestController");

const {
  requireRole,
  requireRestaurantScopeByName
} = require("../middleware/authorization");

// Global orders list - restricted to mainAdmin
router.get("/orders", requireRole("mainAdmin"), getAllOrders);

// Orders by restaurant - restricted to authorized restaurant admin or mainAdmin
router.get(
  "/orders/restaurant/:restaurantName",
  requireRole("admin", "mainAdmin"),
  requireRestaurantScopeByName("restaurantName"),
  getOrdersByRestaurant
);

// Add orders (public / customer creation)
router.post("/orders", addOrders);

// Customer order retrieval by email / id (V04 scope)
router.get("/orders/email/:email", getOrdersByEmail);
router.get("/orders/:id", getById);

// General order update - restricted to authorized restaurant admin or mainAdmin
router.patch("/orders/:id", requireRole("admin", "mainAdmin"), updateorder);

// Order status update - restricted to authorized restaurant admin or mainAdmin
router.patch("/orders/status/:id", requireRole("admin", "mainAdmin"), updateOrderStatus);

// Order deletion - restricted to authorized restaurant admin or mainAdmin
router.delete("/orders/:id", requireRole("admin", "mainAdmin"), deleteorder);

// Order request creation & customer listing
router.post("/order-requests", orderRequestController.createOrderRequest);
router.get("/order-requests/user/:userEmail", orderRequestController.getOrderRequestsByUser);

// Order requests for a restaurant - restricted to authorized restaurant admin or mainAdmin
router.get(
  "/order-requests/restaurant/:restaurantName",
  requireRole("admin", "mainAdmin"),
  requireRestaurantScopeByName("restaurantName"),
  orderRequestController.getOrderRequestsByRestaurant
);

// Order request approval/rejection - restricted to authorized restaurant admin or mainAdmin
router.patch(
  "/order-requests/:requestId",
  requireRole("admin", "mainAdmin"),
  orderRequestController.updateOrderRequestStatus
);

//export
module.exports = router;