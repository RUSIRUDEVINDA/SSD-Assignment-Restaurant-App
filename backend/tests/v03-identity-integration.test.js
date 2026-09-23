const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const express = require('express');
const mongoose = require('mongoose');

// Mock external services and models before importing routes
const RestaurantOrder = require('../models/restaurantOrderModel');
const Reservation = require('../models/reservationModel');
const ReservationRequest = require('../models/reservationRequestModel');
const User = require('../models/User');
const whatsappService = require('../services/whatsappService');

// Authentication harness for tests:
// Simulated verified token context is injected ONLY inside test execution via x-simulated-auth header.
// Production code contains NO bypass.
const authMiddleware = require('../middleware/authMiddleware');
const realRequireAuth = authMiddleware.requireAuth;

authMiddleware.requireAuth = (req, res, next) => {
  if (req.headers['x-simulated-auth']) {
    try {
      req.auth = { payload: JSON.parse(req.headers['x-simulated-auth']) };
      return next();
    } catch (e) {
      // malformed header, proceed to real requireAuth
    }
  }
  return realRequireAuth(req, res, next);
};

// Import application routers
const orderRouter = require('../routes/restaurantOrderRoute');
const reservationRouter = require('../routes/reservationRoute');
const userRouter = require('../routes/userRoute');

const TRUSTED_ISSUER = 'https://dev-restaurant.auth0.com/';

// In-memory test state
let mutationsCalled = [];
let notificationsSent = [];
let simulateDbFailure = false;
let mockUsers = {};
let mockOrders = {};
let mockReservations = {};

function createTestApp() {
  const app = express();
  app.use(express.json());

  app.use('/restaurant', orderRouter);
  app.use('/api', reservationRouter);
  app.use('/api', userRouter);

  // Authentication error handler
  app.use(authMiddleware.authErrorHandler);

  // Server error handler (ensures DB error does not leak diagnostics)
  app.use((err, req, res, next) => {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected server error occurred.'
    });
  });

  return app;
}

let server;
let baseUrl;

before(async () => {
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
  mutationsCalled = [];
  notificationsSent = [];
  simulateDbFailure = false;

  // Provision in-memory test profiles
  mockUsers = {
    customer: {
      _id: new mongoose.Types.ObjectId('650000000000000000000001'),
      authIssuer: TRUSTED_ISSUER,
      authSubject: 'auth0|cust_alice_123',
      role: 'customer',
      active: true,
      displayName: 'Alice Customer'
    },
    adminA: {
      _id: new mongoose.Types.ObjectId('650000000000000000000002'),
      authIssuer: TRUSTED_ISSUER,
      authSubject: 'auth0|admin_barista_bob',
      role: 'admin',
      restaurantId: '1', // Barista
      active: true,
      displayName: 'Bob Barista Admin'
    },
    adminB: {
      _id: new mongoose.Types.ObjectId('650000000000000000000003'),
      authIssuer: TRUSTED_ISSUER,
      authSubject: 'auth0|admin_pizzahut_carol',
      role: 'admin',
      restaurantId: '2', // Pizza Hut
      active: true,
      displayName: 'Carol Pizza Admin'
    },
    mainAdmin: {
      _id: new mongoose.Types.ObjectId('650000000000000000000004'),
      authIssuer: TRUSTED_ISSUER,
      authSubject: 'auth0|mainadmin_dan',
      role: 'mainAdmin',
      active: true,
      displayName: 'Dan Main Admin'
    },
    inactiveUser: {
      _id: new mongoose.Types.ObjectId('650000000000000000000005'),
      authIssuer: TRUSTED_ISSUER,
      authSubject: 'auth0|inactive_eve',
      role: 'customer',
      active: false,
      displayName: 'Eve Inactive'
    },
    invalidAdminRestaurant: {
      _id: new mongoose.Types.ObjectId('650000000000000000000006'),
      authIssuer: TRUSTED_ISSUER,
      authSubject: 'auth0|admin_invalid_res',
      role: 'admin',
      restaurantId: '999', // Unknown restaurant ID
      active: true,
      displayName: 'Invalid Res Admin'
    }
  };

  mockOrders = {
    'order-barista-1': {
      _id: 'order-barista-1',
      restaurantName: 'Barista',
      status: 'confirmed',
      phoneNumber: '0770000001',
      email: 'customer@example.com'
    },
    'order-pizzahut-2': {
      _id: 'order-pizzahut-2',
      restaurantName: 'Pizza Hut',
      status: 'confirmed',
      phoneNumber: '0770000002',
      email: 'customer2@example.com'
    }
  };

  // Mock User.findOne
  User.findOne = async (filter) => {
    if (simulateDbFailure) {
      throw new Error('Simulated database connection failure');
    }
    const { authIssuer, authSubject } = filter;
    for (const key of Object.keys(mockUsers)) {
      const u = mockUsers[key];
      if (u.authIssuer === authIssuer && u.authSubject === authSubject) {
        return u;
      }
    }
    return null;
  };

  // Mock RestaurantOrder methods
  RestaurantOrder.findById = async (id) => mockOrders[id] || null;
  RestaurantOrder.findByIdAndUpdate = async (id, update) => {
    mutationsCalled.push({ model: 'RestaurantOrder', action: 'findByIdAndUpdate', id, update });
    if (mockOrders[id]) {
      Object.assign(mockOrders[id], update);
      return mockOrders[id];
    }
    return null;
  };
  RestaurantOrder.find = (query = {}) => {
    let results = Object.values(mockOrders);
    if (query.restaurantName) {
      results = results.filter(o => o.restaurantName.toLowerCase() === query.restaurantName.toLowerCase());
    }
    return {
      sort: () => results,
      then: (resolve) => resolve(results)
    };
  };

  // Mock whatsappService
  whatsappService.sendOrderReadyNotification = async (order) => {
    notificationsSent.push({ type: 'whatsapp', orderId: order._id, status: order.status });
    return { success: true };
  };
  whatsappService.sendOrderStatusUpdate = async (phone, orderId, status) => {
    notificationsSent.push({ type: 'whatsapp', orderId, status });
    return { success: true };
  };
});

