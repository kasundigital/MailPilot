import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.ADMIN_PASSWORD = 'test-password';
process.env.JWT_SECRET = 'x'.repeat(64);
process.env.ENCRYPTION_KEY = 'a'.repeat(64);
process.env.PUBLIC_URL = 'https://example.com';

const { app } = await import('../server.js');
const { pool } = await import('../db.js');

test('campaign CSV export requires authentication', async () => {
  const res = await app.inject({ method:'GET', url:'/api/campaigns/12/messages/export.csv' });
  assert.equal(res.statusCode,401);
});

test('campaign CSV export rejects invalid campaign ID', async () => {
  const token=app.jwt.sign({sub:process.env.ADMIN_EMAIL});
  const res=await app.inject({method:'GET',url:'/api/campaigns/xyz/messages/export.csv',headers:{cookie:'mailpilot_session='+token}});
  assert.equal(res.statusCode,400);
});

test('campaign CSV export includes errors and escapes spreadsheet formulas', async () => {
  const previous=pool.query;
  pool.query=async(sql,params)=>{
    if(sql.includes('FROM admin_credentials'))return [[]];
    assert.match(sql,/FROM messages/);
    assert.deepEqual(params,[12]);
    return [[{id:8,email:'person@example.com',status:'failed',attempts:2,last_error:'=HYPERLINK("bad","x")',sent_at:null}]];
  };
  try {
    const token=app.jwt.sign({sub:process.env.ADMIN_EMAIL});
    const res=await app.inject({method:'GET',url:'/api/campaigns/12/messages/export.csv',headers:{cookie:'mailpilot_session='+token}});
    assert.equal(res.statusCode,200);
    assert.match(res.headers['content-type'],/text\/csv/);
    assert.match(res.headers['content-disposition'],/mailpilot-campaign-12-messages.csv/);
    assert.match(res.body,/person@example.com/);
    assert.ok(res.body.includes('"\'=HYPERLINK(""bad"",""x"")"'));
  } finally {
    pool.query=previous;
  }
});
