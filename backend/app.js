require("dotenv").config();
const dns = require("node:dns");

// Configure reliable DNS servers to stabilize MongoDB Atlas SRV lookups on Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Fall back to system DNS
}

const express = require("express");
const mongoose = require("mongoose");
const cors = require('cors');
const orderRouter = require("./routes/restaurantOrderRoute");
const reservationRouter = require("./routes/reservationRoute");
const restaurantRouter = require("./routes/restaurantRoute");
<<<<<<< Updated upstream
const userRouter = require("./routes/userRoute");
const { requireAuth, authErrorHandler } = require('./middleware/authMiddleware');
const { errorHandler } = require('./middleware/errorHandler');
=======
const { createResourceProtection, validateResourceBounds, resourceErrorHandler } = require('./middleware/resourceProtection');
>>>>>>> Stashed changes

function createApp() {
const app = express();

//Middleware 
app.use(cors({
  origin: ['http://localhost:8081', 'http://localhost:8083', 'http://localhost:8082'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin', 'Access-Control-Allow-Methods', 'Access-Control-Allow-Headers'],
  credentials: true
}));

// Handle preflight requests for all restaurant routes
app.options('/restaurant/*', (req, res) => {
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(200).end();
});

const { apiLimiter, writeLimiter } = createResourceProtection();
// Reject excessive traffic before parsing bodies, querying MongoDB or sending mail.
app.use(['/restaurant', '/api'], apiLimiter, writeLimiter);
app.use(express.json({ limit: '32kb', inflate: false }));
app.use(validateResourceBounds);

app.use("/restaurant", orderRouter);
app.use("/restaurant", restaurantRouter);
app.use("/api", reservationRouter);
<<<<<<< Updated upstream
app.use("/api", userRouter);

// Authentication Error Handler
app.use(authErrorHandler);

// Centralized Application Error Handler (V04)
app.use(errorHandler);
=======
app.use(resourceErrorHandler);
return app;
}
>>>>>>> Stashed changes

if (require.main === module) {
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI environment variable is required");
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .then(() => {
    createApp().listen(process.env.PORT || 5000);
  })
  .catch((err) => console.log((err)));
}

module.exports = { createApp };