async function sendRequest(method, path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (options.authPayload) {
    headers['x-simulated-auth'] = JSON.stringify(options.authPayload);
  }

  const fetchOptions = { method, headers };
  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, fetchOptions);
  let data;
  try {
    data = await response.json();
  } catch (e) {
    data = null;
  }

  return { status: response.status, body: data };
}

// ============================================================================
// SUITE: 14 MANDATORY INTEGRATION TEST SCENARIOS
// ============================================================================

test('1. Missing verified token context returns 401 Unauthorized', async () => {
  // Anonymous call with no Authorization header and no auth context
  const res = await sendRequest('GET', '/restaurant/orders/restaurant/Barista');
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.error, 'Unauthorized');
});

test('2. Missing or malformed issuer or subject is rejected with 401', async () => {
  // Case A: missing sub
  const resNoSub = await sendRequest('GET', '/restaurant/orders/restaurant/Barista', {
    authPayload: { iss: TRUSTED_ISSUER }
  });
  assert.strictEqual(resNoSub.status, 401);
  assert.strictEqual(resNoSub.body.error, 'Unauthorized');

  // Case B: empty string iss
  const resEmptyIss = await sendRequest('GET', '/restaurant/orders/restaurant/Barista', {
    authPayload: { iss: '   ', sub: 'auth0|user123' }
  });
  assert.strictEqual(resEmptyIss.status, 401);
  assert.strictEqual(resEmptyIss.body.error, 'Unauthorized');

  // Case C: non-string sub
  const resBadSub = await sendRequest('GET', '/restaurant/orders/restaurant/Barista', {
    authPayload: { iss: TRUSTED_ISSUER, sub: 12345 }
  });
  assert.strictEqual(resBadSub.status, 401);
});

test('3. Valid verified identity without an application profile returns 403 Forbidden', async () => {
  // Valid token payload, but user subject not provisioned in application User collection
  const res = await sendRequest('GET', '/restaurant/orders/restaurant/Barista', {
    authPayload: { iss: TRUSTED_ISSUER, sub: 'auth0|unprovisioned_new_user' }
  });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.body.error, 'Forbidden');
  assert.match(res.body.message, /not provisioned/i);
});

test('4. Inactive profile returns 403 Forbidden', async () => {
  // Provisioned user with active: false
  const res = await sendRequest('GET', '/restaurant/orders/restaurant/Barista', {
    authPayload: { iss: TRUSTED_ISSUER, sub: mockUsers.inactiveUser.authSubject }
  });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.body.error, 'Forbidden');
  assert.match(res.body.message, /inactive/i);
});

