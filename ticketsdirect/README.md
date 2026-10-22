# Tickets Direct Excursions Lanzarote: web app

An SEO-first rebuild of excursionsticketsdirect.com. Every page is pre-rendered HTML in English and Spanish, so Google and AI assistants (ChatGPT, Claude, Perplexity, Gemini) can read all of it. A booking assistant sits in the corner of every page.

> This folder is unrelated to the Hippie Chippy site in the rest of this repository. Move it to its own repository before deploying, and don't merge it into this repo's `main` branch: GitHub Pages serves that branch on hippiechippy.com.

## What's inside

| Path | What it is |
|---|---|
| `build.mjs` | Zero-dependency generator: `node build.mjs` writes the site to `dist/` |
| `src/data/*.json` | The single source of truth: tours, categories, resorts, places, offices, reviews, company facts |
| `src/content/guides.mjs` | Editorial guides (EN + ES). `[[tours:a,b]]` and `[[prices]]` pull live data from the catalogue |
| `src/assets/` | CSS, the client script (filters + assistant widget), logo, social image |
| `api/chat.js` | The AI assistant endpoint (Vercel function, Claude API) |
| `vercel.json` | Build, output and function config |

### Pages generated (109)

- **24 tour pages per language.** English pages keep the existing `/trip/<slug>/` URLs, so current rankings carry over. Spanish pages are at `/es/excursion/<slug>/`.
- **7 activity hubs**: boat trips, buggies, bus tours, water sports, underwater, ferries/islands, packs.
- **3 resort pages**: excursions from Costa Teguise, Puerto del Carmen and Playa Blanca, each with travel times and the local office.
- **6 destination pages**: La Graciosa, Lobos, Fuerteventura, Timanfaya, the north caves, the Teguise market.
- **7 guides**: best excursions, price list, cruise port, windy days, kids, booking direct, winter.
- **Trust and support pages**: offices, about, FAQ, contact.
- **Machine-readable files**: `sitemap.xml` (with hreflang), `robots.txt` (AI crawlers explicitly allowed), `llms.txt`, `llms-full.txt`, `/data/tours-{en,es}.json`.

### SEO and AI-search features

- JSON-LD on every page:
  - `TravelAgency` with offices as departments
  - `Product`+`TouristTrip` with `Offer` prices
  - `FAQPage`, `BreadcrumbList`, `ItemList`, `Article`, `TouristDestination`
- `hreflang` EN/ES with an x-default, plus canonical URLs and Open Graph tags.
- Prices are typed once, in `tours.json`. Every page, price table, the structured data, `llms.txt` and the assistant read from that same file, so prices can't drift out of sync.
- Short, factual answer blocks (FAQs, quick-facts tables). These are the passages AI assistants quote.

## The booking assistant

- **With `ANTHROPIC_API_KEY` set**, `/api/chat` uses Claude (`claude-opus-5-5` at low effort; override it with the `CHAT_MODEL` env var). The full catalogue is in a cached system prompt.
  - It recommends up to 3 tours and shows them as bookable cards.
  - It hands complex cases (existing bookings, complaints, group quotes) to WhatsApp.
  - Server-side refusal fallbacks are on (`fallbacks: "default"`).
- **Without the key, or if the API is down**, the widget falls back to a built-in recommender that runs in the browser. It matches activity, kids, budget, resort, windy days and cruise stops. The site never shows a broken assistant.

## Run and deploy

```bash
npm install          # only needed for the AI endpoint
npm run preview      # builds and serves dist/ on http://localhost:8080
```

**Deploy (Vercel):**
1. Import the repository.
2. Add the environment variable `ANTHROPIC_API_KEY`. Optionally add `SITE_URL`; it defaults to https://excursionsticketsdirect.com.
3. Deploy. `vercel.json` already sets the build command, the output folder and the API function.

**Switching the real domain over.** The "Book now" buttons point to `bookingBase` in `src/data/site.json`, which is currently the live booking pages on the existing site.
1. Before pointing excursionsticketsdirect.com at this app, move the existing booking engine to a subdomain (e.g. `book.excursionsticketsdirect.com`).
2. Update `bookingBase` to that subdomain.
3. Then switch DNS. Tour URLs stay the same, so no redirects are needed for them.
4. Add 301 redirects in `vercel.json` for old blog and category URLs.

## Owner checklist before going live

These facts couldn't be verified from public sources. The build prints a warning until the office data is complete.

- [ ] **Offices** (`src/data/offices.json`): only 4 of the 10 offices could be found publicly, and none are confirmed.
  - Costa Teguise has two conflicting addresses (Av. del Mar 28 vs Calle Anzuelo 38).
  - Add the rest, including the Puerto del Carmen address(es), plus opening hours and phones.
  - Set `verified: true` on each office once confirmed.
- [ ] **Tour details**: the live tour pages block automated reading, so the descriptions are written from tour names and public facts. Check each one and add real itineraries, inclusions, pickup points, minimum ages and photos (`"image"` field per tour).
- [ ] **Pack durations**: the live site lists the 170€ packs as "2 Hours". They are shown here as multi-excursion packs instead.
- [ ] **Policies**: confirm the wording on weather cancellations ("we offer another date or a different excursion") and the lowest price guarantee.
- [ ] **Reviews** (`src/data/reviews.json`): paste real reviews from Google, Tripadvisor or Trustindex. Never invent them. Aggregate ratings are only output when real data is added.
- [ ] **Facebook URL**: add it in `site.json` (currently `null`).
- [ ] **Google Business Profile**: claim a profile for each office and link it to its resort page.
- [ ] **Search Console and Bing Webmaster Tools**: submit `sitemap.xml` after launch.
