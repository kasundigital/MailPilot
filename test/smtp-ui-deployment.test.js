import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('public/index.html'),css=read('public/ui-refinement.css');
const js=read('public/app.js'),compose=read('compose.image.yml');
const installer=read('install.sh'),docker=read('.github/workflows/docker-publish.yml');
test('SMTP form keeps existing names and groups controls',()=>{
  assert.match(html,/<form id="smtpForm"/);
  for (const name of ['label','host','port','username','password','secure','fromName','fromEmail','perMinute','perHour','perDay']) {
    assert.match(html,new RegExp('name="'+name+'"'));
  }
  for (const label of ['Connection','Sender identity']) assert.match(html,new RegExp('<legend>'+label+'</legend>'));
  assert.match(html,/Delivery limits/);
});
test('SMTP table retains DNS and SMTP test action hooks',()=>{
  assert.match(js,/account-table/);
  assert.match(js,/data-dns=/);
  assert.match(js,/data-test=/);
  assert.match(js,/escapeHTML\(x\.host\)/);
});
test('responsive theme has reduced motion and keyboard focus',()=>{
  assert.match(css,/\[data-theme="light"\]/);
  assert.match(css,/\[data-theme="dark"\]/);
  assert.match(css,/\.smtp-fields/);
  assert.match(css,/:focus-visible/);
  assert.match(css,/prefers-reduced-motion/);
});
test('image deployment protects historical database volumes and uses GHCR',()=>{
  assert.match(compose,/MAILPILOT_DB_VOLUME:-mailpilot_db-data/);
  assert.match(compose,/ghcr\.io\/kasundigital\/mailpilot/);
  assert.match(installer,/LEGACY_IMAGE_VOLUME/);
  assert.match(installer,/EXPLICIT_VOLUME/);
  assert.match(installer,/git merge --ff-only origin\/main/);
  assert.match(installer,/docker pull "\$REF"/);
  assert.match(docker,/setup-qemu-action/);
  assert.match(docker,/app_version\.outputs\.value/);
});
