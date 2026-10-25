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
| A6 | Traffic / ranking baseline | blocked | Needs Search Console and GA4 access |
| B1 | Competitor matrix (direct, local, OTAs, Maps) | not started | GYG and Viator block crawling, so public snippets only |
| B2 | 20+ buying questions, classified | not started | |
| C1 | AI-search tests (5 prompts × ChatGPT, Perplexity, Google AI) | blocked | Agent has no access. Owner runs the protocol |
| C2 | Local pack / GBP audit (11 profiles) | implemented | `google-business-profiles.md` §7 (public data) |
| C3 | Citations & backlink audit | blocked | Needs a paid tool for backlinks |
| D1 | Prioritised action list | not started | After B/C |
| E1 | Architecture, content and technical plan | in progress | Rebuild already structured; plan doc pending |
| E2 | Analytics plan (incl. chatgpt.com referral segment) | not started | |
| E3 | Booking architecture evaluation (WTE vs FareHarbor vs multi-supplier) | not started | |
| F1 | Rebuild in dev (static EN/ES, schema, hreflang, PWA, agent) | implemented | `ticketsdirect/`, preview artifact |
| F2 | Booking/payment integration | blocked | Needs WP Application Password and Stripe keys in Vercel env |
| F3 | Meeting / collection points | blocked | Waiting for points data (`src/data/pickups.json`) |
| F4 | Blog posts imported (13 EN + ES) | not started | Required before launch, or old URLs 404 |
| G1 | Migration redirect map (435 URLs) | not started | Crawl CSV is the source list |
| G2 | Launch checklist & rollback plan | not started | |
| G3 | Production approval | not started | |
| H1 | Monthly monitoring workflow | not started | |

## Live-site fixes the owner can make now in WordPress (no rebuild needed)

| Fix | Where | Status |
|---|---|---|
| YouTube `sameAs` → `@experiencelanzarote` (current link 404s) | Yoast → Settings → Site representation | not started |
| Organization name → "Excursions Tickets Direct" | Yoast → Site representation | not started |
| Shorten title template (drop "– Excursions in Lanzarote") | Yoast → Content types / Taxonomies | not started |
| Remove `/formulario-e-ticket/` & utility pages from sitemap | Yoast → page settings → noindex | not started |
| Noindex `location`, `tour_language`, `tour_duration`, `difficulty` archives | Yoast → Taxonomies | not started |
| Price missing on 2 trips; duplicate La Graciosa package; jet ski €60/€70 | WP Travel Engine | not started |
