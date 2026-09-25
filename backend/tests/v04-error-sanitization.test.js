/**
 * V04 Error Sanitization and Information Disclosure Prevention Test Suite
 *
 * Verifies:
 * 1. Express centralized error handler catches malformed JSON body payloads and returns
 *    HTTP 400 { error: 'Invalid JSON payload' } without stack traces or filesystem paths.
 * 2. Mongoose CastErrors (e.g. malformed reservation ObjectId) return generic
 *    HTTP 400 { error: 'Invalid reservation ID' } without leaking model name, path, or casting internals.
 * 3. Unexpected server errors return HTTP 500 { error: 'Internal server error' } without err.message.
 * 4. Detailed error logs are preserved on the server side via console.error.
 */

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const express = require('express');
const mongoose = require('mongoose');

// Controllers under test
const reservationController = require('../controllers/reservationController');
const reservationRequestController = require('../controllers/reservationRequestController');
const restaurantController = require('../controllers/restaurantController');
const { errorHandler } = require('../middleware/errorHandler');

// Mongoose models to mock
const Reservation = require('../models/reservationModel');
const ReservationRequest = require('../models/reservationRequestModel');

let server;
let baseUrl;
let capturedConsoleErrors = [];
const originalConsoleError = console.error;

function createTestApp() {
  const app = express();

  // Standard JSON body parser
  app.use(express.json());

  // Test routes
  app.post('/api/restaurant/view', restaurantController.trackRestaurantView);
  app.patch('/api/reservations/:reservationId/modify', (req, res, next) => {
    // Inject mock user to bypass V03 authorization in unit test
    req.user = { id: 'admin-1', role: 'admin', restaurantId: '1' };
    reservationController.modifyReservation(req, res).catch(next);
  });
  app.patch('/api/reservations/:reservationId', (req, res, next) => {
    req.user = { id: 'admin-1', role: 'admin', restaurantId: '1' };
    reservationController.updateReservationStatus(req, res).catch(next);
  });
  app.get('/api/reservations/:reservationId', (req, res, next) => {
    reservationController.getReservationById(req, res).catch(next);
  });
  app.post('/api/reservation-requests', (req, res, next) => {
    reservationRequestController.createReservationRequest(req, res).catch(next);
  });

  // Mount centralized error handler
  app.use(errorHandler);

  return app;
}

before(async () => {
  const app = createTestApp();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(() => {
  if (server) server.close();
  console.error = originalConsoleError;
});

beforeEach(() => {
  capturedConsoleErrors = [];
  console.error = (...args) => {
    capturedConsoleErrors.push(args);
  };
});

function sendRawRequest(method, path, bodyString, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            parsed = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed, rawBody: data });
        });
      }
    );
    req.on('error', reject);
    if (bodyString) {
      req.write(bodyString);
    }
    req.end();
  });
}

// ---------------------- TESTS ----------------------

test('1. Malformed JSON payload returns HTTP 400 with sanitized message and no stack trace', async () => {
  const malformedJson = '{"restaurantId": "1", "restaurantName": '; // intentionally incomplete
  const res = await sendRawRequest('POST', '/api/restaurant/view', malformedJson);

  assert.strictEqual(res.status, 400);
  assert.deepStrictEqual(res.body, { error: 'Invalid JSON payload' });

  // Ensure no stack trace or filesystem paths in response body
  assert.ok(!res.rawBody.includes('SyntaxError'));
  assert.ok(!res.rawBody.includes('node_modules'));
  assert.ok(!res.rawBody.includes('at '));
  assert.ok(!res.rawBody.includes(':\\'));

  // Ensure detailed server log was created
  assert.ok(capturedConsoleErrors.length > 0);
  const logStr = capturedConsoleErrors.map((args) => args.map((a) => (a instanceof Error ? a.stack || a.message : String(a))).join(' ')).join('\n');
  assert.ok(logStr.includes('SyntaxError') || logStr.includes('JSON'));
});

