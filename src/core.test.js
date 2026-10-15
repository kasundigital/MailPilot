import test from 'node:test';import assert from 'node:assert/strict';import {normalizeEmail,parseEmails,encrypt,decrypt,signUnsubscribe,validSignature,safeLimits} from './core.js';
test('deduplicates and normalizes contact emails',()=>assert.deepEqual(parseEmails('A@EXAMPLE.com; a@example.com\n b@test.org bad'),['a@example.com','b@test.org']));
test('rejects malformed address',()=>assert.equal(normalizeEmail('not-an-email'),null));
test('AES GCM credentials roundtrip',()=>{const key='ab'.repeat(32),s=encrypt('super-secret',key);assert.equal(decrypt(s,key),'super-secret');assert.ok(!s.includes('super-secret'))});
test('AES GCM secret rotation',()=>{const key1='11'.repeat(32),key2='22'.repeat(32),keys=key1+','+key2;const s=encrypt('rotated',keys);assert.equal(decrypt(s,keys),'rotated');const old=encrypt('legacy',key2);assert.equal(decrypt(old,keys),'legacy');assert.throws(()=>decrypt(s,'33'.repeat(32)))});
test('unsubscribe signatures tamper proof',()=>{const secret='x'.repeat(64),sig=signUnsubscribe(42,'a@example.com',secret);assert.ok(validSignature(42,'a@example.com',sig,secret));assert.equal(validSignature(43,'a@example.com',sig,secret),false)});
test('limits require hierarchy',()=>{assert.deepEqual(safeLimits({perMinute:2,perHour:20,perDay:100}),{perMinute:2,perHour:20,perDay:100});assert.throws(()=>safeLimits({perMinute:20,perHour:2,perDay:100}))});
