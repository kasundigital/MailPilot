import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import formbody from '@fastify/formbody';
import csrfProtection from '@fastify/csrf-protection';
import jwt from '@fastify/jwt';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import sanitizeHtml from 'sanitize-html';
import path from 'node:path';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {pool,init} from './db.js';
import {checkSenderDns} from './dns-diagnostics.js';
import {normalizeEmail,parseEmails,encrypt,decrypt,signUnsubscribe,validSignature,safeLimits,escapeHtml} from './core.js';
const APP_VERSION=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version;
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
if (!ENCRYPTION_KEY || !ENCRYPTION_KEY.split(',').every(k => /^[0-9a-f]{64}$/i.test(k.trim()))) {
  throw Error('Configure valid ENCRYPTION_KEY');
}
if (!PUBLIC_URL || !PUBLIC_URL.startsWith('https://')) {
  throw Error('Configure valid HTTPS PUBLIC_URL');
}

const app=Fastify({logger:true,bodyLimit:1_000_000,trustProxy:false});
await app.register(helmet,{contentSecurityPolicy:false});
await app.register(cookie);
await app.register(formbody);
await app.register(csrfProtection,{cookieOpts:{secure:true,sameSite:'strict',path:'/'}});
await app.register(jwt,{secret:JWT_SECRET,cookie:{cookieName:'mailpilot_session',signed:false}});
await app.register(rateLimit,{global:false});
const hash=await bcrypt.hash(ADMIN_PASSWORD,12);
const adminCredentials=async()=>{
  const [record]=await rows('SELECT password_hash,session_version FROM admin_credentials WHERE id=1');
  return record && typeof record.password_hash==='string' && Number.isSafeInteger(Number(record.session_version)) ? record : {password_hash:hash,session_version:0};
};
const auth=async(req,reply)=>{
  try{
    await req.jwtVerify();
    const credentials=await adminCredentials();
    if(req.user.sub!==ADMIN_EMAIL||Number(req.user.version||0)!==Number(credentials.session_version))
      return reply.code(401).send({error:'Unauthorized'});
  }catch{return reply.code(401).send({error:'Unauthorized'})}
};
const csrfAuth=async(req,reply)=>{
  await auth(req,reply);
  if(reply.sent)return;
  await new Promise((resolve,reject)=>{
    app.csrfProtection(req,reply,(err)=>{
      if(err)reject(err);
      else resolve();
    });
  });
};
app.setErrorHandler((err,req,reply)=>{req.log.error(err);reply.code(err.statusCode&&err.statusCode<500?err.statusCode:400).send({error:err.statusCode&&err.statusCode<500?err.message:'Request failed'})});
const rows=async(sql,params=[])=>{const [r]=await pool.query(sql,params);return r};
const audit = async (req, action, details='') => {
  try {
    await rows('INSERT INTO audit_logs(admin_email,action,details,ip_address) VALUES (?,?,?,?)',
      [ADMIN_EMAIL, action, String(details).slice(0,255), String(req.ip||'unknown').slice(0,45)]);
  } catch (err) { req.log.warn({err}, 'Audit logging failed'); }
};
app.get('/health',async()=>({ok:true,version:APP_VERSION}));
app.get('/api/version',async()=>({version:APP_VERSION}));
app.post('/api/login', {
  config: {
    rateLimit: { max: 5, timeWindow: '1 minute' }
  }
}, async (req, reply) => {
  const { email, password } = req.body || {};
  const credentials=await adminCredentials();
  if (email !== ADMIN_EMAIL || typeof password !== 'string' || !(await bcrypt.compare(password,credentials.password_hash))) {
    await audit(req,'login_failed',String(email||'').slice(0,255));return reply.code(401).send({ error: 'Invalid credentials' });
  }
  const token = app.jwt.sign({ sub: ADMIN_EMAIL,version:Number(credentials.session_version) }, { expiresIn: '8h' });
  reply.setCookie('mailpilot_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 28800
  });
  await audit(req, 'login_success');
  return { ok: true };
});
app.post('/api/logout',{preHandler:csrfAuth},async(req,reply)=>{reply.clearCookie('mailpilot_session',{path:'/',secure:true,sameSite:'strict',httpOnly:true});await audit(req,'logout');return {ok:true}});
app.get('/api/me',{preHandler:auth},async(req,reply)=>({email:ADMIN_EMAIL,csrfToken:await reply.generateCsrf()}));
app.post('/api/me/password',{preHandler:csrfAuth,config:{rateLimit:{max:5,timeWindow:'15 minutes'}}},async(req,reply)=>{
  const {currentPassword,newPassword}=req.body||{};
  if(typeof currentPassword!=='string'||typeof newPassword!=='string'||
    newPassword.length<12||newPassword.length>128||currentPassword===newPassword)
    return reply.code(400).send({error:'Password must be 12–128 characters and different from current password'});
  const credentials=await adminCredentials();
  if(!(await bcrypt.compare(currentPassword,credentials.password_hash)))
    return reply.code(401).send({error:'Current password is incorrect'});
  const nextHash=await bcrypt.hash(newPassword,12);
  await rows('INSERT INTO admin_credentials(id,password_hash,session_version) VALUES (1,?,1) ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash),session_version=session_version+1',[nextHash]);
  await audit(req,'password_changed');
  reply.clearCookie('mailpilot_session',{path:'/'});
  return {ok:true,signInRequired:true};
});

