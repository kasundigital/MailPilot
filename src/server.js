import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import formbody from '@fastify/formbody';
import jwt from '@fastify/jwt';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import sanitizeHtml from 'sanitize-html';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {pool,init} from './db.js';
import {normalizeEmail,parseEmails,encrypt,decrypt,signUnsubscribe,validSignature,safeLimits} from './core.js';
import workflowRoutes from './workflows/workflow.routes.js';
import triggerRoutes from './workflows/trigger.routes.js';
import { startWorker } from './workflows/worker.js';
const {ADMIN_EMAIL,ADMIN_PASSWORD,JWT_SECRET,ENCRYPTION_KEY,PUBLIC_URL}=process.env;

if (!ADMIN_EMAIL) {
  throw Error('Configure valid ADMIN_EMAIL');
}
if (!ADMIN_PASSWORD || ADMIN_PASSWORD.startsWith('REPLACE_')) {
  throw Error('Configure valid ADMIN_PASSWORD');
}
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw Error('Configure valid JWT_SECRET');
}
if (!ENCRYPTION_KEY || !/^[0-9a-f]{64}$/i.test(ENCRYPTION_KEY)) {
  throw Error('Configure valid ENCRYPTION_KEY');
}
if (!PUBLIC_URL || !PUBLIC_URL.startsWith('https://')) {
  throw Error('Configure valid HTTPS PUBLIC_URL');
}

