/**
 * V05 Mass Assignment / Over-Posting Test Suite
 * 
 * Verifies that the backend enforces strict DTO allowlists and rejects any attempt
 * to inject or modify protected object properties (status, restaurantId, customerEmail,
 * isAdminReservation, etc.) through resource update endpoints.
 *
 * OWASP API Security Top 10:2023 – API3: Broken Object Property Level Authorization
 * CWE-915: Improperly Controlled Modification of Dynamically-Determined Object Attributes
 */

require('dotenv').config();
process.env.AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || 'https://dev-test.auth0.com';
process.env.AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || 'https://ssd-restaurant-api';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const express = require('express');

// Validation schemas under test
const {
  validateReservationModificationDto,
  validateOrderModificationDto,
  PROTECTED_RESERVATION_FIELDS,
  ALLOWED_RESERVATION_FIELDS
} = require('../utils/validationSchemas');

// Models to mock for HTTP integration testing
const Reservation = require('../models/reservationModel');
const RestaurantOrder = require('../models/restaurantOrderModel');

// Synthetic authentication harness for testing
const authMiddleware = require('../middleware/authMiddleware');
const realRequireAuth = authMiddleware.requireAuth;
authMiddleware.requireAuth = (req, res, next) => {
  if (req.user) {
    return next();
  }
  return realRequireAuth(req, res, next);
};

const loadUserIdentityModule = require('../middleware/loadUserIdentity');
const realLoadUserIdentity = loadUserIdentityModule.loadUserIdentity;
loadUserIdentityModule.loadUserIdentity = (req, res, next) => {
  if (req.user) {
    return next();
  }
  return realLoadUserIdentity(req, res, next);
};

const reservationRouter = require('../routes/reservationRoute');
const orderRouter = require('../routes/restaurantOrderRoute');

// Test tracking and mock database
let mockReservations = {};
let mockOrders = {};

function createTestApp() {
  const app = express();
  app.use(express.json());

  // Synthetic identity injection header
  app.use((req, res, next) => {
    if (req.headers['x-test-user']) {
      try {
        req.user = JSON.parse(req.headers['x-test-user']);
      } catch (e) {
        req.user = null;
      }
    } else {
      // Default to mainAdmin to bypass scope checks and directly test DTO validation
      req.user = {
        id: 'admin-main-1',
        role: 'mainAdmin'
      };
    }
    next();
  });

  app.use('/api', reservationRouter);
  app.use('/restaurant', orderRouter);
  app.use(authMiddleware.authErrorHandler);

  return app;
}

let server;
let baseUrl;

