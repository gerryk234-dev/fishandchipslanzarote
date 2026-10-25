# Stage A: access, evidence and baseline audit

Audit date: 25 October 2026. Site audited: https://excursionsticketsdirect.com (live WordPress site).
Nothing on the live site was changed.

Raw evidence in this folder:

- `baseline-crawl-2026-10-25.csv`: one row per sitemap URL (435 URLs).
- `baseline-lab-performance-2026-10-25.json`: headless-browser timings.

## 1. Access and evidence inventory

| Source | Access | How it was used |
|---|---|---|
| Public HTML of all 435 sitemap URLs | ✅ Verified | Full crawl: status, title, description, canonical, hreflang, H1, schema, size |
| robots.txt, Yoast sitemap index (12 sitemaps) | ✅ Verified | Crawl list, crawler rules |
| WordPress REST API (public endpoints) | ✅ Verified | Trips, packages, dates, posts (13 EN posts), taxonomies |
| WP Travel Engine public dates API | ✅ Verified | Used by the rebuild's availability endpoint |
| Google Maps public listings (11 profiles) | ✅ Public data only | Names, categories, ratings, hours, websites (see `docs/google-business-profiles.md`) |
| YouTube channel @experiencelanzarote | ✅ Public data | 41 Shorts imported |
| Competitor sites: oklanzarote.com, excursionslanzarote.com, civitatis.com | ✅ Reachable | For Stage B |
| GetYourGuide, Viator | ⛔ 403 bot protection | Only public search snippets can be used |
| Google SERP (automated) | ⛔ Captcha | Ranking positions **not** measured. Needs Search Console or a rank tracker |
| PageSpeed Insights API | ⛔ Shared quota exhausted (HTTP 429) | Replaced by a lab test (section 6). No CrUX field data |
| Google Search Console | ❌ No access | Needed for real queries, clicks, impressions, indexing and baseline positions |
| GA4 / Google Tag Manager (GTM-KCNK6ZPH is installed) | ❌ No access | Tags inside the container are unknown. Traffic baseline needs access |
| Google Business Profile owner access | ❌ No access | Audit is from public data. No edits made |
| Booking, Stripe, CRM, email, customer chats | ❌ No access | Not reviewed. No claims made about them |
| Server logs, LiteSpeed/firewall settings | ❌ No access | Real bot visit frequency is unknown |
| Backlinks, search volumes, keyword difficulty | ❌ Needs a paid tool (Ahrefs, Semrush or similar) | Not estimated |
| ChatGPT, Perplexity, Gemini, Google AI Overviews UIs | ❌ Not available to this agent | **No AI-search tests have been performed yet.** A test protocol for the owner to run follows in Stage C |

## 2. Site inventory (from the sitemaps)

| Sitemap | URLs | Notes |
|---|---|---|
| trip | 172 | About 85 tours × EN/ES, plus archives |
| destination | 78 | Overlaps with `category` and `location` (duplicate titles, see 4.3) |
| page | 37 | Includes utility pages (wishlist, e-ticket form, "selection of the departure date of the second tour", "gsim europe clients") |
| activities | 32 | Taxonomy archives |
| post | 28 | 13 EN plus their ES versions. Latest post published 12 May 2026 |
| category | 23 | Blog categories that duplicate destinations |
| location | 22 | Duplicates destinations |
| trip_types | 22 | Main category hubs |
| tour_language, tour_duration, difficulty | 8, 6, 6 | Thin taxonomy archives with no description |
| author | 1 | |

There are 433 URLs returning 200 and 2 returning 302: `/formulario-e-ticket/` (EN and ES) redirect to `wp-login.php` but are listed in the sitemap.

## 3. What is already good (verified)

- The `http://` homepage redirects to `https://` with a 301. The sitemap index is valid, and robots.txt allows all crawlers.
- **Crawler access:** with the user agents of Googlebot, Bingbot, OAI-SearchBot, GPTBot, ChatGPT-User, PerplexityBot and ClaudeBot, the homepage and a tour page both returned 200 with the full page and no challenge page.
  - Caveat: this only tests the user-agent string. Real bots come from their own IP ranges, and a firewall may treat them differently. Server logs would confirm.
- Content is rendered on the server (no JavaScript needed to read it). That is good for AI crawlers.
- All pages have self-referencing canonicals and none are noindexed by mistake.
- Every tour page has Product + Offer (price in EUR) and FAQPage JSON-LD. The FAQs are substantial (for example, 23 Q&As on La Graciosa).
- The blog is recent (13 posts, Feb–May 2026) and targets the right topics (La Graciosa, Timanfaya, buggies, boat trips, jet ski, Papagayo).

## 4. Problems found (verified, ranked by impact)

### 4.1 No hreflang on any of the 433 pages (high)
EN and ES pages exist for almost everything, but they are not linked with `hreflang`, so Google has to guess which language version to show each searcher. The EN↔ES pairs can only be discovered through the WPML language switcher.

### 4.2 Entity and schema problems (high for AI and Maps)

