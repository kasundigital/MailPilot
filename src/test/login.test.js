import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.ADMIN_PASSWORD = 'test-password';
process.env.JWT_SECRET = 'x'.repeat(64);
process.env.ENCRYPTION_KEY = 'a'.repeat(64);
process.env.PUBLIC_URL = 'https://example.com';

const { app } = await import('../server.js');

test('login succeeds with valid credentials and secure cookie', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/login',
    payload: {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    }
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { ok: true });

  const cookies = [res.headers['set-cookie']].flat().filter(Boolean);
  const session = cookies.find(c => c.startsWith('mailpilot_session='));

  assert.ok(session);
  assert.match(session, /HttpOnly/i);
  assert.match(session, /Secure/i);
  assert.match(session, /SameSite=Strict/i);
  assert.match(session, /Path=\//i);
});

test('login rejects incorrect email', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/login',
    payload: {
      email: 'wrong@example.com',
      password: process.env.ADMIN_PASSWORD
    }
  });

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.json(), { error: 'Invalid credentials' });
});

test('login rejects incorrect password', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/login',
    payload: {
      email: process.env.ADMIN_EMAIL,
      password: 'wrong-password'
    }
  });

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.json(), { error: 'Invalid credentials' });
});

test('login rejects missing credentials', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/login',
    payload: {}
  });

  assert.notEqual(res.statusCode, 200);
});
