import test from 'node:test';
import assert from 'node:assert/strict';
import {contactIds,contactTag,contactPageOptions} from './contact-management.js';
test('strict contact ID parsing bounds and duplicates',()=>{
 assert.deepEqual(contactIds([1,'2']),[1,2]);
 assert.deepEqual(contactIds('1,2'),[1,2]);
 for(const x of [[1,1],[0],[-1],['1 OR 1=1'],[],Array.from({length:101},(_,i)=>i+1)])assert.throws(()=>contactIds(x));
});
test('tag validation is canonical and SQL-safe',()=>{
 assert.equal(contactTag(' Newsletter_2026 '),'newsletter_2026');
 for(const x of ['',' a space','a;b','<img>','x'.repeat(33)])assert.throws(()=>contactTag(x));
});
test('query paging and sorting is whitelisted',()=>{
 const q=contactPageOptions({page:'2',pageSize:'25',search:'test',status:'subscribed',sort:'email',tag:'CUSTOMER'});
 assert.equal(q.offset,25);assert.equal(q.orderBy,'c.email ASC, c.id ASC');
 assert.equal(q.where.includes('EXISTS'),true);
 assert.deepEqual(q.params,['%test%',1,'customer']);
 for(const bad of [{page:'0'},{page:'1;DROP'},{pageSize:101},{sort:'c.id DESC; DROP TABLE contacts'},{status:'everything'},{search:'x'.repeat(121)}])assert.throws(()=>contactPageOptions(bad));
});
