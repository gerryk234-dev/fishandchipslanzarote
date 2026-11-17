/* Browser stand-in for the parts of node:crypto the server uses (random tokens, SHA-256). */
'use strict';
const { sha256 } = require('@noble/hashes/sha2.js');
const { Buffer } = require('buffer');
const randomBytes = n => Buffer.from(globalThis.crypto.getRandomValues(new Uint8Array(n)));
function createHash(alg) {
  if (alg !== 'sha256') throw new Error('Only sha256 is available in the browser demo');
  const parts = [];
  const h = {
    update(d) { parts.push(typeof d === 'string' ? new TextEncoder().encode(d) : new Uint8Array(d)); return h; },
    digest(enc) { const all = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { all.set(p, o); o += p.length; } const b = Buffer.from(sha256(all)); return enc ? b.toString(enc) : b; },
  };
  return h;
}
const unavailable = () => { throw new Error('Not available in the browser demo'); };
module.exports = { randomBytes, createHash, sign: unavailable, verify: unavailable, createPublicKey: unavailable, generateKeyPairSync: unavailable };
