# Stage B: competitors and customer buying questions

Checked on 1 November 2026. Every figure below was read from the competitor's own public page or from a Google Maps results list, unless it is labelled otherwise.

- **Raw evidence:** the scripts and outputs are in the agent's working folder.
- **Not used:**
  - traffic, backlink and keyword-volume estimates (they need a paid tool)
  - GetYourGuide and Viator page data: both answer automated requests with HTTP 403
- **Not reachable from this environment:** lanzarote.com, lanzaroteinformation.co.uk, Tripadvisor and travelon.world. The network allowlist refuses them, so they are not measured here.

## 1. Competitor matrix

| | **Tickets Direct** | **OK Lanzarote** | **Excursions Lanzarote (TravelOn)** | **Civitatis** |
|---|---|---|---|---|
| Type | Local agency, 10 staffed offices | Local online agency / reseller | Local agency + app, part of TravelOn (other Canary Islands) | Global marketplace |
| Platform | WordPress + WP Travel Engine | WordPress + WooCommerce (77 products, 121 pages) | Joomla | Custom |
| Languages | EN, ES | EN, ES, **DE** | EN | 9+ |
| hreflang | **None** | Yes (6–7 per page) | None | Yes (8–9 per page) |
| Tour/category page HTML | 534–608 KB | 66–111 KB | 81–197 KB | 358–705 KB |
| External scripts per page | 45–95 | 16–18 | **0** | 25–26 |
| Ratings shown to Google (schema) | 4 tours only, each from 1 on-site review | On every category page, e.g. Timanfaya **4.65 / 1,168**, jet ski 4.75 / 119, buggies 4.70 / 85, La Graciosa 4.57 / 82, Lobos 4.4 / 61 | On every tour page, e.g. Grand Tour 4.8 / 89, buggy 4.9 / 23, La Graciosa 4.6 / 22 | La Graciosa **9.1/10 from 2,332**, complete Lanzarote tour 8.2/10 from 2,971 |
| Cancellation (as stated on page) | Free up to 24 h | Free up to 24 h (jet ski 72 h) | Deposit non-refundable | Free cancellation |
| Payment | 35% deposit online, balance later | Not checked | Deposit (stated non-refundable) | Not checked |
| Price promise | None | "Best price guarantee, no hidden fees, extra gift upon booking" | "Price Match Promise – find it cheaper, we'll match" | — |
| App | No (the rebuild adds an installable app) | No | Yes: Google Play + App Store | Yes |
| Physical offices | **11 across 3 resorts** + charter profile | None mentioned in page text | 1 Maps profile in Puerto del Carmen, still shown as open, but the owner reports it has shut | None |
| Titles | Long (median 75 characters) and generic suffix | Short, with the year: "Top Timanfaya National Park Tours in 2026" | Short: "Lanzarote buggy tour \| Excursions Lanzarote" | Short |

Review counts are what each competitor publishes about itself. Where those reviews come from was not verified.

## 2. Prices for the same tours

| Tour | Tickets Direct | OK Lanzarote | Excursions Lanzarote |
|---|---|---|---|
| Lanzarote Grand Tour (adult / child) | €87 / €55 | €87 / €55 | €87 |
| Timanfaya volcano full day | €65 / €49 | €65 / €49 | — |
| Lanzarote's Highlights | €99 / **€63** | €99 / **€59** | — |
| La Graciosa catamaran (adult) | €64 without transfer, €74 with transfer | €67 (transfer terms not checked) | €74 |
| Buggy, Maverick 3 h (per vehicle) | €170 | — | €170 |

