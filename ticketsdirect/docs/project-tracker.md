# Project tracker

Statuses: **not started** · **in progress** · **blocked** (what's missing) · **implemented** (in dev, not live) · **verified** (measured on live).
Nothing below is live on excursionsticketsdirect.com yet. All rebuild work runs on the development branch, and production changes need owner approval.

| # | Phase / task | Status | Evidence / blocker |
|---|---|---|---|
| A1 | Access & evidence inventory | implemented | `audit/01-stage-a-findings.md` §1 |
| A2 | Full crawl of 435 sitemap URLs | implemented | `audit/baseline-crawl-2026-10-25.csv` |
| A3 | Technical/on-page audit | implemented | Findings §4 |
| A4 | Crawler access (Googlebot, Bingbot, OAI-SearchBot, GPTBot, ChatGPT-User, PerplexityBot, ClaudeBot) | in progress | User-agent test passes. Real-IP confirmation **blocked**: needs server logs |
| A5 | Performance baseline | in progress | Lab done. Field data (CrUX/PSI) **blocked**: API quota |
| A6 | Traffic / ranking baseline | in progress | Search Console exported (16 months, git-ignored, summary given to owner in chat). GA4 **blocked**: enable *Google Analytics Data API* in Cloud project sunny-idiom-407419 |
| B1 | Competitor matrix (direct, local, OTAs, Maps) | implemented | `audit/02-stage-b-competitors-and-questions.md` §1–4. GYG/Viator **blocked** (403); lanzarote.com, Lanzarote Information, Tripadvisor not allowed by network |
| B2 | 20+ buying questions, classified | implemented | 27 questions, §5. Search volumes **blocked**: need Search Console or paid tool |
| C1 | AI-search tests (5 prompts × ChatGPT, Perplexity, Google AI) | in progress | ChatGPT prompts 2–5 and Google prompts 1, 2, 3, 5 recorded (`audit/03-stage-c-ai-visibility.md`). Perplexity, ChatGPT prompt 1 and Google prompt 4 still to run |
| C2 | Local pack / GBP audit (11 profiles) | implemented | `google-business-profiles.md` §7 (public data) |
| C3 | Citations & backlink audit | blocked | Needs a paid tool for backlinks |
| D1 | Prioritised action list | not started | After B/C |
| E1 | Architecture, content and technical plan | in progress | Rebuild already structured; plan doc pending |
| E2 | Analytics plan (incl. chatgpt.com referral segment) | not started | |
| E3 | Booking architecture evaluation | implemented | `audit/04-booking-architecture.md`. Recommends launch with request-and-confirm (Stripe deposit, no faked availability), settle supplier API question with First Minute/Lineas Romero, own-brand tours on Rezdy/Bokun with Viator+GYG channel manager |
| E4 | Add German, Italian, French (owner request 2026-11-02) | not started | Owner (2026-11-06): staff speak DE/IT/FR and will review; **checkout must be in the customer's language** |
| B3 | GetYourGuide / Viator analysis | blocked | Needs Viator Partner API key and/or owner's supplier accounts, or a browser on the owner's computer |
| F1 | Rebuild in dev (static EN/ES, schema, hreflang, PWA, agent) | implemented | `ticketsdirect/`, preview artifact |
| F2 | Booking/payment integration | not started | Owner chose checkout in the new site (all 5 languages). Blocked on: which system holds the booking of record (WP Travel Engine and/or BookingMyTour), Stripe keys, and a test plan before production |
| F3 | Meeting / collection points | blocked | Data is in BookingMyTour behind a login; waiting for an export (Excel/CSV/PDF) or screenshots |
| F4 | Blog posts imported (13 EN + ES) | implemented | `npm run import:posts` → `src/data/posts.json`, built at their original URLs with BlogPosting + FAQ data; old misspelt variants 301 to the posts. Embedded WP tour cards replaced by live tour cards. Merging the overlapping posts (jet ski ×2, La Graciosa ×3, buggies ×3) is a later content decision for the owner |
| F5 | Legal pages (privacy, cookies, terms, legal notice, cancellation; EN/ES) | not started | **Required**: WordPress will be removed, so these must live on the new site |
| G1 | Migration redirect map | implemented | `npm run build && npm run redirects`: all 682 old paths covered (276 exist, 246 exact 301s in `vercel.json`, `/wp-content/*` wildcard to the booking subdomain). Review list: `docs/migration/redirect-map.csv`. Re-run after importing blog/legal pages, so their temporary redirects drop out |
| G2 | Launch checklist & rollback plan | not started | |
| G3 | Production approval | not started | |
| S1 | Repository is public: move `ticketsdirect/` to a private repo before any private data or booking code lands | not started | Owner decision |
| H1 | Monthly monitoring workflow | not started | |

## Live-site fixes the owner can make now in WordPress (no rebuild needed)

| Fix | Where | Status |
|---|---|---|
| YouTube `sameAs` → `@experiencelanzarote` (current link 404s) | Yoast → Settings → Site representation | not started |
| Organization name → "Excursions Tickets Direct" | Yoast → Site representation | not started |
| Shorten title template (drop "– Excursions in Lanzarote") | Yoast → Content types / Taxonomies | not started |
| Remove `/formulario-e-ticket/` & utility pages from sitemap | Yoast → page settings → noindex | not started |
| Noindex `tour_language`, `tour_duration`, `difficulty` archives. **Not `location`**: Search Console shows those pages earn clicks, so they get 301 redirects to the resort pages at migration instead | Yoast → Taxonomies | not started |
| Price missing on 2 trips; duplicate La Graciosa package; jet ski €60/€70 | WP Travel Engine | not started |
| Rename 20 tour FAQs titled "faq" / "general faq" | WP Travel Engine | not started |
| Check Highlights child price (€63 vs €59 at OK Lanzarote) | WP Travel Engine | not started |
| C. Bajamar 26 profile confirmed as ours; added as office 11 | Website data | implemented |
| Report Excursions Lanzarote PdC listing as permanently closed (only if verified) | Google Maps → Suggest an edit | not started |
| Rename "Excursions Tickets Direct Puerto del Carmen Beach" to brand-first | Google Business Profile | not started |

## Owner decisions (2026-11-06)

- No price matching. "Lowest price guarantee" removed from the site, the assistant and imported posts.
- Offers vary: some boat trips sometimes give 1 adult the child price per 4 people; water parks sometimes 2 adults + 1 child free or free drinks with entry. Group discounts and private charters for events on request. A 5% discount code exists (the code itself is not published).
- Katfish Premium and Chillout Cruise stay "price on request". Highlights tour keeps its current price.

## Owner decisions (2026-11-07)

- **Checkout is built into the new website** (option B), in the customer's language (EN/ES/DE/IT/FR).
- The 5% discount code is shown on the site **only while it is active**.
- Tickets Direct is connected to **First Minute** and **Líneas Romero**: ask both for a link or mention.
- Pickup points and times are kept in **BookingMyTour** (bookingmytour.net, allowed in the environment 2026-11-07). The data sits behind a login with reCAPTCHA, so it needs an export from the owner or a decision on API access.

## Owner decision (2026-11-07): WordPress is removed after launch

Everything that currently relies on WordPress needs a replacement before WordPress is switched off:

| Today in WordPress | Needed instead |
|---|---|
| Tour content, prices, packages (WP Travel Engine) → `npm run import` | A new source of truth for tours, editable by staff (booking platform's product data, or content files / a small admin) |
| Availability and booked seats (`/api/availability` reads WP) | Availability from the booking system of record |
| Checkout + Stripe (wte-stripe), e-tickets, booking emails | New checkout in the site (decided), Stripe direct |
| ETD admin app (staff manage, email, cancel bookings) | Staff tool in the booking system of record |
| Affiliates (affiliate accounts, registration pages) | Decide: keep, replace or end |
| Legal pages (privacy, cookies, terms, legal notice, cancellation) | Copy to the new site (F5 becomes required) |
| Images under `/wp-content/` (blog images, ~160 URLs in Google) | Download into the site; the redirect map stops pointing at the booking subdomain |

The **booking system of record** is the open decision: BookingMyTour (owner to confirm what it does; no public API found), a platform such as Bókun or FareHarbor, or a custom build (database + admin + Stripe).

## Handover (2026-11-05)

Where the project stands, for the next session:

1. **Run first:** `cd ticketsdirect && NODE_USE_ENV_PROXY=1 npm run google`. The owner added `GOOGLE_SA_PRIVATE_KEY` to the Default environment (key rotated after the old one, `7ea64e33…`, was exposed in a screenshot). Output goes to the git-ignored `.cache/google/`. **Never commit it: the repository is public.** Summarise the results in chat, then write only non-sensitive conclusions to `audit/`.
   - If GA4 reports fail with a permission error, the owner still has to add `seo-reader@sunny-idiom-407419.iam.gserviceaccount.com` as Viewer on property 380597293.
2. **Then:** Stage C (search, local and AI visibility; give the owner the 5-prompt AI test), then D (prioritised actions).
3. **Access in the environment:** `WP_URL`, `WP_USER`, `WP_APP_PASSWORD` (WordPress administrator). Read-only use only; production changes need the owner's approval each time.
4. **Waiting on the owner:**
   - translation reviewers for DE/IT/FR, and whether DE/IT/FR visitors may use the English checkout at first
   - yes/no on a price-match promise (the rebuild currently says "Lowest price guarantee": remove it if no)
   - group/family discounts
   - pickup points
   - whether they already sell on GetYourGuide/Viator/Civitatis
   - a private repository to move `ticketsdirect/` into
