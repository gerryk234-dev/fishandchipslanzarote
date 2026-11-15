# LCT Europe (Low Cost Tours) — competitor study

Studied 15 Nov 2026 from public pages on `www.lcteurope.com`. LCT Europe = **Low Cost Tours**, a direct competitor of Tickets Direct (they resell the same Lanzarote excursions — Timanfaya, Jameos, La Graciosa, Fuerteventura, boat trips, water parks). This doc is **research to build our own guide and booking flow** — not a plan to embed their content, which would send our traffic to their checkout.

## 1. The travel guide (`/guide-lanzarote`)

A large SEO content hub — a lead magnet that funnels readers into their tour pages. Structure (one landing + ~45 sub-pages, mirrored for Tenerife, Gran Canaria, Fuerteventura, Granada):

**Top-level sections (the nav of the guide):**
- Information about Lanzarote → required documents, prices, weather, *festivities 2026*, opening hours, history, **2-day itinerary**
- What to see & do → a page **per attraction** (Timanfaya, Papagayo, Green Lagoon, La Graciosa, Cueva de los Verdes, Manrique Foundation, Hervideros, Mirador del Río, Jameos, Charcones pools, Arrecife) **and per town** (Puerto del Carmen, Playa Blanca, Costa Teguise, Playa Honda, Yaiza, Tías, Teguise, Haría, Órzola, San Bartolomé) — ~25 pages
- How to get to Lanzarote · Transport · Where to eat · **How to save** · Where to sleep · Shopping · Map (incl. "map of excursions") · Activities

**How the content is written (the playbook to copy):**
- Each attraction page answers the search intent then plants a CTA: *"How to visit without queues? The best option is to book a guided tour to Timanfaya that includes transport and priority access"* → links to the matching tour. Every informational page routes to a bookable product.
- Trust strip repeated site-wide: **Free Cancellation (up to 24h), Only the Best Excursions, Best-price Guarantee, 24/7 Customer Service**.
- Multilingual by subdomain: `www`=EN, `es`, `de`, `fr`, `nl`, `pl`. Guide URLs are localised per language (`guide-`, `guia-`, `leiten-`, `guider-`, `gids-`, `przewodnik-`). **6 languages** — more than our planned EN/ES/DE/IT/FR (they skip IT, we skip NL/PL).
- Analytics: GA4 (`G-RBECDCKLYP`) with `content_group: 'lz-guia'` — they segment guide traffic separately, i.e. they measure the guide as a funnel.

**Takeaway for us:** this is exactly the "own guide" I recommended. We already have the tour catalogue and the i18n scaffolding; a guide with (a) one page per attraction, (b) one per resort/town, (c) practical pages (getting around, weather, 2-day itinerary, where to eat), each ending in a CTA to *our* tour — directly competes for the same informational searches and keeps the click.

## 2. Most-important / money pages

No public view counts, but priority is readable from sitemap + internal linking. 488 URLs total; **47 are the Lanzarote guide**, ~40 are Lanzarote tour pages. Their priority tours (by category slug weighting `1-bus-tours`, `2-boat-trips`):
- **Bus excursions:** Timanfaya + Jameos del Agua (tour id 1 — their flagship), South Tour Timanfaya, Grand Tour, Northern Treasures (Jameos + Cueva Verdes + Mirador + Cactus Garden), César Manrique Foundation, Fuerteventura-from-Lanzarote day trips (Corralejo dunes).
- **Boat trips:** La Graciosa (catamaran / sail / free-time variants — 3+ pages), Love Sunset catamaran, Sunset & Dolphins, Lobos Island, Papagayo premium boat.
- **Parks & shows:** Costa Teguise water park, Rancho Texas, Fred Olsen ferry tickets, drag-queen show.
- **Private & semi-private:** a full "private tours" and "semi-private minibus" range (Timanfaya/Jameos/south) — higher-margin, we have nothing equivalent yet.
- Hub pages that collect link equity: `/bestexcursions` (catalogue), `/guide-lanzarote`, `/simple-and-flexible-booking-excursions`, `/pricequality`.

