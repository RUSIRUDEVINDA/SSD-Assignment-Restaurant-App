/**
 * V06 Price & Business-Logic Tampering Test Suite
 * 
 * Verifies that the backend enforces authoritative server-side pricing,
 * discards any client-supplied totalAmount and item prices, and strictly
 * validates quantity bounds and catalog membership.
 *
 * OWASP Top 10:2021 – A04: Insecure Design
 * CWE-472: Impurchasable / Tampered Values
 * CWE-602: Client-Side Enforcement of Server-Side Security
 */

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const express = require('express');

// Authoritative pricing engine under test
const {
  validateAndPriceOrderItems,
  getAuthoritativeMenu,
  MENU_CATALOG_BY_RESTAURANT_ID
} = require('../utils/menuCatalog');

// Mocked persistence and services for HTTP integration testing
const RestaurantOrder = require('../models/restaurantOrderModel');
const emailService = require('../services/emailService');

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

const orderRouter = require('../routes/restaurantOrderRoute');

// Test tracking
let savedOrders = [];
let mockDb = {};

// Express test app
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
      // Default test customer identity
      req.user = {
        id: 'cust-test-1',
        role: 'customer'
      };
    }
    next();
  });

  app.use('/restaurant', orderRouter);
  app.use(authMiddleware.authErrorHandler);

  return app;
}

let server;
let baseUrl;

before(async () => {
  // Mock RestaurantOrder.create
  RestaurantOrder.create = async (data) => {
    const doc = {
      _id: 'order-' + Date.now() + '-' + Math.random().toString(36).substring(7),
      ...data,
      status: 'Pending',
      createdAt: new Date(),
      modifiedAt: null
    };
    savedOrders.push(doc);
    mockDb[doc._id] = doc;
    return doc;
  };

  // Mock RestaurantOrder.findById
  RestaurantOrder.findById = async (id) => {
    return mockDb[id] || null;
  };

  // Mock RestaurantOrder.findByIdAndUpdate
  RestaurantOrder.findByIdAndUpdate = async (id, update, options) => {
    if (!mockDb[id]) return null;
    mockDb[id] = { ...mockDb[id], ...update };
    return mockDb[id];
  };

  // Silence email sending in tests
  emailService.sendOrderConfirmation = async () => true;

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
  savedOrders = [];
  mockDb = {};
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
// Unit Tests: Authoritative Pricing Engine
// -------------------------------------------------------------

test('UNIT: validateAndPriceOrderItems accurately calculates total from catalog', () => {
  const result = validateAndPriceOrderItems('Barista', [
    { name: 'Cappuccino', quantity: 2 },
    { name: 'Croissant', quantity: 1 }
  ]);

  // Cappuccino is 4.95 * 2 = 9.90, Croissant is 3.25 -> Total: 13.15
  assert.strictEqual(result.totalAmount, 13.15);
  assert.strictEqual(result.canonicalRestaurantName, 'Barista');
  assert.strictEqual(result.sanitizedItems.length, 2);
  assert.strictEqual(result.sanitizedItems[0].price, 4.95);
  assert.strictEqual(result.sanitizedItems[1].price, 3.25);
});

test('UNIT: validateAndPriceOrderItems completely discards client-tampered price', () => {
  const result = validateAndPriceOrderItems('Palm Strip Bar & Restaurant', [
    { name: 'Filet Mignon', price: 0.01, quantity: 1 }
  ]);

  // Filet Mignon authoritative price is 32.95, client's 0.01 is ignored
  assert.strictEqual(result.totalAmount, 32.95);
  assert.strictEqual(result.sanitizedItems[0].price, 32.95);
});

test('UNIT: validateAndPriceOrderItems rejects negative quantity', () => {
  assert.throws(
    () => validateAndPriceOrderItems('Barista', [{ name: 'Espresso', quantity: -2 }]),
    (err) => err.status === 400 && err.message.includes('Quantity must be an integer between 1 and 50')
  );
});

test('UNIT: validateAndPriceOrderItems rejects zero quantity', () => {
  assert.throws(
    () => validateAndPriceOrderItems('Barista', [{ name: 'Espresso', quantity: 0 }]),
    (err) => err.status === 400 && err.message.includes('Quantity must be an integer between 1 and 50')
  );
});

test('UNIT: validateAndPriceOrderItems rejects non-integer/float quantity', () => {
  assert.throws(
    () => validateAndPriceOrderItems('Barista', [{ name: 'Espresso', quantity: 1.5 }]),
    (err) => err.status === 400 && err.message.includes('Quantity must be an integer between 1 and 50')
  );
});

test('UNIT: validateAndPriceOrderItems rejects item not belonging to the restaurant', () => {
  assert.throws(
    () => validateAndPriceOrderItems('Barista', [{ name: 'Filet Mignon', quantity: 1 }]),
    (err) => err.status === 400 && err.message.includes('not offered by restaurant "Barista"')
  );
});

test('UNIT: validateAndPriceOrderItems rejects empty item list', () => {
  assert.throws(
    () => validateAndPriceOrderItems('Barista', []),
    (err) => err.status === 400 && err.message.includes('at least one item')
  );
});

test('UNIT: validateAndPriceOrderItems rejects unknown restaurant name', () => {
  assert.throws(
    () => validateAndPriceOrderItems('NonExistentCafé', [{ name: 'Latte', quantity: 1 }]),
    (err) => err.status === 400 && err.message.includes('Unknown restaurant')
  );
});

// -------------------------------------------------------------
// Integration Tests: HTTP API Defense Verification
// -------------------------------------------------------------

test('INTEGRATION: POST /restaurant/orders overrides client totalAmount and item price tampering', async () => {
  const tamperedOrder = {
    restaurantName: 'Palm Strip Bar & Restaurant',
    itemsPurchased: [
      { name: 'Filet Mignon', price: 0.01, quantity: 1 },
      { name: 'Crème Brûlée', price: 0.01, quantity: 1 }
    ],
    totalAmount: 0.02, // Attacker tamper attempt!
    fullName: 'Attacker Customer',
    email: 'attacker@example.com',
    phoneNumber: '+94771234567',
    pickupTime: '19:30'
  };

  const res = await makeRequest('POST', '/restaurant/orders', tamperedOrder);

  assert.strictEqual(res.status, 201);
  // Authoritative: Filet Mignon (32.95) + Crème Brûlée (9.95) = 42.90
  assert.strictEqual(res.body.totalAmount, 42.90);
  assert.strictEqual(res.body.itemsPurchased[0].price, 32.95);
  assert.strictEqual(res.body.itemsPurchased[1].price, 9.95);

  // Check persisted record in database
  assert.strictEqual(savedOrders.length, 1);
  assert.strictEqual(savedOrders[0].totalAmount, 42.90);
});

test('INTEGRATION: POST /restaurant/orders rejects negative quantity with 400 Bad Request', async () => {
  const maliciousOrder = {
    restaurantName: 'Barista',
    itemsPurchased: [
      { name: 'Latte', quantity: -3 }
    ],
    fullName: 'Attacker',
    email: 'attacker@example.com',
    phoneNumber: '+94771234567',
    pickupTime: '10:30'
  };

  const res = await makeRequest('POST', '/restaurant/orders', maliciousOrder);

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error, 'Bad Request');
  assert.match(res.body.message, /Quantity must be an integer between 1 and 50/);
  assert.strictEqual(savedOrders.length, 0); // Nothing saved
});

test('INTEGRATION: POST /restaurant/orders rejects cross-tenant/unauthorized item with 400 Bad Request', async () => {
  const crossRestaurantOrder = {
    restaurantName: 'Barista',
    itemsPurchased: [
      { name: 'Double Bacon Burger', quantity: 1 } // Burger King item, not Barista
    ],
    fullName: 'Attacker',
    email: 'attacker@example.com',
    phoneNumber: '+94771234567',
    pickupTime: '11:00'
  };

  const res = await makeRequest('POST', '/restaurant/orders', crossRestaurantOrder);

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error, 'Bad Request');
  assert.match(res.body.message, /not offered by restaurant "Barista"/);
  assert.strictEqual(savedOrders.length, 0);
});

