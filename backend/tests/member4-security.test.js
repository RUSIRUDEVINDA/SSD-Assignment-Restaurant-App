const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { gzipSync } = require('node:zlib');
const { createFixture, orderPayload, reservationPayload } = require('./support/member4-fixture');
const { escapeHtml } = require('../utils/escapeHtml');
let fixture;
let server;
let base;
before(async () => { fixture = await createFixture(); });
after(() => { if (server) server.close(); });

async function freshApp() {
  if (server) await new Promise(resolve => server.close(resolve));
  const app = fixture.rootRequire('./app').createApp();
  server = await new Promise(resolve => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  base = `http://127.0.0.1:${server.address().port}`;
}
async function post(body, headers = {}, route = '/restaurant/orders') {
  return fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
}

test('V07 encodes five HTML metacharacters and preserves ordinary Unicode', () => {
  assert.equal(escapeHtml('<>&"\''), '&lt;&gt;&amp;&quot;&#39;');
  assert.equal(escapeHtml('Café සිංහල'), 'Café සිංහල');
  assert.equal(escapeHtml(null), '');
});

test('V07 order and reservation HTTP requests preserve data but email it as literal text', async () => {
  await freshApp();
  for (const [payload, route] of [[orderPayload, '/restaurant/orders'], [reservationPayload, '/api/restaurant/1/reservations']]) {
    const result = await post(payload, {}, route);
    assert.equal(result.status, 201);
    const saved = await result.json();
    assert.equal(saved.fullName || saved.customerName, '<b>SECURITY_TEST</b>');
    const mail = fixture.emails.at(-1);
    assert(mail.html.includes('&lt;b&gt;SECURITY_TEST&lt;/b&gt;'));
    assert(!mail.html.includes('<b>SECURITY_TEST</b>'));
  }
});

test('V07 every dynamic order text field is encoded, including item names and fallbacks', async () => {
  const mailer = fixture.rootRequire('./services/emailService');
  const payload = '<em>FIELD_TEST</em>';
  await mailer.sendOrderConfirmation('member4@example.invalid', {
    restaurantName: payload, customerName: payload, _id: payload,
    pickupTime: payload, totalAmount: payload,
    itemsPurchased: [{ name: payload, quantity: payload, price: 1 }]
  });
  const mail = fixture.emails.at(-1);
  assert(!mail.html.includes(payload));
  assert.equal((mail.html.match(/&lt;em&gt;FIELD_TEST&lt;\/em&gt;/g) || []).length, 7);
  assert.equal(mail.subject, 'Order Confirmation');
});

test('V07 every dynamic reservation text field is encoded; subjects contain no user data', async () => {
  const mailer = fixture.rootRequire('./services/emailService');
  const payload = '<em>FIELD_TEST</em>';
  await mailer.sendReservationConfirmation('member4@example.invalid', {
    restaurantName: payload, fullName: payload, _id: payload, time: payload, guests: payload
  });
  const mail = fixture.emails.at(-1);
  assert(!mail.html.includes(payload));
  assert.equal((mail.html.match(/&lt;em&gt;FIELD_TEST&lt;\/em&gt;/g) || []).length, 5);
  assert.equal(mail.subject, 'Reservation Confirmation');
});

test('V08 the eleventh write is 429, has retry headers and causes no writes or emails', async () => {
  await freshApp();
  const initialWrites = fixture.writes;
  const initialEmails = fixture.emails.length;
  for (let i = 0; i < 10; i++) assert.equal((await post(orderPayload)).status, 201);
  const blocked = await post(orderPayload);
  assert.equal(blocked.status, 429);
  assert(Number(blocked.headers.get('retry-after')) > 0);
  assert(blocked.headers.has('ratelimit'));
  assert.equal(fixture.writes - initialWrites, 10);
  assert.equal(fixture.emails.length - initialEmails, 10);
  // Alternate route and spoofed IP must not create a fresh budget.
  assert.equal((await post(reservationPayload, { 'X-Forwarded-For': '198.51.100.1' }, '/api/restaurant/1/reservations')).status, 429);
  assert.equal(fixture.writes - initialWrites, 10);
});

test('V08 read budget is shared across API prefixes and cannot be bypassed with query strings', async () => {
  await freshApp();
  for (let i = 0; i < 100; i++) {
    assert.equal((await fetch(base + `/api/unknown?attempt=${i}`)).status, 404);
  }
  assert.equal((await fetch(base + '/restaurant/unknown')).status, 429);
});

test('V08 bounded bodies and arrays reject before persistence; normal requests still succeed', async () => {
  await freshApp();
  const initial = fixture.writes;
  assert.equal((await post({ ...orderPayload, fullName: 'x'.repeat(34000) })).status, 413);
  assert.equal((await post({ ...orderPayload, fullName: 'x'.repeat(2001) })).status, 400);
  assert.equal((await post({ ...orderPayload, itemsPurchased: Array(51).fill(orderPayload.itemsPurchased[0]) })).status, 400);
  assert.equal((await fetch(base + '/restaurant/orders', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' },
    body: gzipSync(JSON.stringify(orderPayload))
  })).status, 415);
  const invalid = await fetch(base + '/restaurant/orders', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{'
  });
  assert.equal(invalid.status, 400);
  assert.equal(fixture.writes, initial);
  assert.equal((await post({ ...orderPayload, fullName: "O'Connor & Sons" })).status, 201);
});

test('V08 burst requests cannot exceed the write limit concurrently', async () => {
  await freshApp();
  const initial = fixture.writes;
  const statuses = await Promise.all(Array.from({ length: 15 }, async () => (await post(orderPayload)).status));
  assert.equal(statuses.filter(status => status === 201).length, 10);
  assert.equal(statuses.filter(status => status === 429).length, 5);
  assert.equal(fixture.writes - initial, 10);
});
