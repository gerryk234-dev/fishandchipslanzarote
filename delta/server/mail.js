/* Outbound messages. Every message is recorded in the outbox table (audit trail).
   With SMTP_URL set, email is delivered via nodemailer; otherwise it is only logged (dev mailbox).
   SMS is logged only — plug an SMS provider into sendSms() when chosen. */
'use strict';
const config = require('./config');
let transport = null;
if (config.smtpUrl) {
  try { transport = require('nodemailer').createTransport(config.smtpUrl); }
  catch (e) { console.warn('nodemailer not available — emails will be logged only:', e.message); }
}
function createMailer(store) {
  function record(m, status, error) {
    return store.db.prepare('INSERT INTO outbox (at, to_email, to_name, channel, subject, body, status, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(Date.now(), m.to || '', m.toName || '', m.channel, m.subject, m.text, status, error || null).lastInsertRowid;
  }
  return {
    mode: transport ? 'smtp' : 'log',
    email({ to, toName, subject, text }) {
      const id = record({ to, toName, subject, text, channel: 'email' }, transport ? 'queued' : 'logged');
      if (transport) transport.sendMail({ from: config.mailFrom, to, subject, text })
        .then(() => store.db.prepare("UPDATE outbox SET status = 'sent' WHERE id = ?").run(id))
        .catch(e => store.db.prepare("UPDATE outbox SET status = 'failed', error = ? WHERE id = ?").run(String(e.message), id));
      else if (!config.demo) console.log(`[mail:log] to=${to} subject=${subject}`);
    },
    sms({ to, toName, text }) { record({ to, toName, subject: text.slice(0, 80), text, channel: 'sms' }, 'logged'); },
    task({ toName, subject, text }) { record({ to: '', toName, subject, text: text || subject, channel: 'task' }, 'logged'); },
    recent(limit = 50) { return store.db.prepare('SELECT * FROM outbox ORDER BY id DESC LIMIT ?').all(limit); },
  };
}
module.exports = { createMailer };
