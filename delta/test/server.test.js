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
    const r = await a.act('checkout', { name: 'Kim', email: 'kim@example.com', phone: '+44 7700 900123', nationality: 'British', dob: '1985-04-02', terms: true });
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

test('registration: email + phone + nationality + date of birth, with validation', async () => {
  const app = await boot();
  try {
    const c = client(app.url);
    const good = { name: 'Ana López', email: 'ana@example.com', phone: '+34 612 22 58 43', nationality: 'Spanish', dob: '1990-06-01', terms: true };
    assert.match((await c.act('register', { ...good, phone: 'call me' })).error, /phone number/);
    assert.match((await c.act('register', { ...good, nationality: 'Martian' })).error, /nationality/);
    assert.match((await c.act('register', { ...good, dob: '2015-01-01' })).error, /aged 18 and over/);
    assert.match((await c.act('register', { ...good, terms: false })).error, /terms/);
    const r = await c.act('register', good);
    assert.equal(r.ok, true); assert.equal(r.go, '/join');
    const me = (await c.state()).users[0];
    assert.equal(me.phone, '+34612225843'); assert.equal(me.nationality, 'Spanish'); assert.equal(me.dob, '1990-06-01'); assert.equal(me.emailVerified, false);
    assert.equal((await client(app.url).act('register', good)).status, 409);
    const mail = app.store.db.prepare("SELECT subject FROM outbox WHERE to_email = 'ana@example.com'").get();
    assert.match(mail.subject, /Confirm your DELTA email/);
  } finally { app.done(); }
});