Civitatis served prices in US dollars to this environment (the currency follows the visitor's location), so they are not compared in euros here.

**Finding:** the local agencies sell the same supplier tours at the same prices. Nobody wins on price, so customers choose on trust, convenience and reassurance. The competitors make that choice easier with:

- visible review counts
- a price promise
- free cancellation
- an app
- German

The one price difference found is the Highlights child ticket: €63 here vs €59 at OK Lanzarote. Please check it.

## 3. Google Maps snapshot

Method: one run per search on 1 November 2026, with the browser location set to the resort. Maps results change with the searcher's position and history, so treat this as a snapshot, not a rank tracker. Local Falcon (already installed, needs connecting) would measure it properly across a grid.

| Search | Tickets Direct position(s) | Profiles above you |
|---|---|---|
| excursions Playa Blanca Lanzarote | **#1** (Playa Blanca Port 4.8), #3 (Playa Dorada 4.4) | Chill Out Cruise 4.6 |
| tour agency Playa Blanca | **#1** (Port), #5 (Playa Dorada) | — |
| excursions Puerto del Carmen | #4 (PdC Beach 5.0), #6 ("Tickets Direct Excursions Lanzarote Puerto del Carmen", 4.9) | Excursions Lanzarote 4.2, Waverider RIB 4.8, Lanzarote Sea Tours 3.7 |
| boat trips Puerto del Carmen | **Not in top 6** | Lanzarote Sea Tours, Rent A Boat, Waverider, Excursions Lanzarote, Lineas Romero, Catlanza |
| excursions Costa Teguise | #4 (Center 4.7), #6 (Playa Bastián 4.5), #7 (Cucharas 4.5) | H2O Buggy 4.7, LowCostTours.net 4.8, H2O 3.2 |
| excursiones Costa Teguise | #3 (Center), #5 (Cucharas) | LowCostTours.net, H2O Buggy |

Findings for the Google profiles:

1. **C. Bajamar 26 profile: confirmed yours** (owner, 2 November 2026). Added to the site as the 11th office. It is a *Boat tour agency* profile rated 4.9.
1. **Excursions Lanzarote's Puerto del Carmen office** ranks #1 for "excursions Puerto del Carmen" and still shows as open ("Open 24 hours", UK phone number). The owner reports it has shut down. If that's right, anyone can report it on Maps: *Suggest an edit → Close or remove → Permanently closed*. Google checks before changing it, and the report should only be made if it's true. Your Puerto del Carmen Beach office is next door.
2. **Name inconsistent.** "**Excursions Tickets** Direct Puerto del Carmen Beach" is the only profile that doesn't start "Tickets Direct Excursions…".
3. **Puerto del Carmen is the weakest resort.** You have 4 offices there, but they rank below 1–3 single-office competitors, and none appears for "boat trips". Primary categories there are mixed (Travel agency, Tourist information center, Tour agency). A "Boat tour agency" category plus boat-trip posts and photos is the clearest lever.
4. **Playa Blanca is your strongest resort.** Use it as the template: consistent name, boat-tour category, high rating.

## 4. What makes them win, and what to take from each

| Competitor | Verified advantage | Do we adopt it? |
|---|---|---|
| OK Lanzarote | German version with hreflang | **Yes, phase 2.** Of the local agencies checked, only OK has German. Needs translated content, not machine filler |
| OK Lanzarote | Rating + review count on every category page | **Only with real reviews.** Collect reviews per tour after each trip and mark them up on the tour (Product) pages. Show each office's Google rating as text. Review stars for the business itself (Organization/LocalBusiness) are not eligible when the business publishes them on its own site |
| OK Lanzarote / Excursions Lanzarote | Price promise | **Owner decision.** Only if you will honour it in the offices |
| OK Lanzarote | Short titles with the year | Yes: already in the rebuild's title format; add the year only where the content is refreshed yearly |
| Excursions Lanzarote | No third-party scripts, light pages | Yes: the rebuild uses 1 script |
| Excursions Lanzarote | App in the stores | Rebuild is installable now. Store listing (Play via TWA) is optional later |
| Civitatis | Thousands of reviews | Can't be copied. Answer: steady Google review requests from all 10 offices (kit already written) |
| All | Free cancellation shown on page | You already offer 24 h. Show it next to every Book button (the rebuild does) |

**Your advantages that none of them can copy (verified):**
- 10 staffed offices in all 3 resorts, each with a Google profile rated 4.2–5.0.
- 1,069 tour-specific FAQ answers on your site (pickup, payment, mobility, what to wear). This is original, first-hand information that AI answers can quote.
- 85 tours.

## 5. Customer buying questions (27), classified

Sources: how often each question appears across your own 85 tours' FAQs (questions customers actually ask your staff), competitor FAQ markup, and gaps noted in the earlier teardown.

Stage: **D** = discover, **C** = compare, **B** = decide/book, **L** = logistics, **P** = after booking.

| # | Question | Stage | Intent | Source | Answered on your site today? | Where it belongs |
|---|---|---|---|---|---|---|
| 1 | What are the best excursions in Lanzarote? | D | Commercial | EL, OK FAQ | Blog post (overlapping) | Guide: best excursions |
| 2 | What are the best boat trips in Lanzarote? | D | Commercial | EL FAQ | Blog post (overlapping) | Boat trips hub |
| 3 | Which excursions go from my resort (Costa Teguise / Puerto del Carmen / Playa Blanca)? | D | Local | Teardown, Maps | No | Resort pages (in rebuild) |
| 4 | Should I take an organised Timanfaya tour or drive myself? | C | Informational | OK FAQ | No | Timanfaya guide |
| 5 | Is the camel ride included at Timanfaya? | C | Commercial | OK, EL FAQ | Yes, on 5 tours | Tour FAQ + comparison table |
| 6 | Catamaran vs ferry to La Graciosa: which should I choose? | C | Commercial | EL FAQ, your 3 posts | Split over 3 posts | One La Graciosa guide |
| 7 | How long does it take to get to La Graciosa? | C | Informational | EL FAQ | Yes (tour FAQ) | Tour + guide |
| 8 | What food and drinks are included on the catamaran? | C | Commercial | EL FAQ; yours ×12 "are drinks included" | Yes | Tour FAQ |
| 9 | Will we see dolphins or whales? | C | Commercial | EL FAQ; yours ×9 | Yes | Tour FAQ |
| 10 | How much do excursions in Lanzarote cost? | C | Commercial | Teardown | No single page | Price guide (in rebuild) |
| 11 | Where is the best place to book excursions? Online or at an office? | B | Commercial | EL FAQ | No | "Why book with us" + offices page |
| 12 | Is it cheaper to book online or in person? Is there a price match? | B | Transactional | OK, EL promises | No | Owner decision first |
| 13 | Do I need to book in advance? | B | Transactional | EL FAQ; yours ×1 (jet ski) | Only for jet ski | Booking help page |
| 14 | What is the cancellation policy? | B | Transactional | All competitors | Yes (24 h on tour page) | Next to Book button + policy page |
| 15 | What happens if my boat trip is cancelled because of wind? | B | Transactional | Teardown gap | **No** | Weather policy page |
| 16 | How and when do I pay the balance? | B | Transactional | Yours ×42 (3 wordings) | Yes, per tour | One payment page (35% deposit) |
| 17 | Are there group or family discounts? | B | Transactional | EL FAQ | **No** | Owner to confirm |
| 18 | Where and what time will I be picked up? | L | Local | Yours **×48** (most-asked) | Per tour | Meeting-point guide (needs points data) |
| 19 | Do you pick up from villas / Airbnbs? | L | Local | Yours ×42 (3 wordings) | Per tour | Meeting-point guide |
| 20 | How far are the pickup points from my hotel? | L | Local | Yours ×43 (2 wordings) | Per tour | Meeting-point guide with map |
| 21 | What language is the tour in? | L | Informational | Yours ×38 | Yes | Tour facts |
| 22 | Can someone with reduced mobility do this tour? | L | Informational | Yours ×33 | Per tour | Accessibility guide (gap online) |
| 23 | What should I wear and bring? | L | Informational | Yours ×46 | Per tour | Tour FAQ |
| 24 | Is it suitable for children? What is the minimum age? | C | Informational | EL FAQ; yours (67 mention age) | Partly | Tour facts (min age field) |
| 25 | Do I need a licence to drive the buggy or jet ski? | C | Informational | EL FAQ; yours ×2 | Jet ski only | Buggy tour FAQ |
| 26 | How do I visit Lobos? Do I need a permit? | C | Informational | Teardown gap | **No** | Lobos guide |
| 27 | I'm on a cruise ship: will I be back on board in time? | B | Transactional | Teardown gap | **No** | Cruise passengers guide (in rebuild) |

## 6. Data problems found while doing this

- **Placeholder FAQ questions.** 20 of your tour FAQs are titled just "faq" or "general faq". Rename them in WP Travel Engine to the real question.
- **Highlights child price.** €63 here vs €59 at OK Lanzarote (see section 2).

## 7. What still needs access to complete Stage B

| Missing | Why it matters | How to get it |
|---|---|---|
| GetYourGuide and Viator page data | Their ratings and prices on the same tours | Blocked to automated access. Manual screenshots, or Ahrefs/Semrush |
| Keyword volumes per question | Which of the 27 questions are searched most | Search Console (after verification) or a paid tool |
| lanzarote.com, Lanzarote Information, Tripadvisor | Content competitors | Add to the environment's allowed domains |
