/**
 * V03 Administrator Authorization & Scope Verification Test Suite
 * 
 * Tests route/middleware/controller composition using isolated mocked persistence.
 * Does NOT connect to the remote MongoDB database.
 * Tests all authorization, tenant scoping, tamper-resistance, route consolidation,
 * and regression scenarios.
 */

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const express = require('express');

// Models and services to mock
const RestaurantOrder = require('../models/restaurantOrderModel');
const OrderRequest = require('../models/orderRequestModel');
const Reservation = require('../models/reservationModel');
const ReservationRequest = require('../models/reservationRequestModel');
const whatsappService = require('../services/whatsappService');
const { isUserInRestaurantScope, getRestaurantNameById, getRestaurantIdByName } = require('../utils/restaurantMapping');

// Test environment authentication harness
// Synthetic identity injection exists exclusively in test files
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

// Routers under test (imported after requireAuth test harness setup)
const orderRouter = require('../routes/restaurantOrderRoute');
const reservationRouter = require('../routes/reservationRoute');

// Test tracking variables
let mutationsCalled = [];
let notificationsSent = [];
let queriesMade = [];
let mockDb = {};

// Express test app setup
function createTestApp() {
  const app = express();
  app.use(express.json());

  // Synthetic identity injection header - ONLY present in isolated test environment
  app.use((req, res, next) => {
    if (req.headers['x-test-user']) {
      try {
        req.user = JSON.parse(req.headers['x-test-user']);
      } catch (e) {
        req.user = null;
      }
    }
    next();
  });

  app.use('/restaurant', orderRouter);
  app.use('/api', reservationRouter);

  // Mount authentication error handler under test
  app.use(authMiddleware.authErrorHandler);

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
  queriesMade = [];

  // Seed mocked documents in isolated collections
  mockDb = {
    orders: {
      'order-barista-1': {
        _id: 'order-barista-1',
        restaurantName: 'Barista',
        status: 'confirmed',
        itemsPurchased: [{ name: 'Coffee', price: 450, quantity: 2 }],
        totalAmount: 900,
        fullName: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '0770000001',
        pickupTime: '10:00'
      },
      'order-pizzahut-2': {
        _id: 'order-pizzahut-2',
        restaurantName: 'Pizza Hut',
        status: 'confirmed',
        itemsPurchased: [{ name: 'Pizza', price: 1800, quantity: 1 }],
        totalAmount: 1800,
        fullName: 'Jane Smith',
        email: 'jane@example.com',
        phoneNumber: '0770000002',
        pickupTime: '12:00'
      }
    },
    orderRequests: {
      'req-order-barista-1': {
        _id: 'req-order-barista-1',
        orderId: 'order-barista-1',
        type: 'cancellation',
        status: 'pending',
        requestDetails: 'Cancel this order'
      },
      'req-order-pizzahut-2': {
        _id: 'req-order-pizzahut-2',
        orderId: 'order-pizzahut-2',
        type: 'cancellation',
        status: 'pending',
        requestDetails: 'Cancel pizza order'
      },
      'req-order-processed': {
        _id: 'req-order-processed',
        orderId: 'order-barista-1',
        type: 'cancellation',
        status: 'approved'
      },
      'req-order-missing-parent': {
        _id: 'req-order-missing-parent',
        orderId: 'order-nonexistent',
        type: 'cancellation',
        status: 'pending'
      }
    },
    reservations: {
      'res-barista-1': {
        _id: 'res-barista-1',
        restaurantId: '1',
        restaurantName: 'Barista',
        status: 'booked',
        date: new Date(),
        time: '14:00',
        partySize: 2,
        customerName: 'Alice',
        customerPhone: '0771234567'
      },
      'res-pizzahut-2': {
        _id: 'res-pizzahut-2',
        restaurantId: '2',
        restaurantName: 'Pizza Hut',
        status: 'booked',
        date: new Date(),
        time: '18:00',
        partySize: 4,
        customerName: 'Bob',
        customerPhone: '0777654321'
      }
    },
    reservationRequests: {
      '507f1f77bcf86cd799439011': {
        _id: '507f1f77bcf86cd799439011',
        reservationId: 'res-barista-1',
        restaurantId: '1',
        type: 'cancellation',
        status: 'pending'
      },
      '507f1f77bcf86cd799439022': {
        _id: '507f1f77bcf86cd799439022',
        reservationId: 'res-pizzahut-2',
        restaurantId: '2',
        type: 'cancellation',
        status: 'pending'
      },
      '507f1f77bcf86cd799439033': {
        _id: '507f1f77bcf86cd799439033',
        reservationId: 'res-missing-parent',
        restaurantId: '1',
        type: 'cancellation',
        status: 'pending'
      }
    }
  };

  // Mock RestaurantOrder methods with query filtering and mutation tracking
  RestaurantOrder.findById = async (id) => mockDb.orders[id] || null;
  RestaurantOrder.findByIdAndUpdate = async (id, update, opts) => {
    mutationsCalled.push({ type: 'RestaurantOrder.findByIdAndUpdate', id, update });
    if (mockDb.orders[id]) {
      Object.assign(mockDb.orders[id], update);
      return mockDb.orders[id];
    }
    return null;
  };
  RestaurantOrder.findByIdAndDelete = async (id) => {
    mutationsCalled.push({ type: 'RestaurantOrder.findByIdAndDelete', id });
    const item = mockDb.orders[id];
    delete mockDb.orders[id];
    return item || null;
  };
  RestaurantOrder.find = (query = {}) => {
    queriesMade.push({ collection: 'orders', query });
    let results = Object.values(mockDb.orders);
    if (query.restaurantName) {
      results = results.filter(o => o.restaurantName.toLowerCase() === query.restaurantName.toLowerCase());
    }
    return {
      sort: () => results,
      then: (resolve) => resolve(results)
    };
  };

  // Mock OrderRequest methods
  OrderRequest.findById = async (id) => mockDb.orderRequests[id] || null;
  OrderRequest.findOneAndUpdate = async (filter, update, opts) => {
    mutationsCalled.push({ type: 'OrderRequest.findOneAndUpdate', filter, update });
    const target = mockDb.orderRequests[filter._id];
    if (target && (!filter.status || target.status === filter.status)) {
      if (update.$set) {
        Object.assign(target, update.$set);
      } else {
        Object.assign(target, update);
      }
      return target;
    }
    return null; // Condition not met (already processed concurrently)
  };
  OrderRequest.find = (query = {}) => {
    queriesMade.push({ collection: 'orderRequests', query });
    let results = Object.values(mockDb.orderRequests);
    if (query.orderId && query.orderId.$in) {
      results = results.filter(r => query.orderId.$in.includes(r.orderId));
    }
    return Promise.resolve(results);
  };

  // Mock Reservation methods
  Reservation.findById = async (id) => mockDb.reservations[id] || null;
  Reservation.findByIdAndUpdate = async (id, update, opts) => {
    mutationsCalled.push({ type: 'Reservation.findByIdAndUpdate', id, update });
    if (mockDb.reservations[id]) {
      Object.assign(mockDb.reservations[id], update);
      return mockDb.reservations[id];
    }
    return null;
  };
  Reservation.findByIdAndDelete = async (id) => {
    mutationsCalled.push({ type: 'Reservation.findByIdAndDelete', id });
    const item = mockDb.reservations[id];
    delete mockDb.reservations[id];
    return item || null;
  };
  Reservation.find = (query = {}) => {
    queriesMade.push({ collection: 'reservations', query });
    let results = Object.values(mockDb.reservations);
    if (query.restaurantId) {
      results = results.filter(r => String(r.restaurantId) === String(query.restaurantId));
    }
    return Promise.resolve(results);
  };

  // Mock ReservationRequest methods
  ReservationRequest.findById = async (id) => mockDb.reservationRequests[id] || null;
  ReservationRequest.findOneAndUpdate = async (filter, update, opts) => {
    mutationsCalled.push({ type: 'ReservationRequest.findOneAndUpdate', filter, update });
    const target = mockDb.reservationRequests[filter._id];
    if (target && (!filter.status || target.status === filter.status)) {
      if (update.$set) {
        Object.assign(target, update.$set);
      } else {
        Object.assign(target, update);
      }
      return target;
    }
    return null;
  };
  ReservationRequest.find = (query = {}) => {
    queriesMade.push({ collection: 'reservationRequests', query });
    let results = Object.values(mockDb.reservationRequests);
    if (query.restaurantId) {
      results = results.filter(r => String(r.restaurantId) === String(query.restaurantId));
    }
    return Promise.resolve(results);
  };

  // Mock WhatsApp notification service
  whatsappService.sendOrderReadyNotification = async (order) => {
    notificationsSent.push({ phoneNumber: order.phoneNumber, orderId: order._id, status: order.status });
    return { success: true };
  };
  whatsappService.sendOrderStatusUpdate = async (phoneNumber, orderId, status) => {
    notificationsSent.push({ phoneNumber, orderId, status });
    return { success: true };
  };
});

