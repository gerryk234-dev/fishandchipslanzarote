/* "Continue with Google", "Continue with Microsoft" and "Sign in with Apple" (OpenID Connect, authorization-code flow).
   - state + nonce (+ PKCE for Google) are stored server-side and single-use
   - the ID token's signature is verified against the provider's published keys (JWKS),
     and its issuer, audience, expiry, nonce and email-verified claim are checked
   - a verified email that matches an existing account is linked to it; otherwise an account is created.
   Providers switch on only when their keys are configured (see .env.example). */
'use strict';
const crypto = require('node:crypto');
const b64u = b => Buffer.from(b).toString('base64url');
const fromB64u = s => Buffer.from(s, 'base64url');

function providerConfigs(config) {
  const o = config.oauthOverrides || {};
  const p = {};
  const g = config.google || {};
  if (g.clientId && g.clientSecret) p.google = {
    label: 'Google', clientId: g.clientId, secret: () => g.clientSecret, scope: 'openid email profile', pkce: true, extra: { prompt: 'select_account' },
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth', tokenUrl: 'https://oauth2.googleapis.com/token',
    jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs', issuers: ['https://accounts.google.com', 'accounts.google.com'], ...(o.google || {}),
  };
  const a = config.apple || {};
  if (a.clientId && a.teamId && a.keyId && a.privateKey) p.apple = {
    label: 'Apple', clientId: a.clientId, scope: 'name email', formPost: true, extra: {},
    /* Apple's client secret is a short-lived ES256 JWT signed with the .p8 key from the Apple developer account. */
    secret: () => {
      const now = Math.floor(Date.now() / 1000);
      const head = b64u(JSON.stringify({ alg: 'ES256', kid: a.keyId })), body = b64u(JSON.stringify({ iss: a.teamId, iat: now, exp: now + 3000, aud: 'https://appleid.apple.com', sub: a.clientId }));
      const sig = crypto.sign('sha256', Buffer.from(`${head}.${body}`), { key: a.privateKey.replace(/\\n/g, '\n'), dsaEncoding: 'ieee-p1363' });
      return `${head}.${body}.${b64u(sig)}`;
    },
    authorizeUrl: 'https://appleid.apple.com/auth/authorize', tokenUrl: 'https://appleid.apple.com/auth/token',
    jwksUrl: 'https://appleid.apple.com/auth/keys', issuers: ['https://appleid.apple.com'], ...(o.apple || {}),
  };
  const m = config.microsoft || {};
  if (m.clientId && m.clientSecret) {
    const tenant = m.tenant || 'common';
    p.microsoft = {
      label: 'Microsoft', clientId: m.clientId, secret: () => m.clientSecret, scope: 'openid email profile', pkce: true, extra: { prompt: 'select_account' },
      authorizeUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`, tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      jwksUrl: 'https://login.microsoftonline.com/common/discovery/v2.0/keys',
      /* Multi-tenant: the issuer contains the account's own tenant id. */
      issuerOk: c => typeof c.tid === 'string' && c.iss === `https://login.microsoftonline.com/${c.tid}/v2.0`,
      ...(o.microsoft || {}),
    };
  }
  return p;
}
/* Personal Microsoft accounts (Outlook, Hotmail, Live) live in this tenant and their email is verified by Microsoft. */
const MS_CONSUMER_TENANT = '9188040d-6c67-4c5b-b112-36a304b66dad';
/* Returns { email, verified } — whether the provider vouches for the address. */
function emailFrom(name, c) {
  if (name === 'microsoft') {
    const personal = c.tid === MS_CONSUMER_TENANT;
    const email = c.email || (personal ? c.preferred_username : null);
    return { email, verified: personal && !!email };
  }
  return { email: c.email, verified: c.email_verified === true || c.email_verified === 'true' };
}

