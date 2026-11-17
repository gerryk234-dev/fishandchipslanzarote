/* SQLite storage (Node's built-in node:sqlite — no native build step).
   Business entities are stored as JSON documents with indexed columns for lookups.
   Swap for Postgres later by re-implementing this file's small API. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const { DOC_TABLES } = require('./tables');

function open(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  for (const t of DOC_TABLES) {
    db.exec(`CREATE TABLE IF NOT EXISTS ${t} (
      id TEXT PRIMARY KEY, user_id TEXT, status TEXT, kind TEXT, email TEXT, at INTEGER, data TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS ${t}_user ON ${t}(user_id);
      CREATE INDEX IF NOT EXISTS ${t}_status ON ${t}(status);
      CREATE INDEX IF NOT EXISTS ${t}_kind ON ${t}(kind);`);
  }
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS users_email ON users(email);
    CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at INTEGER, expires_at INTEGER);
    CREATE TABLE IF NOT EXISTS login_tokens (hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at INTEGER, used_at INTEGER);
    CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER, actor TEXT, action TEXT, details TEXT);
    CREATE TABLE IF NOT EXISTS outbox (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER, to_email TEXT, to_name TEXT, channel TEXT, subject TEXT, body TEXT, status TEXT, error TEXT);
    CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, user_id TEXT, kind TEXT, name TEXT, mime TEXT, size INTEGER, path TEXT, at INTEGER);
    CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS oauth_states (state TEXT PRIMARY KEY, provider TEXT, verifier TEXT, nonce TEXT, next TEXT, expires_at INTEGER);
    CREATE TABLE IF NOT EXISTS identities (provider TEXT, sub TEXT, user_id TEXT, email TEXT, at INTEGER, PRIMARY KEY (provider, sub));`);

  const row2doc = r => r ? JSON.parse(r.data) : null;
  const store = {
    db,
    get(table, id) { return row2doc(db.prepare(`SELECT data FROM ${check(table)} WHERE id = ?`).get(id)); },
    byEmail(email) { return row2doc(db.prepare('SELECT data FROM users WHERE email = ?').get(String(email).toLowerCase())); },
    find(table, where = {}, order = 'at') {
      where = Object.fromEntries(Object.entries(where).map(([k, v]) => [k === 'role' ? 'kind' : k, v]));
      const keys = Object.keys(where);
      const sql = `SELECT data FROM ${check(table)}${keys.length ? ' WHERE ' + keys.map(k => `${k} = ?`).join(' AND ') : ''} ORDER BY ${order === 'at' ? 'at' : 'at DESC'}`;
      return db.prepare(sql).all(...keys.map(k => where[k])).map(row2doc);
    },
    all(table) { return store.find(table); },
    put(table, doc) {
      if (!doc.id) throw new Error('doc needs id');
      if (table === 'users' && doc.email) doc.email = doc.email.toLowerCase();
      db.prepare(`INSERT INTO ${check(table)} (id, user_id, status, kind, email, at, data) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, status = excluded.status, kind = excluded.kind, email = excluded.email, at = excluded.at, data = excluded.data`)
        .run(doc.id, doc.userId ?? null, doc.status ?? null, (table === 'users' ? doc.role : doc.kind) ?? null, table === 'users' ? doc.email : null, doc.at ?? doc.createdAt ?? Date.now(), JSON.stringify(doc));
      return doc;
    },
    del(table, id) { db.prepare(`DELETE FROM ${check(table)} WHERE id = ?`).run(id); },
    count(table) { return db.prepare(`SELECT COUNT(*) n FROM ${check(table)}`).get().n; },
    kvGet(key, def) { const r = db.prepare('SELECT value FROM kv WHERE key = ?').get(key); return r ? JSON.parse(r.value) : def; },
    kvSet(key, value) { db.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, JSON.stringify(value)); },
    /* Run fn atomically; nested calls join the outer transaction. */
    tx(fn) {
      if (store._inTx) return fn();
      db.exec('BEGIN IMMEDIATE'); store._inTx = true;
      try { const r = fn(); db.exec('COMMIT'); return r; }
      catch (e) { db.exec('ROLLBACK'); throw e; }
      finally { store._inTx = false; }
    },
    wipe() { for (const t of [...DOC_TABLES, 'sessions', 'login_tokens', 'audit', 'outbox', 'files', 'kv', 'oauth_states', 'identities']) db.exec(`DELETE FROM ${t}`); },
    /* ── everything else the app stores, behind named methods (the only SQL in the app lives in this file) ── */
    addAudit(at, actor, action, details) { db.prepare('INSERT INTO audit (at, actor, action, details) VALUES (?, ?, ?, ?)').run(at, actor, action, details); },
    recentAudit(limit) { return db.prepare('SELECT at, actor, action, details FROM audit ORDER BY id DESC LIMIT ?').all(limit); },
    addOutbox(m) { return db.prepare('INSERT INTO outbox (at, to_email, to_name, channel, subject, body, status, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(m.at, m.to_email, m.to_name, m.channel, m.subject, m.body, m.status, m.error ?? null).lastInsertRowid; },
    setOutboxStatus(id, status, error = null) { db.prepare('UPDATE outbox SET status = ?, error = ? WHERE id = ?').run(status, error, id); },
    recentOutbox(limit) { return db.prepare('SELECT * FROM outbox ORDER BY id DESC LIMIT ?').all(limit); },
    addFile(f) { db.prepare('INSERT INTO files (id, user_id, kind, name, mime, size, path, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(f.id, f.user_id, f.kind, f.name, f.mime, f.size, f.path, f.at); },
    getFile(id) { return db.prepare('SELECT * FROM files WHERE id = ?').get(id); },
    filesFor(uid) { return db.prepare('SELECT id, kind, name, mime, size, at FROM files WHERE user_id = ? ORDER BY at').all(uid); },
    addSession(id, userId, createdAt, expiresAt) { db.prepare('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(id, userId, createdAt, expiresAt); },
    getSession(id) { return db.prepare('SELECT user_id, expires_at FROM sessions WHERE id = ?').get(id); },
    delSession(id) { db.prepare('DELETE FROM sessions WHERE id = ?').run(id); },
    addLoginToken(hash, email, expiresAt) { db.prepare('INSERT INTO login_tokens (hash, email, expires_at) VALUES (?, ?, ?)').run(hash, email, expiresAt); },
    getLoginToken(hash) { return db.prepare('SELECT * FROM login_tokens WHERE hash = ?').get(hash); },
    useLoginToken(hash, at) { db.prepare('UPDATE login_tokens SET used_at = ? WHERE hash = ?').run(at, hash); },
    addOAuthState(s) { db.prepare('DELETE FROM oauth_states WHERE expires_at < ?').run(Date.now()); db.prepare('INSERT INTO oauth_states (state, provider, verifier, nonce, next, expires_at) VALUES (?, ?, ?, ?, ?, ?)').run(s.state, s.provider, s.verifier, s.nonce, s.next, s.expires_at); },
    takeOAuthState(state) { const r = db.prepare('SELECT * FROM oauth_states WHERE state = ?').get(state); if (r) db.prepare('DELETE FROM oauth_states WHERE state = ?').run(state); return r; },
    getIdentity(provider, sub) { return db.prepare('SELECT user_id FROM identities WHERE provider = ? AND sub = ?').get(provider, sub); },
    addIdentity(provider, sub, userId, email, at) { db.prepare('INSERT OR IGNORE INTO identities (provider, sub, user_id, email, at) VALUES (?, ?, ?, ?, ?)').run(provider, sub, userId, email, at); },
    providersFor(uid) { return db.prepare('SELECT provider FROM identities WHERE user_id = ?').all(uid).map(r => r.provider); },
  };
  function check(t) { if (!DOC_TABLES.includes(t)) throw new Error('unknown table ' + t); return t; }
  return store;
}
module.exports = { open, DOC_TABLES };
