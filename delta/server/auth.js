/* Passwordless sign-in: a single-use emailed link (token stored only as a SHA-256 hash),
   then an httpOnly session cookie. */
'use strict';
const crypto = require('node:crypto');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const COOKIE = 'delta_sid';

function createAuth(store, L, mailer, config) {
  const hits = new Map(); // simple per-key rate limit
  function limited(key, max, windowMs) {
    const t = Date.now(), a = (hits.get(key) || []).filter(x => t - x < windowMs);
    a.push(t); hits.set(key, a); return a.length > max;
  }
  function cookieHeader(value, maxAgeSec) {
    return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${config.cookieSecure ? '; Secure' : ''}`;
  }
  const A = {
    COOKIE,
    limited,
    startSession(res, userId) {
      const token = crypto.randomBytes(32).toString('base64url');
      store.db.prepare('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(sha(token), userId, Date.now(), Date.now() + config.sessionDays * 864e5);
      res.setHeader('Set-Cookie', cookieHeader(token, config.sessionDays * 86400));
    },
    endSession(req, res) {
      const tok = A.readCookie(req);
      if (tok) store.db.prepare('DELETE FROM sessions WHERE id = ?').run(sha(tok));
      res.setHeader('Set-Cookie', cookieHeader('', 0));
    },
    readCookie(req) {
      const c = req.headers.cookie || '';
      const m = c.split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='));
      return m ? decodeURIComponent(m.slice(COOKIE.length + 1)) : null;
    },
    userFromRequest(req) {
      const tok = A.readCookie(req); if (!tok) return null;
      const s = store.db.prepare('SELECT user_id, expires_at FROM sessions WHERE id = ?').get(sha(tok));
      if (!s || s.expires_at < Date.now()) return null;
      return L.user(s.user_id);
    },
    /* Always answers the same way, so it can't be used to discover who has an account. */
    requestLink(email, ip) {
      email = String(email || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error('Please enter a valid email address.'), { status: 400 });
      if (limited('ip:' + ip, 20, 3600e3) || limited('em:' + email, 5, 3600e3)) throw Object.assign(new Error('Too many requests — please try again later.'), { status: 429 });
      let u = store.byEmail(email);
      if (!u && config.adminEmails.includes(email)) { u = L.createUser({ name: 'Founder', email, role: 'admin' }); }
      if (!u) { L.audit('Visitor', 'Sign-in link requested (no account)', email); return; }
      const token = crypto.randomBytes(32).toString('base64url');
      store.db.prepare('INSERT INTO login_tokens (hash, email, expires_at) VALUES (?, ?, ?)').run(sha(token), email, Date.now() + config.loginTokenMinutes * 60e3);
      mailer.email({ to: email, toName: u.name, subject: 'Your DELTA sign-in link', text: `Hello ${u.name},\n\nUse this link to sign in to DELTA. It works once and expires in ${config.loginTokenMinutes} minutes:\n\n${config.baseUrl}/auth/verify?token=${token}\n\nIf you didn't ask for this, you can ignore this email.` });
      L.audit(u.name, 'Sign-in link sent', email);
    },
    /* Confirms a new email address — the same single-use link, which also signs them in. */
    sendVerification(u) {
      const token = crypto.randomBytes(32).toString('base64url');
      store.db.prepare('INSERT INTO login_tokens (hash, email, expires_at) VALUES (?, ?, ?)').run(sha(token), u.email, Date.now() + 24 * 3600e3);
      mailer.email({ to: u.email, toName: u.name, subject: 'Confirm your DELTA email address', text: `Hello ${u.name},\n\nWelcome to DELTA. Please confirm your email address with this link (valid for 24 hours):\n\n${config.baseUrl}/auth/verify?token=${token}\n\nIf you didn't create an account, you can ignore this email.` });
    },
    verify(token) {
      const row = store.db.prepare('SELECT * FROM login_tokens WHERE hash = ?').get(sha(String(token || '')));
      if (!row || row.used_at || row.expires_at < Date.now()) return null;
      store.db.prepare('UPDATE login_tokens SET used_at = ? WHERE hash = ?').run(Date.now(), row.hash);
      const u = store.byEmail(row.email); if (!u) return null;
      if (!u.emailVerified) { u.emailVerified = true; L.saveUser(u); }
      L.audit(u.name, 'Signed in', 'email link');
      return u;
    },
  };
  return A;
}
module.exports = { createAuth };
