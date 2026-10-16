import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV='test';
process.env.ADMIN_EMAIL='admin@example.com';
process.env.ADMIN_PASSWORD='old-password-for-testing';
process.env.JWT_SECRET='x'.repeat(64);
process.env.ENCRYPTION_KEY='a'.repeat(64);
process.env.PUBLIC_URL='https://example.com';

const {app}=await import('../server.js');
const {pool}=await import('../db.js');
const bcrypt=(await import('bcryptjs')).default;

test('password change verifies current password, persists hash, and revokes old sessions',async()=>{
  let credential;
  const original=pool.query;
  pool.query=async(sql,params=[])=>{
    if(sql.includes('SELECT password_hash,session_version FROM admin_credentials'))return [[credential].filter(Boolean)];
    if(sql.includes('INSERT INTO admin_credentials')){
      credential={password_hash:params[0],session_version:(credential?.session_version||0)+1};
      return [{affectedRows:1}];
    }
    return [[]];
  };
  try{
    const login=await app.inject({method:'POST',url:'/api/login',payload:{email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD}});
    assert.equal(login.statusCode,200);
    const loginCookies=[login.headers['set-cookie']].flat().filter(Boolean).map(x=>x.split(';')[0]);
    const me=await app.inject({method:'GET',url:'/api/me',headers:{cookie:loginCookies.join('; ')}});
    assert.equal(me.statusCode,200);
    const csrfCookies=[me.headers['set-cookie']].flat().filter(Boolean).map(x=>x.split(';')[0]);
    const headers={cookie:[...loginCookies,...csrfCookies].join('; '),'csrf-token':me.json().csrfToken};
    const bad=await app.inject({method:'POST',url:'/api/me/password',headers,payload:{currentPassword:'wrong',newPassword:'new-password-for-testing'}});
    assert.equal(bad.statusCode,401);
    assert.equal(credential,undefined);
    const changed=await app.inject({method:'POST',url:'/api/me/password',headers,payload:{currentPassword:process.env.ADMIN_PASSWORD,newPassword:'new-password-for-testing'}});
    assert.equal(changed.statusCode,200);
    assert.equal(changed.json().signInRequired,true);
    assert.ok(await bcrypt.compare('new-password-for-testing',credential.password_hash));
    const revoked=await app.inject({method:'GET',url:'/api/me',headers:{cookie:loginCookies.join('; ')}});
    assert.equal(revoked.statusCode,401);
    const oldLogin=await app.inject({method:'POST',url:'/api/login',payload:{email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD}});
    assert.equal(oldLogin.statusCode,401);
    const newLogin=await app.inject({method:'POST',url:'/api/login',payload:{email:process.env.ADMIN_EMAIL,password:'new-password-for-testing'}});
    assert.equal(newLogin.statusCode,200);
  }finally{pool.query=original}
});
