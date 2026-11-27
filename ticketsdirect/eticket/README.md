# Booking & e-ticket system

Replaces what WordPress + the old admin app do today, in the new stack. Built in this folder:

| File | What it is | Status |
|---|---|---|
| `eticket.mjs` | The bilingual (EN/ES) e-ticket renderer — one function, `renderEticket(data, {logo, qr})` → HTML. Matches the current Tickets Direct e-ticket layout. | **Done** |
| `scripts/make-eticket.mjs` | `node scripts/make-eticket.mjs booking.json` → PDF (Chromium print). The booking API calls the same renderer. | **Done** |
| `confirm.html` | Staff interface: fill reference, pickup point/time, people, price per adult/child, deposit → live e-ticket preview → Print/Save PDF or download the data. | **Done (prototype)** |
| `emails.mjs` | `confirmationEmail()` (sent on payment: "we'll send your e-ticket by email + WhatsApp") and `eticketEmail()` (sent on staff confirmation, PDF attached; also the WhatsApp text). **In the language the customer booked in** (EN/ES/DE/IT/FR), from `booking.bookingLang`. | **Done** |
| `sample.json` | Example booking used to generate a sample PDF. | — |

## The flow

1. **Customer books on the site** and pays the deposit. A booking record is created with status `pending`, storing `bookingLang` (the website language used at checkout).
2. **Payment confirmation** goes out immediately (`confirmationEmail`), **in the booking language**: confirms the deposit and says the e-ticket will follow by email and WhatsApp. The site never shows the booking as "confirmed" at this point.
3. **Staff confirm** in `confirm.html`: enter the reference/locator, pickup point and time, people, prices, deposit. This generates the **PDF e-ticket** (customer name, hotel & room, phone, pickup point & time, rates, total/deposit/balance, QR, terms).
4. **E-ticket delivery** (`eticketEmail`): the PDF is emailed and the same text is sent on WhatsApp. Booking status → `confirmed`.

## What's still needed to run it live

- **Booking store** — a small database for bookings (BookingMyTour has no API, so the new site keeps its own record): Vercel KV/Postgres or similar. Fields are in `sample.json`.
- **Payment** — the owner has PayPal and Stripe. **Left unconnected for now (owner's choice, 7 Nov 2026).** When ready: add the keys through a secure form (never in code); both PayPal and Stripe can feed the same `pending` booking + confirmation email.
- **Email sending** — an email service (e.g. Resend/SMTP) and a verified sender on the domain. `emails.mjs` produces the bodies.
- **PDF in production** — `make-eticket.mjs` uses Playwright, which is heavy for a serverless function. For production, either run generation on a small always-on worker, use a serverless Chromium build, or keep PDF generation where it is today and have the new site only capture the booking + send the confirmation. Decide at build time.
- **WhatsApp** — automatic send needs the WhatsApp Business API; until then staff send the `whatsapp` text manually (one tap from the confirm screen can be added).
- **Verify page** — `/e/<eticket-number>` showing the current (or cancelled) e-ticket, which the QR points to.

None of these change the renderer or the layout — they wire the same pieces to real services.
