# Tickets Direct Excursions Lanzarote: website + installable app

An SEO-first rebuild of excursionsticketsdirect.com that works as a normal website and as an installable app on phones, tablets and computers.

- Every page is pre-rendered HTML in English and Spanish, so Google and AI assistants (ChatGPT, Claude, Perplexity, Gemini) can read all of it.
- All tour content, prices and photos come straight from the existing WordPress site.
- A booking assistant sits on every page.

> This folder lives in the Hippie Chippy repository but is a separate project. Don't merge it into this repo's `main` branch: GitHub Pages serves that branch on hippiechippy.com. Deploy it from its own Vercel project (below).

## How it fits together

```
WordPress (WP Travel Engine)  ──npm run import──▶  src/data/catalog.json + src/assets/img/trips/*.webp
                                                        │
editorial: src/data/{categories,resorts,places,offices,site}.json, src/content/guides.mjs
                                                        │
                                   npm run build ──▶  dist/  (305 pages, sitemap, PWA, llms.txt)
                                                        │
                                   api/chat.js  ◀── same catalogue (src/lib/catalog.mjs)
```

| Command | What it does |
|---|---|
| `npm run import` | Pulls all trips, prices (adult/child, transfer options), itineraries, includes, FAQs, galleries, videos, pickup towns, categories and destinations, in **EN and ES**, from the WordPress REST API. Downloads the photos and optimises them to WebP. Results are cached in `.cache/`; use `-- --fresh` to refetch. |
| `npm run build` | Generates the site into `dist/` |
| `npm run gbp` | Regenerates `docs/google-business-profiles.md` (Google Business Profile kit) from the live catalogue |
| `npm run preview` | Builds and serves the site on http://localhost:8080 |

Edit tours in WordPress as usual, then run `npm run import && npm run build`, or let the Vercel build do it.

## What's generated

- **83 tour pages in each language**, at the exact same URLs as today (`/trip/<slug>/` and `/es/trip/<spanish-slug>/`), so rankings and backlinks carry over. Each page has:
  - a photo gallery and the full description
  - a step-by-step itinerary, and what's included and not included
  - a YouTube video (loads only on click)
  - pickup towns, which link to the resort pages
  - the places visited, and all of that tour's FAQs from WordPress
  - a price box with adult/child prices and transfer options, the deposit %, Book and WhatsApp buttons
- **Category pages** at the existing `/trip-types/…` URLs.
- **38 destination pages** at the existing `/destinations/…` URLs, using your long WordPress descriptions plus the tours that visit each place.
- **New pages competitors don't have:**
  - 3 resort pages ("Excursions from Costa Teguise / Puerto del Carmen / Playa Blanca"), listing only tours that really pick up there, with your offices
  - 7 guides: prices, cruise port, windy days, kids, booking direct, winter, best excursions
  - offices, about, FAQ and contact pages
- **Fixes to SEO problems on the current site:**
  - **hreflang links**: the WordPress site prints none, so Google can't pair English and Spanish pages.
  - Product/TouristTrip structured data with real adult/child `Offer`s.
  - Breadcrumbs, FAQ structured data, an XML sitemap with language alternates.
- **AI assistants:** `robots.txt` explicitly welcomes AI crawlers. `llms.txt` and `llms-full.txt` give a plain-text catalogue with every tour, price, pickup and FAQ, and `/data/tours-*.json` is open for tools.

## The app (phones, tablets, computers)

The site is a Progressive Web App:
- manifest with icons and shortcuts
- an offline-capable service worker
- an "Install app" button that appears when the browser supports it
- an `/app/` page with install steps for Android, iPhone/iPad and desktop

To also list it in app stores:
- **Google Play and Microsoft Store:** package the live URL with [PWABuilder](https://www.pwabuilder.com). It generates the store packages from the manifest; no code changes are needed.
- **Apple App Store:** needs a thin native wrapper (e.g. Capacitor) and an Apple developer account.

## The booking assistant

- **With `ANTHROPIC_API_KEY` set**, `/api/chat` uses Claude (`claude-opus-5-5` at low effort; change it with `CHAT_MODEL`). All 83 tours, prices, child prices, pickups and durations are in a cached system prompt.
  - It recommends up to 3 tours as bookable cards.
  - It hands bookings issues, complaints and group quotes to WhatsApp.
  - Server-side refusal fallbacks are on.
- **Without a key, or if the API is down**, a built-in recommender answers instantly in the browser. It matches activity, kids, budget, resort pickup, windy days, cruise stops and places.

## Deploy (Vercel)

1. Create a Vercel project from this repository and set **Root Directory** to `ticketsdirect`.
2. Set the environment variables:
   - `ANTHROPIC_API_KEY`
   - optionally `SITE_URL` (default https://excursionsticketsdirect.com)
   - optionally `BOOKING_ORIGIN`: where the "Book now" buttons go, default https://excursionsticketsdirect.com
3. Deploy.

**Moving the real domain over:**
1. Keep WordPress running as the booking engine on a subdomain, e.g. `book.excursionsticketsdirect.com`.
2. Set `BOOKING_ORIGIN` to that subdomain and `WP_URL` for imports.
3. Point the main domain at Vercel. Tour, category and destination URLs are identical, so no redirects are needed for them.

## Owner checklist

- [x] **Offices:** all 10 physical offices (09:30–18:00 every day) plus the Puerto Calero boat-charter profile (not a walk-in office, kept off the site's office list) are in `src/data/offices.json`.
- [ ] **Google Business Profiles:** work through the per-profile audit in `docs/google-business-profiles.md` (section 7): categories, website links, names, the Costa Teguise Center address, and a possible duplicate in Puerto del Carmen.
- [ ] **Two tours have no price in WordPress** and are hidden until priced: *Katfish Premium Cruises* and *Chillout Cruise Playa Blanca*.
- [ ] **Reviews:** paste real reviews into `src/data/reviews.json`. Never invent them.
- [ ] **Search Console and Bing Webmaster Tools:** submit `sitemap.xml` after launch.
