/* Instant browser demo: runs the real DELTA server modules inside the page.
   The app's requests to /api/* are answered here instead of over the network, and the demo
   data is kept in this browser (localStorage) so it survives a refresh. */
'use strict';
const config = require('./config');
const { openMemory } = require('../server/memory-store');
const { createMailer } = require('../server/mail');
const { createLogic } = require('../server/logic');
const { createAuth } = require('../server/auth');
const { createPayments } = require('../server/payments');
const { createOAuth } = require('../server/oauth');
const { createState } = require('../server/state');
const { createActions } = require('../server/actions');
const fsShim = require('./shims/fs');

const KEY = 'delta_static_v1', SID = 'delta_static_sid';
const ls = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } }, del: k => { try { localStorage.removeItem(k); } catch { /* */ } } };

const store = openMemory();
const mailer = createMailer(store);
const L = createLogic(store, mailer, config);
const auth = createAuth(store, L, mailer, config);
const payments = createPayments(store, L, config);
const oauth = createOAuth(store, L, auth, config);
const state = createState(store, L, mailer, payments, config, oauth);
const run = createActions(store, L, auth, payments, mailer, config, oauth);

const saved = ls.get(KEY);
let restored = false;
if (saved) { try { store.load(saved); restored = true; } catch { /* start fresh */ } }
if (!restored) { L.seedContent(); L.importYouTube(); L.seedDemo(); }
L.runReminders();
const persist = () => ls.set(KEY, store.dump());
persist();

let sid = ls.get(SID);
const fakeRes = () => ({ setHeader(k, v) { if (k.toLowerCase() !== 'set-cookie') return; const m = /delta_sid=([^;]*);.*Max-Age=(\d+)/.exec(v); if (!m || m[2] === '0' || !m[1]) { sid = null; ls.del(SID); } else { sid = m[1]; ls.set(SID, sid); } } });
const fakeReq = (body = {}, query = {}) => ({ headers: { cookie: sid ? `delta_sid=${sid}` : '' }, body, query, ip: 'browser', get: h => (h.toLowerCase() === 'x-delta' ? '1' : undefined) });
const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

const realFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  if (!/^\/(api|auth)\//.test(url)) return realFetch(input, init);
  const u = new URL(url, 'http://demo'), path = u.pathname;
  const req = fakeReq(init.body ? JSON.parse(init.body) : {}, Object.fromEntries(u.searchParams)), res = fakeRes();
  req.user = auth.userFromRequest(req);
  if (path === '/api/state') return json(200, state(req.user));
  const m = /^\/api\/act\/([\w-]+)$/.exec(path);
  if (m) {
    try { const out = await run(m[1], { user: req.user, body: req.body, req, res, ip: req.ip }); persist(); return json(200, { ok: true, ...out }); }
    catch (e) { if (!e.status) console.error(e); persist(); return json(e.status || 500, { error: e.status ? e.message : 'Something went wrong. Please try again.' }); }
  }
  return json(404, { error: 'Not found' });
};

const blobUrls = new Map();
globalThis.DELTA_STATIC = {
  /* Private files uploaded in this demo, as playable/viewable blob URLs. */
  fileUrl(id) {
    if (blobUrls.has(id)) return blobUrls.get(id);
    const f = store.getFile(id); const buf = f && fsShim.__files.get(f.path);
    if (!buf) return '#';
    const url = URL.createObjectURL(new Blob([buf], { type: f.mime })); blobUrls.set(id, url); return url;
  },
  mailbox: () => store.recentOutbox(40),
  /* Email sign-in links open inside the demo. */
  verify(token) { const u = auth.verify(token); if (!u) return '/login?expired=1'; auth.startSession(fakeRes(), u.id); persist(); return u.role === 'member' ? '/portal' : '/admin'; },
  startOver() { ls.del(KEY); ls.del(SID); },
};