app.get('/api/stats',{preHandler:auth},async()=>{const [contacts]=await rows('SELECT COUNT(*) total,SUM(subscribed=1) subscribed FROM contacts');const [messages]=await rows("SELECT COUNT(*) total,SUM(status='sent') sent,SUM(status='queued') queued,SUM(status='failed') failed FROM messages");return {contacts,messages}});
app.get('/api/accounts',{preHandler:auth},async()=>rows('SELECT id,label,host,port,secure,username,from_name,from_email,per_minute,per_hour,per_day,enabled FROM accounts ORDER BY id DESC'));
app.post('/api/accounts', { preHandler: csrfAuth }, async (req, reply) => {
  const x = req.body || {};
  const limit = safeLimits({
    perMinute: x.perMinute,
    perHour: x.perHour,
    perDay: x.perDay,
  });

  if (
    !x.label ||
    !x.host ||
    !x.username ||
    !x.password ||
    !normalizeEmail(x.fromEmail) ||
    !Number.isInteger(Number(x.port)) ||
    Number(x.port) < 1 ||
    Number(x.port) > 65535
  ) {
    return reply.code(400).send({ error: 'Invalid SMTP details' });
  }

  const r = await rows(
    'INSERT INTO accounts(label,host,port,secure,username,password_cipher,from_name,from_email,per_minute,per_hour,per_day) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [
      String(x.label).slice(0, 120),
      String(x.host).slice(0, 255),
      Number(x.port),
      !!x.secure,
      String(x.username),
      encrypt(String(x.password), ENCRYPTION_KEY),
      String(x.fromName || 'MailPilot').slice(0, 120),
      normalizeEmail(x.fromEmail),
      limit.perMinute,
      limit.perHour,
      limit.perDay,
    ]
  );

  return { id: r.insertId };
});
app.get('/api/accounts/:id/dns',{preHandler:auth,config:{rateLimit:{max:10,timeWindow:'1 minute'}}},async(req,reply)=>{
  const id=Number(req.params.id);
  if(!Number.isSafeInteger(id)||id<=0)return reply.code(400).send({error:'Invalid account ID'});
  const [account]=await rows('SELECT from_email FROM accounts WHERE id=?',[id]);
  if(!account)return reply.code(404).send({error:'Account not found'});
  return checkSenderDns(account.from_email);
});
app.post('/api/accounts/:id/test',{preHandler:csrfAuth,config:{rateLimit:{max:5,timeWindow:'1 minute'}}},async(req,reply)=>{const [a]=await rows('SELECT * FROM accounts WHERE id=?',[req.params.id]);if(!a)return reply.code(404).send({error:'Not found'});const tx=nodemailer.createTransport({host:a.host,port:a.port,secure:!!a.secure,requireTLS:!a.secure,auth:{user:a.username,pass:decrypt(a.password_cipher,ENCRYPTION_KEY)},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:10000});try{await tx.verify();return {ok:true}}finally{tx.close()}});
const csvCell = value => {
  const text = String(value ?? '');
  const safe = /^[=+@\-\t\r\n]/.test(text) ? "'" + text : text;
  return '"' + safe.replace(/"/g, '""') + '"';
};
app.get('/api/contacts/export.csv',{preHandler:auth},async(req,reply)=>{
  const contacts=await rows('SELECT email,subscribed,consent_source,created_at,unsubscribed_at FROM contacts ORDER BY id');
  const header=['email','subscribed','consent_source','created_at','unsubscribed_at'];
  const lines=[header.join(','),...contacts.map(c=>header.map(k=>csvCell(c[k])).join(','))];
  reply.header('Content-Type','text/csv; charset=utf-8');
  reply.header('Content-Disposition','attachment; filename="mailpilot-contacts.csv"');
  reply.header('Cache-Control','no-store');
  return '\uFEFF'+lines.join('\r\n')+'\r\n';
});
app.get('/api/contacts',{preHandler:auth},async()=>rows('SELECT id,email,subscribed,consent_source,created_at FROM contacts ORDER BY id DESC LIMIT 500'));
app.post('/api/contacts/import',{preHandler:csrfAuth,config:{rateLimit:{max:5,timeWindow:'1 minute'}}},async(req,reply)=>{const {emails,consentSource,confirmConsent}=req.body||{};if(confirmConsent!==true||typeof consentSource!=='string'||consentSource.trim().length<3)return reply.code(400).send({error:'Confirm recipient permission and provide consent source'});const parsed=parseEmails(emails);if(!parsed.length||parsed.length>10000)return reply.code(400).send({error:'Provide 1–10000 valid email addresses'});let added=0;for(const email of parsed){const r=await rows('INSERT IGNORE INTO contacts(email,consent_source) VALUES (?,?)',[email,consentSource.trim().slice(0,255)]);added+=r.affectedRows}await audit(req,'contacts_imported',`Added ${added} contacts`);return {received:parsed.length,added,duplicates:parsed.length-added}});
app.get('/api/campaigns',{preHandler:auth},async()=>rows("SELECT c.id,c.name,c.subject,c.status,c.created_at,a.label account_name,(SELECT COUNT(*) FROM campaign_audience ca WHERE ca.campaign_id=c.id) audience_total,(SELECT COUNT(*) FROM messages m WHERE m.campaign_id=c.id) total,(SELECT COUNT(*) FROM messages m WHERE m.campaign_id=c.id AND m.status='sent') sent FROM campaigns c JOIN accounts a ON a.id=c.account_id ORDER BY c.id DESC LIMIT 100"));
const safeStyleRegex=/^(?!.*(?:expression|-moz-binding|url\s*\()).*$/i;const safeStyle=[safeStyleRegex];const allowedStylesObj={'color':safeStyle,'background':safeStyle,'background-color':safeStyle,'font-family':safeStyle,'font-size':safeStyle,'font-weight':safeStyle,'font-style':safeStyle,'text-align':safeStyle,'text-decoration':safeStyle,'line-height':safeStyle,'margin':safeStyle,'margin-top':safeStyle,'margin-right':safeStyle,'margin-bottom':safeStyle,'margin-left':safeStyle,'padding':safeStyle,'padding-top':safeStyle,'padding-right':safeStyle,'padding-bottom':safeStyle,'padding-left':safeStyle,'border':safeStyle,'border-top':safeStyle,'border-right':safeStyle,'border-bottom':safeStyle,'border-left':safeStyle,'border-radius':safeStyle,'width':safeStyle,'max-width':safeStyle,'height':safeStyle,'max-height':safeStyle,'display':safeStyle,'vertical-align':safeStyle,'list-style':safeStyle,'list-style-type':safeStyle,'border-collapse':safeStyle,'border-spacing':safeStyle,'color-scheme':safeStyle};
app.post('/api/campaigns',{preHandler:csrfAuth},async(req,reply)=>{
  const x=req.body||{};
  if(!x.accountId||!String(x.subject||'').trim()||!String(x.html||'').trim())
    return reply.code(400).send({error:'Sender, subject and HTML are required'});
  if(!['all','selected'].includes(x.audienceMode))
    return reply.code(400).send({error:'Choose your recipients explicitly'});
  const clean=sanitizeHtml(String(x.html),{allowedTags:sanitizeHtml.defaults.allowedTags.concat(['img','h1','h2','style']),allowVulnerableTags:true,allowedAttributes:{...sanitizeHtml.defaults.allowedAttributes,a:['href','target','rel'],img:['src','alt','width','height'],'*':['style']},allowedStyles:{'*':allowedStylesObj},allowedSchemes:['https','http','mailto']});
  const accounts=await rows('SELECT id FROM accounts WHERE id=? AND enabled=1',[x.accountId]);
  if(!accounts.length)return reply.code(400).send({error:'Active account required'});
  let recipientIds=[];
  if(x.audienceMode==='all'){
    const contacts=await rows('SELECT id FROM contacts WHERE subscribed=1');
    recipientIds=contacts.map(c=>c.id);
  }else{
    const tokens=String(x.recipientEmails||'').split(/[\s,;]+/).filter(Boolean);
    if(tokens.some(token=>!normalizeEmail(token)))
      return reply.code(400).send({error:'Invalid recipient address. Correct all addresses before saving.'});
    const emails=[...new Set(tokens.map(normalizeEmail))];
    if(!emails.length||emails.length>500)
      return reply.code(400).send({error:'Select 1–500 existing opted-in contact addresses'});
    const contacts=await rows('SELECT id,email FROM contacts WHERE subscribed=1 AND email IN (?)',[emails]);
    if(contacts.length!==emails.length)
      return reply.code(400).send({error:'Some recipients are missing, invalid or unsubscribed'});
    recipientIds=contacts.map(c=>c.id);
  }
  if(!recipientIds.length)return reply.code(400).send({error:'No subscribed contacts in the chosen audience'});
  const connection=await pool.getConnection();
  let id;
  try{
    await connection.beginTransaction();
    const [result]=await connection.query('INSERT INTO campaigns(account_id,name,subject,preheader,html,plain) VALUES (?,?,?,?,?,?)',
      [x.accountId,String(x.name||'').slice(0,255),String(x.subject).slice(0,255),String(x.preheader||'').slice(0,255),clean,String(x.plain||clean.replace(/<[^>]+>/g,' '))]);
    id=result.insertId;
    for(let offset=0;offset<recipientIds.length;offset+=500){
      const batch=recipientIds.slice(offset,offset+500).map(contactId=>[id,contactId]);
      await connection.query('INSERT INTO campaign_audience(campaign_id,contact_id) VALUES ?',[batch]);
    }
    await connection.commit();
  }catch(err){await connection.rollback();throw err}finally{connection.release()}
  await audit(req,'campaign_created',`Campaign ID ${id}; recipients ${recipientIds.length}`);
  return {id,recipientCount:recipientIds.length};
});
app.post('/api/campaigns/:id/start',{preHandler:csrfAuth},async(req,reply)=>{
  const [c]=await rows('SELECT * FROM campaigns WHERE id=?',[req.params.id]);
  if(!c||!['draft','paused'].includes(c.status))
    return reply.code(400).send({error:'Campaign cannot be started'});
  if(c.status==='draft'){
    const [audience]=await rows('SELECT COUNT(*) AS total FROM campaign_audience WHERE campaign_id=?',[c.id]);
    if(!Number(audience?.total)){
      if(req.body?.legacyAudience!=='all')
        return reply.code(409).send({error:'Legacy draft has no audience. Explicitly select all subscribed contacts to continue.'});
      await rows('INSERT IGNORE INTO campaign_audience(campaign_id,contact_id) SELECT ?,id FROM contacts WHERE subscribed=1',[c.id]);
    }
    await rows("INSERT IGNORE INTO messages(campaign_id,contact_id) SELECT ?,ca.contact_id FROM campaign_audience ca JOIN contacts c ON c.id=ca.contact_id WHERE ca.campaign_id=? AND c.subscribed=1",[c.id,c.id]);
  }
  const [pending]=await rows("SELECT COUNT(*) AS total FROM messages WHERE campaign_id=? AND status IN ('queued','sending')",[c.id]);
  if(!Number(pending?.total))
    return reply.code(400).send({error:'No eligible recipients remain. Campaign was not started.'});
  await rows("UPDATE campaigns SET status='running' WHERE id=?",[c.id]);
  await audit(req,'campaign_started',`Campaign ID ${c.id}`);
  return {ok:true};
});

app.post('/api/campaigns/test-send', { preHandler: csrfAuth, config:{rateLimit:{max:3,timeWindow:'1 hour'}} }, async (req, reply) => {
  const { accountId, subject, html, plain, testEmail, preheader } = req.body || {};
  if (!accountId || !subject || !html || !testEmail) return reply.code(400).send({ error: 'Missing required fields for test send' });
  const [account] = await rows('SELECT * FROM accounts WHERE id=? AND enabled=1', [accountId]);
  if (!account) return reply.code(400).send({ error: 'Active account required' });

  try {
    const transporter = nodemailer.createTransport({
      host: account.host, port: account.port, secure: !!account.secure,
      requireTLS: !account.secure,
      connectionTimeout: 10000,
      socketTimeout: 15000,
      auth: { user: account.username, pass: decrypt(account.password_cipher, ENCRYPTION_KEY) },
      pool: false
    });
    const parsedTestEmail = parseEmails(testEmail)[0];
    if(!parsedTestEmail) return reply.code(400).send({ error: 'Invalid test email address' });

    await transporter.sendMail({
      from: `"${account.from_name}" <${account.from_email}>`,
      to: parsedTestEmail,
      subject: subject,
      html: (preheader ? '<div style="display:none;max-height:0;overflow:hidden;opacity:0">'+escapeHtml(String(preheader).slice(0,255))+'</div>' : '') + sanitizeHtml(String(html), { allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img','h1','h2','style']), allowVulnerableTags: true, allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, a: ['href','target','rel'], img: ['src','alt','width','height'], '*': ['style'] }, allowedStyles: { '*': allowedStylesObj }, allowedSchemes: ['https','http','mailto'] }),
      text: plain || String(html).replace(/<[^>]+>/g, ' ')
    });
    return { ok: true };
  } catch (err) {
    return reply.code(500).send({ error: 'Test send failed: ' + err.message });
  }
});
app.post('/api/campaigns/:id/pause',{preHandler:csrfAuth},async(req)=>{await rows("UPDATE campaigns SET status='paused' WHERE id=? AND status='running'",[req.params.id]);await audit(req,'campaign_paused',`Campaign ID ${req.params.id}`);return {ok:true}});
app.delete('/api/campaigns/:id', { preHandler: csrfAuth }, async (req, reply) => {
  const [c] = await rows('SELECT status FROM campaigns WHERE id=?', [req.params.id]);
  if (!c) return reply.code(404).send({ error: 'Campaign not found' });
  if (c.status === 'running') return reply.code(400).send({ error: 'Cannot delete a running campaign' });
  await rows('DELETE FROM campaign_audience WHERE campaign_id=?', [req.params.id]);
  await rows('DELETE FROM messages WHERE campaign_id=?', [req.params.id]);
  await rows('DELETE FROM campaigns WHERE id=?', [req.params.id]);
  await audit(req, 'campaign_deleted', `Campaign ID ${req.params.id}`);
  return { ok: true };
});

app.post('/api/campaigns/:id/duplicate', { preHandler: csrfAuth }, async (req, reply) => {
  const [c] = await rows('SELECT * FROM campaigns WHERE id=?', [req.params.id]);
  if (!c) return reply.code(404).send({ error: 'Campaign not found' });
  const [r] = await rows('INSERT INTO campaigns(account_id, name, subject, preheader, html, plain) VALUES (?,?,?,?,?,?)',
    [c.account_id, String(c.name || '') + ' (Copy)', String(c.subject), String(c.preheader || ''), c.html, c.plain]);
  const newId = r.insertId;
  await rows('INSERT INTO campaign_audience(campaign_id, contact_id) SELECT ?, contact_id FROM campaign_audience WHERE campaign_id=?', [newId, c.id]);
  await audit(req, 'campaign_duplicated', `Campaign ID ${newId} from ${c.id}`);
  return { id: newId };
});

app.get('/api/campaigns/:id/messages',{preHandler:auth},async(req)=>rows('SELECT m.id,c.email,m.status,m.attempts,m.last_error,m.sent_at FROM messages m JOIN contacts c ON c.id=m.contact_id WHERE m.campaign_id=? ORDER BY m.id DESC LIMIT 500',[req.params.id]));
app.get('/api/campaigns/:id/messages/export.csv',{preHandler:auth},async(req,reply)=>{
  const id=Number(req.params.id);
  if(!Number.isSafeInteger(id)||id<=0)return reply.code(400).send({error:'Invalid campaign ID'});
  const messages=await rows('SELECT m.id,c.email,m.status,m.attempts,m.last_error,m.sent_at FROM messages m JOIN contacts c ON c.id=m.contact_id WHERE m.campaign_id=? ORDER BY m.id DESC LIMIT 10000',[id]);
  const fields=['id','email','status','attempts','last_error','sent_at'];
  const lines=[fields.join(','),...messages.map(message=>fields.map(field=>csvCell(message[field])).join(','))];
  reply.header('Content-Type','text/csv; charset=utf-8');
  reply.header('Content-Disposition','attachment; filename="mailpilot-campaign-'+id+'-messages.csv"');
  reply.header('Cache-Control','no-store');
  return '\uFEFF'+lines.join('\r\n')+'\r\n';
});

app.get('/unsubscribe', async (req, reply) => {
  const { id, email, sig } = req.query || {};
  if (!validSignature(id, email, sig, JWT_SECRET))
    return reply.code(400).type('text/plain').send('Invalid unsubscribe link');
  return reply.type('text/html').send(`<!doctype html>
<title>Unsubscribe</title>
<h1>Unsubscribe</h1>
<form method="POST">
  <input type="hidden" name="id" value="${escapeHtml(id)}">
  <input type="hidden" name="email" value="${escapeHtml(email)}">
  <input type="hidden" name="sig" value="${escapeHtml(sig)}">
  <button>Confirm unsubscribe</button>
</form>`);
});
app.post('/unsubscribe',async(req,reply)=>{const x=req.body||{};if(!validSignature(x.id,x.email,x.sig,JWT_SECRET))return reply.code(400).type('text/plain').send('Invalid link');await rows('UPDATE contacts SET subscribed=0,unsubscribed_at=NOW() WHERE id=? AND email=?',[x.id,x.email]);await rows("UPDATE messages SET status='suppressed' WHERE contact_id=? AND status='queued'",[x.id]);return reply.type('text/plain').send('You have been unsubscribed.')});
await app.register(fastifyStatic,{root:path.join(path.dirname(fileURLToPath(import.meta.url)),'../public'),prefix:'/'});
let busy = false;

async function getCandidate() {
  const candidates = await rows("SELECT m.id AS message_id,m.campaign_id,m.contact_id,m.attempts,c.email,c.subscribed,p.subject,p.preheader,p.html,p.plain,a.* FROM messages m JOIN campaigns p ON p.id=m.campaign_id JOIN contacts c ON c.id=m.contact_id JOIN accounts a ON a.id=p.account_id WHERE m.status='queued' AND m.next_attempt<=NOW() AND p.status='running' AND a.enabled=1 ORDER BY m.id LIMIT 1");
  return candidates[0];
}

async function handleUnsubscribed(j) {
  if (!j.subscribed) {
    await rows("UPDATE messages SET status='suppressed' WHERE id=?", [j.message_id]);
    return true;
  }
  return false;
}

async function checkRateLimits(j) {
  const [limits] = await rows("SELECT SUM(m.sent_at>=NOW()-INTERVAL 1 MINUTE) minute_count,SUM(m.sent_at>=NOW()-INTERVAL 1 HOUR) hour_count,SUM(m.sent_at>=NOW()-INTERVAL 1 DAY) day_count FROM messages m JOIN campaigns c ON c.id=m.campaign_id WHERE c.account_id=? AND m.status='sent'", [j.account_id]);
  return (Number(limits.minute_count) >= j.per_minute || Number(limits.hour_count) >= j.per_hour || Number(limits.day_count) >= j.per_day);
}

async function takeMessage(message_id) {
  const taken = await rows("UPDATE messages SET status='sending',attempts=attempts+1 WHERE id=? AND status='queued'", [message_id]);
  return taken.affectedRows > 0;
}

async function sendCandidateMessage(j) {
  const url = new URL('/unsubscribe', PUBLIC_URL);
  url.searchParams.set('id', j.contact_id);
  url.searchParams.set('email', j.email);
  url.searchParams.set('sig', signUnsubscribe(j.contact_id, j.email, JWT_SECRET));
  const unsubscribe = url.toString();

  const tx = nodemailer.createTransport({
    host: j.host,
    port: j.port,
    secure: !!j.secure,
    requireTLS: !j.secure,
    auth: {
      user: j.username,
      pass: decrypt(j.password_cipher, ENCRYPTION_KEY)
    },
    connectionTimeout: 15000,
    socketTimeout: 20000
  });

  try {
    await tx.sendMail({
      from: { name: j.from_name, address: j.from_email },
      to: j.email,
      subject: j.subject,
      html: (j.preheader ? '<div style="display:none;max-height:0;overflow:hidden;opacity:0">'+escapeHtml(String(j.preheader))+'</div>' : '') + j.html + '<p style="font-size:12px">Unsubscribe: <a href="' + unsubscribe + '">click here</a></p>',
      text: j.plain + '\n\nUnsubscribe: ' + unsubscribe,
      headers: { 'List-Unsubscribe': '<' + unsubscribe + '>' },
      list: { unsubscribe: { url: unsubscribe } }
    });
    await rows("UPDATE messages SET status='sent',sent_at=NOW(),last_error=NULL WHERE id=?", [j.message_id]);
  } catch (e) {
    const permanent = Number(e.responseCode) >= 500 || j.attempts >= 4;
    const backoff = Math.min(3600, 60 * 2 ** j.attempts);
    await rows("UPDATE messages SET status=?,next_attempt=DATE_ADD(NOW(),INTERVAL ? SECOND),last_error=? WHERE id=?", [permanent ? 'failed' : 'queued', backoff, String(e.message).slice(0, 1000), j.message_id]);
  } finally {
    tx.close();
  }
}

async function checkCampaignCompletion(campaign_id) {
  await rows("UPDATE campaigns c SET status='completed' WHERE id=? AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.campaign_id=c.id AND m.status IN ('queued','sending'))", [campaign_id]);
}

async function tick() {
  if (busy) return;
  busy = true;
  try {
    const j = await getCandidate();
    if (!j) return;

    const suppressed = await handleUnsubscribed(j);
    if (suppressed) return;

    const isLimited = await checkRateLimits(j);
    if (isLimited) return;

    const taken = await takeMessage(j.message_id);
    if (!taken) return;

    await sendCandidateMessage(j);
    await checkCampaignCompletion(j.campaign_id);
  } catch (e) {
    app.log.error(e);
  } finally {
    busy = false;
  }
}

export { app, tick };

async function startServer() {
  await init();
  await rows("UPDATE messages SET status='queued',next_attempt=NOW() WHERE status='sending'");
  setInterval(tick,1000).unref();
  const port = Number(process.env.APP_PORT || process.env.PORT || 3088);
  await app.listen({port,host:'0.0.0.0'});
}

// Importing for API tests must not open a listening socket or query the DB.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await startServer();
}
