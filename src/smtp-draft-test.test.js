import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';

process.env.NODE_ENV='test';
process.env.ADMIN_EMAIL='admin@example.com';
process.env.ADMIN_PASSWORD='test-password';
process.env.JWT_SECRET='x'.repeat(64);
process.env.ENCRYPTION_KEY='a'.repeat(64);
process.env.PUBLIC_URL='https://example.com';

const {app}=await import('./server.js');
const {pool}=await import('./db.js');
const {getCsrfSession}=await import('./test/csrf-helper.js');
const oldTransport=nodemailer.createTransport;
const oldQuery=pool.query;
const queries=[];
pool.query=async(sql,params=[])=>{
 queries.push({sql,params});
 if(sql.includes('admin_credentials'))return [[]];
 return [{affectedRows:1}];
};
const payload={
 host:'smtp.example.com',port:587,secure:false,
 username:'send@example.com',password:'secret-test-password'
};
test('unsaved test requires admin session and CSRF',async()=>{
 const noAuth=await app.inject({method:'POST',url:'/api/accounts/test-connection',payload});
 assert.equal(noAuth.statusCode,401);
 const token=app.jwt.sign({sub:process.env.ADMIN_EMAIL});
 const missingCsrf=await app.inject({method:'POST',url:'/api/accounts/test-connection',headers:{cookie:'mailpilot_session='+token},payload});
 assert.equal(missingCsrf.statusCode,403);
});
test('unsaved SMTP test validates fields without contacting server',async()=>{
 const session=await getCsrfSession(app,process.env.ADMIN_EMAIL);
 let used=false;
 nodemailer.createTransport=()=>{used=true;throw Error('Should not connect')};
 const invalid=await app.inject({method:'POST',url:'/api/accounts/test-connection',headers:session.headers,payload:{...payload,port:70000}});
 assert.equal(invalid.statusCode,400);
 assert.equal(used,false);
 assert.doesNotMatch(invalid.body,/secret-test-password/);
});
test('pre-save test verifies STARTTLS and authentication without storing or sending',async()=>{
 const session=await getCsrfSession(app,process.env.ADMIN_EMAIL);
 let options,verifyCalls=0,closeCalls=0,sendCalls=0;
 nodemailer.createTransport=x=>{
  options=x;
  return {verify:async()=>{verifyCalls++},close:()=>{closeCalls++},sendMail:()=>{sendCalls++}};
 };
 queries.length=0;
 const response=await app.inject({method:'POST',url:'/api/accounts/test-connection',headers:session.headers,payload});
 assert.equal(response.statusCode,200);
 assert.equal(response.json().ok,true);
 assert.equal(verifyCalls,1);assert.equal(closeCalls,1);assert.equal(sendCalls,0);
 assert.equal(options.secure,false);assert.equal(options.requireTLS,true);
 assert.equal(options.tls.rejectUnauthorized,true);
 assert.equal(options.auth.pass,payload.password);
 assert.equal(queries.some(q=>q.sql.includes('INSERT INTO accounts')),false);
 assert.doesNotMatch(response.body,/secret-test-password/);
});
test('failed SMTP authentication is actionable but never exposes raw credential errors',async()=>{
 const session=await getCsrfSession(app,process.env.ADMIN_EMAIL);
 let closed=false;
 nodemailer.createTransport=()=>({verify:async()=>{throw Object.assign(Error('Password secret-test-password denied'),{code:'EAUTH',responseCode:535})},close:()=>{closed=true}});
 const response=await app.inject({method:'POST',url:'/api/accounts/test-connection',headers:session.headers,payload});
 assert.equal(response.statusCode,422);
 assert.equal(response.json().code,'AUTH_FAILED');
 assert.match(response.json().error,/username and app password/i);
 assert.doesNotMatch(response.body,/secret-test-password/);
 assert.equal(closed,true);
});
test.after(async()=>{nodemailer.createTransport=oldTransport;pool.query=oldQuery;await app.close()});