test('5. Wrong issuer does not match a profile with the same subject', async () => {
  // Subject exists for Barista Admin, but issuer is untrusted / different
  const res = await sendRequest('GET', '/restaurant/orders/restaurant/Barista', {
    authPayload: { iss: 'https://malicious-or-other.auth0.com/', sub: mockUsers.adminA.authSubject }
  });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.body.error, 'Forbidden');
  assert.match(res.body.message, /not provisioned/i);
});

test('6. Provisioned customer reaches role check and receives 403 on admin action', async () => {
  // Provisioned customer authenticated and loaded, but lacks admin role
  const res = await sendRequest('PATCH', '/restaurant/orders/status/order-barista-1', {
    authPayload: { iss: TRUSTED_ISSUER, sub: mockUsers.customer.authSubject },
    body: { status: 'ready for pickup' }
  });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.body.error, 'Forbidden');
  assert.match(res.body.message, /role 'customer' lacks permission/i);
});

test('7. Restaurant Admin A succeeds on Restaurant A order', async () => {
  // Admin A has restaurantId: '1' (Barista); target order belongs to Barista
  const res = await sendRequest('PATCH', '/restaurant/orders/status/order-barista-1', {
    authPayload: { iss: TRUSTED_ISSUER, sub: mockUsers.adminA.authSubject },
    body: { status: 'ready for pickup' }
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'ready for pickup');
  assert.strictEqual(mutationsCalled.length, 1);
  assert.strictEqual(notificationsSent.length, 1);
});

test('8. Restaurant Admin A is denied on Restaurant B order (403)', async () => {
  // Admin A (Barista) attempts to alter Pizza Hut order (Restaurant B)
  const res = await sendRequest('PATCH', '/restaurant/orders/status/order-pizzahut-2', {
    authPayload: { iss: TRUSTED_ISSUER, sub: mockUsers.adminA.authSubject },
    body: { status: 'ready for pickup' }
  });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.body.error, 'Forbidden');
  assert.match(res.body.message, /outside your assigned restaurant scope/i);
  assert.strictEqual(mutationsCalled.length, 0);
  assert.strictEqual(notificationsSent.length, 0);
});

test('9. Invalid admin restaurant assignment is denied (403)', async () => {
  // User profile has role: admin but unmapped restaurantId '999'
  const res = await sendRequest('GET', '/restaurant/orders/restaurant/Barista', {
    authPayload: { iss: TRUSTED_ISSUER, sub: mockUsers.invalidAdminRestaurant.authSubject }
  });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.body.error, 'Forbidden');
  assert.match(res.body.message, /no valid assigned restaurant/i);
});

test('10. Body, query, or header role spoofing cannot override stored profile', async () => {
  // Scenario A: Customer attempts to inject role 'mainAdmin' in query string and header
  const resQuery = await sendRequest('GET', '/restaurant/orders?role=mainAdmin&restaurantId=1', {
    authPayload: { iss: TRUSTED_ISSUER, sub: mockUsers.customer.authSubject },
    headers: { 'x-role': 'mainAdmin', 'x-test-role': 'mainAdmin' }
  });
  assert.strictEqual(resQuery.status, 403);
  assert.strictEqual(resQuery.body.error, 'Forbidden');
  assert.match(resQuery.body.message, /role 'customer' lacks permission/i);

  // Scenario B: Customer attempts to inject role 'admin' / 'mainAdmin' in request body
  const resBody = await sendRequest('PATCH', '/restaurant/orders/status/order-barista-1', {
    authPayload: { iss: TRUSTED_ISSUER, sub: mockUsers.customer.authSubject },
    body: { status: 'ready for pickup', role: 'admin', restaurantId: '1' }
  });
  assert.strictEqual(resBody.status, 403);
  assert.strictEqual(resBody.body.error, 'Forbidden');
  assert.match(resBody.body.message, /role 'customer' lacks permission/i);
});

test('11. Explicitly permitted mainAdmin operation succeeds', async () => {
  // mainAdmin accesses global /orders
  const res = await sendRequest('GET', '/restaurant/orders', {
    authPayload: { iss: TRUSTED_ISSUER, sub: mockUsers.mainAdmin.authSubject }
  });
  assert.strictEqual(res.status, 200);
  assert(Array.isArray(res.body));
  assert.strictEqual(res.body.length, 2);
});

