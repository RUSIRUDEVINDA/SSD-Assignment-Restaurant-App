//username->admin  password->1234

const express = require("express");
const mongoose = require("mongoose");
const cors = require('cors');
const orderRouter = require("./routes/restaurantOrderRoute");
const reservationRouter = require("./routes/reservationRoute");
const restaurantRouter = require("./routes/restaurantRoute");
const reservationRequestController = require('./controllers/reservationRequestController');

const app = express();

//Middleware 
app.use(express.json());
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

app.use("/restaurant", orderRouter);
app.use("/restaurant", restaurantRouter);
app.use("/api", reservationRouter);

// Reservation Request Routes
app.post('/api/reservation-requests', reservationRequestController.createReservationRequest);
app.get('/api/reservation-requests', reservationRequestController.getReservationRequestsByUserEmail);
app.get('/api/restaurant/:restaurantId/reservation-requests', reservationRequestController.getReservationRequestsByRestaurant);
app.patch('/api/reservation-requests/:id', reservationRequestController.updateReservationRequestStatus);

mongoose.connect("mongodb+srv://admin:**********@airportmanagementsystem.8nzgv.mongodb.net/test")
.then(()=> console.log("Connected to MongoDB"))
.then(()=>{
    app.listen(5000);
})
.catch((err)=>console.log((err)));