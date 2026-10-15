import test from 'node:test';
import assert from 'node:assert/strict';

test('server test api/accounts', async (t) => {
  process.env.ADMIN_EMAIL = 'admin@example.com';
  process.env.ADMIN_PASSWORD = 'password';
  process.env.JWT_SECRET = 'x'.repeat(32);
  process.env.ENCRYPTION_KEY = 'a'.repeat(64);
  process.env.PUBLIC_URL = 'https://example.com';
  process.env.NODE_ENV = 'test';

  const db = await import('./db.js');
  db.pool.query = async (sql, params) => {
    if (sql.includes('SELECT id,label,host,port,secure,username,from_name,from_email,per_minute,per_hour,per_day,enabled FROM accounts ORDER BY id DESC')) {
      return [[{ id: 1, label: 'Test DB', host: 'localhost' }]];
    }
    if (sql.includes('INSERT INTO accounts')) {
      return [{ insertId: 42 }];
    }
    return [[]];
  };

  const { app } = await import('./server.js');
  const token = app.jwt.sign({sub: process.env.ADMIN_EMAIL},{expiresIn:'8h'});

  await t.test('GET /api/accounts', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/accounts',
      cookies: { mailpilot_session: token }
    });
    assert.equal(res.statusCode, 200);
    const json = res.json();
    assert.deepEqual(json, [{ id: 1, label: 'Test DB', host: 'localhost' }]);
  });

  await t.test('POST /api/accounts - validation error for missing payload', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/accounts',
      cookies: { mailpilot_session: token },
      payload: { perMinute: 10, perHour: 100, perDay: 1000 }
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error, 'Invalid SMTP details');
  });

  await t.test('POST /api/accounts - validation error for bad limit', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/accounts',
      cookies: { mailpilot_session: token },
      payload: {
        label: 'My Account',
        host: 'smtp.example.com',
        username: 'user1',
        password: 'password1',
        fromEmail: 'no-reply@example.com',
        port: 587,
        perMinute: 10,
        perHour: 1,
        perDay: 1000
      }
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error, 'Request failed'); // the limit error gets caught by setErrorHandler
  });

  await t.test('POST /api/accounts - successful account creation', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/accounts',
      cookies: { mailpilot_session: token },
      payload: {
        label: 'My Account',
        host: 'smtp.example.com',
        username: 'user1',
        password: 'password1',
        fromEmail: 'no-reply@example.com',
        port: 587,
        perMinute: 10,
        perHour: 100,
        perDay: 1000
      }
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().id, 42);
  });
});
