import test from 'node:test';
import assert from 'node:assert/strict';
import { signUnsubscribe } from './core.js';

process.env.NODE_ENV = 'test';
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.ADMIN_PASSWORD = 'not-a-replace-password';
process.env.JWT_SECRET = 'x'.repeat(64);
process.env.ENCRYPTION_KEY = 'a'.repeat(64);
process.env.PUBLIC_URL = 'https://mail.example.com';

const { app } = await import('./server.js');
const { pool } = await import('./db.js');

test('GET /unsubscribe returns 400 without params', async () => {
    const res = await app.inject({
        method: 'GET',
        url: '/unsubscribe'
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body, 'Invalid unsubscribe link');
});

test('GET /unsubscribe returns form with valid params', async () => {
    const id = 42;
    const email = 'user@example.com';
    const sig = signUnsubscribe(id, email, process.env.JWT_SECRET);

    const res = await app.inject({
        method: 'GET',
        url: '/unsubscribe',
        query: { id: String(id), email, sig }
    });

    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'], /text\/html/);
    assert.ok(res.body.includes('<!doctype html>'));
    assert.ok(res.body.includes('value="42"'));
    assert.ok(res.body.includes('value="user@example.com"'));
    assert.ok(res.body.includes(`value="${sig}"`));
});

test('POST /unsubscribe unsubscribes with valid params', async () => {
    const id = 42;
    const email = 'user@example.com';
    const sig = signUnsubscribe(id, email, process.env.JWT_SECRET);

    const queries = [];
    pool.query = async (sql, params) => {
        queries.push({ sql, params });
        return [[]];
    };

    const res = await app.inject({
        method: 'POST',
        url: '/unsubscribe',
        payload: { id: String(id), email, sig }
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body, 'You have been unsubscribed.');

    assert.equal(queries.length, 2);
    assert.ok(queries[0].sql.includes('UPDATE contacts SET subscribed=0'));
    assert.deepEqual(queries[0].params, ['42', 'user@example.com']);

    assert.ok(queries[1].sql.includes("UPDATE messages SET status='suppressed'"));
    assert.deepEqual(queries[1].params, ['42']);
});

test('POST /unsubscribe fails with invalid signature', async () => {
    const res = await app.inject({
        method: 'POST',
        url: '/unsubscribe',
        payload: { id: '42', email: 'user@example.com', sig: 'invalid' }
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body, 'Invalid link');
});
