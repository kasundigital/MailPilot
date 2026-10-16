import { getCsrfSession } from './csrf-helper.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { patchServer, restoreServer } from './helper.js';

process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.ADMIN_PASSWORD = 'password123';
process.env.JWT_SECRET = 'x'.repeat(64);
process.env.ENCRYPTION_KEY = 'a'.repeat(64);
process.env.PUBLIC_URL = 'https://example.com';

const original = patchServer();

import { pool } from '../db.js';

let queries = [];
let mockRows = [];

pool.query = async (sql, params) => {
  queries.push({ sql, params });
  if (mockRows.length > 0) {
      return [mockRows.shift()];
  }

  if (sql.includes('SELECT id FROM accounts')) {
    if (params[0] === 1) return [[{ id: 1 }]];
    return [[]];
  }

  if (sql.includes('INSERT INTO campaigns')) {
    return [{ insertId: 42 }];
  }

  if (sql.includes('SELECT c.id,c.subject')) {
      return [[{ id: 42, subject: 'Test' }]];
  }

  return [[{}]];
};

const { app } = await import('../server.js');

test('POST /api/campaigns validates input', async () => {
  const token = app.jwt.sign({ sub: process.env.ADMIN_EMAIL }, { expiresIn: '8h' });

  const res = await app.inject({
    method: 'POST',
    url: '/api/campaigns',
    headers: (await getCsrfSession(app, process.env.ADMIN_EMAIL)).headers,
    payload: { accountId: 1, subject: '' }
  });

  assert.equal(res.statusCode, 400);
  assert.equal(res.json().error, 'Account, subject and HTML required');
});

test('POST /api/campaigns rejects non-existent account', async () => {
  const token = app.jwt.sign({ sub: process.env.ADMIN_EMAIL }, { expiresIn: '8h' });

  const res = await app.inject({
    method: 'POST',
    url: '/api/campaigns',
    headers: (await getCsrfSession(app, process.env.ADMIN_EMAIL)).headers,
    payload: { accountId: 2, subject: 'Valid', html: '<p>HTML</p>' }
  });

  assert.equal(res.statusCode, 400);
  assert.equal(res.json().error, 'Active account required');
});

test('POST /api/campaigns sanitizes HTML and inserts campaign', async () => {
  queries = []; // reset
  const token = app.jwt.sign({ sub: process.env.ADMIN_EMAIL }, { expiresIn: '8h' });

  const res = await app.inject({
    method: 'POST',
    url: '/api/campaigns',
    headers: (await getCsrfSession(app, process.env.ADMIN_EMAIL)).headers,
    payload: {
      accountId: 1,
      subject: 'My Campaign',
      html: '<h1>Title</h1><script>alert(1)</script><p>Hello</p>',
      plain: 'Custom plain'
    }
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.json().id, 42);

  const insertQuery = queries.find(q => q.sql.includes('INSERT INTO campaigns'));
  assert.ok(insertQuery);
  assert.equal(insertQuery.params[0], 1); // accountId
  assert.equal(insertQuery.params[1], 'My Campaign'); // subject
  assert.equal(insertQuery.params[2], '<h1>Title</h1><p>Hello</p>'); // sanitized html
  assert.equal(insertQuery.params[3], 'Custom plain'); // explicit plain
});

test('POST /api/campaigns generates plaintext from HTML if not provided', async () => {
  queries = []; // reset
  const token = app.jwt.sign({ sub: process.env.ADMIN_EMAIL }, { expiresIn: '8h' });

  const res = await app.inject({
    method: 'POST',
    url: '/api/campaigns',
    headers: (await getCsrfSession(app, process.env.ADMIN_EMAIL)).headers,
    payload: {
      accountId: 1,
      subject: 'My Campaign',
      html: '<h1>Title</h1><p>Hello</p>'
    }
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.json().id, 42);

  const insertQuery = queries.find(q => q.sql.includes('INSERT INTO campaigns'));
  assert.ok(insertQuery);
  assert.equal(insertQuery.params[2], '<h1>Title</h1><p>Hello</p>'); // html
  assert.equal(insertQuery.params[3], ' Title  Hello '); // stripped plain
});

test('GET /api/campaigns returns campaigns', async () => {
  const token = app.jwt.sign({ sub: process.env.ADMIN_EMAIL }, { expiresIn: '8h' });

  const res = await app.inject({
    method: 'GET',
    url: '/api/campaigns',
    headers: { cookie: `mailpilot_session=${token}` }
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), [{ id: 42, subject: 'Test' }]);
});

test.after(() => {
  restoreServer(original);
});