before(async () => {
  // Mock Reservation.findById
  Reservation.findById = async (id) => {
    return mockReservations[id] || null;
  };

  // Mock Reservation.findByIdAndUpdate
  Reservation.findByIdAndUpdate = async (id, update, options) => {
    if (!mockReservations[id]) return null;
    mockReservations[id] = { ...mockReservations[id], ...update };
    return mockReservations[id];
  };

  // Mock RestaurantOrder.findById
  RestaurantOrder.findById = async (id) => {
    return mockOrders[id] || null;
  };

  // Mock RestaurantOrder.findByIdAndUpdate
  RestaurantOrder.findByIdAndUpdate = async (id, update, options) => {
    if (!mockOrders[id]) return null;
    mockOrders[id] = { ...mockOrders[id], ...update };
    return mockOrders[id];
  };

  const app = createTestApp();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(() => {
  if (server) server.close();
});

beforeEach(() => {
  mockReservations = {};
  mockOrders = {};
});

// Helper for test HTTP requests
async function makeRequest(method, path, body = null, headers = {}) {
  const url = new URL(path, baseUrl);
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, body: json, headers: res.headers });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// -------------------------------------------------------------
// Unit Tests: DTO Allowlist Validation Engine
// -------------------------------------------------------------

test('UNIT: validateReservationModificationDto rejects over-posted status', () => {
  assert.throws(
    () => validateReservationModificationDto({ time: '21:00', status: 'confirmed' }),
    (err) => err.status === 400 && err.message.includes("Modifying protected property 'status'")
  );
});

test('UNIT: validateReservationModificationDto rejects over-posted restaurantId', () => {
  assert.throws(
    () => validateReservationModificationDto({ restaurantId: 'HACKED_RESTAURANT_999' }),
    (err) => err.status === 400 && err.message.includes("Modifying protected property 'restaurantId'")
  );
});

test('UNIT: validateReservationModificationDto rejects over-posted customerEmail', () => {
  assert.throws(
    () => validateReservationModificationDto({ customerEmail: 'attacker@evil.com' }),
    (err) => err.status === 400 && err.message.includes("Modifying protected property 'customerEmail'")
  );
});

test('UNIT: validateReservationModificationDto rejects arbitrary injected attribute (isAdminReservation)', () => {
  assert.throws(
    () => validateReservationModificationDto({ time: '21:00', isAdminReservation: true }),
    (err) => err.status === 400 && (err.message.includes("Modifying protected property") || err.message.includes("Unrecognized or disallowed field"))
  );
});

test('UNIT: validateReservationModificationDto rejects invalid partySize bounds', () => {
  assert.throws(
    () => validateReservationModificationDto({ partySize: -1 }),
    (err) => err.status === 400 && err.message.includes('partySize must be an integer between 1 and 20')
  );
  assert.throws(
    () => validateReservationModificationDto({ partySize: 50 }),
    (err) => err.status === 400 && err.message.includes('partySize must be an integer between 1 and 20')
  );
});

test('UNIT: validateReservationModificationDto constructs clean DTO with allowlisted fields', () => {
  const dto = validateReservationModificationDto({
    time: '20:30',
    partySize: 4,
    customerPhone: '+94771234567',
    customerName: 'Jane Doe'
  });

  assert.strictEqual(dto.time, '20:30');
  assert.strictEqual(dto.partySize, 4);
  assert.strictEqual(dto.customerPhone, '+94771234567');
  assert.strictEqual(dto.customerName, 'Jane Doe');
  assert.strictEqual(dto.status, 'modified');
  assert.ok(dto.updatedAt instanceof Date);
});

test('UNIT: validateOrderModificationDto rejects over-posted status in orders', () => {
  assert.throws(
    () => validateOrderModificationDto({ status: 'completed' }),
    (err) => err.status === 400 && err.message.includes("Modifying protected property 'status'")
  );
});

test('UNIT: validateOrderModificationDto rejects over-posted arbitrary attribute', () => {
  assert.throws(
    () => validateOrderModificationDto({ isAdminOrder: true }),
    (err) => err.status === 400 && (err.message.includes("Modifying protected property") || err.message.includes("Unrecognized or disallowed field"))
  );
});

// -------------------------------------------------------------
// Integration Tests: HTTP API Mass Assignment Defense
// -------------------------------------------------------------

test('INTEGRATION: PATCH /api/reservations/:id/modify rejects over-posted status with 400', async () => {
  const reservationId = 'res-101';
  mockReservations[reservationId] = {
    _id: reservationId,
    restaurantId: '1',
    restaurantName: 'Barista',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerPhone: '0771234567',
    time: '19:00',
    partySize: 2,
    status: 'booked'
  };

  const maliciousPayload = {
    time: '21:00',
    partySize: 4,
    status: 'confirmed', // Over-posting attack
    restaurantId: 'HACKED_RESTAURANT_999',
    isAdminReservation: true
  };

  const res = await makeRequest('PATCH', `/api/reservations/${reservationId}/modify`, maliciousPayload);

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error, 'Bad Request');
  assert.match(res.body.message, /Modifying protected property/);

  // Verify database record was not altered
  assert.strictEqual(mockReservations[reservationId].status, 'booked');
  assert.strictEqual(mockReservations[reservationId].restaurantId, '1');
});

test('INTEGRATION: PATCH /api/reservations/:id/modify permits allowlisted updates and updates status to modified', async () => {
  const reservationId = 'res-102';
  mockReservations[reservationId] = {
    _id: reservationId,
    restaurantId: '1',
    restaurantName: 'Barista',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerPhone: '0771234567',
    time: '19:00',
    partySize: 2,
    status: 'booked'
  };

  const legitimatePayload = {
    time: '21:00',
    partySize: 4,
    customerName: 'Johnathan Doe'
  };

  const res = await makeRequest('PATCH', `/api/reservations/${reservationId}/modify`, legitimatePayload);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.time, '21:00');
  assert.strictEqual(res.body.partySize, 4);
  assert.strictEqual(res.body.customerName, 'Johnathan Doe');
  assert.strictEqual(res.body.status, 'modified');

  // Verify protected properties remained completely untouched
  assert.strictEqual(res.body.restaurantId, '1');
  assert.strictEqual(res.body.customerEmail, 'john@example.com');
});

test('INTEGRATION: PATCH /restaurant/orders/:id rejects over-posted status with 400', async () => {
  const orderId = 'order-201';
  mockOrders[orderId] = {
    _id: orderId,
    restaurantName: 'Barista',
    fullName: 'Regular Customer',
    email: 'cust@example.com',
    phoneNumber: '0771234567',
    pickupTime: '10:00',
    itemsPurchased: [{ name: 'Cappuccino', quantity: 1, price: 4.95 }],
    totalAmount: 4.95,
    status: 'Pending'
  };

  const maliciousPayload = {
    restaurantName: 'Barista',
    fullName: 'Regular Customer',
    phoneNumber: '0771234567',
    pickupTime: '11:00',
    itemsPurchased: [{ name: 'Cappuccino', quantity: 1 }],
    status: 'completed', // Over-posting attack
    isAdminOrder: true
  };

  const res = await makeRequest('PATCH', `/restaurant/orders/${orderId}`, maliciousPayload);

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error, 'Bad Request');
  assert.match(res.body.message, /Modifying protected property 'status'/);

  // Status must remain Pending
  assert.strictEqual(mockOrders[orderId].status, 'Pending');
});