**Gaps vs us / opportunities:** they lean on **private & semi-private minibus tours** and **ferry/transfer tickets** (Fred Olsen, airport transfers) — product lines we could add. Their La Graciosa coverage is deep (we're invisible for "La Graciosa" per the AI-visibility tests), so that guide page + tour is a priority for us.

## 3. How their booking system works

**Stack:** Laravel + Vue, PWA (installable), reCAPTCHA v3 on forms, GA4 + GTM + Facebook Pixel.

**Flow (per tour page):**
1. **Price teaser** — "From €X" = the *cheapest* day; a tooltip says the final price "varies depending on the day or season" → **dynamic/seasonal pricing per date**.
2. **`<calendar-form>` Vue widget** holds the booking logic:
   - `dates_available_init` = an **explicit allow-list of departure dates** (e.g. this tour runs ~every 2–3 days, not daily). The calendar only enables those dates — real availability, not faked.
   - Passenger categories: **Adult (>11)**, **Child (2–11)**, plus baby/senior tiers per tour.
   - Languages offered per departure (ES/EN/FR/DE guide).
   - Each tour carries an `integration` object with a `hash` (per-product booking token).
3. **Add to cart** (`/show-cart`) → booking form (name, phone *with country code*, hotel, comments where you note children's ages) → **pay**.
4. **Payment options** (all stated on the tour FAQ): payment-gateway **link sent with your booking number**, **card** (gateway or by phone), **PayPal**, or **bank transfer / cash deposit** with emailed proof to `info@lcteurope.com`. No surcharge on any method.
5. **Confirmation:** "instant confirmations and digital tickets" — you get a **digital voucher** (print or show on phone) with the **assigned pick-up point**. **Free cancellation up to 24h.**
6. **Affiliate / agency layer:** every URL carries `?affiliate=<id>&qr_hash=<hash>`; there are `/register-agency` and `/show-agency` pages. Reps/offices get **QR codes** that stamp the affiliate id onto the booking — that's how a physical rep or partner office earns commission on an online booking. (The code in the link you sent me was their *empty fallback*, not a Tickets Direct code — so that particular link tracks to nobody.)

### How this compares to what we built for Tickets Direct

| | LCT (Low Cost Tours) | Tickets Direct (our build) |
|---|---|---|
| Confirmation | **Instant** voucher at pay time | **Request-and-confirm**: deposit → staff issue e-ticket by email + WhatsApp |
| Availability | Per-date allow-list in calendar, real | To wire to booking system of record (BookingMyTour / First Minute / Líneas Romero) |
| Pricing | Dynamic per date/season | Fixed per tour (per your decision) |
| Payment | Gateway link, card, PayPal, transfer | PayPal + Stripe (built, left unconnected per your decision) |
| Voucher | Print / phone digital ticket + pickup | PDF e-ticket (name, hotel & room, phone, pickup point & time, QR) |
| Pickups | Shown on voucher | Data still needed from BookingMyTour |
| Affiliate/QR | Agency + QR-hash commission tracking | **We don't have this** — relevant given your 11 offices + reps |

**Two things worth stealing (legitimately — these are common patterns, not their content):**
1. **"From €X, final price by date" calendar** with an explicit available-date list — honest and converts. Our request-and-confirm can still show a calendar of real departure days once we have them.
2. **An agency/rep QR layer.** You have 11 offices and staff on the ground; a per-office/per-rep code (QR a customer scans in-office, or on a flyer) that attributes the online booking back to that office would let you push walk-ins to the website without losing the attribution — exactly how LCT arms its network.

## Recommendation

Do **not** embed or link their guide. Build **our own Lanzarote guide** on the same information architecture (attraction pages + resort pages + practical pages, each CTA-ing our tours), in EN/ES/DE (+IT/FR as those launch). It feeds SEO *and* the AI-visibility goal, and it's the honest version of what their guide does. I can draft the guide structure + first pages from the keyword/intent research already in `06-language-research.md`.