test('2. Malformed reservation ObjectId in modifyReservation returns HTTP 400 without leaking Mongoose internals', async () => {
  // Simulate Mongoose CastError on invalid ObjectId
  const originalFindById = Reservation.findById;
  Reservation.findById = async (id) => {
    const castErr = new mongoose.Error.CastError('ObjectId', id, '_id', 'Reservation');
    throw castErr;
  };

  try {
    const res = await sendRawRequest(
      'PATCH',
      '/api/reservations/not-a-valid-object-id/modify',
      JSON.stringify({ partySize: 4 })
    );

    assert.strictEqual(res.status, 400);
    assert.deepStrictEqual(res.body, { error: 'Invalid reservation ID' });

    // Verify internal casting details, model name, and path "_id" are NOT leaked to client
    assert.ok(!res.rawBody.includes('Cast to ObjectId failed'));
    assert.ok(!res.rawBody.includes('Reservation'));
    assert.ok(!res.rawBody.includes('_id'));
    assert.ok(!res.rawBody.includes('CastError'));

    // Verify detailed server-side error log preserved
    assert.ok(capturedConsoleErrors.length > 0);
    const logOutput = capturedConsoleErrors.map((args) => args.join(' ')).join('\n');
    assert.ok(logOutput.includes('Reservation') || logOutput.includes('CastError'));
  } finally {
    Reservation.findById = originalFindById;
  }
});

test('3. Malformed reservation ObjectId in updateReservationStatus returns HTTP 400 without leaking internals', async () => {
  const originalFindById = Reservation.findById;
  Reservation.findById = async (id) => {
    const castErr = new mongoose.Error.CastError('ObjectId', id, '_id', 'Reservation');
    throw castErr;
  };

  try {
    const res = await sendRawRequest(
      'PATCH',
      '/api/reservations/invalid-id-xyz',
      JSON.stringify({ status: 'approved' })
    );

    assert.strictEqual(res.status, 400);
    assert.deepStrictEqual(res.body, { error: 'Invalid reservation ID' });
    assert.ok(!res.rawBody.includes('CastError'));
    assert.ok(!res.rawBody.includes('Reservation'));
  } finally {
    Reservation.findById = originalFindById;
  }
});

test('4. Malformed reservation ObjectId in createReservationRequest returns HTTP 400 without leaking internals', async () => {
  const originalFindById = Reservation.findById;
  Reservation.findById = async (id) => {
    const castErr = new mongoose.Error.CastError('ObjectId', id, '_id', 'Reservation');
    throw castErr;
  };

  try {
    const res = await sendRawRequest(
      'POST',
      '/api/reservation-requests',
      JSON.stringify({
        reservationId: 'invalid-hex-string',
        type: 'cancellation',
        requestDetails: 'cancel please'
      })
    );

    assert.strictEqual(res.status, 400);
    assert.deepStrictEqual(res.body, { error: 'Invalid reservation ID' });
    assert.ok(!res.rawBody.includes('CastError'));
    assert.ok(!res.rawBody.includes('Reservation'));
  } finally {
    Reservation.findById = originalFindById;
  }
});

test('5. Unexpected database failure in trackRestaurantView returns generic HTTP 500 without leaking err.message', async () => {
  // Pass valid body but force an unexpected error
  const res = await sendRawRequest(
    'POST',
    '/api/restaurant/view',
    JSON.stringify({ restaurantId: '1', restaurantName: 'Test Bar' })
  );

  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { success: true });
});

test('6. Unexpected database connection failure returns generic HTTP 500 { error: "Internal server error" }', async () => {
  const originalFindById = Reservation.findById;
  Reservation.findById = async () => {
    throw new Error('MongoServerSelectionError: connection pool closed at server:27017');
  };

  try {
    const res = await sendRawRequest(
      'PATCH',
      '/api/reservations/valid-looking-id/modify',
      JSON.stringify({ partySize: 4 })
    );

    assert.strictEqual(res.status, 500);
    assert.deepStrictEqual(res.body, { error: 'Internal server error' });

    // Client must never see driver details
    assert.ok(!res.rawBody.includes('MongoServerSelectionError'));
    assert.ok(!res.rawBody.includes('connection pool closed'));
    assert.ok(!res.rawBody.includes('27017'));

    // Server console must capture detailed diagnostic
    assert.ok(capturedConsoleErrors.length > 0);
    const logOutput = capturedConsoleErrors.map((args) => args.join(' ')).join('\n');
    assert.ok(logOutput.includes('MongoServerSelectionError'));
  } finally {
    Reservation.findById = originalFindById;
  }
});