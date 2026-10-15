import test from 'node:test';import assert from 'node:assert/strict';import {normalizeEmail,parseEmails,encrypt,decrypt,signUnsubscribe,validSignature,safeLimits,escapeHtml} from './core.js';
test('deduplicates and normalizes contact emails',()=>assert.deepEqual(parseEmails('A@EXAMPLE.com; a@example.com\n b@test.org bad'),['a@example.com','b@test.org']));
test('escapes HTML special characters',()=>assert.equal(escapeHtml('"><script>alert(1)</script>&\''),'&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;&amp;&#039;'));
test('rejects malformed address',()=>assert.equal(normalizeEmail('not-an-email'),null));
test('AES GCM credentials roundtrip',()=>{const key='ab'.repeat(32),s=encrypt('super-secret',key);assert.equal(decrypt(s,key),'super-secret');assert.ok(!s.includes('super-secret'))});
test('unsubscribe signatures tamper proof',()=>{const secret='x'.repeat(64),sig=signUnsubscribe(42,'a@example.com',secret);assert.ok(validSignature(42,'a@example.com',sig,secret));assert.equal(validSignature(43,'a@example.com',sig,secret),false)});
test('limits require hierarchy',()=>{assert.deepEqual(safeLimits({perMinute:2,perHour:20,perDay:100}),{perMinute:2,perHour:20,perDay:100});assert.throws(()=>safeLimits({perMinute:20,perHour:2,perDay:100}))});
