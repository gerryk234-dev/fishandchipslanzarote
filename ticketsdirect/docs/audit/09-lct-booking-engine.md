# LCT Europe booking engine — exact mechanics

Reverse-engineered 15 Nov 2026 from the live front-end (`/js/calendar.js`, the `<calendar-form>` Vue component, and the `/api/*` endpoints it calls). This is **how their booking actually works, step by step** — so we can decide what Tickets Direct should copy.

## Architecture in one line

A **Laravel + Vue** app where the **server is the source of truth**: the browser only collects `excursion_id + date + paxs + language + add-ons`, and every price, fare list and seat count is fetched live from `/api/*` keyed by **excursion and date**. The front-end never sets the price — it posts the selection and the server recomputes. Classic OTA/reseller engine.

## The data a tour page ships with

Each tour renders `<calendar-form>` with:
- `integration` = `{ id, user_id, integrable_type:"App\Tour", integrable_id, hash }` — a per-product booking token (the `hash` keys availability calls).
- `tour_id`, `product_location` (resort/zone id, e.g. `2`).
- `dates_available_init` = **explicit allow-list of departure dates** (real calendar; a date listed twice = two **sessions/times** that day).
- `languages` = guide languages offered (ES/EN/FR/DE).
- `show_sessions` (0/1) = whether to show multiple **departure times** per day.

## The API (all GET unless noted)

| Endpoint | Returns | When called |
|---|---|---|
| `/api/date-languages/{option}` | `[{ languages, dates }]` — enabled dates + languages for the chosen variant, and resolves the `excursion_id` | on option/variant select |
| `/api/check_availability/{hash}/{product_location}/{date}` | **remaining seats (capacity)** for that product on that date; `-1` = not seat-tracked | on date select |
| `/api/excursion-available/{excursion_id}` | fallback capacity when `check_availability` returns `-1` | fallback |
| `/api/fares/{excursion_id}` | **fare types with prices** (Adult / Child / Baby / Senior…) **for that date's excursion** | after excursion resolved |
| `/api/supplements/{excursion_id}` | optional **add-ons** with prices (camel ride, lunch, insurance…) | after excursion resolved |
| `POST /add-product` | adds the line to the **cart**; posts `excursion_id`, `date`, `paxs`, `language_id` (+ fare/supplement breakdown) | on "Book now" |
| `/show-cart` | the cart → checkout page | after add |
| others seen | `/api/excursions`, `/api/excursions-lang`, `/api/languages` | catalogue/misc |

## The booking flow, exactly

1. **Pick variant/date.** `selectOption()` → `GET /api/date-languages/{option}` returns the enabled **dates**, the available **guide languages**, and the **`excursion_id`** that applies (this is how one tour maps to different priced products by date/season).
2. **Pick a date.** `GET /api/check_availability/{hash}/{location}/{date}` → `capacity` (seats left). `-1` → fall back to `/api/excursion-available/{excursion_id}`.
3. **Load pricing for that date.** `selectExcursion(id)` fires two calls in parallel:
   - `GET /api/fares/{excursion_id}` → fare rows `{ label, price, amount }` — **prices are per-excursion-per-date, so they change by day/season** (the "From €X" teaser is just the cheapest day).
   - `GET /api/supplements/{excursion_id}` → optional paid extras.
4. **Choose people + extras + language.** The client computes:
   ```
   total = Σ(fare.amount × fare.price) + Σ(supplement.amount × supplement.price)
   paxs  = Σ(fare.amount)                       // total heads across fare types
   ```
5. **Availability gate.** "Book now" enables only when: `paxs > 0` **and** `fares.length > 0` **and** a `date` is set **and** `excursion_id` set **and** `total > 0` **and** **`capacity >= paxs`**. If `paxs > capacity` it shows a red "not enough seats" alert. So **overbooking is blocked client-side and (because the server recomputes) server-side**.
6. **Add to cart.** `POST /add-product` with `excursion_id, date, paxs, language_id` (+ the fare/supplement breakdown). Cart can hold **multiple tours**.
7. **Checkout** at `/show-cart`: customer details (**name, phone with country code, email, hotel, comment** — where you note children's ages), optional coupon, then **pay**: payment-gateway link (with booking number), card (gateway or phone), PayPal, or bank transfer/cash with emailed proof. No surcharge.
8. **Confirmation = instant.** Digital **voucher** (print or show on phone) with the **assigned pickup point & time**. **Free cancellation up to 24h.** reCAPTCHA v3 guards the forms.
9. **Attribution.** `?affiliate=&qr_hash=` ride through the whole flow, so an **agency/rep/QR** gets commission credited on the resulting booking (see `/show-agency`).

## Why they can do instant-confirm (and what it costs to copy)

Instant confirmation works because LCT **holds its own inventory in its own database**: it has negotiated **allotments** (seat blocks) with each supplier and loaded the **dates, sessions, fares and capacities** itself. `check_availability` just decrements that stored allotment. There is **no live supplier API in the flow** — the "availability" is LCT's own loaded data.

That is the crux for us. **Tickets Direct resells** via BookingMyTour / First Minute / Líneas Romero and does **not** own the seat inventory, so to match instant-confirm we'd need one of:

| Option | What it takes | Trade-off |
|---|---|---|
| **A. Load our own allotments** (LCT's approach) | Negotiate seat blocks per tour/date with suppliers; build admin to load dates, sessions, fares, capacity; decrement on booking | Full control + instant confirm, but we carry allotment risk and the data-entry/admin burden |
| **B. Live supplier feed/API** | A real-time availability/price API from the suppliers or a reseller platform (Bókun, TourCMS, Rezdy) **if** the suppliers are on one | True live availability, no allotment risk; depends entirely on suppliers exposing it — none found public so far |
| **C. Keep request-and-confirm** (our current build) | Take booking + deposit, show "confirmed within X h / e-ticket to follow", staff issue the PDF e-ticket | No inventory risk, honest, works today; slower confirmation than LCT |

## What to copy into the Tickets Direct engine (regardless of A/B/C)

1. **Server-authoritative pricing.** Never trust a client price. Post `tour + date + pax breakdown + language`; the server returns/validates fares. (Our static build must gain a small pricing API for this.)
2. **Per-date fare resolution.** Model a tour → many dated "departures," each with its own fares and capacity, even if we start with one fixed price (your decision) — the structure lets seasonal pricing in later without a rebuild.
3. **Fare types + supplements as data.** Adult/Child/(Senior/Baby) rows + optional paid extras (your boat "1 child price per 4 pax", waterpark "free child/drinks" offers map onto this as fare rules/supplements).
4. **Real available-dates calendar + optional sessions.** Show only real departure days; support multiple **times** per day via a `show_sessions`-style flag. Needs the pickup/departure data from BookingMyTour.
5. **Cart (multi-tour) → single checkout → language-of-booking confirmation.** We already send confirmation in the booking language; add the multi-item cart.
6. **Affiliate/QR attribution** carried through add-product → checkout, so your 11 offices/reps get credited on online bookings (separate spec).

## The concrete gap in our current build

We have: the e-ticket/voucher, booking-language emails, request-and-confirm model, Stripe/PayPal (unwired). We **lack**: the dated-departure + fares + capacity data model and the small `/api/*` layer that serves prices/availability and a server-validated `add-product`/cart. Building that (even for request-and-confirm, no live capacity) is the next real step if you want the LCT-style calendar + cart on the site.
