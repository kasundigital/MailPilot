import test from 'node:test';
import assert from 'node:assert/strict';
import {senderDomain,checkSenderDns} from '../src/dns-diagnostics.js';

test('sender domain validation',()=>{
  assert.equal(senderDomain('Sender@Example.COM'),'example.com');
  for(const address of ['','invalid','x@localhost','x@-example.org','x@example..org','x@foo_.org'])assert.equal(senderDomain(address),null);
});

test('detects SPF and DMARC records without exposing secrets',async()=>{
  const resolver={resolveTxt:async name=>{
    if(name==='example.org')return [['v=spf1 include:_spf.example.org ','-all']];
    if(name==='_dmarc.example.org')return [['v=DMARC1; p=reject; rua=mailto:dmarc@example.org']];
    throw Object.assign(new Error('missing'),{code:'ENODATA'});
  }};
  const result=await checkSenderDns('test@example.org',resolver);
  assert.equal(result.spf.status,'present');
  assert.equal(result.dmarc.policy,'reject');
  assert.equal(result.dkim.status,'not_checked');
});
test('reports missing and ambiguous TXT records',async()=>{
  const resolver={resolveTxt:async name=>name.startsWith('_dmarc')?Promise.reject(Object.assign(new Error(),{code:'ENODATA'})):[['v=spf1 -all'],['v=spf1 ~all']]};
  const result=await checkSenderDns('x@example.org',resolver);
  assert.equal(result.spf.status,'multiple');
  assert.equal(result.dmarc.status,'unknown');
});
