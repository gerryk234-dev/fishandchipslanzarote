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
| C1 | AI-search tests (5 prompts × ChatGPT, Perplexity, Google AI) | blocked | Agent has no access. Owner runs the protocol |
| C2 | Local pack / GBP audit (11 profiles) | implemented | `google-business-profiles.md` §7 (public data) |
| C3 | Citations & backlink audit | blocked | Needs a paid tool for backlinks |
| D1 | Prioritised action list | not started | After B/C |
| E1 | Architecture, content and technical plan | in progress | Rebuild already structured; plan doc pending |
| E2 | Analytics plan (incl. chatgpt.com referral segment) | not started | |
| E3 | Booking architecture evaluation (WTE vs FareHarbor vs multi-supplier) | not started | |
| E4 | Add German, Italian, French (owner request 2026-11-02) | not started | Needs reviewers per language and a decision on checkout language |
| B3 | GetYourGuide / Viator analysis | blocked | Needs Viator Partner API key and/or owner's supplier accounts, or a browser on the owner's computer |
| F1 | Rebuild in dev (static EN/ES, schema, hreflang, PWA, agent) | implemented | `ticketsdirect/`, preview artifact |
| F2 | Booking/payment integration | blocked | Needs WP Application Password and Stripe keys in Vercel env |
| F3 | Meeting / collection points | blocked | Waiting for points data (`src/data/pickups.json`) |
| F4 | Blog posts imported (13 EN + ES) | not started | Required before launch, or old URLs 404 |
| G1 | Migration redirect map | in progress | Search Console lists 719 URLs with impressions; 405 are not in the rebuild and need a 301 or a page. Also carry over the live site's existing 301s (e.g. `/trip/jetski-safari/`). Unpriced tours (Katfish, Chillout) now kept as price-on-request pages |
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
