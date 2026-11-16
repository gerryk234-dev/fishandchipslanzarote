/* Express app factory (separate from index.js so tests can start it in-process). */
'use strict';
const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const { open } = require('./db');
const { createMailer } = require('./mail');
const { createLogic } = require('./logic');
const { createAuth } = require('./auth');
const { createPayments } = require('./payments');
const { createState, can } = require('./state');
const { createActions } = require('./actions');
const { createOAuth } = require('./oauth');

function createApp(config) {
  const store = open(config.dbFile || path.join(config.dataDir, 'delta.db'));
  const mailer = createMailer(store);
  const L = createLogic(store, mailer, config);
  const auth = createAuth(store, L, mailer, config);
  const payments = createPayments(store, L, config);
  const oauth = createOAuth(store, L, auth, config);
  const state = createState(store, L, mailer, payments, config, oauth);
  const run = createActions(store, L, auth, payments, mailer, config, oauth);
  L.seedContent();
  L.importYouTube();
  if (config.demo) L.seedDemo();
  L.runReminders();

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: blob: https://i.ytimg.com; frame-src https://www.youtube-nocookie.com; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://checkout.stripe.com");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (config.cookieSecure) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    next();
  });

  /* Stripe needs the raw body to verify the signature — mount before the JSON parser. */
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json', limit: '1mb' }), (req, res) => {
    try { const type = payments.webhook(req.body, req.headers['stripe-signature']); res.json({ received: true, type }); }
    catch (e) { res.status(e.status || 400).send(`Webhook error: ${e.message}`); }
  });
  app.use('/api', express.json({ limit: `${Math.ceil(config.maxUploadMb * 1.4) + 1}mb` }));
  app.use((req, res, next) => { req.user = auth.userFromRequest(req); next(); });

  app.get('/health', (req, res) => res.json({ ok: true, demo: config.demo, payments: payments.mode, mail: mailer.mode }));
  app.get('/api/state', (req, res) => { res.setHeader('Cache-Control', 'no-store'); res.json(state(req.user)); });
  app.post('/api/act/:name', async (req, res) => {
    /* CSRF defence: only same-origin script can send this header with JSON. */
    if (req.get('X-Delta') !== '1' || !req.is('application/json')) return res.status(403).json({ error: 'Forbidden' });
    try {
      const out = await run(req.params.name, { user: req.user, body: req.body || {}, req, res, ip: req.ip });
      res.json({ ok: true, ...out });
    } catch (e) {
      if (!e.status) console.error(e);
      res.status(e.status || 500).json({ error: e.status ? e.message : 'Something went wrong. Please try again.' });
    }
  });
  app.get('/auth/verify', (req, res) => {
    const u = auth.verify(req.query.token);
    if (!u) return res.redirect('/#/login?expired=1');
    auth.startSession(res, u.id);
    res.redirect(u.role === 'member' ? '/#/portal' : '/#/admin');
  });
  /* Google / Apple sign-in. Apple returns via a form POST, Google via a GET redirect. */
  app.get('/auth/:provider/start', (req, res) => {
    const url = oauth.start(req.params.provider, req.query.next);
    res.redirect(url || '/#/login?error=notconfigured');
  });
  app.all('/auth/:provider/callback', express.urlencoded({ extended: false, limit: '20kb' }), async (req, res) => {
    try { res.redirect(303, '/#' + await oauth.callback(req.params.provider, req.method === 'POST' ? req.body : req.query, res)); }
    catch (e) { console.error('oauth', req.params.provider, e.message); res.redirect(303, '/#/login?error=failed'); }
  });
  /* Private files: owner or staff with a relevant area. Always served as a download. */
  app.get('/api/files/:id', (req, res) => {
    const f = store.db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
    const u = req.user;
    const ok = f && u && (f.user_id === u.id || (f.kind === 'lab-report' && ['/admin/upload', '/admin/reports', '/admin/exceptions'].some(a => can(u, a))) || (f.kind === 'voice-note' && can(u, '/admin/voice')));
    if (!ok) return res.status(404).send('Not found');
    L.audit(L.actorName(u), 'File accessed', `${f.kind} ${f.id}`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Type', f.mime);
    res.setHeader('Content-Disposition', `${f.kind === 'voice-note' && req.query.inline ? 'inline' : 'attachment'}; filename="${f.name.replace(/[^\w.\- ]/g, '_')}"`);
    fs.createReadStream(f.path).pipe(res);
  });
  if (config.demo) {
    /* Dev mailbox: read sign-in links and other emails without an SMTP server. Demo mode only. */
    app.get('/dev/mailbox', (req, res) => {
      const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const rows = mailer.recent(40).map(m => `<article><b>${esc(m.subject)}</b><br><small>${new Date(m.at).toLocaleString('en-GB')} · ${esc(m.channel)} · to ${esc(m.to_email || m.to_name)}</small><pre>${esc(m.body).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')}</pre></article>`).join('');
      res.send(`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>DELTA dev mailbox</title><link rel=stylesheet href=/styles.css><main class="page"><div class="mid stack"><h1>Dev mailbox</h1><p class="muted sm">Demo mode only — messages that would be emailed. <a href="/">Back to DELTA</a></p>${rows.replace(/<article>/g, '<article class="card p4">')}</div></main>`);
    });
  }
  app.use('/shared', express.static(path.join(__dirname, '..', 'shared'), { maxAge: '1h' }));
  app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h', index: 'index.html' }));

  const timer = setInterval(() => { try { store.tx(() => L.runReminders()); } catch (e) { console.error('reminders', e); } }, 3600e3);
  timer.unref();
  return { app, store, L, close: () => { clearInterval(timer); store.db.close(); } };
}
module.exports = { createApp };
