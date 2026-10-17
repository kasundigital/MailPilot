import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const themeCss = readFileSync(new URL('../public/ui-refinement.css', import.meta.url), 'utf8');

test('MailPilot loads its UI refinement theme and retains developer credit', () => {
  assert.match(html, /href="\/ui-refinement\.css"/);
  assert.match(html, /Designed &amp; Developed by/);
  assert.match(html, /kasunindika\.com/);
});
test('campaign table retains existing action delegation contract', () => {
  for (const hook of ['data-start', 'data-pause', 'data-duplicate', 'data-delete', 'data-logs', 'data-export-logs']) {
    assert.ok(script.includes(hook), 'missing campaign action: ' + hook);
  }
  assert.match(script, /campaignSearch/);
  assert.match(script, /campaignStatus/);
  assert.match(script, /data-campaign-page/);
});
test('design tokens include light/dark semantics, focus and reduced motion', () => {
  assert.match(themeCss, /\[data-theme="light"\]/);
  assert.match(themeCss, /\[data-theme="dark"\]/);
  assert.match(themeCss, /:focus-visible/);
  assert.match(themeCss, /prefers-reduced-motion/);
});
test('logout remains a bodyless POST', () => {
  assert.match(script, /api\('\/api\/logout',\{method:'POST'\}\)/);
});