- **Name:** the Organization name in the schema is `"Excursions in Lanzarote | Excursions Tickets Direct"`. That is a page-title string, not a business name.
- **Missing business details:** there is no address, phone number, `TravelAgency` or LocalBusiness type, and no link between the website and the 10 offices.
- **Broken YouTube link:** `sameAs` points to `youtube.com/@ExcursionsTicketsDirect`, which **returns 404**. The real channel is `@experiencelanzarote`.
- **Placeholder description:** every tour's Product/Trip `description` is the same placeholder text, "Looking for another experience? Explore all our excursions.", repeated on 170 pages.
- **Self-serving review stars:** 4 tour pages carry `AggregateRating` built from on-site reviews, for example `/trip/sea-trekkin/` with ratingValue 5.0 and reviewCount 1. Google treats ratings a business publishes about itself as ineligible for review stars, and a single review is weak evidence anyway.

### 4.3 Duplicate and overlapping archives (medium-high)
Destinations exist three times: as `destination`, as `location` and as blog `category`. These copies share identical titles, for example:

- *La Graciosa – Excursions in Lanzarote | Excursions Tickets Direct* is used for both `/category/la-graciosa/` and `/destinations/la-graciosa/`.
- The same happens for Caleta de Famara and Papagayo.

In total, 20 titles and 65 meta descriptions are duplicated.

### 4.4 Blog keyword cannibalisation (medium)
Several posts compete for the same searches:

| Topic | Competing posts |
|---|---|
| Jet ski | 2 posts, and one of them reuses the title of "25 Best Things to Do in Lanzarote" |
| La Graciosa | 3 posts |
| Buggies | 3 posts |

### 4.5 Titles and descriptions (medium)

- **Long titles:** 400 of 433 titles are over 60 characters, with a median of 75. The suffix "– Excursions in Lanzarote | Excursions Tickets Direct" uses about 53 characters, so Google cuts off the tour name.
- **Missing descriptions:** 174 pages have none, including 64 tour pages and all taxonomy archives.
- **Mixed language:** the EN trips archive is titled "Trips **archivo**".

### 4.6 Headings (low-medium)
These have **no H1**:

- the blog index, trip-types, activities and destinations indexes
- About, Contact, All tours and the Lanzarote guide

Ten pages have 2–5 H1s, and the homepage has 82 H2s.

### 4.7 Weight and speed (medium)
The median HTML page is **533 KB**, with 48 external scripts and 19 stylesheets per page.

Lab test on the homepage (mobile emulation, unthrottled, 2 runs):

| Metric | Result |
|---|---|
| Requests | 110 |
| Transfer size | about 2.0 MB |
| Largest contentful paint (LCP) | 2.2–3.0 s |

The La Graciosa tour page was slower:

| Metric | Result |
|---|---|
| Requests | 123 |
| Transfer size | 2.4 MB |
| LCP | 4.3–4.6 s |

On a cache miss, `/es/` took **11.1 s** to the first byte (and 13 s with curl). Spanish visitors and crawlers hitting a cold cache wait a long time.

These are lab figures from this agent's network, not Google field data (CrUX). They show direction, not the score Google uses.

### 4.8 Other (low)

- **Security headers:** none are sent (no HSTS, X-Content-Type-Options, Referrer-Policy or CSP). This is low SEO impact, but a trust and security hygiene item.
  - **Not changed.** It needs authorisation and testing on the server.
- **Image alt text:** 1,753 image tags across the crawl have no alt text, about 4% of 45,139 (counted with repeated template images).
- **No llms.txt:** `/llms.txt` returns 404 (optional, low priority).
- **Utility pages in the sitemap:** the wishlist, e-ticket form and partner pages are listed in the sitemap and are crawlable.
- **Data issues seen during import** (previously reported):
  - two trips have no price
  - a duplicate "No transfer" package exists on La Graciosa
  - the sea-trekkin video URL is broken
  - the jet ski price differs between the site (€70) and a Short (€60)

## 5. Tracking currently installed (visible in HTML)
These are installed on the site:

- **Google Tag Manager** `GTM-KCNK6ZPH`. Its contents are unknown without access.
- **CookieYes** consent banner.
- **Crisp** chat.
- **WhatsApp** links.

No direct GA4 tag and no Meta pixel are hard-coded. These may live inside GTM.

## 6. Baseline numbers to measure against later

| Metric | Baseline 25 Oct 2026 | Source |
|---|---|---|
| Indexable URLs in sitemap | 435 (433 × 200) | Crawl |
| Pages with hreflang | 0 | Crawl |
| Pages missing meta description | 174 | Crawl |
| Duplicate titles / descriptions | 20 / 65 | Crawl |
| Median HTML size | 533 KB | Crawl |
| Homepage lab LCP / transfer | 2.2–3.0 s / 2.0 MB | Lab |
| Tour page (La Graciosa) lab LCP / transfer | 4.3–4.6 s / 2.4 MB | Lab |
| Google rating across 10 offices (public) | Average 4.7 | Maps, public |
| Rankings, clicks, impressions | **Unknown: needs Search Console** | — |
| Sessions, conversions, chatgpt.com referrals | **Unknown: needs GA4** | — |
| AI citations | **Not yet tested** | — |

## 7. What I need from you (only things that can't be verified publicly)

1. **Search Console:** add the person running this project as a user (restricted access is enough), or export the last 16 months of *Performance → Queries/Pages*. This gives real rankings and the baseline.
2. **GA4:** grant read access, or say which property is in GTM-KCNK6ZPH.
3. **AI-search tests:** run the 5 prompts I will give in Stage C in ChatGPT, Perplexity and Google, and paste screenshots. I can't access those tools, so I won't report results I haven't seen.
4. **A paid SEO tool:** optional, for backlinks and search volumes. Without one, those columns stay "not measured".
