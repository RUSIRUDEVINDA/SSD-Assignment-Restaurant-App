const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/authMiddleware");

const {
  requireRole,
  requireRestaurantScopeByName
} = require("../middleware/authorization");

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

// Global orders list - restricted to authenticated mainAdmin
router.get(
  "/orders",
  requireAuth,
  requireRole("mainAdmin"),
  getAllOrders
);

// Orders by restaurant - restricted to authenticated authorized restaurant admin or mainAdmin
router.get(
  "/orders/restaurant/:restaurantName",
  requireAuth,
  requireRole("admin", "mainAdmin"),
  requireRestaurantScopeByName("restaurantName"),
  getOrdersByRestaurant
);

// Add orders - authenticated user
router.post(
  "/orders",
  requireAuth,
  addOrders
);

// Customer order retrieval by email / id
// Authentication is Member 1 scope.
// Ownership / IDOR protection remains Member 2 scope.
router.get(
  "/orders/email/:email",
  requireAuth,
  getOrdersByEmail
);

router.get(
  "/orders/:id",
  requireAuth,
  getById
);

// General order update - authenticated authorized restaurant admin or mainAdmin
router.patch(
  "/orders/:id",
  requireAuth,
  requireRole("admin", "mainAdmin"),
  updateorder
);

// Order status update - authenticated authorized restaurant admin or mainAdmin
router.patch(
  "/orders/status/:id",
  requireAuth,
  requireRole("admin", "mainAdmin"),
  updateOrderStatus
);

// Order deletion - authenticated authorized restaurant admin or mainAdmin
router.delete(
  "/orders/:id",
  requireAuth,
  requireRole("admin", "mainAdmin"),
  deleteorder
);

// Order request creation
router.post(
  "/order-requests",
  requireAuth,
  orderRequestController.createOrderRequest
);

// Customer order request listing
router.get(
  "/order-requests/user/:userEmail",
  requireAuth,
  orderRequestController.getOrderRequestsByUser
);

// Order requests for a restaurant - restricted to authenticated authorized restaurant admin or mainAdmin
router.get(
  "/order-requests/restaurant/:restaurantName",
  requireAuth,
  requireRole("admin", "mainAdmin"),
  requireRestaurantScopeByName("restaurantName"),
  orderRequestController.getOrderRequestsByRestaurant
);

// Order request approval/rejection - restricted to authenticated authorized restaurant admin or mainAdmin
router.patch(
  "/order-requests/:requestId",
  requireAuth,
  requireRole("admin", "mainAdmin"),
  orderRequestController.updateOrderRequestStatus
);

// Export
module.exports = router;