test('Google / Apple sign-in: verified ID token creates or links the account; forged tokens are refused', async () => {
  const crypto = require('node:crypto'), http = require('node:http');
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const { privateKey: wrongKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' };
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  let claims = {}, signWith = privateKey, lastNonce = '';
  const idp = http.createServer((req, res) => {
    let body = ''; req.on('data', d => body += d); req.on('end', () => {
      if (req.url === '/jwks') return res.end(JSON.stringify({ keys: [jwk] }));
      if (req.url === '/token') {
        const p = new URLSearchParams(body);
        assert.equal(p.get('client_id'), 'gid'); assert.ok(p.get('code_verifier'), 'PKCE verifier sent');
        const h = b64({ alg: 'RS256', kid: 'k1' }), pl = b64({ iss: 'https://idp.test', aud: 'gid', exp: Math.floor(Date.now() / 1000) + 600, nonce: lastNonce, email_verified: true, ...claims });
        const sig = crypto.sign('RSA-SHA256', Buffer.from(`${h}.${pl}`), signWith).toString('base64url');
        return res.end(JSON.stringify({ id_token: `${h}.${pl}.${sig}` }));
      }
      res.statusCode = 404; res.end();
    });
  });
  await new Promise(r => idp.listen(0, r));
  const idpUrl = `http://127.0.0.1:${idp.address().port}`;
  const app = await boot({ google: { clientId: 'gid', clientSecret: 'gsecret' }, oauthOverrides: { google: { tokenUrl: idpUrl + '/token', jwksUrl: idpUrl + '/jwks', issuers: ['https://idp.test'] } } });
  const signIn = async c => {
    const start = await c.get('/auth/google/start');
    const loc = new URL(start.headers.get('location'));
    assert.equal(loc.origin + loc.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
    assert.equal(loc.searchParams.get('code_challenge_method'), 'S256');
    lastNonce = loc.searchParams.get('nonce');
    return c.get(`/auth/google/callback?code=abc&state=${loc.searchParams.get('state')}`);
  };
  try {
    assert.deepEqual((await client(app.url).state()).oauth, { google: true, microsoft: false, apple: false });
    // new person → account created, sent to /join
    const c = client(app.url); claims = { sub: 'g-1', email: 'New.Person@gmail.com', name: 'New Person' };
    assert.equal((await signIn(c)).headers.get('location'), '/#/join');
    const s = await c.state(); assert.equal(s.users[0].name, 'New Person'); assert.deepEqual(s.users[0].signIn, ['email', 'google']);
    // existing email → linked to the existing account
    const d = client(app.url); claims = { sub: 'g-2', email: 'alex@example.com', name: 'Alex' };
    assert.equal((await signIn(d)).headers.get('location'), '/#/portal');
    assert.equal((await d.state()).users[0].name, 'Alex Morgan');
    // forged signature, unverified email, replayed state → refused
    const e = client(app.url); signWith = wrongKey; claims = { sub: 'g-3', email: 'x@gmail.com' };
    assert.match((await signIn(e)).headers.get('location'), /error=failed/);
    assert.equal((await e.state()).session, null);
    signWith = privateKey; claims = { sub: 'g-4', email: 'y@gmail.com', email_verified: false };
    assert.match((await signIn(client(app.url))).headers.get('location'), /error=failed/);
    assert.match((await client(app.url).get('/auth/google/callback?code=abc&state=nope')).headers.get('location'), /error=expired/);
    // not configured → friendly message
    assert.match((await client(app.url).get('/auth/apple/start')).headers.get('location'), /notconfigured/);
  } finally { app.done(); idp.close(); }
});

test('social sign-ups give phone, nationality and date of birth at intake; DOB decides the under-18 flag', async () => {
  const app = await boot();
  try {
    const u = app.L.createUser({ name: 'Social', email: 'social@example.com' });
    const c = client(app.url);
    await c.act('login-request', { email: 'social@example.com' });
    const token = app.store.db.prepare("SELECT body FROM outbox WHERE to_email = 'social@example.com' ORDER BY id DESC").get().body.match(/token=([\w-]+)/)[1];
    await c.get('/auth/verify?token=' + token);
    const base = { pregnant: 'no', under18: 'no', medications: '', conditions: '', edu: true, consent: true };
    assert.match((await c.act('intake', base)).error, /phone number/);
    assert.equal((await c.act('intake', { ...base, phone: '+353 87 123 4567', nationality: 'Irish', dob: '1979-02-03' })).ok, true);
    const me = (await c.state()).users[0];
    assert.equal(me.nationality, 'Irish'); assert.equal(me.intake.under18, 'no'); assert.equal(me.intake.review_status, 'cleared');
    void u;
  } finally { app.done(); }
});

test('Sign in with Apple: form_post callback, first-time name, ES256 client secret', async () => {
  const crypto = require('node:crypto'), http = require('node:http');
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const ec = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'a1' };
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  let nonce = '', secretOk = false;
  const idp = http.createServer((req, res) => { let body = ''; req.on('data', d => body += d); req.on('end', () => {
    if (req.url === '/keys') return res.end(JSON.stringify({ keys: [jwk] }));
    const p = new URLSearchParams(body), [h, pl, sig] = p.get('client_secret').split('.');
    secretOk = JSON.parse(Buffer.from(h, 'base64url')).alg === 'ES256' && JSON.parse(Buffer.from(pl, 'base64url')).iss === 'TEAM123'
      && crypto.verify('sha256', Buffer.from(`${h}.${pl}`), { key: ec.publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(sig, 'base64url'));
    const hh = b64({ alg: 'RS256', kid: 'a1' }), body2 = b64({ iss: 'https://appleid.apple.com', aud: 'com.delta.web', exp: Math.floor(Date.now() / 1000) + 600, nonce, sub: 'apple-1', email: 'relay@privaterelay.appleid.com', email_verified: 'true' });
    res.end(JSON.stringify({ id_token: `${hh}.${body2}.${crypto.sign('RSA-SHA256', Buffer.from(`${hh}.${body2}`), privateKey).toString('base64url')}` }));
  }); });
  await new Promise(r => idp.listen(0, r));
  const u = `http://127.0.0.1:${idp.address().port}`;
  const app = await boot({ apple: { clientId: 'com.delta.web', teamId: 'TEAM123', keyId: 'KEY1', privateKey: ec.privateKey.export({ type: 'pkcs8', format: 'pem' }) }, oauthOverrides: { apple: { tokenUrl: u + '/token', jwksUrl: u + '/keys' } } });
  try {
    const c = client(app.url);
    const loc = new URL((await c.get('/auth/apple/start')).headers.get('location'));
    assert.equal(loc.searchParams.get('response_mode'), 'form_post');
    nonce = loc.searchParams.get('nonce');
    const form = new URLSearchParams({ code: 'c', state: loc.searchParams.get('state'), user: JSON.stringify({ name: { firstName: 'Mia', lastName: 'Stone' } }) });
    const r = await fetch(app.url + '/auth/apple/callback', { method: 'POST', body: form, redirect: 'manual' });
    assert.equal(r.status, 303); assert.equal(r.headers.get('location'), '/#/join');
    assert.ok(secretOk, 'client secret is a valid ES256 JWT');
    const cookie = r.headers.get('set-cookie').split(';')[0];
    const s = await fetch(app.url + '/api/state', { headers: { cookie } }).then(x => x.json());
    assert.equal(s.users[0].name, 'Mia Stone'); assert.deepEqual(s.users[0].signIn, ['email', 'apple']);
  } finally { app.done(); idp.close(); }
});

test('Microsoft sign-in: personal accounts are trusted; work accounts never take over an existing email', async () => {
  const crypto = require('node:crypto'), http = require('node:http');
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'm1' };
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const PERSONAL = '9188040d-6c67-4c5b-b112-36a304b66dad', WORK = '11111111-2222-3333-4444-555555555555';
  let claims = {}, nonce = '';
  const idp = http.createServer((req, res) => { req.resume(); req.on('end', () => {
    if (req.url === '/keys') return res.end(JSON.stringify({ keys: [jwk] }));
    const h = b64({ alg: 'RS256', kid: 'm1' }), pl = b64({ iss: `https://login.microsoftonline.com/${claims.tid}/v2.0`, aud: 'mid', exp: Math.floor(Date.now() / 1000) + 600, nonce, ...claims });
    res.end(JSON.stringify({ id_token: `${h}.${pl}.${crypto.sign('RSA-SHA256', Buffer.from(`${h}.${pl}`), privateKey).toString('base64url')}` }));
  }); });
  await new Promise(r => idp.listen(0, r));
  const u = `http://127.0.0.1:${idp.address().port}`;
  const app = await boot({ microsoft: { clientId: 'mid', clientSecret: 'ms', tenant: 'common' }, oauthOverrides: { microsoft: { tokenUrl: u + '/token', jwksUrl: u + '/keys' } } });
  const signIn = async c => {
    const loc = new URL((await c.get('/auth/microsoft/start')).headers.get('location'));
    assert.equal(loc.origin + loc.pathname, 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    nonce = loc.searchParams.get('nonce');
    return (await c.get(`/auth/microsoft/callback?code=x&state=${loc.searchParams.get('state')}`)).headers.get('location');
  };
  try {
    assert.equal((await client(app.url).state()).oauth.microsoft, true);
    // personal account, no "email" claim → preferred_username, verified, links to existing member
    const a = client(app.url); claims = { tid: PERSONAL, sub: 'm-1', preferred_username: 'jo@example.com', name: 'Jo' };
    assert.equal(await signIn(a), '/#/portal'); assert.equal((await a.state()).users[0].name, 'Jo Rivera');
    // work account claiming an existing member's email → refused, no session
    const b = client(app.url); claims = { tid: WORK, sub: 'm-2', email: 'alex@example.com', name: 'Fake Alex' };
    assert.match(await signIn(b), /error=link/); assert.equal((await b.state()).session, null);
    // new work account → created, asked to confirm email
    const c = client(app.url); claims = { tid: WORK, sub: 'm-3', email: 'kai@contoso.com', name: 'Kai' };
    assert.equal(await signIn(c), '/#/join');
    const me = (await c.state()).users[0]; assert.equal(me.emailVerified, false); assert.deepEqual(me.signIn, ['email', 'microsoft']);
    // token from a different issuer pattern → refused
    const d = client(app.url); claims = { tid: WORK, sub: 'm-4', email: 'z@contoso.com', iss: 'https://evil.example/v2.0' };
    assert.match(await signIn(d), /error=failed/);
  } finally { app.done(); idp.close(); }
});

test('YouTube library: imported in channel order, held videos stay private until published, add by link', async () => {
  const app = await boot();
  try {
    const pub = client(app.url), s = await pub.state();
    const yt = require('../shared/youtube-videos.json');
    assert.equal(s.videos.length, yt.videos.filter(v => !v.review).length);
    assert.ok(s.videos.every(v => v.status === 'published'));
    assert.deepEqual(s.videos.map(v => v.order), s.videos.map(v => v.order).slice().sort((a, b) => b - a));
    const held = yt.videos.find(v => v.review);
    const f = client(app.url); await persona(f, 'Founder');
    assert.ok((await f.state()).videos.some(v => v.youtubeId === held.youtubeId && v.status === 'review'));
    assert.equal((await pub.act('vid-publish', { id: 'yt_' + held.youtubeId })).status, 401);
    await f.act('vid-publish', { id: 'yt_' + held.youtubeId });
    assert.ok((await pub.state()).videos.some(v => v.youtubeId === held.youtubeId));
    assert.match((await f.act('video-youtube', { url: 'https://example.com/x' })).error, /YouTube video link/);
    assert.match((await f.act('video-youtube', { url: 'https://youtu.be/' + held.youtubeId })).error, /already/);
    const r = await f.act('video-youtube', { url: 'https://www.youtube.com/watch?v=AbCdEfGhIjK&t=10', title: 'New upload', cat: 'Minerals & testing', pillar: 'body' });
    assert.equal(r.ok, true);
    const added = (await pub.state()).videos[0];
    assert.equal(added.youtubeId, 'AbCdEfGhIjK'); assert.equal(added.title, 'New upload');
    // importing twice does nothing
    assert.equal(app.L.importYouTube(), 0);
  } finally { app.done(); }
});
