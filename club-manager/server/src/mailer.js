import nodemailer from "nodemailer";
import { WELCOME_TEXT, TERMS_TEXT } from "./card.js";

/* Welcome email with the membership-card PDF attached.
   Configure via environment variables (e.g. a Gmail App Password):
     SMTP_HOST=smtp.gmail.com  SMTP_PORT=465  SMTP_SECURE=1
     SMTP_USER=club@gmail.com  SMTP_PASS=<app password>
     SMTP_FROM="One Life Lanzarote <club@gmail.com>"
   Without configuration, sendWelcome() returns "not_configured" and the
   card PDF is still saved on disk / downloadable from the member profile. */

function transport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== "0",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export async function sendWelcome(member, pdfBytes) {
  const t = transport();
  if (!t) return "not_configured";
  if (!member.email) return "no_email";
  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
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
