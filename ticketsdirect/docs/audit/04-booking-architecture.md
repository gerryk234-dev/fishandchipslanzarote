# Stage E: booking architecture evaluation

Written 7 November 2026. This is the decision that unblocks taking bookings on the new site once WordPress is gone.

**Fee and feature figures below come from third-party blogs and vendor marketing, not the vendors' own contracts. They are labelled "verify". Confirm current terms directly with each vendor before committing. Nothing here is a quote or a signed rate.**

## 1. The real situation

Tickets Direct is a **pure intermediary** — like GetYourGuide or Viator, but local with physical offices (owner, 7 Nov 2026). **It operates no tours of its own.** Every excursion is run by another operator (First Minute, Líneas Romero and others), and the bookings are managed through **BookingMyTour**, which is **not Tickets Direct's system**, is accessed only through a booking login, and has **no API Tickets Direct controls**.

Because there is no own inventory, the usual "put your tours on a booking platform" path does not apply: there are no tours to load. The site's job is to **capture a sale and route it to the operator**, which the operator's system then fulfils.

This matters because almost every tour-booking platform (FareHarbor, Bókun, Rezdy, TrekkSoft…) is built **operator-first**: it assumes *you own the inventory and set the availability*. A reseller's availability lives in the supplier's system. So the first decision is not "which platform" — it is **where the real-time availability and the confirmed booking live**.

## 2. The core question

When a customer books on the new site, two things have to happen:

1. **Check availability** — are there seats on that tour, that date?
2. **Record the booking** so the operator runs it and the customer gets a ticket.

Today both happen in the supplier's system (via BookingMyTour / WP Travel Engine). The new site has to connect to *something* that does them. Three models:

| Model | How a booking works | Availability shown | Fit for Tickets Direct |
|---|---|---|---|
| **A. Request & confirm** | Customer pays a deposit (or the full price) on the new site via Stripe. Staff place the booking in BookingMyTour by hand, then confirm by email/WhatsApp. | Not live: shown as "on request", or a staff-maintained calendar | **Works now, no supplier API needed.** Honest if the site says "confirmed within X hours". More staff work. Never shows a booking as confirmed before staff place it. |
| **B. Own booking platform** | Tickets Direct runs its own platform (e.g. Bókun/Rezdy) holding availability for the tours it controls; the new site books into it live; that platform also pushes tours to Viator/GetYourGuide. | Live for tours Tickets Direct manages itself | Good for **own-brand tours**. For resold tours it only works if the supplier lets Tickets Direct hold/sync availability. |
| **C. Supplier API** | The new site (or a platform) connects to the supplier's own system by API and books in real time. | Live | Best experience, but **needs the supplier's permission and API** — which BookingMyTour does not offer to you. Off the table unless that changes. |

**Key point:** you cannot show live availability for a tour whose seats you don't control, and you must never mark a booking "confirmed" before the operator's system actually holds it. (This is also a firm project rule.)

Because Tickets Direct holds no inventory, **Model B (own booking platform) does not apply** — there are no own tours to host. The realistic choices are **Model A now**, moving to **Model C** per supplier as access is granted. The platforms below matter only as a possible **agent/reseller layer** (Model C at scale) or if a supplier is already on one of these networks.

## 3. Platform comparison (agent/reseller layer, or selling on Viator/GetYourGuide)

All figures **verify with the vendor**. Owned-by-an-OTA matters: it buys cheaper distribution to that OTA but is lock-in.

| | **FareHarbor** | **Bókun** | **Rezdy** | **TourCMS** |
|---|---|---|---|---|
| Owner | Booking Holdings | Tripadvisor (owns Viator) | Independent (NepStar) | Palisis |
| Monthly fee | None reported | Free tier + ~$49 / $149 / $499 tiers | Paid plans; "no booking fee for **agents**" | By quote |
| Booking fee (direct) | ~6%, usually added to the customer's price | ~1–1.5% by tier | ~3% flat, all channels | By quote |
| Fee on Viator bookings | — | **0%** (same owner) | Same 3% (neutral) | — |
| Channel manager to Viator + GetYourGuide | Yes (FHDN, high referral %) | **Strong** | **Strong, channel-neutral** | Yes |
| **Reseller / agent model** (sell other suppliers' tours) | Weak | Via marketplace | **Marketplace + reseller tools** | **Built for agents/resellers** |
| Multilingual checkout | Partial | Partial | Partial | Partial |
| Best for | Single operators | Distribution to Viator | Agencies wanting neutral distribution | **Multi-supplier agents** |

Sources (third-party, treat as estimates): FareHarbor pricing [basecampadvertising](https://basecampadvertising.com/fareharbor-fees-tour-operators/), [automate.travel](https://automate.travel/blog/fareharbor-pricing-guide-2026/); Bókun pricing [hamzaliaqat](https://hamzaliaqat.com/blog/bokun-pricing-2026), [travelity](https://travelity.app/blog/bokun-pricing/); Rezdy resellers [rezdy.com](https://rezdy.com/resellers/); platform roundup [automate.travel](https://automate.travel/booking-engine-pricing/).

**None of these replaces BookingMyTour for the resold tours** unless the supplier integrates. They matter most for (a) your own-brand tours and (b) pushing all your tours onto Viator and GetYourGuide as extra sales channels.

## 4. Recommendation (phased, reversible)

1. **Launch with Model A (request & confirm).** The new site already has the pieces: tour pages, a deposit model, WhatsApp. Add a Stripe deposit step and a clear "we confirm your booking within X hours" message. This lets the site take money and launch without any supplier API, and without ever faking availability. Build the booking record in a small database the site owns (so it survives WordPress being switched off).
2. **In parallel, settle the supplier question.** Ask the people who run BookingMyTour, and First Minute / Líneas Romero (you're connected to both), the one question that decides everything: *will they give availability + booking access (API or a feed) for the tours we resell?* If yes → Model C, live availability, per supplier. If no → those tours stay request-and-confirm.
3. **A reseller platform is a later option, not a launch need.** TourCMS (built for agents) or Rezdy's marketplace can pull supplier inventory *if the suppliers are on those networks* — worth raising with the suppliers, but it depends entirely on them, so it is not something to build the launch around.
4. **Keep WordPress's job list covered** (see the tracker's "WordPress is removed" table): tour data source, availability, checkout, staff admin, legal pages, `/wp-content/` images. Model A + a small owned database covers checkout and the booking record without WordPress; tour content is kept in the site's own data files (already imported), refreshed when prices change.

This avoids the two big risks: spending weeks building a custom booking engine before the model is settled, and launching something that shows fake availability.

## 5. What's needed to decide

| Needed | From whom | Why |
|---|---|---|
| Does BookingMyTour / First Minute / Líneas Romero offer availability + booking API/feed? | The suppliers (you're connected) | Decides Model A vs C for resold tours |
| Who the operator is for each tour | Owner | Needed to route each booking to the right supplier |
| Stripe account + keys | Owner (into a secure form, never chat) | To take the deposit/payment |
| Confirmation rule per tour (how fast staff confirm; cut-offs) | Owner | For honest "confirmed within X hours" copy |
| Pickup points & times | Owner (screenshots from BookingMyTour) | Needed on tour pages regardless of model |

Once the supplier answer is known, this doc gets a concrete build plan for the chosen model.