// Helper for test requests
async function sendRequest(method, path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (options.user) {
    headers['x-test-user'] = JSON.stringify(options.user);
  }

  const fetchOptions = {
    method,
    headers
  };

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
// TEST SUITE: 20 COMPREHENSIVE AUTHORIZATION & REGRESSION SCENARIOS
// ============================================================================

test('1. Anonymous admin-operation request returns 401 Unauthorized', async () => {
  const res = await sendRequest('GET', '/restaurant/orders/restaurant/Barista');
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.error, 'Unauthorized');
});

test('2. Customer role attempting admin operation returns 403 Forbidden', async () => {
  const user = { id: 'cust-1', role: 'customer' };
  const res = await sendRequest('GET', '/restaurant/orders/restaurant/Barista', { user });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.body.error, 'Forbidden');
});

test('3. Unknown or malformed role returns 403 Forbidden', async () => {
  const user = { id: 'bad-1', role: 'superhacker' };
  const res = await sendRequest('GET', '/restaurant/orders/restaurant/Barista', { user });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.body.error, 'Forbidden');
});

test('4. Restaurant admin without assigned restaurantId returns 403 Forbidden', async () => {
  const user = { id: 'admin-unassigned', role: 'admin' };
  const res = await sendRequest('GET', '/restaurant/orders/restaurant/Barista', { user });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.body.error, 'Forbidden');
});