test('12. GET /api/me exposes only approved fields (id, role, restaurantId, displayName)', async () => {
  const res = await sendRequest('GET', '/api/me', {
    authPayload: { iss: TRUSTED_ISSUER, sub: mockUsers.adminA.authSubject }
  });
  assert.strictEqual(res.status, 200);
  const keys = Object.keys(res.body).sort();
  assert.deepStrictEqual(keys, ['displayName', 'id', 'restaurantId', 'role']);
  assert.strictEqual(res.body.id, mockUsers.adminA._id.toString());
  assert.strictEqual(res.body.role, 'admin');
  assert.strictEqual(res.body.restaurantId, '1');
  assert.strictEqual(res.body.displayName, 'Bob Barista Admin');

  // Verify internal Auth0 subject, secrets, or internal DB fields are NOT exposed
  assert.strictEqual(res.body.authSubject, undefined);
  assert.strictEqual(res.body.authIssuer, undefined);
  assert.strictEqual(res.body._id, undefined);
  assert.strictEqual(res.body.__v, undefined);
});

test('13. Database lookup failure does not permit access or expose diagnostics', async () => {
  simulateDbFailure = true;
  const res = await sendRequest('GET', '/api/me', {
    authPayload: { iss: TRUSTED_ISSUER, sub: mockUsers.customer.authSubject }
  });
  assert.strictEqual(res.status, 500);
  assert.strictEqual(res.body.error, 'Internal Server Error');
  // Confirm no sensitive database connection strings or stack traces are leaked
  assert.strictEqual(res.body.stack, undefined);
  assert.strictEqual(res.body.message, 'An unexpected server error occurred.');
});

test('14. Denied requests cause no mutations or notifications', async () => {
  // Cross-restaurant admin attempting mutation on Restaurant B
  const res = await sendRequest('PATCH', '/restaurant/orders/status/order-pizzahut-2', {
    authPayload: { iss: TRUSTED_ISSUER, sub: mockUsers.adminA.authSubject },
    body: { status: 'ready for pickup' }
  });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(mutationsCalled.length, 0);
  assert.strictEqual(notificationsSent.length, 0);
  assert.strictEqual(mockOrders['order-pizzahut-2'].status, 'confirmed');
});

test('15. User model validation enforces required fields and valid restaurant mapping for admin role', () => {
  // Missing authIssuer and authSubject
  const emptyUser = new User({});
  const emptyErr = emptyUser.validateSync();
  assert(emptyErr.errors.authIssuer);
  assert(emptyErr.errors.authSubject);
  assert(emptyErr.errors.role);

  // Admin missing restaurantId
  const adminMissingRes = new User({
    authIssuer: TRUSTED_ISSUER,
    authSubject: 'auth0|admin_no_res',
    role: 'admin'
  });
  const adminMissingResErr = adminMissingRes.validateSync();
  assert(adminMissingResErr.errors.restaurantId);

  // Admin with unknown restaurantId ('999')
  const adminBadRes = new User({
    authIssuer: TRUSTED_ISSUER,
    authSubject: 'auth0|admin_bad_res',
    role: 'admin',
    restaurantId: '999'
  });
  const adminBadResErr = adminBadRes.validateSync();
  assert(adminBadResErr.errors.restaurantId);

  // Valid admin with Restaurant 1 (Barista)
  const validAdmin = new User({
    authIssuer: TRUSTED_ISSUER,
    authSubject: 'auth0|admin_valid',
    role: 'admin',
    restaurantId: '1'
  });
  assert.strictEqual(validAdmin.validateSync(), undefined);

  // Valid customer without restaurantId
  const validCust = new User({
    authIssuer: TRUSTED_ISSUER,
    authSubject: 'auth0|cust_valid',
    role: 'customer'
  });
  assert.strictEqual(validCust.validateSync(), undefined);
});

test('16. Provisioning script argument parser correctly parses arguments and flags', () => {
  const { parseArgs } = require('../scripts/provision-user');

  const parsed = parseArgs([
    '--sub', 'auth0|test_sub_123',
    '--role', 'admin',
    '--restaurant-id', '1',
    '--display-name', 'Barista Admin',
    '--dry-run'
  ]);

  assert.strictEqual(parsed.sub, 'auth0|test_sub_123');
  assert.strictEqual(parsed.role, 'admin');
  assert.strictEqual(parsed.restaurantId, '1');
  assert.strictEqual(parsed.displayName, 'Barista Admin');
  assert.strictEqual(parsed.dryRun, true);
});
