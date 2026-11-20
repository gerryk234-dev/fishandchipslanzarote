import nodemailer from "nodemailer";
import { WELCOME_TEXT, TERMS_TEXT } from "./card.js";
import { smtpCreds } from "./db.js";

/* Welcome email with the membership-card PDF attached.
   Credentials come from the in-app Ajustes screen (or SMTP_* env vars).
   Without them, sendWelcome() returns "not_configured" and the card PDF is
   still saved on disk / downloadable from the member profile. */

function transport() {
  const c = smtpCreds();
  if (!c.user || !c.pass) return null;
  return nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.secure,
    auth: { user: c.user, pass: c.pass },
  });
}

/* Build a valid From: header. If SMTP_FROM is only a display name (no
   address), wrap it around the user so sending never fails on a bad From. */
function fromAddress() {
  const c = smtpCreds();
  const from = (c.from || "").trim();
  if (!from) return c.user;
  if (from.includes("@")) return from;      // already a full address / name <addr>
  return `${from} <${c.user}>`;             // display name only → attach the address
}

export async function sendWelcome(member, pdfBytes) {
  const t = transport();
  if (!t) return "not_configured";
  if (!member.email) return "no_email";
  try {
    await t.sendMail({
      from: fromAddress(),
      to: member.email,
      subject: `Bienvenido/a a One Life Lanzarote — tu carnet ${member.num}`,
      text: `${WELCOME_TEXT(member.name)}\n\n------------------------------\n\n${TERMS_TEXT}`,
      attachments: [{ filename: `OneLife-${member.num}.pdf`, content: pdfBytes, contentType: "application/pdf" }],
    });
    return "sent";
  } catch (e) {
    console.error("[mailer]", e.message);
    return "failed";
  }
}

/* generic plain-text email (used for shift-close reports) */
export async function sendPlain(to, subject, text) {
  const t = transport();
  if (!t) return "not_configured";
  if (!to) return "no_email";
  try {
    await t.sendMail({ from: fromAddress(), to, subject, text });
    return "sent";
  } catch (e) {
    console.error("[mailer]", e.message);
    return "failed";
  }
}
