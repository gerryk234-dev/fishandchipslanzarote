import { scryptSync, randomBytes, timingSafeEqual, createHmac } from "node:crypto";

/* ---- secret hashing (scrypt) ---- */
export const randomHex = (n) => randomBytes(n).toString("hex");

export function hashSecret(secret) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(String(secret), salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifySecret(secret, stored) {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(String(secret), salt, 32);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

/* ---- stateless signed session tokens (HMAC) ---- */
const b64url = (buf) => Buffer.from(buf).toString("base64url");

export function signToken(payload, secret) {
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken(token, secret) {
  if (typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
