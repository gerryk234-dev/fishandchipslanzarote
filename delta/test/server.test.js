'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Dom = require('../shared/domain.js');
const { createApp } = require('../server/app.js');

const DAY = 864e5;
function boot(extra = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'delta-test-'));
  const config = { production: false, demo: true, port: 0, baseUrl: 'http://test', dataDir, stripeKey: '', stripeWebhookSecret: '', smtpUrl: '', mailFrom: 'x', adminEmails: ['boss@delta.example'], cookieSecure: false, sessionDays: 30, loginTokenMinutes: 20, maxUploadMb: 15, ...extra };
  const ctx = createApp(config);
  return new Promise(res => { const srv = ctx.app.listen(0, () => res({ ...ctx, srv, url: `http://127.0.0.1:${srv.address().port}`, done: () => { srv.close(); ctx.close(); fs.rmSync(dataDir, { recursive: true, force: true }); } })); });
}
function client(url) {
  let cookie = '';
  const keep = r => { const c = r.headers.get('set-cookie'); if (c) cookie = c.split(';')[0]; return r; };
  return {
    state: () => fetch(url + '/api/state', { headers: { cookie } }).then(keep).then(r => r.json()),
    act: (name, body = {}, headers = {}) => fetch(`${url}/api/act/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Delta': '1', cookie, ...headers }, body: JSON.stringify(body) }).then(keep).then(async r => ({ status: r.status, ...(await r.json()) })),
    get: p => fetch(url + p, { headers: { cookie }, redirect: 'manual' }).then(keep),
  };
}
const persona = async (c, name) => { const s = await c.state(); return c.act('dev-login', { id: s.personas.find(p => p.name === name).id }); };

test('renewal: six months from the later of expiry or purchase, clamped at month end', () => {
  const jan1 = Date.UTC(2026, 0, 1), aug31 = Date.UTC(2026, 7, 31);
  assert.equal(new Date(Dom.renewedExpiry(null, jan1, 6)).toISOString().slice(0, 10), '2026-07-01');
  assert.equal(new Date(Dom.renewedExpiry(aug31, jan1, 6)).toISOString().slice(0, 10), '2027-02-28');
  assert.equal(new Date(Dom.renewedExpiry(jan1, aug31, 6)).toISOString().slice(0, 10), '2027-02-28');
});

test('lab parsing never infers or converts', () => {
  const r = Dom.parseLab('Ca, 62, mg%\nNa, 210, ppm\nZn, sixteen, mg%\nXx, 1, mg%');
  const msgs = r.issues.map(i => i.msg).join('\n');
  assert.match(msgs, /unit "ppm"/); assert.match(msgs, /not a number/); assert.match(msgs, /Unknown element/); assert.match(msgs, /Missing Magnesium/);
  assert.equal(r.minerals.find(m => m.name === 'Mg').value, null);
  assert.deepEqual(Dom.parseLab(Dom.demoLab()).issues, []);
});

test('rule-set regression fixtures pass', () => {
  for (const r of Dom.runRuleTests()) assert.ok(r.pass, r.name);
});

test('security: CSRF header, roles, member data isolation, private files', async () => {
  const app = await boot();
  try {
    const c = client(app.url);
    assert.equal((await c.act('logout', {}, { 'X-Delta': '' })).status, 403);
    await persona(c, 'Alex Morgan');
    const s = await c.state();
    assert.equal(s.users.length, 1); assert.equal(s.users[0].name, 'Alex Morgan');
    assert.equal(s.audit.length, 0); assert.equal(s.outbox.length, 0);
    assert.equal((await c.act('set-role', { id: s.users[0].id, role: 'admin' })).status, 403);
    assert.equal((await c.act('safety', { userId: 'x', decision: 'clear', note: 'n' })).status, 403);
    assert.equal((await c.act('__proto__')).status, 404);
    // Jo's report is held; Jo's own snapshot must not contain it
    const jo = client(app.url); await persona(jo, 'Jo Rivera');
    const joTest = (await jo.state()).users[0].tests[0];
    assert.equal(joTest.status, 'safety_review'); assert.deepEqual(joTest.programme, []); assert.deepEqual(joTest.minerals, []);
    // moderator sees no client records
    const m = client(app.url); await persona(m, 'Moderator');
    assert.equal((await m.state()).users.length, 1);
    // staff upload a PDF; another member cannot fetch it
    const f = client(app.url); await persona(f, 'Founder');
    const lee = (await f.state()).users.find(u => u.name === 'Lee Chen');
    const up = await f.act('upload', { userId: lee.id, name: 'Lee Chen', data: Dom.demoLab(), pdf: { name: 'r.pdf', mime: 'application/pdf', b64: Buffer.from('%PDF-1.4 x').toString('base64') } });
    assert.equal(up.ok, true);
    const fid = (await f.state()).users.find(u => u.id === lee.id).tests[0].pdfFile;
    assert.equal((await f.get('/api/files/' + fid)).status, 200);
    assert.equal((await c.get('/api/files/' + fid)).status, 404);
    assert.equal((await f.act('upload', { userId: lee.id, name: 'Lee Chen', data: 'x', pdf: { name: 'r.pdf', mime: 'application/pdf', b64: Buffer.from('not a pdf').toString('base64') } })).status, 400);
  } finally { app.done(); }
});

test('payments: fulfilment is idempotent and test payments need the order owner', async () => {
  const app = await boot();
  try {
    const a = client(app.url);
    const r = await a.act('checkout', { name: 'Kim', email: 'kim@example.com', terms: true });
    assert.match(r.redirect, /^#\/pay\/ord_/);
    const orderId = r.redirect.split('/').pop();
    const other = client(app.url); await persona(other, 'Alex Morgan');
    assert.equal((await other.act('pay-test', { orderId })).status, 404);
    assert.equal((await a.act('pay-test', { orderId })).ok, true);
    const exp = (await a.state()).users[0].expiresAt;
    app.L.fulfil(orderId, 'replayed-webhook');
    const after = (await a.state()).users[0];
    assert.equal(after.expiresAt, exp); assert.equal(after.tests.length, 1);
    assert.equal((await a.act('checkout', { terms: false })).status, 400);
    const res = await fetch(app.url + '/api/stripe/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(res.status, 400);
  } finally { app.done(); }
});

test('email sign-in: unknown emails reveal nothing, links are single-use, admin bootstrap', async () => {
  const app = await boot();
  try {
    const c = client(app.url);
    const a = await c.act('login-request', { email: 'nobody@example.com' }), b = await c.act('login-request', { email: 'sam@example.com' });
    assert.equal(a.toast, b.toast);
    await c.act('login-request', { email: 'boss@delta.example' });
    const mail = app.store.db.prepare("SELECT body FROM outbox WHERE to_email = 'boss@delta.example' ORDER BY id DESC").get().body;
    const token = mail.match(/token=([\w-]+)/)[1];
    const r1 = await c.get('/auth/verify?token=' + token);
    assert.equal(r1.headers.get('location'), '/#/admin');
    assert.equal((await c.state()).role, 'admin');
    const r2 = await client(app.url).get('/auth/verify?token=' + token);
    assert.match(r2.headers.get('location'), /expired/);
  } finally { app.done(); }
});

test('reminders fire once, then expiry pauses member-only actions', async () => {
  const app = await boot();
  try {
    const c = client(app.url); await persona(c, 'Dana Price');
    const exp = (await c.state()).users[0].expiresAt;
    app.store.kvSet('clockDays', Math.ceil((exp - Date.now()) / DAY) - 5); app.L.runReminders(); app.L.runReminders();
    const titles = (await c.state()).users[0].inbox.map(n => n.title);
    assert.equal(titles.filter(t => /renews in/.test(t)).length, 2); // 30-day (seeded) + 7-day, each once
    app.store.kvSet('clockDays', Math.ceil((exp - Date.now()) / DAY) + 1); app.L.runReminders();
    assert.equal((await c.act('lesson-done', { key: 'body:0' })).status, 403);
    assert.equal((await c.state()).users[0].tests.length, 1);
  } finally { app.done(); }
});

test('production safety: demo-only actions are unavailable when demo mode is off', async () => {
  const app = await boot({ demo: false });
  try {
    const c = client(app.url);
    assert.equal((await c.act('reset')).status, 404);
    assert.equal((await c.act('dev-login', { id: 'x' })).status, 404);
    assert.equal((await c.get('/dev/mailbox')).status, 404);
    assert.equal((await c.state()).personas.length, 0);
  } finally { app.done(); }
});