test('INTEGRATION: PATCH /restaurant/orders/:id authoritatively recalculates total on order modification', async () => {
  // Pre-seed an order in the mock database
  const orderId = 'order-barista-update-1';
  mockDb[orderId] = {
    _id: orderId,
    restaurantName: 'Barista',
    itemsPurchased: [{ name: 'Cappuccino', quantity: 1, price: 4.95 }],
    totalAmount: 4.95,
    fullName: 'John Regular',
    email: 'john@example.com',
    phoneNumber: '+94771234567',
    pickupTime: '10:00'
  };

  const adminUser = {
    id: 'admin-barista-1',
    role: 'admin',
    restaurantId: '1' // Barista ID
  };

  // Attempt to update items and tamper with totalAmount
  const updatePayload = {
    restaurantName: 'Barista',
    itemsPurchased: [
      { name: 'Cappuccino', quantity: 3, price: 0.10 } // Real: 4.95 * 3 = 14.85
    ],
    totalAmount: 0.30, // Tampered total override
    fullName: 'John Regular',
    phoneNumber: '+94771234567',
    pickupTime: '11:00'
  };

  const res = await makeRequest('PATCH', `/restaurant/orders/${orderId}`, updatePayload, {
    'x-test-user': JSON.stringify(adminUser)
  });

  assert.strictEqual(res.status, 200);
  // Authoritative total must be 4.95 * 3 = 14.85, completely ignoring 0.30
  assert.strictEqual(res.body.totalAmount, 14.85);
  assert.strictEqual(res.body.itemsPurchased[0].price, 4.95);
  assert.strictEqual(mockDb[orderId].totalAmount, 14.85);
});