test('5. Admin A successfully reads Restaurant A orders list and database filter is asserted', async () => {
  const user = { id: 'admin-barista', role: 'admin', restaurantId: '1' };
  const res = await sendRequest('GET', '/restaurant/orders/restaurant/Barista', { user });

  assert.strictEqual(res.status, 200);
  assert(Array.isArray(res.body), 'Response must be an array');
  assert.strictEqual(res.body.length, 1);
  assert.strictEqual(res.body[0].restaurantName, 'Barista');
  // Confirm other restaurants records are absent
  assert(!res.body.some(o => o.restaurantName === 'Pizza Hut'));

  // Assert expected database predicate was used
  const orderQueries = queriesMade.filter(q => q.collection === 'orders');
  assert(orderQueries.length > 0);
  assert.strictEqual(orderQueries[0].query.restaurantName, 'Barista');
});

test('6. Admin A attempting to read Restaurant B list returns 403 Forbidden', async () => {
  const user = { id: 'admin-barista', role: 'admin', restaurantId: '1' };
  const res = await sendRequest('GET', '/restaurant/orders/restaurant/Pizza%20Hut', { user });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.body.error, 'Forbidden');
});

test('7. Admin A successfully updates order within Restaurant A scope', async () => {
  const user = { id: 'admin-barista', role: 'admin', restaurantId: '1' };
  const res = await sendRequest('PATCH', '/restaurant/orders/status/order-barista-1', {
    user,
    body: { status: 'processing' }
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'processing');
  assert.strictEqual(mutationsCalled.length, 1);
});

test('8. Admin A attempting to update Restaurant B order returns 403 and causes no mutation', async () => {
  const user = { id: 'admin-barista', role: 'admin', restaurantId: '1' };
  const res = await sendRequest('PATCH', '/restaurant/orders/status/order-pizzahut-2', {
    user,
    body: { status: 'processing' }
  });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(mutationsCalled.length, 0);
  assert.strictEqual(notificationsSent.length, 0);
});

test('9. Admin A successfully approves Restaurant A order request', async () => {
  const user = { id: 'admin-barista', role: 'admin', restaurantId: '1' };
  const res = await sendRequest('PATCH', '/restaurant/order-requests/req-order-barista-1', {
    user,
    body: { status: 'approved', adminResponse: 'Order cancelled as requested' }
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'approved');
  assert.strictEqual(mutationsCalled.some(m => m.type === 'OrderRequest.findOneAndUpdate'), true);
});

test('10. Admin A attempting to approve Restaurant B order request returns 403', async () => {
  const user = { id: 'admin-barista', role: 'admin', restaurantId: '1' };
  const res = await sendRequest('PATCH', '/restaurant/order-requests/req-order-pizzahut-2', {
    user,
    body: { status: 'approved' }
  });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(mutationsCalled.length, 0);
});

test('11. Reservation listing: Admin A reads own restaurant (200), denied on other (403)', async () => {
  const user = { id: 'admin-barista', role: 'admin', restaurantId: '1' };

  // Own restaurant
  const resOwn = await sendRequest('GET', '/api/restaurant/1/reservations', { user });
  assert.strictEqual(resOwn.status, 200);
  assert(Array.isArray(resOwn.body));
  assert.strictEqual(resOwn.body.length, 1);
  assert.strictEqual(resOwn.body[0].restaurantId, '1');
  assert(!resOwn.body.some(r => r.restaurantId === '2'));

  // Database scope predicate asserted
  const resQueries = queriesMade.filter(q => q.collection === 'reservations');
  assert(resQueries.length > 0);
  assert.strictEqual(resQueries[0].query.restaurantId, '1');

  // Other restaurant
  const resOther = await sendRequest('GET', '/api/restaurant/2/reservations', { user });
  assert.strictEqual(resOther.status, 403);
});

test('12. Reservation requests: Admin A approves own restaurant (200), denied on other (403)', async () => {
  const user = { id: 'admin-barista', role: 'admin', restaurantId: '1' };

  // Own restaurant cancellation approval deletes parent reservation
  const resOwn = await sendRequest('PATCH', '/api/reservation-requests/507f1f77bcf86cd799439011', {
    user,
    body: { status: 'approved' }
  });
  assert.strictEqual(resOwn.status, 200);
  assert.strictEqual(resOwn.body.status, 'approved');
  assert(mutationsCalled.some(m => m.type === 'Reservation.findByIdAndDelete'));

  // Other restaurant request approval denied
  const resOther = await sendRequest('PATCH', '/api/reservation-requests/507f1f77bcf86cd799439022', {
    user,
    body: { status: 'approved' }
  });
  assert.strictEqual(resOther.status, 403);
});

test('13. mainAdmin succeeds across restaurants on administrative operations', async () => {
  const mainAdmin = { id: 'main-admin-1', role: 'mainAdmin' };

  // Global orders
  const resGlobal = await sendRequest('GET', '/restaurant/orders', { user: mainAdmin });
  assert.strictEqual(resGlobal.status, 200);

  // Cross-restaurant order status update
  const resPizza = await sendRequest('PATCH', '/restaurant/orders/status/order-pizzahut-2', {
    user: mainAdmin,
    body: { status: 'ready for pickup' }
  });
  assert.strictEqual(resPizza.status, 200);
  assert.strictEqual(resPizza.body.status, 'ready for pickup');
});

test('14. Client parameters in body/query claiming mainAdmin or different restaurantId are ignored', async () => {
  // Caller has real role 'admin' for Barista, but attempts to spoof role in body
  const user = { id: 'admin-barista', role: 'admin', restaurantId: '1' };
  const res = await sendRequest('PATCH', '/restaurant/orders/status/order-pizzahut-2', {
    user,
    body: { status: 'processing', role: 'mainAdmin', restaurantId: '2' }
  });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(mutationsCalled.length, 0);
});

test('15. Order request with nonexistent parent order returns 404 with zero mutations', async () => {
  const user = { id: 'admin-barista', role: 'admin', restaurantId: '1' };
  const res = await sendRequest('PATCH', '/restaurant/order-requests/req-order-missing-parent', {
    user,
    body: { status: 'approved' }
  });
  assert.strictEqual(res.status, 404);
  assert.strictEqual(mutationsCalled.length, 0);
});

test('16. Generic order update (PATCH /orders/:id) enforces authorization and prevents restaurant reassignment', async () => {
  // 1. Anonymous rejected
  const resAnon = await sendRequest('PATCH', '/restaurant/orders/order-barista-1', {
    body: { itemsPurchased: [{ name: 'Cake', price: 500, quantity: 1 }], totalAmount: 500, fullName: 'John', phoneNumber: '0770000001', pickupTime: '11:00' }
  });
  assert.strictEqual(resAnon.status, 401);

  // 2. Customer rejected
  const resCust = await sendRequest('PATCH', '/restaurant/orders/order-barista-1', {
    user: { id: 'cust-1', role: 'customer' },
    body: { itemsPurchased: [{ name: 'Cake', price: 500, quantity: 1 }], totalAmount: 500, fullName: 'John', phoneNumber: '0770000001', pickupTime: '11:00' }
  });
  assert.strictEqual(resCust.status, 403);

  // 3. Admin B cannot update Admin A's order
  const adminB = { id: 'admin-pizzahut', role: 'admin', restaurantId: '2' };
  const resCross = await sendRequest('PATCH', '/restaurant/orders/order-barista-1', {
    user: adminB,
    body: { itemsPurchased: [{ name: 'Cake', price: 500, quantity: 1 }], totalAmount: 500, fullName: 'John', phoneNumber: '0770000001', pickupTime: '11:00' }
  });
  assert.strictEqual(resCross.status, 403);

  // 4. Regression test: Reassignment of restaurant is rejected (400) and cannot make Admin B authorized
  const adminA = { id: 'admin-barista', role: 'admin', restaurantId: '1' };
  const resReassign = await sendRequest('PATCH', '/restaurant/orders/order-barista-1', {
    user: adminA,
    body: {
      restaurantName: 'Pizza Hut', // Attempting to reassign restaurant
      itemsPurchased: [{ name: 'Coffee', price: 450, quantity: 2 }],
      totalAmount: 900,
      fullName: 'John Doe',
      phoneNumber: '0770000001',
      pickupTime: '10:00'
    }
  });
  assert.strictEqual(resReassign.status, 400);
  assert.strictEqual(mockDb.orders['order-barista-1'].restaurantName, 'Barista'); // Not reassigned

  // Admin B still cannot manage it
  const resAdminBCheck = await sendRequest('PATCH', '/restaurant/orders/status/order-barista-1', {
    user: adminB,
    body: { status: 'processing' }
  });
  assert.strictEqual(resAdminBCheck.status, 403);

  // 5. Valid update by authorized Admin A succeeds with preserved stored restaurantName and email
  const resLegit = await sendRequest('PATCH', '/restaurant/orders/order-barista-1', {
    user: adminA,
    body: {
      itemsPurchased: [{ name: 'Espresso', price: 300, quantity: 1 }],
      totalAmount: 300,
      fullName: 'John Updated',
      phoneNumber: '0770000001',
      pickupTime: '10:30'
    }
  });
  assert.strictEqual(resLegit.status, 200);
  assert.strictEqual(resLegit.body.restaurantName, 'Barista');
  assert.strictEqual(resLegit.body.email, 'john@example.com');
});

test('17. Generic reservation modify (PATCH /reservations/:id/modify) enforces RBAC, scope, and allowlist', async () => {
  // 1. Anonymous rejected
  const resAnon = await sendRequest('PATCH', '/api/reservations/res-barista-1/modify', {
    body: { partySize: 3 }
  });
  assert.strictEqual(resAnon.status, 401);

  // 2. Customer rejected until V04
  const resCust = await sendRequest('PATCH', '/api/reservations/res-barista-1/modify', {
    user: { id: 'cust-1', role: 'customer' },
    body: { partySize: 3 }
  });
  assert.strictEqual(resCust.status, 403);

  // 3. Admin B denied on Admin A's reservation
  const adminB = { id: 'admin-pizzahut', role: 'admin', restaurantId: '2' };
  const resCross = await sendRequest('PATCH', '/api/reservations/res-barista-1/modify', {
    user: adminB,
    body: { partySize: 3 }
  });
  assert.strictEqual(resCross.status, 403);

  // 4. Attempt to alter status or reassign restaurantId rejected
  const adminA = { id: 'admin-barista', role: 'admin', restaurantId: '1' };
  const resTamper = await sendRequest('PATCH', '/api/reservations/res-barista-1/modify', {
    user: adminA,
    body: { restaurantId: '2', status: 'completed' }
  });
  assert.strictEqual(resTamper.status, 400);

  // 5. Legitimate admin modification succeeds on allowlisted fields
  const resValid = await sendRequest('PATCH', '/api/reservations/res-barista-1/modify', {
    user: adminA,
    body: { partySize: 5, customerPhone: '0779998887' }
  });
  assert.strictEqual(resValid.status, 200);
  assert.strictEqual(resValid.body.partySize, 5);
  assert.strictEqual(resValid.body.status, 'modified');
});

test('18. isUserInRestaurantScope strictly rejects missing, malformed, and contradictory target scopes', () => {
  const admin1 = { id: 'admin-1', role: 'admin', restaurantId: '1' };
  const mainAdmin = { id: 'main-1', role: 'mainAdmin' };

  // Empty scope
  assert.strictEqual(isUserInRestaurantScope(admin1, {}), false);
  assert.strictEqual(isUserInRestaurantScope(mainAdmin, {}), false);

  // Blank identifiers
  assert.strictEqual(isUserInRestaurantScope(admin1, { restaurantId: '' }), false);
  assert.strictEqual(isUserInRestaurantScope(admin1, { restaurantName: '   ' }), false);

  // Malformed / unknown identifiers
  assert.strictEqual(isUserInRestaurantScope(admin1, { restaurantId: '999' }), false);
  assert.strictEqual(isUserInRestaurantScope(admin1, { restaurantName: 'Unknown Café' }), false);

  // Conflicting restaurantId and restaurantName
  assert.strictEqual(isUserInRestaurantScope(admin1, { restaurantId: '1', restaurantName: 'Pizza Hut' }), false);

  // Invalid user identity contract (missing or blank id)
  assert.strictEqual(isUserInRestaurantScope({ id: '', role: 'admin', restaurantId: '1' }, { restaurantId: '1' }), false);
  assert.strictEqual(isUserInRestaurantScope({ role: 'admin', restaurantId: '1' }, { restaurantId: '1' }), false);

  // Customer role
  assert.strictEqual(isUserInRestaurantScope({ id: 'cust-1', role: 'customer' }, { restaurantId: '1' }), false);

  // Valid matches
  assert.strictEqual(isUserInRestaurantScope(admin1, { restaurantId: '1' }), true);
  assert.strictEqual(isUserInRestaurantScope(admin1, { restaurantName: 'Barista' }), true);
  assert.strictEqual(isUserInRestaurantScope(admin1, { restaurantId: '1', restaurantName: 'Barista' }), true);
});

test('19. Restaurant 6 authoritative mapping matches application catalog ("Palm Strip Bar & Restaurant")', () => {
  const idMatch = getRestaurantIdByName('Palm Strip Bar & Restaurant');
  assert.strictEqual(idMatch, '6');

  const nameMatch = getRestaurantNameById('6');
  assert.strictEqual(nameMatch, 'Palm Strip Bar & Restaurant');

  const admin6 = { id: 'admin-6', role: 'admin', restaurantId: '6' };
  assert.strictEqual(isUserInRestaurantScope(admin6, { restaurantId: '6' }), true);
  assert.strictEqual(isUserInRestaurantScope(admin6, { restaurantName: 'Palm Strip Bar & Restaurant' }), true);
  assert.strictEqual(isUserInRestaurantScope(admin6, { restaurantId: '6', restaurantName: 'Palm Strip Bar & Restaurant' }), true);
});

test('20. Already-processed requests are rejected and notification permissions are enforced', async () => {
  const user = { id: 'admin-barista', role: 'admin', restaurantId: '1' };

  // 1. Approving already processed request returns 400 or 409
  const resAlready = await sendRequest('PATCH', '/restaurant/order-requests/req-order-processed', {
    user,
    body: { status: 'approved' }
  });
  assert(resAlready.status === 400 || resAlready.status === 409);

  // 2. Denied requests never dispatch notifications
  const resDenied = await sendRequest('PATCH', '/restaurant/orders/status/order-pizzahut-2', {
    user,
    body: { status: 'ready for pickup' }
  });
  assert.strictEqual(resDenied.status, 403);
  assert.strictEqual(notificationsSent.length, 0);

  // 3. Legitimate status update to ready for pickup dispatches notification
  const resReady = await sendRequest('PATCH', '/restaurant/orders/status/order-barista-1', {
    user,
    body: { status: 'ready for pickup' }
  });
  assert.strictEqual(resReady.status, 200);
  assert.strictEqual(notificationsSent.length, 1);
  assert.strictEqual(notificationsSent[0].phoneNumber, '0770000001');
});

test('21. authErrorHandler returns generic JSON 401, sets headers, and passes non-auth errors through', () => {
  const { authErrorHandler } = authMiddleware;

  // 1. Authentication error handling
  let statusCode = null;
  let jsonResponse = null;
  let headersSet = null;
  let nextCalledWith = null;

  const mockReq = { method: 'POST', originalUrl: '/api/test' };
  const mockRes = {
    status: (code) => { statusCode = code; return mockRes; },
    json: (body) => { jsonResponse = body; return mockRes; },
    set: (headers) => { headersSet = headers; return mockRes; }
  };
  const mockErr = new Error('Token verification failed');
  mockErr.name = 'UnauthorizedError';
  mockErr.status = 401;
  mockErr.headers = { 'WWW-Authenticate': 'Bearer error="invalid_token"' };

  authErrorHandler(mockErr, mockReq, mockRes, (err) => { nextCalledWith = err; });

  assert.strictEqual(statusCode, 401);
  assert.deepStrictEqual(jsonResponse, { error: 'Unauthorized', message: 'Authentication required' });
  assert.deepStrictEqual(headersSet, { 'WWW-Authenticate': 'Bearer error="invalid_token"' });
  assert.strictEqual(nextCalledWith, null);

  // 2. Non-authentication error passes through to next(err)
  let nonAuthPassed = null;
  const nonAuthErr = new Error('Database connection failed');
  nonAuthErr.status = 500;
  authErrorHandler(nonAuthErr, mockReq, mockRes, (err) => { nonAuthPassed = err; });
  assert.strictEqual(nonAuthPassed, nonAuthErr);
});

