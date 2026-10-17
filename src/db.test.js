import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { pool, init } from './db.js';

test('init executes all table creation statements', async (t) => {
  mock.method(pool, 'query', async () => {});

  await init();

  assert.equal(pool.query.mock.calls.length, 11);
  const sql = pool.query.mock.calls.map(c => c.arguments[0]);
  assert.match(sql[0], /CREATE TABLE IF NOT EXISTS accounts/);
  assert.match(sql[1], /CREATE TABLE IF NOT EXISTS contacts/);
  assert.match(sql[2], /CREATE TABLE IF NOT EXISTS campaigns/);
  assert.match(sql[3], /CREATE TABLE IF NOT EXISTS messages/);
  assert.match(sql[4], /CREATE TABLE IF NOT EXISTS campaign_audience/);
  assert.match(sql[5], /CREATE TABLE IF NOT EXISTS admin_credentials/);
  assert.match(sql[6], /CREATE TABLE IF NOT EXISTS audit_logs/);
  assert.match(sql[7], /ALTER TABLE campaigns ADD COLUMN name/);
  assert.match(sql[8], /ALTER TABLE campaigns ADD COLUMN preheader/);
  assert.match(sql[9], /ALTER TABLE messages ADD COLUMN worker_id/);
  assert.match(sql[10], /ALTER TABLE messages ADD COLUMN leased_until/);
});
