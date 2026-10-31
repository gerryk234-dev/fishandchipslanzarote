# Canary Kebab & Snack Bar — Website Build Brief

Prepared 31 Oct 2026. The goal is a site for Canary Kebab & Snack Bar (Costa Teguise, Lanzarote) built the same way as the Hippie Chippy site in this repo.

> **Read first: how this was gathered.** The three links supplied (two `share.google` Google Business links and the Facebook share link) **could not be opened**. This session's network blocks Google share links, Facebook, Instagram, TripAdvisor, RestaurantGuru, Wanderlog and the restaurant's own menu site. Everything below comes from search-engine summaries of those pages. **No photos or videos could be downloaded**, so they must come from the owner (see §6). Each fact is tagged:
> - ✅ = seen in more than one source
> - ⚠️ = one source only, or sources disagree. Confirm with the owner.

---

## 1. Business facts

| Field | Value | Status |
|---|---|---|
| Trading name | **Canary Kebab & Snack Bar** (Google title: "Canary Kebab \| Kebab, Pizza & Indian Food in Costa Teguise") | ✅ |
| Location 1 (main) | Avenida Islas Canarias 3, C.C. Calypso, Local 12, 35508 Costa Teguise, Lanzarote | ✅ |
| Location 2 ("Canary Kebab & Snack Bar 2") | Av. del Jablillo 47, C.C. Teguise Playa, 35508 Costa Teguise | ⚠️ Is it still open? Same owner? |
| Phone | +34 928 33 35 30 | ✅ (TripAdvisor + Facebook) |
| Alt. phone | +34 631 89 93 87 (one directory, for location 2) | ⚠️ Mobile/WhatsApp? Needed for `wa.me/` order links |
| Email | canarykebab1@gmail.com | ⚠️ (Facebook) |
| Facebook | https://www.facebook.com/canarykebab/ | ✅ |
| Instagram | https://www.instagram.com/canarykebab/ (@canarykebab) | ✅ |
| Existing menu site | https://canary-kebab.123restaurant.es/ (menu at `/carta.html`) | ✅ exists, content not fetched |
| Services | Eat-in, takeaway, delivery | ✅ (Instagram bio) |
| Hours | Open late: about 12:00–02:00 (one TripAdvisor listing); location 2 until about 03:30 | ⚠️ Full weekly hours needed |
| Price level | € (budget). One review: kebab, chips, garlic bread and 2 drinks for just over €20 | ✅ |
| Cuisine tags | Kebab/Turkish, Pizza, Indian, Burgers, Fast food, American | ✅ |

**Ratings (for the reviews section and JSON-LD `aggregateRating`, confirm before publishing):**
- Google: **4.5 ★ from about 266 reviews** ⚠️
- TripAdvisor (location 1): **4.6 ★ from 34 reviews** ✅
- TripAdvisor (location 2): 4.7 ★ from 3 reviews ⚠️

## 2. Menu: what we know

The Instagram bio groups the menu as: **Kebab & Durum · Burger & Pizza · Snack & More**.

Dishes mentioned in reviews and listings:
- Doner kebab, chicken kebab wrap / durum, chicken shawarma
- Pizzas, including veggie pizza
- Indian: chicken tikka kebab, tandoori chicken, samosas
- Burgers
- Sides: chips, garlic bread

**No prices were found.** Aggregator prices that turn up in search belong to *Canaries Pizza & Kebab, Norwich (UK)*, a different business, so do not use them.

➡️ **Needed from the owner:** the full menu with prices, in EN and ES if they have both, as a PDF or a clear photo of the menu board. Also list allergens and say which dishes are vegetarian, halal or spicy.

Suggested `data-cat` filter tabs to match the Hippie Chippy `filterMenu()` pattern:
`kebab` (doner, durum, shawarma, kebab plates) · `pizza` · `indian` (tikka, tandoori, samosa, curries) · `burgers` · `sides` (chips, garlic bread, snacks, drinks).

## 3. Review highlights (paraphrased; get the exact text from Google or TripAdvisor before quoting)

- Kebab wraps, tandoori chicken and samosas get frequent praise. Prices are called "reasonable" or "very reasonable".
- It is a go-to late-night spot for a kebab or pizza after a night out.
- One reviewer singled out the late-night pizza, another the chicken shawarma.
- Criticism: it can be slow when only one staff member is on (about 30 minutes at a busy time). The site should push **ordering ahead by phone/WhatsApp**.

## 4. Positioning / copy angles

- **"Kebab, Pizza & Indian, open late in Costa Teguise."** It is unusual to get all three under one roof.
- Open until 2am or later. Make **late-night** the hero message, since Hippie Chippy's daytime hours are its main contrast.
- Location 1 is in the C.C. Calypso. Location 2 (if still open) is near the Teguise Playa / Jablillo strip, the tourist beachfront.
- Takeaway, delivery and eat-in. Order ahead by phone or WhatsApp.
- Blog / SEO topic ideas (the `const blogs = [...]` array): "Best late-night food in Costa Teguise", "Doner vs durum vs shawarma: what's the difference?", "Tandoori and tikka: Indian food at Canary Kebab", "Where to eat after a night out in Costa Teguise", "Veggie options in Costa Teguise".
- SEO keywords: kebab Costa Teguise, pizza Costa Teguise, Indian takeaway Costa Teguise, late night food Lanzarote, durum Lanzarote, comida a domicilio Costa Teguise, kebab abierto tarde Lanzarote.

