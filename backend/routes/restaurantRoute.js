const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');

// Restaurant view tracking endpoint
router.post('/view', restaurantController.trackRestaurantView);

module.exports = router;
