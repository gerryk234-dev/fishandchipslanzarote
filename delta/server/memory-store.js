/* In-memory store with exactly the same API as db.js (minus the raw `db` handle).
   Used by the instant browser demo (static build) so the real server logic runs in the page.
   Documents are deep-copied in and out, just like a database, and tx() rolls back on error. */
'use strict';
const { DOC_TABLES } = require('./tables');

function openMemory() {
  let S = empty();
  function empty() {
    return { docs: Object.fromEntries(DOC_TABLES.map(t => [t, {}])), seq: 0, audit: [], outbox: [], outboxSeq: 0, files: {}, sessions: {}, tokens: {}, kv: {}, oauth: {}, identities: {} };
  }
  const clone = o => (o == null ? o : JSON.parse(JSON.stringify(o)));
  const check = t => { if (!DOC_TABLES.includes(t)) throw new Error('unknown table ' + t); return S.docs[t]; };
  const cols = (table, d) => ({ user_id: d.userId ?? null, status: d.status ?? null, kind: (table === 'users' ? d.role : d.kind) ?? null, email: table === 'users' ? d.email : null, at: d.at ?? d.createdAt ?? Date.now() });

  const store = {
    get(table, id) { const r = check(table)[id]; return r ? clone(r.doc) : null; },
    byEmail(email) { const e = String(email).toLowerCase(); const r = Object.values(S.docs.users).find(x => x.cols.email === e); return r ? clone(r.doc) : null; },
    find(table, where = {}, order = 'at') {
      const w = Object.entries(where).map(([k, v]) => [k === 'role' ? 'kind' : k, v]);
      const rows = Object.values(check(table)).filter(r => w.every(([k, v]) => r.cols[k] === v));
      rows.sort((a, b) => (a.cols.at - b.cols.at) || (a.seq - b.seq));
      if (order !== 'at') rows.reverse();
      return rows.map(r => clone(r.doc));
    },
    all(table) { return store.find(table); },
    put(table, doc) {
      if (!doc.id) throw new Error('doc needs id');
      if (table === 'users' && doc.email) doc.email = doc.email.toLowerCase();
      const t = check(table), c = cols(table, doc);
      if (table === 'users' && c.email && Object.values(t).some(r => r.cols.email === c.email && r.doc.id !== doc.id)) throw new Error('UNIQUE constraint failed: users.email');
      t[doc.id] = { doc: clone(doc), cols: c, seq: t[doc.id]?.seq ?? ++S.seq };
      return doc;
    },
    del(table, id) { delete check(table)[id]; },
    count(table) { return Object.keys(check(table)).length; },
    kvGet(key, def) { return key in S.kv ? clone(S.kv[key]) : def; },
    kvSet(key, value) { S.kv[key] = clone(value); },
    tx(fn) {
      if (store._inTx) return fn();
      const snap = JSON.stringify(S); store._inTx = true;
      try { return fn(); } catch (e) { S = JSON.parse(snap); throw e; } finally { store._inTx = false; }
    },
    wipe() { S = empty(); },
    addAudit(at, actor, action, details) { S.audit.push({ at, actor, action, details }); if (S.audit.length > 2000) S.audit.splice(0, S.audit.length - 2000); },
    recentAudit(limit) { return S.audit.slice(-limit).reverse().map(clone); },
    addOutbox(m) { const id = ++S.outboxSeq; S.outbox.push({ id, ...m }); if (S.outbox.length > 500) S.outbox.shift(); return id; },
    setOutboxStatus(id, status, error = null) { const o = S.outbox.find(x => x.id === id); if (o) Object.assign(o, { status, error }); },
    recentOutbox(limit) { return S.outbox.slice(-limit).reverse().map(clone); },
    addFile(f) { S.files[f.id] = { ...f }; },
    getFile(id) { return clone(S.files[id] || null) || undefined; },
    filesFor(uid) { return Object.values(S.files).filter(f => f.user_id === uid).sort((a, b) => a.at - b.at).map(({ id, kind, name, mime, size, at }) => ({ id, kind, name, mime, size, at })); },
    addSession(id, userId, createdAt, expiresAt) { S.sessions[id] = { user_id: userId, created_at: createdAt, expires_at: expiresAt }; },
    getSession(id) { const s = S.sessions[id]; return s ? { user_id: s.user_id, expires_at: s.expires_at } : undefined; },
    delSession(id) { delete S.sessions[id]; },
    addLoginToken(hash, email, expiresAt) { S.tokens[hash] = { hash, email, expires_at: expiresAt, used_at: null }; },
    getLoginToken(hash) { return clone(S.tokens[hash]) || undefined; },
    useLoginToken(hash, at) { if (S.tokens[hash]) S.tokens[hash].used_at = at; },
    addOAuthState(s) { for (const k in S.oauth) if (S.oauth[k].expires_at < Date.now()) delete S.oauth[k]; S.oauth[s.state] = { ...s }; },
    takeOAuthState(state) { const r = S.oauth[state]; delete S.oauth[state]; return r; },
    getIdentity(provider, sub) { const r = S.identities[provider + ' ' + sub]; return r ? { user_id: r.user_id } : undefined; },
    addIdentity(provider, sub, userId, email, at) { const k = provider + ' ' + sub; if (!S.identities[k]) S.identities[k] = { provider, sub, user_id: userId, email, at }; },
    providersFor(uid) { return Object.values(S.identities).filter(r => r.user_id === uid).map(r => r.provider); },
    /* persistence for the browser demo */
    dump() { return JSON.stringify(S); },
    load(json) { S = JSON.parse(json); },
  };
  return store;
}
module.exports = { openMemory };
