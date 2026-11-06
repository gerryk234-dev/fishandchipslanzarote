# Stage D: prioritised action plan

Written 7 November 2026, from the Stage A–C findings (Search Console, competitors, Google Maps, ChatGPT and Google AI tests, and the profile audit). Ordered by impact for the effort. Impact and effort are judgement calls, not measured.

## The three levers that matter most

1. **Google Business Profiles.** Both ChatGPT and Google already put your offices first for "where to book in my resort". Every fix to the profiles (names, categories, website links, hours, reviews) feeds Maps *and* AI answers at once. This is your biggest edge and the fastest to act on — no rebuild needed.
2. **Pages that answer "which tour, what price, what pickup".** You rank ~10th for the big searches because Google sends everything to your homepage, and you're invisible in AI tour answers because your pages don't state price + pickup clearly. The new site fixes the structure; it needs the pickup facts to finish the job.
3. **Launch the new site cleanly.** Faster pages, language tags, resort and category pages, and the blog kept at the same URLs. The redirect map and content imports are done; the remaining blockers are booking and go-live.

## A. Do now — live site, owner, no rebuild (high impact, low effort)

| # | Action | Where | Impact |
|---|---|---|---|
| A1 | Fix Google profile **names** to brand-first ("Tickets Direct Excursions …"), esp. the Puerto del Carmen Beach one | business.google.com | High |
| A2 | Set **one primary category** per profile: Tour agency, except the boat-trip profiles keep Boat tour agency | business.google.com | High |
| A3 | Point each profile's **website** link to its resort page (not the http homepage) | business.google.com | Medium |
| A4 | Fix **hours** on the 5 profiles that don't show 09:30–18:00 | business.google.com | Medium |
| A5 | Start the **review routine**: ask every customer for a Google review (kit in `google-business-profiles.md`), reply to all | offices + WhatsApp | High, compounding |
| A6 | Fix Yoast: business name "Excursions Tickets Direct", YouTube link to @experiencelanzarote | WordPress Yoast | Medium |
| A7 | If Excursions Lanzarote's Puerto del Carmen office is really closed, report it on Maps | Google Maps | Medium (clears your main PdC rival) |

## B. Before launch — development (blockers)

| # | Action | Status |
|---|---|---|
| B1 | Redirect map for all 682 old URLs | **Done** |
| B2 | Import blog posts + legal pages at their URLs, host their images | **Done** |
| B3 | **Pickup points + times** on tour pages | Blocked: needs the data (screenshots from BookingMyTour) |
| B4 | **Booking: request-and-confirm + Stripe deposit** in 5 languages | Blocked: needs Stripe keys, confirmation rules, operator-per-tour |
| B5 | **German, Italian, French** versions | Not started: needs the build extended + staff review |
| B6 | Replace WordPress's remaining jobs (tour data, staff admin) | Depends on booking decision |
| B7 | Launch checklist + rollback + test domain | Not started |

## C. After launch — growth (ongoing)

| # | Action | Impact |
|---|---|---|
| C1 | Get a link/mention from **First Minute** and **Líneas Romero** (you're connected). ChatGPT already recommends Líneas Romero for La Graciosa; a link ties you to that answer | High, hard to get elsewhere |
| C2 | Build content that answers the questions you lose on: La Graciosa (ferry vs catamaran), Timanfaya (tour vs self-drive), prices, windy-day, cruise-port. Several guides already drafted | High |
| C3 | Local links: hotels, villa rentals, La Voz de Lanzarote, expat/Reddit communities (Reddit already ranks for La Graciosa) | Medium |
| C4 | List tours on **Viator / GetYourGuide** as sales channels while rankings grow | Medium |
| C5 | Merge the overlapping blog posts (jet ski ×2, La Graciosa ×3, buggies ×3) so they stop competing | Medium |
| C6 | Monthly: re-run the 5 AI prompts + Search Console, track position and clicks vs this baseline | Measurement |

## What unblocks the most, fastest

- **From the owner, now:** the Google-profile fixes (A1–A7) and the review routine — biggest effect, no waiting on the build.
- **For the build:** pickup data (B3) and the booking decisions + Stripe (B4). These two unblock the launch.
- **Everything else** (German/Italian/French, growth) follows the launch.
