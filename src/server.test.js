import test from 'node:test';
import assert from 'node:assert/strict';

// Set up process.env mocks BEFORE importing server.js
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.ADMIN_PASSWORD = 'supersecret_longpassword';
process.env.JWT_SECRET = 'a'.repeat(64);
process.env.ENCRYPTION_KEY = 'b'.repeat(64);
process.env.PUBLIC_URL = 'https://example.com';

// Mock DB pool.query to avoid mysql connection errors when importing server.js
import { pool } from './db.js';
pool.query = async () => [];

// Now we can safely import app
const { app } = await import('./server.js');

test('POST /api/login - valid credentials', async () => {
    const response = await app.inject({
        method: 'POST',
        url: '/api/login',
        payload: {
            email: 'admin@example.com',
            password: 'supersecret_longpassword'
        }
    });

    assert.equal(response.statusCode, 200, 'Expected status code 200 for valid credentials');
    assert.deepEqual(response.json(), { ok: true }, 'Expected {ok: true} response');

    // Verify mailpilot_session cookie is set correctly
    const setCookieHeader = response.headers['set-cookie'];
    assert.ok(setCookieHeader, 'Expected set-cookie header');

    // In fastify with multiple cookies this is an array, or just a single string if only 1 cookie
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    const sessionCookie = cookies.find(c => c.startsWith('mailpilot_session='));
    assert.ok(sessionCookie, 'Expected mailpilot_session cookie');
    assert.ok(sessionCookie.includes('HttpOnly'), 'Expected HttpOnly flag');
    assert.ok(sessionCookie.includes('Secure'), 'Expected Secure flag');
    assert.ok(sessionCookie.includes('SameSite=Strict'), 'Expected SameSite=Strict flag');
    assert.ok(sessionCookie.includes('Path=/'), 'Expected Path=/');
    assert.ok(sessionCookie.includes('Max-Age=28800'), 'Expected Max-Age=28800');
});

test('POST /api/login - invalid email', async () => {
    const response = await app.inject({
        method: 'POST',
        url: '/api/login',
        payload: {
            email: 'wrong@example.com',
            password: 'supersecret_longpassword'
        }
    });

    assert.equal(response.statusCode, 401, 'Expected status code 401 for invalid email');
    assert.deepEqual(response.json(), { error: 'Invalid credentials' });
});

test('POST /api/login - invalid password', async () => {
    const response = await app.inject({
        method: 'POST',
        url: '/api/login',
        payload: {
            email: 'admin@example.com',
            password: 'wrongpassword'
        }
    });

    assert.equal(response.statusCode, 401, 'Expected status code 401 for invalid password');
    assert.deepEqual(response.json(), { error: 'Invalid credentials' });
});

test('POST /api/login - missing fields', async () => {
    const response = await app.inject({
        method: 'POST',
        url: '/api/login',
        payload: {
            email: 'admin@example.com'
        }
    });

    assert.equal(response.statusCode, 401, 'Expected status code 401 for missing password');
    assert.deepEqual(response.json(), { error: 'Invalid credentials' });

    const response2 = await app.inject({
        method: 'POST',
        url: '/api/login',
        payload: {}
    });

    assert.equal(response2.statusCode, 401, 'Expected status code 401 for missing fields');
});
