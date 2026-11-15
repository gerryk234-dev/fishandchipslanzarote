# DELTA — clickable prototype

Continuation of the Grok build (finch-crystal-bison-moon.grok.me), extended to cover the
DELTA master developer brief (Nov 2026). Same design tokens, copy, images, routes and
mineral-chart logic as the Grok app, rebuilt as a static site so it runs anywhere.

**Run it:** `python3 -m http.server 8000` in this folder, then open http://localhost:8000.
State is kept in the browser's localStorage — use **Switch user** to try each persona
and **+30 / +90 days** to test reminders, expiry and renewal. **Reset demo** restores seed data.

## Files
- `index.html` — shell
- `styles.css` — DELTA design tokens (#0a0e1a / #d4af37) carried over from Grok
- `data.js` — pillars, episodes, videos, partners, FAQs, mineral bands, **version-controlled rule set**
- `app.js` — router, pages, workflow engine, charts, admin
- `brand/` — images from the Grok build

## What's in it
**From Grok:** home, How it works, Join, Six Pillars, sign-in, intake safety screen, member portal
with mineral range chart and progress chart, admin dashboard, members, reports, client-charts editor,
safety review, lessons editor, AI assistant.

**Added from the brief:** six-month access with the "later of expiry or purchase date" renewal rule;
expiry pause + data export; automated reminders; full workflow states; lab upload with validation
(units, identity, missing values, outliers) and an exception queue; rules engine that records the
version used + regression tests; safety gate (clear / withhold supplements / escalate); full report
view; optional paid voice notes (client purchase → practitioner upload → private delivery);
pillar pages with lessons; Awakening hub; DELTA Podcast; Meet Mineral Man; LAUGHOLOGY with moderation;
moderated community groups with reporting; Partner Collective with disclosures and click tracking;
admin content, moderation, partners, settings, audit log and role-based access.

## Not production-ready — still to decide / build
- Real backend, auth, payments, email/SMS, lab PDF extraction, hosting (UK/EU region)
- Reference bands, rules and supplement protocol are **placeholders** awaiting clinical sign-off (§19)
- Final prices, legal wording, retention policy, lab supplier