function createOAuth(store, L, auth, config) {
  const P = providerConfigs(config);
  store.db.exec(`CREATE TABLE IF NOT EXISTS oauth_states (state TEXT PRIMARY KEY, provider TEXT, verifier TEXT, nonce TEXT, next TEXT, expires_at INTEGER);
    CREATE TABLE IF NOT EXISTS identities (provider TEXT, sub TEXT, user_id TEXT, email TEXT, at INTEGER, PRIMARY KEY (provider, sub));`);
  const jwksCache = new Map();
  const redirectUri = name => `${config.baseUrl}/auth/${name}/callback`;
  const safeNext = n => (typeof n === 'string' && /^\/[\w\-/]*$/.test(n) ? n : '');

  async function keyFor(prov, kid, force) {
    let c = jwksCache.get(prov.jwksUrl);
    if (!c || force || Date.now() - c.at > 3600e3) {
      const r = await fetch(prov.jwksUrl); if (!r.ok) throw new Error('Could not fetch provider keys');
      c = { at: Date.now(), keys: (await r.json()).keys || [] }; jwksCache.set(prov.jwksUrl, c);
    }
    const jwk = c.keys.find(k => k.kid === kid);
    if (!jwk && !force) return keyFor(prov, kid, true); // provider rotated keys
    if (!jwk) throw new Error('Unknown signing key');
    return crypto.createPublicKey({ key: jwk, format: 'jwk' });
  }
  async function verifyIdToken(prov, token, nonce) {
    const [h, p, s] = String(token || '').split('.');
    if (!h || !p || !s) throw new Error('Malformed ID token');
    const header = JSON.parse(fromB64u(h)), claims = JSON.parse(fromB64u(p));
    if (header.alg !== 'RS256') throw new Error('Unexpected token algorithm');
    const ok = crypto.verify('RSA-SHA256', Buffer.from(`${h}.${p}`), await keyFor(prov, header.kid), fromB64u(s));
    if (!ok) throw new Error('Bad token signature');
    if (!(prov.issuerOk ? prov.issuerOk(claims) : prov.issuers.includes(claims.iss))) throw new Error('Wrong issuer');
    if (!(claims.aud === prov.clientId || (Array.isArray(claims.aud) && claims.aud.includes(prov.clientId)))) throw new Error('Wrong audience');
    if (!(claims.exp * 1000 > Date.now() - 60e3)) throw new Error('Token expired');
    if (claims.nonce !== nonce) throw new Error('Nonce mismatch');
    return claims;
  }

  return {
    enabled: () => Object.fromEntries(['google', 'microsoft', 'apple'].map(k => [k, !!P[k]])),
    start(name, next) {
      const prov = P[name]; if (!prov) return null;
      const state = crypto.randomBytes(24).toString('base64url'), nonce = crypto.randomBytes(16).toString('base64url');
      const verifier = prov.pkce ? crypto.randomBytes(32).toString('base64url') : null;
      store.db.prepare('DELETE FROM oauth_states WHERE expires_at < ?').run(Date.now());
      store.db.prepare('INSERT INTO oauth_states (state, provider, verifier, nonce, next, expires_at) VALUES (?, ?, ?, ?, ?, ?)').run(state, name, verifier, nonce, safeNext(next), Date.now() + 10 * 60e3);
      const q = new URLSearchParams({ client_id: prov.clientId, redirect_uri: redirectUri(name), response_type: 'code', scope: prov.scope, state, nonce, ...prov.extra });
      if (prov.formPost) q.set('response_mode', 'form_post');
      if (verifier) { q.set('code_challenge', b64u(crypto.createHash('sha256').update(verifier).digest())); q.set('code_challenge_method', 'S256'); }
      return `${prov.authorizeUrl}?${q}`;
    },
    /* Returns the path to send the browser to (hash route) after signing them in. */
    async callback(name, params, res) {
      const prov = P[name]; if (!prov) throw new Error('Provider not configured');
      if (params.error) return '/login?error=cancelled';
      const row = store.db.prepare('SELECT * FROM oauth_states WHERE state = ?').get(String(params.state || ''));
      if (!row || row.provider !== name || row.expires_at < Date.now()) return '/login?error=expired';
      store.db.prepare('DELETE FROM oauth_states WHERE state = ?').run(row.state);
      const body = new URLSearchParams({ grant_type: 'authorization_code', code: String(params.code || ''), redirect_uri: redirectUri(name), client_id: prov.clientId, client_secret: prov.secret() });
      if (row.verifier) body.set('code_verifier', row.verifier);
      const tr = await fetch(prov.tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
      if (!tr.ok) throw new Error('Token exchange failed (' + tr.status + ')');
      const claims = await verifyIdToken(prov, (await tr.json()).id_token, row.nonce);

      const found = emailFrom(name, claims);
      if (!found.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(found.email)) throw new Error('No usable email from provider');
      /* Google and Apple only hand over verified emails; anything else is refused. */
      if (!found.verified && name !== 'microsoft') throw new Error('Email not verified by provider');
      const email = found.email.toLowerCase();
      let u, isNew = false, blocked = false;
      const link = store.db.prepare('SELECT user_id FROM identities WHERE provider = ? AND sub = ?').get(name, String(claims.sub));
      store.tx(() => {
        u = link && L.user(link.user_id);
        if (!u) {
          const existing = store.byEmail(email);
          /* Never take over an existing account on an email the provider hasn't verified. */
          if (existing && !found.verified) { blocked = true; return; }
          u = existing;
        }
        if (!u) {
          let given = claims.name;
          if (!given && params.user) { try { const n = JSON.parse(params.user).name || {}; given = [n.firstName, n.lastName].filter(Boolean).join(' '); } catch { /* Apple sends the name only on first sign-in */ } }
          u = L.createUser({ name: given || email.split('@')[0], email, role: config.adminEmails.includes(email) ? 'admin' : 'member' });
          isNew = true;
        }
        if (!link) store.db.prepare('INSERT OR IGNORE INTO identities (provider, sub, user_id, email, at) VALUES (?, ?, ?, ?, ?)').run(name, String(claims.sub), u.id, email, Date.now());
        if (!u.emailVerified && found.verified) { u.emailVerified = true; L.saveUser(u); }
        L.audit(u.name, isNew ? 'Account created' : 'Signed in', `via ${prov.label}`);
      });
      if (blocked) return '/login?error=link';
      if (isNew && !found.verified) auth.sendVerification(u);
      auth.startSession(res, u.id);
      return row.next || (u.role === 'member' ? (isNew ? '/join' : '/portal') : '/admin');
    },
    providersFor: uid => store.db.prepare('SELECT provider FROM identities WHERE user_id = ?').all(uid).map(r => r.provider),
  };
}
module.exports = { createOAuth };