## 5. Site structure (mirrors Hippie Chippy)

The Hippie Chippy site is six self-contained HTML pages with inline CSS/JS, bilingual EN/ES (`data-lang` + `setLang()` + `localStorage`), and Restaurant JSON-LD in every `<head>`. Plan:

| Page | Hippie Chippy equivalent | Canary Kebab content |
|---|---|---|
| `index.html` | hero video slideshow, about, menu, gallery, reviews, reels, blog, order, find-us | Hero: grill / pizza oven / late-night videos. Sections: about, menu with tabs, gallery, reviews, Instagram, blog, order (phone/WhatsApp/delivery), find us (both locations + map) |
| `menu.html` | full menu + PDF download | Full menu with filters + `CanaryKebab-Menu.pdf` |
| `about.html` | story | Owner story, the kebab + pizza + Indian mix, team |
| `blog.html` | articles | Blog topics from §4 |
| `contact.html` | contact, hours, map | Both addresses, phone, WhatsApp, email, hours, Google Maps embeds |
| `reels.html` | videos | Instagram / TikTok reels |

New brand tokens needed (replace `--cream/--sea/--gold…`). Suggested starting point until a logo is supplied: deep charcoal `--ink`, flame red/orange `--rust`, turmeric `--gold`, Canary yellow/blue accents. **Final colours should be taken from the logo.**

JSON-LD: use `@type: ["Restaurant","FastFoodRestaurant"]`, `servesCuisine: ["Turkish","Kebab","Pizza","Indian"]`, `priceRange: "€"`, and one `location` / `department` per branch if both are open.

## 6. Assets: owner checklist (none could be downloaded)

Photos and videos on Google Maps, Facebook and Instagram are owned by the business or by the customers who posted them. Customer photos on Google/TripAdvisor **should not be reused** without permission. Ask the owner for originals (WhatsApp or Google Drive is fine):

**Branding**
- [ ] Logo (PNG/SVG, high-res, transparent if possible)
- [ ] Brand colours / existing signage photo

**Photos → `canary-kebab/images/`** (minimum about 20; landscape, ≥1600px wide)
- [ ] Shopfront / signage, day and night (both locations)
- [ ] Interior / counter / seating
- [ ] Doner on the spit; durum / wrap close-up; kebab plate
- [ ] 3–4 pizzas, including veggie
- [ ] Tandoori chicken, chicken tikka, samosas, any curries
- [ ] Burgers, chips, garlic bread
- [ ] Staff / owner portrait (for About)
- [ ] Menu board

**Videos → `canary-kebab/videos/`** (4 clips of 5–15s for the hero slideshow, landscape 1080p, no audio needed)
- [ ] Doner being carved
- [ ] Pizza going into / coming out of the oven
- [ ] Tandoori / grill flames
- [ ] Night-time shopfront with lights / customers
- [ ] Any existing Instagram reels (originals, for `reels.html`)

**Info to confirm**
- [ ] Full menu + prices (EN/ES)
- [ ] Opening hours per day, per location
- [ ] Is location 2 (Av. del Jablillo 47) open? Same phone?
- [ ] WhatsApp number for orders
- [ ] Delivery: own drivers or Just Eat / Glovo / Uber Eats? Links? Delivery area and minimum order?
- [ ] Domain name wanted (e.g. canarykebab.com / canarykebab.es)
- [ ] Halal? Vegetarian/vegan options? Allergen info
- [ ] Short owner story (how long open, where the recipes come from)
- [ ] Permission to quote Google reviews by first name

## 7. Sources

- Facebook: https://www.facebook.com/canarykebab/
- Instagram: https://www.instagram.com/canarykebab/
- Menu site: https://canary-kebab.123restaurant.es/
- TripAdvisor (loc. 1): https://www.tripadvisor.com/Restaurant_Review-g659633-d26366078-Reviews-Canary_Kebab_Snack_Bar_Costa_Teguise-Costa_Teguise_Lanzarote_Canary_Islands.html
- TripAdvisor (loc. 2): https://www.tripadvisor.com/Restaurant_Review-g659633-d27496543-Reviews-Canary_Kebab_Snack_Bar-Costa_Teguise_Lanzarote_Canary_Islands.html
- RestaurantGuru menu: https://restaurantguru.com/Canary-Kebab-and-Snack-Bar-Costa-Teguise/menu
- Gastroranking: https://gastroranking.es/r/canary-kebab-snack-bar_230574/
- Wanderlog: https://wanderlog.com/place/details/9657159/canary-kebab--snack-bar
- Taste the Canaries: https://tastethecanaries.com/restaurants/spain/lanzarote-1/costa-teguise/canary-kebab-snack-bar-2/
- top-rated.online: https://www.top-rated.online/cities/Costa+Teguise/place/p/12750528/Canary+Kebab+&+Snack+Bar
