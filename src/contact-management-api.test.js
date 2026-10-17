import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV='test';
process.env.ADMIN_EMAIL='admin@example.com';
process.env.ADMIN_PASSWORD='example-test-password';
process.env.JWT_SECRET='x'.repeat(64);
process.env.ENCRYPTION_KEY='a'.repeat(64);
process.env.PUBLIC_URL='https://example.com';

const {app}=await import('./server.js');
const {pool}=await import('./db.js');
const {getCsrfSession}=await import('./test/csrf-helper.js');
const originalQuery=pool.query,originalConnection=pool.getConnection;
const sqls=[];
pool.query=async(sql,params=[])=>{
 sqls.push({sql,params});
 if(sql.includes('SELECT password_hash'))return [[]];
 if(sql.includes('COUNT(*) total FROM contacts c'))return [[{total:1}]];
 if(sql.includes('FROM contacts c'))return [[{id:7,email:'a@example.com',subscribed:1,tags:'vip',consent_source:'web'}]];
 if(sql.includes('SELECT email,subscribed'))return [[{email:'a@example.com',subscribed:1,consent_source:'web',created_at:'2026-10-17'}]];
 return [[{}]];
};
let tx=[];
pool.getConnection=async()=>({
 beginTransaction:async()=>{tx.push('BEGIN');},
 query:async(sql,params=[])=>{
  tx.push({sql,params});
  if(sql.includes('SELECT id FROM contacts WHERE id IN'))return [[{id:7}]];
  if(sql.includes('UPDATE contacts')||sql.includes('INSERT IGNORE INTO contact_tags'))return [{affectedRows:1}];
  return [{affectedRows:1}];
 },
 commit:async()=>{tx.push('COMMIT');},
 rollback:async()=>{tx.push('ROLLBACK');},
 release:()=>{tx.push('RELEASE');}
});
test('contact paging requires authentication and validates unsafe sort',async()=>{
 const notAuth=await app.inject({method:'GET',url:'/api/contacts/page'});
 assert.equal(notAuth.statusCode,401);
 const token=app.jwt.sign({sub:process.env.ADMIN_EMAIL});
 const headers={cookie:'mailpilot_session='+token};
 const invalid=await app.inject({method:'GET',url:'/api/contacts/page?sort=drop%20table',headers});
 assert.equal(invalid.statusCode,400);
 const good=await app.inject({method:'GET',url:'/api/contacts/page?search=a%40&status=subscribed&page=1',headers});
 assert.equal(good.statusCode,200);
 assert.equal(good.json().total,1);
 assert.equal(good.json().items[0].email,'a@example.com');
 assert.ok(sqls.find(s=>s.sql.includes('ORDER BY c.id DESC LIMIT ? OFFSET ?')));
});
test('bulk rejects malformed ids with valid CSRF',async()=>{
 const session=await getCsrfSession(app,process.env.ADMIN_EMAIL);
 const bad=await app.inject({method:'POST',url:'/api/contacts/bulk',headers:session.headers,payload:{action:'suppress',ids:[7,7]}});
 assert.equal(bad.statusCode,400);
 const malformed=await app.inject({method:'POST',url:'/api/contacts/bulk',headers:session.headers,payload:{action:'tag',ids:[7],tag:'invalid tag!'}});
 assert.equal(malformed.statusCode,400);
});
test('bulk tagging and suppression are transactional, audited, and leave subscribed users protected',async()=>{
 const session=await getCsrfSession(app,process.env.ADMIN_EMAIL);
 tx=[];
 const tagged=await app.inject({method:'POST',url:'/api/contacts/bulk',headers:session.headers,payload:{action:'tag',ids:[7],tag:'VIP'}});
 assert.equal(tagged.statusCode,200);
 assert.deepEqual(tagged.json(),{ok:true,selected:1,changed:1});
 assert.ok(tx.some(x=>typeof x==='object'&&x.sql.includes('INSERT IGNORE INTO contact_tags')));
 assert.ok(tx.some(x=>typeof x==='object'&&x.sql.includes('INSERT INTO audit_logs')&&x.params[1]==='contacts_bulk_tagged'));
 assert.ok(tx.includes('COMMIT'));
 tx=[];
 const suppressed=await app.inject({method:'POST',url:'/api/contacts/bulk',headers:session.headers,payload:{action:'suppress',ids:[7]}});
 assert.equal(suppressed.statusCode,200);
 assert.ok(tx.some(x=>typeof x==='object'&&x.sql.includes('SET subscribed=0')));
 assert.ok(tx.some(x=>typeof x==='object'&&x.sql.includes("status='suppressed'")));
 assert.ok(tx.some(x=>typeof x==='object'&&x.sql.includes('INSERT INTO audit_logs')&&x.params[1]==='contacts_bulk_suppressed'));
 assert.ok(tx.includes('COMMIT'));
});
test('selected CSV respects request ID bounds',async()=>{
 const token=app.jwt.sign({sub:process.env.ADMIN_EMAIL});
 const headers={cookie:'mailpilot_session='+token};
 const bad=await app.inject({method:'GET',url:'/api/contacts/export.csv?ids=0',headers});
 assert.equal(bad.statusCode,400);
 const csv=await app.inject({method:'GET',url:'/api/contacts/export.csv?ids=7',headers});
 assert.equal(csv.statusCode,200);
 assert.match(csv.body,/a@example\.com/);
 assert.ok(sqls.some(x=>x.sql.includes('WHERE id IN (?)')));
});
test.after(async()=>{pool.query=originalQuery;pool.getConnection=originalConnection;await app.close();});
