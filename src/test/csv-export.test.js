import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.ADMIN_PASSWORD = 'test-password';
process.env.JWT_SECRET = 'x'.repeat(64);
process.env.ENCRYPTION_KEY = 'a'.repeat(64);
process.env.PUBLIC_URL = 'https://example.com';

const { app } = await import('../server.js');
const { pool } = await import('../db.js');

test('CSV export escapes formulas, quotes and commas', async () => {
  pool.query = async () => [[{
    email: 'person@example.com',
    subscribed: 1,
    consent_source: '=SUM(1,2)"test',
    created_at: '2026-10-16',
    unsubscribed_at: null
  }]];

  const token = app.jwt.sign({
    sub: process.env.ADMIN_EMAIL
  });

  const response = await app.inject({
    method: 'GET',
    url: '/api/contacts/export.csv',
    headers: {
      cookie: `mailpilot_session=${token}`
    }
  });

  assert.equal(response.statusCode, 200);
  assert.match(response.body, /person@example\.com/);
  assert.ok(
    response.body.includes(`"'=SUM(1,2)""test"`),
    'Formula must be neutralized and quotes escaped'
  );
});
