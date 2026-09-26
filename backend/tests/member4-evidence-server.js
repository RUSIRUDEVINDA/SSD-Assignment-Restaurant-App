// Manual/ZAP fixture, explicitly started by the assessor. No real DB/email traffic.
const fs = require('node:fs');
const path = require('node:path');
const { createFixture } = require('./support/member4-fixture');
(async () => {
  const [backendRoot, port = '5012'] = process.argv.slice(2);
  const fixture = await createFixture(backendRoot ? path.resolve(backendRoot) : undefined);
  fixture.app.get('/__evidence', (req, res) => res.json({
    mode: 'Isolated fixture: real routes, controllers, schemas and templates; mocked database and mail transport',
    writes: fixture.writes, emails: fixture.emails
  }));
  fixture.app.listen(Number(port), '127.0.0.1', () => console.log(`MEMBER4_READY http://127.0.0.1:${port}`));
})().catch(error => { console.error(error); process.exitCode = 1; });
