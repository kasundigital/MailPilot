import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.ADMIN_PASSWORD = 'password123';
process.env.JWT_SECRET = '12345678901234567890123456789012';
process.env.ENCRYPTION_KEY = 'a'.repeat(64);
process.env.PUBLIC_URL = 'https://example.com';

const { pool } = await import('./db.js');
let queryResults = [];
let queryParams = [];

mock.method(pool, 'query', async (sql, params) => {
  queryParams.push({ sql, params });
  if (queryResults.length > 0) {
    return [queryResults.shift()];
  }
  return [[]]; // Default empty array response
});

import nodemailer from 'nodemailer';
let sentEmails = [];
let throwMailError = null;
const mockTransport = {
  sendMail: mock.fn(async (opts) => {
    if (throwMailError) throw throwMailError;
    sentEmails.push(opts);
    return true;
  }),
  close: mock.fn(),
};
mock.method(nodemailer, 'createTransport', () => mockTransport);

const { tick } = await import('./server.js');
import { encrypt } from './core.js';

test('server export works', () => {
  assert.ok(typeof tick === 'function');
});

export function resetMocks() {
  queryResults = [];
  queryParams = [];
  sentEmails = [];
  throwMailError = null;
  mockTransport.sendMail.mock.resetCalls();
  mockTransport.close.mock.resetCalls();
}

export function setNextQueryResults(resultsArray) {
  queryResults = resultsArray;
}

export function getQueryParams() {
  return queryParams;
}

export function getSentEmails() {
  return sentEmails;
}

export function setThrowMailError(err) {
  throwMailError = err;
}

test('tick does nothing if no candidates', async () => {
  resetMocks();
  setNextQueryResults([[]]); // No candidates

  await tick();

  assert.equal(getQueryParams().length, 1);
  assert.equal(getSentEmails().length, 0);
});

test('tick suppresses message if contact not subscribed', async () => {
  resetMocks();
  setNextQueryResults([
    [{ message_id: 10, subscribed: 0 }] // candidate
  ]);

  await tick();

  const queries = getQueryParams();
  assert.equal(queries.length, 2);
  assert.equal(queries[1].sql, "UPDATE messages SET status='suppressed' WHERE id=?");
  assert.deepEqual(queries[1].params, [10]);
});

test('tick aborted by rate limits', async () => {
  resetMocks();
  setNextQueryResults([
    [{ message_id: 20, subscribed: 1, account_id: 5, per_minute: 10, per_hour: 100, per_day: 1000 }], // candidate
    [{ minute_count: 10, hour_count: 50, day_count: 100 }] // limits (minute limit reached)
  ]);

  await tick();

  const queries = getQueryParams();
  assert.equal(queries.length, 2); // candidate fetch, limits fetch
  assert.equal(getSentEmails().length, 0);
});

test('tick successfully sends an email', async () => {
  resetMocks();
  setNextQueryResults([
    [{
       message_id: 30, campaign_id: 40, contact_id: 50, email: 'test@example.com', subscribed: 1,
       subject: 'Hello', html: '<b>World</b>', plain: 'World',
       account_id: 5, per_minute: 10, per_hour: 100, per_day: 1000,
       host: 'smtp.example.com', port: 587, secure: 0, username: 'user', password_cipher: encrypt('pass', process.env.ENCRYPTION_KEY),
       from_name: 'Admin', from_email: 'admin@example.com'
    }], // candidate
    [{ minute_count: 0, hour_count: 0, day_count: 0 }], // limits
    { affectedRows: 1 }, // taken update
    { affectedRows: 1 }  // mark completed check
  ]);

  await tick();

  const queries = getQueryParams();
  const sent = getSentEmails();

  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'test@example.com');
  assert.equal(sent[0].subject, 'Hello');

  // Verify updates happened
  const updateSending = queries.find(q => q.sql.includes("UPDATE messages SET status='sending'"));
  assert.ok(updateSending);

  const updateSent = queries.find(q => q.sql.includes("UPDATE messages SET status='sent'"));
  assert.ok(updateSent);
});

test('tick handles transient email failure (backoff)', async () => {
  resetMocks();
  setNextQueryResults([
    [{
       message_id: 31, campaign_id: 40, contact_id: 50, email: 'fail@example.com', subscribed: 1,
       subject: 'Hello', html: '<b>World</b>', plain: 'World', attempts: 1,
       account_id: 5, per_minute: 10, per_hour: 100, per_day: 1000,
       host: 'smtp.example.com', port: 587, secure: 0, username: 'user', password_cipher: encrypt('pass', process.env.ENCRYPTION_KEY),
       from_name: 'Admin', from_email: 'admin@example.com'
    }],
    [{ minute_count: 0, hour_count: 0, day_count: 0 }],
    { affectedRows: 1 }
  ]);

  const err = new Error('Connection timeout');
  err.responseCode = 421;
  setThrowMailError(err);

  await tick();

  const queries = getQueryParams();
  const updateFailed = queries.find(q => q.sql.includes("UPDATE messages SET status=?,next_attempt=DATE_ADD"));
  assert.ok(updateFailed);
  assert.equal(updateFailed.params[0], 'queued'); // Transient
});

test('tick handles permanent email failure (500 or max attempts)', async () => {
  resetMocks();
  setNextQueryResults([
    [{
       message_id: 32, campaign_id: 40, contact_id: 50, email: 'fail@example.com', subscribed: 1,
       subject: 'Hello', html: '<b>World</b>', plain: 'World', attempts: 4, // Max attempts
       account_id: 5, per_minute: 10, per_hour: 100, per_day: 1000,
       host: 'smtp.example.com', port: 587, secure: 0, username: 'user', password_cipher: encrypt('pass', process.env.ENCRYPTION_KEY),
       from_name: 'Admin', from_email: 'admin@example.com'
    }],
    [{ minute_count: 0, hour_count: 0, day_count: 0 }],
    { affectedRows: 1 }
  ]);

  const err = new Error('Bad address');
  err.responseCode = 550; // Hard bounce
  setThrowMailError(err);

  await tick();

  const queries = getQueryParams();
  const updateFailed = queries.find(q => q.sql.includes("UPDATE messages SET status=?,next_attempt=DATE_ADD"));
  assert.ok(updateFailed);
  assert.equal(updateFailed.params[0], 'failed'); // Permanent
});