const app=Fastify({logger:true,bodyLimit:1_000_000,trustProxy:false});
await app.register(helmet,{contentSecurityPolicy:false});
await app.register(cookie);
await app.register(formbody);
await app.register(jwt,{secret:JWT_SECRET,cookie:{cookieName:'mailpilot_session',signed:false}});
await app.register(rateLimit,{global:false});
app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
  try {
    req.rawBody = body.toString();
    done(null, JSON.parse(req.rawBody));
  } catch (err) {
    done(err);
  }
});
await app.register(workflowRoutes,{prefix:'/api/workflows'});
await app.register(triggerRoutes,{prefix:'/api'});
const hash=await bcrypt.hash(ADMIN_PASSWORD,12);
const auth=async(req,reply)=>{try{await req.jwtVerify()}catch{return reply.code(401).send({error:'Unauthorized'})}};
app.setErrorHandler((err,req,reply)=>{req.log.error(err);reply.code(err.statusCode&&err.statusCode<500?err.statusCode:400).send({error:err.statusCode&&err.statusCode<500?err.message:'Request failed'});});
const rows=async(sql,params=[])=>{const [r]=await pool.query(sql,params);return r};
app.get('/health',async()=>({ok:true}));
app.post('/api/login', {
  config: {
    rateLimit: { max: 5, timeWindow: '1 minute' }
  }
}, async (req, reply) => {
  const { email, password } = req.body || {};
  if (email !== ADMIN_EMAIL || typeof password !== 'string' || !(await bcrypt.compare(password, hash))) {
    return reply.code(401).send({ error: 'Invalid credentials' });
  }
  const token = app.jwt.sign({ sub: ADMIN_EMAIL }, { expiresIn: '8h' });
  reply.setCookie('mailpilot_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 28800
  });
  return { ok: true };
});
app.post('/api/logout',{preHandler:auth},async(req,reply)=>{reply.clearCookie('mailpilot_session',{path:'/'});return {ok:true}});
app.get('/api/me',{preHandler:auth},async()=>({email:ADMIN_EMAIL}));
app.get('/api/stats',{preHandler:auth},async()=>{const [contacts]=await rows('SELECT COUNT(*) total,SUM(subscribed=1) subscribed FROM contacts');const [messages]=await rows("SELECT COUNT(*) total,COUNT(CASE WHEN status='sent' THEN 1 END) sent FROM messages");return {contacts:contacts[0],messages:messages[0]}});
app.get('/api/accounts',{preHandler:auth},async()=>rows('SELECT id,label,host,port,secure,username,from_name,from_email,per_minute,per_hour,per_day,enabled FROM accounts ORDER BY id DESC'));
app.post('/api/accounts', { preHandler: auth }, async (req, reply) => {
  const x = req.body || {};
  const limit = safeLimits({ perMinute: x.perMinute, perHour: x.perHour, perDay: x.perDay });

  if (!x.label || !x.host || !x.username || !x.password || !normalizeEmail(x.fromEmail) || !Number.isInteger(Number(x.port)) || Number(x.port) < 1 || Number(x.port) > 65535) {
    return reply.code(400).send({ error: 'Invalid SMTP details' });
  }

  const r = await rows(
    'INSERT INTO accounts(label,host,port,secure,username,password_cipher,from_name,from_email,per_minute,per_hour,per_day) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [String(x.label).slice(0, 120), String(x.host).slice(0, 255), Number(x.port), !!x.secure, String(x.username), encrypt(String(x.password), ENCRYPTION_KEY), String(x.fromName || 'MailPilot').slice(0, 120), normalizeEmail(x.fromEmail), limit.perMinute, limit.perHour, limit.perDay]
  );

  return { id: r.insertId };
});
app.post('/api/accounts/:id/test',{preHandler:auth,config:{rateLimit:{max:5,timeWindow:'1 minute'}}},async(req,reply)=>{const [a]=await rows('SELECT * FROM accounts WHERE id=?',[req.params.id]);if(!a)return reply.code(404).send({error:'Account not found'});const transport=nodemailer.createTransport({host:a.host,port:a.port,secure:!!a.secure,auth:{user:a.username,pass:decrypt(a.password_cipher,ENCRYPTION_KEY)}});try{await transport.verify();return {ok:true}}catch(e){return reply.code(400).send({error:e.message})}});
app.get('/api/contacts',{preHandler:auth},async()=>rows('SELECT id,email,subscribed,consent_source,created_at FROM contacts ORDER BY id DESC LIMIT 500'));
app.post('/api/contacts/import',{preHandler:auth,config:{rateLimit:{max:5,timeWindow:'1 minute'}}},async(req,reply)=>{const {emails,consentSource,confirmConsent}=req.body||{};if(confirmConsent!==true||!Array.isArray(emails)||!emails.length)return reply.code(400).send({error:'invalid import payload'});const values=[];for(const email of emails){const e=String(email).trim().toLowerCase();if(!normalizeEmail(e))continue;values.push([e,Boolean(consentSource),String(consentSource||'manual')]);}if(!values.length)return {imported:0};for(const [email,subscribed,source] of values){await rows('INSERT INTO contacts(email,subscribed,consent_source) VALUES (?,?,?) ON DUPLICATE KEY UPDATE subscribed=VALUES(subscribed), consent_source=VALUES(consent_source)',[email, subscribed ? 1 : 0, source]);}return {imported:values.length}});
app.get('/api/campaigns',{preHandler:auth},async()=>rows("SELECT c.id,c.subject,c.status,c.created_at,a.label account_name,(SELECT COUNT(*) FROM messages m WHERE m.campaign_id=c.id) total,(SELECT COUNT(*) FROM messages m WHERE m.campaign_id=c.id AND m.status='sent') sent FROM campaigns c JOIN accounts a ON a.id=c.account_id ORDER BY c.id DESC"));
const safeStyleRegex=/^(?!.*(?:expression|-moz-binding|url\s*\().*$/i;const safeStyle=[safeStyleRegex];const allowedStylesObj={'color':safeStyle,'background':safeStyle,'background-color':safeStyle,'font-size':safeStyle,'font-weight':safeStyle,'text-align':safeStyle,'padding':safeStyle,'margin':safeStyle,'border':safeStyle,'border-radius':safeStyle,'width':safeStyle,'height':safeStyle};
app.post('/api/campaigns',{preHandler:auth},async(req,reply)=>{const x=req.body||{};if(!x.accountId||!String(x.subject||'').trim()||!String(x.html||'').trim())return reply.code(400).send({error:'Invalid campaign payload'});const clean=sanitizeHtml(String(x.html),{allowedTags:['h1','h2','h3','p','a','b','strong','em','blockquote','ul','ol','li','table','thead','tbody','tr','th','td','img','br','hr','span','div','code','pre'],allowedAttributes:{'*':['style'],'a':['href','target','rel']},allowedStyles:{'*':allowedStylesObj},transformTags:{'a':(tagName,attribs)=>({tagName,attribs:{...attribs,target:'_blank',rel:'noopener noreferrer'}})}});const r=await rows('INSERT INTO campaigns(account_id,subject,html,plain,status) VALUES (?,?,?,?,?)',[Number(x.accountId),String(x.subject).slice(0,255),clean,String(x.plain||clean.replace(/<[^>]+>/g,'')).slice(0,65535),'draft']);return {id:r.insertId}});
app.post('/api/campaigns/:id/start',{preHandler:auth},async(req,reply)=>{const [c]=await rows('SELECT * FROM campaigns WHERE id=?',[req.params.id]);if(!c||!['draft','paused'].includes(c.status))return reply.code(400).send({error:'Campaign cannot be started'});await rows('UPDATE campaigns SET status=? WHERE id=?',['running',req.params.id]);const [contacts]=await rows('SELECT id FROM contacts WHERE subscribed=1');for(const contact of contacts){await rows('INSERT INTO messages(campaign_id,contact_id,status,attempts,next_attempt) VALUES (?,?,?,0,NOW()) ON DUPLICATE KEY UPDATE status=VALUES(status)',[req.params.id,contact.id,'queued']);}return {ok:true}});
app.post('/api/campaigns/:id/pause',{preHandler:auth},async(req)=>{await rows("UPDATE campaigns SET status='paused' WHERE id=? AND status='running'",[req.params.id]);return {ok:true}});
app.get('/api/campaigns/:id/messages',{preHandler:auth},async(req)=>rows('SELECT m.id,c.email,m.status,m.attempts,m.last_error,m.sent_at FROM messages m JOIN contacts c ON c.id=m.contact_id WHERE m.campaign_id=? ORDER BY m.id DESC',[req.params.id]));
app.get('/unsubscribe', async (req, reply) => {
  const { id, email, sig } = req.query || {};
  if (!validSignature(id, email, sig, JWT_SECRET))
    return reply.code(400).type('text/plain').send('Invalid unsubscribe link');
  return reply.type('text/html').send(`<!doctype html>
<title>Unsubscribe</title>
<h1>Unsubscribe</h1>
<form method="POST">
  <input type="hidden" name="id" value="${String(id).replace(/\D/g, '')}">
  <input type="hidden" name="email" value="${String(email).replace(/["<>]/g, '')}">
  <input type="hidden" name="sig" value="${sig}">
  <button>Confirm unsubscribe</button>
</form>`);
});
app.post('/unsubscribe',async(req,reply)=>{const x=req.body||{};if(!validSignature(x.id,x.email,x.sig,JWT_SECRET))return reply.code(400).type('text/plain').send('Invalid link');await rows('UPDATE contacts SET subscribed=0, unsubscribed_at=NOW() WHERE email=?',[String(x.email).trim().toLowerCase()]);return {ok:true}});
await app.register(fastifyStatic,{root:path.join(path.dirname(fileURLToPath(import.meta.url)),'../public'),prefix:'/'});
let busy=false;
async function tick(){if(busy)return;busy=true;try{
  const candidates=await rows("SELECT m.id AS message_id,m.campaign_id,m.contact_id,m.attempts,c.email,c.subscribed,p.subject,p.html,p.plain,a.* FROM messages m JOIN campaigns p ON p.id=m.campaign_id JOIN contacts c ON c.id=m.contact_id JOIN accounts a ON a.id=p.account_id WHERE m.status='queued' AND m.next_attempt <= NOW() ORDER BY m.id ASC LIMIT 1");
  const j=candidates[0];if(!j)return;
  if(!j.subscribed){await rows("UPDATE messages SET status='suppressed' WHERE id=?",[j.message_id]);return}
  const [limits]=await rows("SELECT SUM(m.sent_at>=NOW()-INTERVAL 1 MINUTE) minute_count,SUM(m.sent_at>=NOW()-INTERVAL 1 HOUR) hour_count,SUM(m.sent_at>=NOW()-INTERVAL 1 DAY) day_count FROM messages m JOIN campaigns p ON p.id=m.campaign_id JOIN accounts a ON a.id=p.account_id WHERE a.id=? AND m.sent_at>=NOW()-INTERVAL 1 DAY",[j.account_id]);
  if(Number(limits.minute_count)>=j.per_minute||Number(limits.hour_count)>=j.per_hour||Number(limits.day_count)>=j.per_day)return;
  const taken=await rows("UPDATE messages SET status='sending',attempts=attempts+1 WHERE id=? AND status='queued'",[j.message_id]);if(!taken.affectedRows)return;
  const url=new URL('/unsubscribe',PUBLIC_URL);url.searchParams.set('id',j.contact_id);url.searchParams.set('email',j.email);url.searchParams.set('sig',signUnsubscribe(j.contact_id,j.email,JWT_SECRET));
  const unsubscribe=url.toString();
  const tx=nodemailer.createTransport({host:j.host,port:j.port,secure:!!j.secure,requireTLS:!j.secure,auth:{user:j.username,pass:decrypt(j.password_cipher,ENCRYPTION_KEY)}});
  try{await tx.sendMail({from:{name:j.from_name,address:j.from_email},to:j.email,subject:j.subject,html:j.html+'<p style="font-size:12px">Unsubscribe: <a href="'+unsubscribe+'">click here</a></p>',text:j.plain});await rows("UPDATE messages SET status='sent',sent_at=NOW(),last_error=NULL WHERE id=?",[j.message_id]);await rows("UPDATE campaigns SET status='completed' WHERE id=? AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.campaign_id=? AND m.status IN ('queued','sending'))",[j.campaign_id,j.campaign_id]);}
  catch(e){const permanent=Number(e.responseCode)>=500||j.attempts>=4;await rows("UPDATE messages SET status=?,last_error=?,next_attempt=DATE_ADD(NOW(), INTERVAL ? SECOND) WHERE id=?",[permanent?'failed':'queued',String(e.message).slice(0,1000),permanent?0:Math.min(3600,60*Math.pow(2,Math.max(0,j.attempts))),j.message_id]);}
}catch(e){app.log.error(e)}finally{busy=false}}
await init();
await rows("UPDATE messages SET status='queued',next_attempt=NOW() WHERE status='sending'");
setInterval(tick,1000).unref();
const port = Number(process.env.APP_PORT || process.env.PORT || 3000);
await app.listen({host:'0.0.0.0',port});
startWorker({ intervalMs: 2000 });
