import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.ADMIN_PASSWORD = 'test-password';
process.env.JWT_SECRET = 'x'.repeat(64);
process.env.ENCRYPTION_KEY = 'a'.repeat(64);
process.env.PUBLIC_URL = 'https://example.com';

const { app } = await import('../server.js');

test('authenticated POST without CSRF token is rejected', async () => {
  const jwt = app.jwt.sign({ sub: process.env.ADMIN_EMAIL });

  const res = await app.inject({
    method: 'POST',
    url: '/api/campaigns',
    headers: {
      cookie: `mailpilot_session=${jwt}`
    },
    payload: {
      accountId: 1,
      subject: 'Test',
      html: '<p>Hello</p>'
    }
  });

  assert.equal(res.statusCode, 403);
});

test('authenticated POST with invalid CSRF token is rejected', async () => {
  const jwt = app.jwt.sign({ sub: process.env.ADMIN_EMAIL });

  const session = await app.inject({
    method: 'GET',
    url: '/api/me',
    headers: {
      cookie: `mailpilot_session=${jwt}`
    }
  });

  assert.equal(session.statusCode, 200);

  const csrfCookies = [session.headers['set-cookie']]
    .flat()
    .filter(Boolean)
    .map(c => c.split(';')[0]);

  const res = await app.inject({
    method: 'POST',
    url: '/api/campaigns',
    headers: {
      cookie: [
        `mailpilot_session=${jwt}`,
        ...csrfCookies
      ].join('; '),
      'csrf-token': 'invalid-token'
    },
    payload: {
      accountId: 1,
      subject: 'Test',
      html: '<p>Hello</p>'
    }
  });

  assert.equal(res.statusCode, 403);
});
