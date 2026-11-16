# On-site booking system (LCT-style, built)

Built 16 Nov 2026. A self-contained booking flow on the new site — calendar of real departures, price calculator, cart and request-and-confirm checkout — modelled on the LCT/Low Cost Tours engine studied in `09-lct-booking-engine.md`, but fitted to Tickets Direct's static site and request-and-confirm model (no live payment yet, per the owner's 7 Nov decision).

## What it does (customer flow)

1. **Tour page → booking box.** Pick option, a **real departure date** (and time where the tour has sessions), set travellers per fare type. Price and deposit update live; the date's own prices apply (seasonal-ready).
2. **Add to booking.** Validates a date is chosen and seats are available (`capacity ≥ travellers`), then adds the line to a cart (browser `localStorage`). A header **Booking** badge shows the count.
3. **Cart** (`/book/`, `/es/reservar/`, `/de/buchen/`). Edit/remove items, see **Total · Deposit to pay now · Balance on the day**.
4. **Details.** Lead traveller: name, phone (with country code), email, **hotel & room**, pickup point, notes (children's ages, flight times…). All required fields validated.
5. **Request received.** Generates a reference `TD-YYYYMMDD-XXXX`, shows the request-and-confirm message ("we check availability, e-ticket to follow by email + WhatsApp"), and hands the booking to staff via a **pre-filled WhatsApp message**, an **email** (mailto), or a **downloadable JSON**. The whole flow runs **in the language the customer booked in** (EN/ES/DE).

## How "all the departures" are generated

- **Source of truth:** `src/data/departures.json` — per-category (and optional per-tour) running **days**, **times/sessions**, **capacity**, closed dates, and seasonal price factors. Editable; meant to be replaced with the real BookingMyTour schedule.
- **Generator:** `build.mjs → availabilityFor(t)` expands the schedule over a rolling horizon (180 days) into concrete dated departures with per-date fares and seat counts, written to **`/data/availability/<tourId>.json`** (one file per bookable tour). The booking widget fetches these; no live backend required.
- Current build: **83 tours → 10,532 dated departures.** Service worker serves availability **network-first** so seats stay fresh.

## Architecture (how it mirrors LCT, honestly)

| LCT | Tickets Direct build |
|---|---|
| Vue `calendar-form` + `/api/*` | `.bk` booking box + static `/data/availability/<id>.json` |
| `check_availability` → seats | `capacity` per date; add-to-cart blocked when `travellers > capacity` |
| `fares`/`supplements` per date | per-date `prices` from each package's fare categories |
| `add-product` → cart → `/show-cart` | localStorage cart → `/book/` cart page |
| Instant voucher at payment | **Request-and-confirm**: staff issue the existing PDF e-ticket |
| Affiliate/QR attribution | not built yet (separate spec — the owner has 11 offices + reps) |

## Files

- `src/data/departures.json` — the schedule (edit this to set real days/times/capacity).
- `build.mjs` — `availabilityFor`, `seasonFactor`, `availabilityFiles()`, `bookPage()`, cart i18n (`T[lang].cart`), header Booking link, `SEG.book`.
- `src/assets/app.js` — cart store, booking-box add-to-cart + capacity gate, and the `#cart-app` cart/checkout/confirmation renderer.
- `src/assets/styles.css` — cart/checkout, header badge, toast styles.

## What is deliberately NOT wired yet (owner decisions / next steps)

- **Payment.** PayPal + Stripe stay disconnected (owner, 7 Nov). The confirmation says a secure deposit link follows with the e-ticket. When ready, the deposit charge slots in between "Details" and "Request received".
- **Server booking store + email send.** The booking is handed to staff via WhatsApp/email/JSON now. A real store (Vercel KV/Postgres) and transactional email (Resend/SMTP) replace that; `app.js` has the single hand-off point marked for a `POST`.
- **Real schedule + pickups.** `departures.json` holds placeholder running-days/times/capacity until the BookingMyTour export (dates, sessions, seats) and pickup points land.
- **Affiliate/rep + QR attribution** for the 11 offices (separate build).
