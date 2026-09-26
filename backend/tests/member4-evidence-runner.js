/* Generates repeatable, local-only evidence for the Member 4 report. */
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const Module = require('node:module');
const { createFixture, orderPayload, reservationPayload } = require('./support/member4-fixture');

const backendRoot = path.resolve(__dirname, '..');
const baselineRoot = process.argv[2] ? path.resolve(process.argv[2]) : null;
const outPath = process.argv[3] ? path.resolve(process.argv[3]) : path.resolve(__dirname, '../../evidence/member4-evidence.json');

function loadBaselineMailer(root) {
  process.env.NODE_PATH = path.resolve(backendRoot, 'node_modules');
  Module._initPaths();
  const nodemailer = require('nodemailer');
  const captured = [];
  const original = nodemailer.createTransport;
  nodemailer.createTransport = () => ({ sendMail: async options => { captured.push(options); return { messageId: 'baseline-captured' }; } });
  delete require.cache[require.resolve(path.join(root, 'services/emailService.js'))];
  const mailer = require(path.join(root, 'services/emailService.js'));
  return { mailer, captured, restore: () => { nodemailer.createTransport = original; } };
}

function listen(app) {
  return new Promise(resolve => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}
async function request(base, method, route, body) {
  const response = await fetch(base + route, {
    method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined
  });
  return { status: response.status, headers: Object.fromEntries(response.headers), text: await response.text() };
}
async function main() {
  if (!baselineRoot) throw new Error('Pass the archived baseline backend path.');
  const baselineMailer = loadBaselineMailer(baselineRoot);
  await baselineMailer.mailer.sendOrderConfirmation('evidence@example.invalid', {
    ...orderPayload, _id: 'baseline-order', fullName: '<b>SECURITY_TEST</b>'
  });
  baselineMailer.restore();
  const baselineEmailHtml = baselineMailer.captured[0].html;

  const fixed = await createFixture();
  const server = await listen(fixed.app);
  const base = `http://127.0.0.1:${server.address().port}`;
  const fixedOrder = await request(base, 'POST', '/restaurant/orders', orderPayload);
  const fixedReservation = await request(base, 'POST', '/api/restaurant/1/reservations', reservationPayload);
  const fixedEmailHtml = fixed.emails[0].html;
  server.close();

  // A separate instance avoids consuming the write budget during V07 verification.
  const rateFixture = await createFixture();
  const rateServer = await listen(rateFixture.app);
  const rateBase = `http://127.0.0.1:${rateServer.address().port}`;
  const writeStatuses = [];
  let rateHeaders = {};
  for (let i = 0; i < 11; i++) {
    const result = await request(rateBase, 'POST', '/restaurant/orders', { ...orderPayload, fullName: `Rate test ${i}` });
    writeStatuses.push(result.status);
    rateHeaders = result.headers;
  }
  rateServer.close();

  const evidence = {
    generatedAt: new Date().toISOString(),
    scope: 'Local isolated verification: real Express routes, controllers and email templates; mocked mail transport and persistence. No real emails or database records were created.',
    v07: {
      payload: '<b>SECURITY_TEST</b>',
      before: { markupRendered: baselineEmailHtml.includes('<b>SECURITY_TEST</b>'), snippet: baselineEmailHtml.match(/Hello[^\n]*/)?.[0].trim() },
      after: { orderStatus: fixedOrder.status, reservationStatus: fixedReservation.status, markupEncoded: fixedEmailHtml.includes('&lt;b&gt;SECURITY_TEST&lt;/b&gt;'), rawMarkupAbsent: !fixedEmailHtml.includes('<b>SECURITY_TEST</b>'), snippet: fixedEmailHtml.match(/Hello[^\n]*/)?.[0].trim() }
    },
    v08: { writeStatuses, acceptedRequests: writeStatuses.filter(status => status === 201).length, throttledRequests: writeStatuses.filter(status => status === 429).length, rateLimitHeaderPresent: Boolean(rateHeaders.ratelimit), retryAfterPresent: Boolean(rateHeaders['retry-after']) }
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(evidence, null, 2));
  process.stdout.write(JSON.stringify(evidence, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
