import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { db, getSetting, setSetting } from "./db.js";

/* Gmail importer for onelifelanzarote.com registrations.
   The website (Elementor form) emails each registration as labelled lines:

     Full name: Lexie Eloise Dunning
     Nationality: White British
     ID/ Passport number: DUNNI058217LE9TE
     Email: lexie@example.com
     Phone number: 07486633859
     Upload a selfie: https://onelifelanzarote.com/wp-content/uploads/elementor/forms/xxx.jpeg

   Uses the same Gmail App Password as sending (SMTP_USER / SMTP_PASS).
   On startup it scans the whole INBOX once, then re-checks every 5 minutes,
   remembering the last processed message UID. Each new registration becomes
   a 'pendiente' member (with the selfie downloaded from the site) for staff
   to approve in Socios. Duplicates are skipped by email, document or
   identical name. */

const POLL_MS = 5 * 60 * 1000;
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

export function parseRegistration(text) {
  if (!text || !/Full name:/i.test(text)) return null;
  const grab = (re) => {
    const m = text.match(re);
    return m ? m[1].trim().replace(/\s+/g, " ") : "";
  };
  const name = grab(/Full name:\s*([^\n]+)/i);
  if (!name) return null;
  return {
    name,
    nationality: grab(/Nationality:\s*([^\n]+)/i),
    document: grab(/ID\/?\s*Passport number:\s*\n?\s*([^\n]+)/i),
    email: grab(/Email:\s*([^\s\n]+@[^\s\n]+)/i),
    phone: grab(/Phone number:\s*([^\n]+)/i),
    selfieUrl: grab(/Upload a selfie:\s*\n?\s*(https?:\/\/[^\s\n]+)/i),
  };
}

async function downloadPhoto(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") || "").toLowerCase();
    if (!/image\/(jpeg|jpg|png)/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_PHOTO_BYTES) return null;
    return `data:image/${type.includes("png") ? "png" : "jpeg"};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function alreadyExists(reg) {
  if (reg.email && db.prepare("SELECT 1 FROM members WHERE lower(email) = lower(?)").get(reg.email)) return true;
  if (reg.document && db.prepare("SELECT 1 FROM members WHERE upper(document) = upper(?)").get(reg.document)) return true;
  if (db.prepare("SELECT 1 FROM members WHERE lower(name) = lower(?) AND status != 'baja'").get(reg.name)) return true;
  return false;
}

async function scanOnce() {
  const user = process.env.SMTP_USER, pass = process.env.SMTP_PASS;
  if (!user || !pass) return { skipped: "not_configured" };
  const client = new ImapFlow({
    host: process.env.IMAP_HOST || "imap.gmail.com",
    port: Number(process.env.IMAP_PORT || 993),
    secure: true,
    auth: { user, pass },
    logger: false,
  });
  const lastUid = Number(getSetting("importer_last_uid") || 0);
  let imported = 0, seenMax = lastUid;
  await client.connect();
  try {
    await client.mailboxOpen("INBOX");
    const uids = await client.search({ uid: `${lastUid + 1}:*`, body: "Full name:" }, { uid: true });
    for (const uid of uids || []) {
      if (uid <= lastUid) continue;
      seenMax = Math.max(seenMax, uid);
      const msg = await client.fetchOne(uid, { source: true }, { uid: true });
      if (!msg?.source) continue;
      const mail = await simpleParser(msg.source);
      const reg = parseRegistration(mail.text || "");
      if (!reg) continue;
      if (alreadyExists(reg)) { console.log(`[importer] duplicado, saltado: ${reg.name}`); continue; }
      const photo = await downloadPhoto(reg.selfieUrl);
      const joined = (mail.date || new Date()).toISOString().slice(0, 10);
      db.prepare(
        "INSERT INTO members (num, name, nationality, type, status, joined, sponsor_num, email, phone, photo, document) VALUES (NULL, ?, ?, NULL, 'pendiente', ?, NULL, ?, ?, ?, ?)"
      ).run(reg.name, reg.nationality || "—", joined, reg.email || null, reg.phone || null, photo, reg.document || null);
      imported++;
      console.log(`[importer] importado: ${reg.name}${photo ? " (con selfie)" : " (sin selfie)"}`);
    }
    if (seenMax > lastUid) setSetting("importer_last_uid", String(seenMax));
  } finally {
    await client.logout().catch(() => {});
  }
  return { imported };
}

export function startImporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("[importer] sin credenciales de Gmail (SMTP_USER/SMTP_PASS) — importador desactivado");
    return;
  }
  const run = () => scanOnce()
    .then((r) => { if (r.imported) console.log(`[importer] ${r.imported} solicitudes nuevas desde Gmail`); })
    .catch((e) => console.error("[importer]", e.message));
  run();
  setInterval(run, POLL_MS);
  console.log("[importer] vigilando el buzón de Gmail cada 5 min");
}
