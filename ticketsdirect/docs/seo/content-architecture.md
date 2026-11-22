# SEO content architecture & 3-month build tracker

Turns the SEO growth strategy into the actual site structure on `excursionsticketsdirect.com`, mapped to the **existing** generator (`build.mjs`, `src/content/guides.mjs`, `src/data/*`). One domain, no mini-sites. Rule from the strategy: **improve existing pages before creating duplicates** — most of the plan already exists here and is marked *keep/enhance*, not *new*.

Legend: **keep** (exists, fine) · **enhance** (exists, improve content/links) · **new** (create) · **done** (built in this project).

## The 5 top-level sections (nav + topical structure)

| Section | What it is | Lives as |
|---|---|---|
| **Excursions** | Money pages — booking catalogue | `toursIndex` (`/trip/`) + category pages (`/trip-types/…`) |
| **Explore Lanzarote** | Resorts & destination guides | `resortPage` (`/excursions-from/…`) + `destinationPage` (`/destinations/…`) |
| **Things to Do** | Activities & attractions hub | **new** pillar hub guide + activity guides/posts |
| **Travel Guide** | Informational SEO (articles, itineraries, beaches, tips) | `guides` + blog `posts` |
| **Cruise Visitors** | Excursions during a cruise stop | `guides/lanzarote-shore-excursions-cruise-port` |

Nav restructures into these five. Breadcrumbs follow the hierarchy: Home › Section › Page (guides already do Home › Travel Guide › Article).

## Page map — strategy item → real URL → status

### Tier 1 — high commercial intent
| Strategy page | Real URL on this site | Status |
|---|---|---|
| Lanzarote excursions (hub) | `/trip/` (all excursions) | keep |
| Best excursions Lanzarote | `/guides/best-excursions-in-lanzarote/` (+ blog post) | enhance |
| Lanzarote boat trips | `/trip-types/lanzarote-boat-trips/` + post *Best Boat Trips* | enhance (make hub) |
| Lanzarote catamaran trips | `/guides/best-catamaran-trips-lanzarote/` | **new → done** |
| Lanzarote volcano / Timanfaya tours | `/trip-types/lanzarote-bus-tours/` + post *Timanfaya* | enhance; *which tour* guide = new (Wk12) |
| Lanzarote island tours | `/trip-types/lanzarote-bus-tours/` | keep |
| Family excursions | `/guides/lanzarote-excursions-with-kids/` | keep/enhance |
| Excursions from Costa Teguise | `/excursions-from/costa-teguise/` | enhance → destination guide |
| Excursions from Puerto del Carmen | `/excursions-from/puerto-del-carmen/` | enhance → destination guide |
| Excursions from Playa Blanca | `/excursions-from/playa-blanca/` | enhance → destination guide |

### Tier 2 — tourism / planning traffic
| Strategy page | Real URL | Status |
|---|---|---|
| Things to do in Lanzarote | `/guides/things-to-do-lanzarote/` (pillar hub) + post *25 Things to Do* | **new hub → done** |
| Best beaches Lanzarote | `/guides/best-beaches-lanzarote/` | **new → done** |
| Lanzarote without a car | `/guides/lanzarote-without-a-car/` | **new** (Wk9) |
| Lanzarote with kids | `/guides/lanzarote-excursions-with-kids/` | keep |
| Lanzarote 3-day itinerary | `/guides/lanzarote-3-day-itinerary/` | **new** (Wk?) |
| Lanzarote 7-day itinerary | `/guides/lanzarote-7-day-itinerary/` | **new** (Wk10) |
| Things to do when windy | `/guides/windy-day-lanzarote-boat-cancelled/` | keep |
| Lanzarote in November / weather | extend `/guides/lanzarote-excursions-in-winter/` or new | **new/extend** (Wk?) |
| Is Lanzarote worth visiting? | `/guides/is-lanzarote-worth-visiting/` | **new** |

### Tier 3 — niche (mostly already covered by categories/posts)
Cruise port → cruise guide (keep). Papagayo boat → post (keep). Dolphin watching → boat-trips category + Lobos post (keep). Markets → Sunday-market post + tour (keep). Submarine → underwater category (keep). Buggy → buggy category + posts (keep). Jet ski → water-sports + posts (keep). Sunset cruise → boat-trips + tour (keep).

## Internal-linking rules (applied to every guide/article)
- 3–5 contextual links to related guides/articles (system: "related guides" block + inline).
- 3–8 links to relevant excursions via `[[tours:slug,…]]` (real cards, prices, booking).
- 1 link to the section hub + breadcrumbs (system: `breadcrumbs()`).
- Booking CTA near top and at the end (system: `.cta-box` + WhatsApp).
- Related articles at the bottom (system: `others` block).

## Schema (already implemented by the generator)
Organization/LocalBusiness (offices), BreadcrumbList (every page), Article/BlogPosting (guides/posts), Product+Offer (tour pages), FAQPage (FAQs), ItemList (category/resort). No fake ratings; AggregateRating only where real.

## On-page SEO (enforced by templates)
One H1 per page; unique title/meta; readable URL; H2/H3/H4 hierarchy; descriptive alt text; mobile-first; canonical; sitemap/robots; CTA near top + throughout.

## Build phases (tracker)
- **Phase 1 — foundation (this project):** nav → 5 sections ✅ · Things-to-Do pillar hub ✅ · blueprint/tracker ✅ · internal-link hub wiring ✅.
- **Phase 1 — first new commercial content:** Best Catamaran Trips ✅ · Best Beaches ✅.
- **Phase 2 — destination guides:** resort pages now carry a "Plan your stay in {resort}" cross-link block to the hub, beaches, catamaran, kids, itinerary and without-a-car guides ✅. Still to do: per-resort things-to-do prose + map + Arrecife cruise angle. *partial*
- **Phase 2 — itineraries & planning:** 7-day itinerary ✅ · Lanzarote without a car ✅ · Is Lanzarote worth visiting ✅ · 3-day itinerary ✅ · November/weather ✅.
- **Phase 3 — conversion & authority:** volcano "which tour" comparison ✅ (with comparison table) · Best Excursions hub cross-linked to new guides ✅ · category (money) pages now show a "Related guides" block funnelling into the guides ✅ (bidirectional internal linking) · KPI baseline doc (GSC/GA4) ✅ (`kpi-baseline.md`). Still to do (polish): per-resort things-to-do prose + a dedicated Arrecife cruise page (currently served by the cruise guide) · "best for families/couples/adventure" labels on cards. *mostly done*

## KPI tracking (to set up in Phase 3)
Baseline then 30/60/90-day: GSC organic clicks, impressions, avg position, CTR, indexed target pages, ranking keywords; GA4 organic sessions, booking-button clicks, booking funnel, organic bookings, conversion rate. Effort split ≈ 60% booking-intent / 30% destination & activity / 10% broad informational.
