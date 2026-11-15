# DELTA platform — Phase 1

DELTA — Analysis · Intelligence · Method. Continues the Grok prototype
(finch-crystal-bison-moon.grok.me) and implements Phase 1 of the master developer brief as a
working web app: real accounts, checkout, the lab → report pipeline, the safety gate, the member
portal and the admin area. Design, copy and imagery carry over from the Grok build.

## Run it

```bash
cd delta
npm install
npm start            # http://localhost:3000 — demo mode is on by default outside production
npm test             # server tests (rules, renewals, permissions, payments, sign-in)
BASE=http://localhost:3000 node test/e2e.js   # full browser journey test (needs Playwright)
```

**Demo mode** (the default when `NODE_ENV` isn't `production`) seeds personas at every stage of
the journey, adds a demo clock (+30 / +90 days) to test reminders and expiry, a *Simulate lab
results* button, persona switching and a dev mailbox at `/dev/mailbox` where sign-in links and
other emails appear. All of this is switched off — and the server refuses to start with it on —
in production.

## Architecture

| Part | Choice | Why |
|---|---|---|
| Server | Node.js 22 + Express 5 | Small, common, easy to hand over |
| Database | SQLite via Node's built-in `node:sqlite` | No separate DB server for Phase 1; one file to back up. `server/db.js` is the only file to change to move to Postgres |
| Sign-in | Emailed single-use link → httpOnly session cookie | No passwords to leak or reset |
| Payments | Stripe Checkout + signed webhook | Card data never touches DELTA; TEST mode until keys are added |
| Email | Any SMTP provider (nodemailer) | Logged to the outbox until configured |
| Files | Lab PDFs and voice-note audio on private disk storage | Served only to the owner or authorised staff, every access audited |

```
delta/
  public/    browser app (index.html, app.js, styles.css, brand/)
  shared/    data.js (pillars, content seed, mineral bands, versioned rule set) + domain.js (pure rules)
  server/    app.js (routes) · actions.js (every change + its permission) · state.js (role-scoped data)
             logic.js (orders, fulfilment, lab pipeline, publishing, reminders) · auth.js · payments.js · mail.js · db.js
  test/      server.test.js (node:test) · e2e.js (Playwright)
```

The server is the authority: renewal maths, validation, the rules engine, the safety gate and every
permission check run there. Members only ever receive their own records, and report content held for
safety review is stripped before it leaves the server.

## What works now

- Join → checkout (Stripe or test) → account created → intake & consent → sample instructions
- Six-month access: a repeat test adds six months from the **later** of current expiry or purchase date;
  reminders at 30 and 7 days (admin-editable); expiry pauses member-only features but keeps reports and export
- Lab upload with the original PDF stored, validation (units, identity, missing values, outliers) and an exception queue
- Versioned rules engine (version recorded on every report) with regression tests in admin
- Safety gate: practitioner clears, publishes without supplement guidance, or escalates
- Paid voice notes: purchase → practitioner uploads audio → private playback
- Pillars, Awakening, Podcast, Meet Mineral Man, LAUGHOLOGY (moderated), community groups (reporting,
  signposting), Partner Collective (disclosures, click tracking)
- Admin: members, roles (admin / practitioner / support / moderator), content, settings, audit log, communications log
- Data export and deletion requests (UK GDPR)

## Before going live

1. **Clinical sign-off** — the mineral bands, rules and supplement templates in `shared/data.js` are placeholders (brief §19).
2. **Accounts** — Stripe (keys + webhook), an email provider (SMTP), a domain and hosting with persistent storage
   in the UK/EU. See `.env.example`.
3. **Legal** — privacy notice, terms, retention policy, processor agreements; replace the placeholder text on `#/legal`.
4. **Lab supplier** — once chosen, add an importer for their CSV/API/PDF format (feeds the same validation).
5. **Backups** — schedule copies of `DATA_DIR` (database + uploads).
6. **Content** — real lessons, videos (hosted on a video platform) and the podcast RSS feed.
