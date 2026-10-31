# Canary Kebab & Snack Bar — Website Build Brief

Updated 31 Oct 2026. The goal is a site for Canary Kebab & Snack Bar built the same way as the Hippie Chippy site in this repo.

**Sources read directly:**
- the restaurant's current website, `canary-kebab.123restaurant.es` (your first share link goes there), including its menu data
- the Google Maps listing (limited view)
- Gastroranking
- Wanderlog

**Could not read:**
- Facebook and Instagram: both need a login.
- The Google Search share link: Google showed a robot check.
- TripAdvisor: blocked (403).

| File | What it is |
|---|---|
| `data/MENU.md` | **Full menu with prices, EN + ES**: 71 food items, 112 drinks |
| `data/menu-food.json`, `data/menu-drinks.json` | Same menu as structured data (EN/ES/DE names, descriptions, prices), ready to turn into `.menu-card` markup |
| `data/REVIEWS.md` | Review quotes + rating summary |
| `images/` | Logo, photos and what each one is (see `images/README.md`) |

---

## 1. Business facts (✅ = confirmed on their own website and/or Google Maps)

| Field | Value |
|---|---|
| Name | **Canary Kebab & Snack Bar** ✅ |
| Tagline / SEO title | "Kebab, Pizza & Indian Food in Costa Teguise" ✅ |
| Address | Avda. de las Islas Canarias 3, C.C. Calypso, Local 12, 35508 Costa Teguise, Lanzarote ✅ |
| Plus code / coords | XGX5+58 · 28.9979169, -13.4916666 ✅ |
| Google place ID | `ChIJcQoTwl-dSAwRYCeP9WJATFY` ✅ |
| Phone | **+34 928 33 35 30** ✅ |
| WhatsApp (orders) | **+34 612 22 58 43** → `https://wa.me/34612225843`. Temporary: the same number as Hippie Chippy for now. When it changes, grep the site for `612225843` |
| Email | not on their site. Facebook lists canarykebab1@gmail.com (unconfirmed) |
| Hours | **Every day 13:00–02:00** ✅ (Google: "Closes 2 AM") |
| Services | Eat in, take away, delivery ✅. Accessible entrance ✅ (Google) |
| Price | € (budget). All prices include 7% IGIC ✅ |
| Languages | Current site is EN + ES (DE translations exist but are switched off) |
| Facebook | https://www.facebook.com/canarykebab/ |
| Instagram | https://www.instagram.com/canarykebab/ (not linked from their current site) |
| Google review link | https://search.google.com/local/writereview?placeid=ChIJcQoTwl-dSAwRYCeP9WJATFY |
| Location | About 2 minutes from Playa de las Cucharas, opposite the bus stop on Av. Islas Canarias, near Pueblo Marinero |

**Ratings:**
- Google: **4.5 ★ from 297 reviews** ✅
- TripAdvisor: 4.6 ★ from about 34 reviews (from search results)

**Second branch ✅ (confirmed by owner side):** also in Costa Teguise, at a different location. Listed as "Canary Kebab & Snack Bar 2", **Av. del Jablillo 47, C.C. Teguise Playa, 35508 Costa Teguise** (TripAdvisor: 4.7★, open until about 03:30). Still to confirm: its exact hours and phone, and whether the menu is the same. The site should have a **"Two locations in Costa Teguise"** block (home + contact pages), and the JSON-LD should list both as separate `Restaurant` entries.

## 2. Menu summary (full detail in `data/MENU.md`)

Menu categories with item counts:
- **Food:** Kebabs (10), Indian Tapas (12), Kebab Plates (7), Sandwiches (2), Burgers (4), Snacks & Sides (17), Pizzas (19)
- **Drinks:** Soft drinks, Juices, Beers (23), Ciders, Vodka, Gin, Rum, Brandy, Whisky, Liqueurs (23), Wines, Sangría

Price highlights:
- Wraps/pitas €7.00–9.90
- Kebab plates €6.90–10.00
- Pizzas €7.90–14.90
- Burgers €7.90–9.90
- Samosas €5–6
- Naans €2.90–5.90
- Beer from €1.75

Signature items for the "favourites" section:
- **Canary Chips** (cheesy chips loaded with doner, €6.50)
- **Canary pizza** (kebab meat and red onion, €11)
- **Lanzarote pizza** (bacon, dates and goat cheese, €12.50)
- **Punjabi pizza** 🌶 (chicken tikka, ginger and chillies, €13.90)
- **Punjabi naan**
- **Chicken Tikka Wrap** (€9.90)
- **Surf & Slice** pizza (€14.90)

Suggested `data-cat` tabs, replacing Hippie Chippy's fish/burgers/breakfast/sides/extras: `kebab` (kebabs + plates) · `indian` · `pizza` · `burgers` (burgers + sandwiches) · `sides` · `drinks`.

## 3. What customers say (detail in `data/REVIEWS.md`)

- Fresh, fully loaded kebabs, good portions, **great prices**
- **Authentic Indian** samosas and pakoras ("not British-style")
- Chilli sauce and garlic mayo are mentioned a lot
- Friendly staff and spotlessly clean. Good for eating in or taking away, with a beer or cocktail while you wait
- "Best kebab on the island", from several holidaymakers
- Weak point: a few say service is slow or "not very welcoming" when it's busy. The site should push **phone-ahead ordering**.

## 4. Brand

- **Logo, cleaned up and vectorised: `images/logo/`** (preview: `images/logo/preview.png`):
  - `logo.svg`: full colour, transparent background, with a subtle gradient on the spit. Use it in the nav on light backgrounds.
  - `logo-on-dark.svg`: cream + gold, for dark headers and footers.
  - `logo-mono-white.svg`: all white, for use over photos and video.
  - `logo-flat.svg`: two flat colours, for print or embroidery.
  - `icon.svg` / `icon-on-dark.svg`: the flaming doner on its own.
  - PNG exports: `logo-2400.png`, `logo-on-dark-2400.png`, `logo-mono-white-2400.png`, `icon-1024.png`, `icon-512.png`, `apple-touch-icon.png` (180), `favicon-32.png`, `favicon.ico`.
  - The original is `images/from-website/logo.webp`, plus the faint watermark `logo_fondo.webp`.
- **Colours sampled from the logo** (proposed tokens replacing Hippie Chippy's):
  - `--ink` / primary burgundy **#4F1C23**
  - `--gold` / flame **#DF9E2F**
  - muted mauve **#906F6E**
  - `--cream` / stone **#C0B3A5** · light **#DAD4D1**
  - The shop sign is red and yellow neon, which could serve as an accent.
- **Fonts:** Hippie Chippy uses Fraunces + DM Sans. Something bolder suits a kebab shop better, e.g. *Bebas Neue / Oswald* for headings and *DM Sans* for body text.

## 5. Site structure (mirrors Hippie Chippy)

| Page | Content |
|---|---|
| `index.html` | Hero (shopfront at dusk / food video) · "Kebab, Pizza & Indian, open till 2am" · favourites · menu with tabs · reviews (4.5★ / 297) · gallery · order (call / WhatsApp) · find us (map embed + directions link) |
| `menu.html` | Full food + drinks menu from `data/`, filter tabs, allergen note, "7% IGIC included" |
| `about.html` | Story: kebab + pizza + authentic Indian under one roof, near Playa de las Cucharas |
| `blog.html` | Ideas: "Best late-night food in Costa Teguise", "Doner vs durum vs pita", "What are pakoras & bhajis?", "Pizza with a Lanzarote twist: dates & goat cheese", "Where to eat near Playa de las Cucharas" |
| `contact.html` | Address, phone, hours, Google Maps embed (URL in §7), review links |
| `reels.html` | Instagram reels, once the owner supplies them |

JSON-LD:
- `@type: "Restaurant"`
- `servesCuisine: ["Kebab","Turkish","Pizza","Indian","Fast Food"]`
- `priceRange: "€"`
- `openingHoursSpecification`: Mo–Su 13:00–02:00
- `geo`: the coordinates in §1
- `aggregateRating`: 4.5 / 297
- `hasMenu`: the menu page

Keywords from their current site: kebab Costa Teguise, pizza Costa Teguise, comida india Lanzarote, kebab a domicilio Lanzarote, snack bar Costa Teguise.

## 6. Still needed from the owner

- [ ] **Videos from the Facebook page.** Facebook needs a login, so they can't be fetched automatically. Either upload them to Google Drive (downloaded from the page, or via Meta Business Suite → Content → Download), or send the direct links to individual videos/reels. Needed: 3–4 landscape clips of 5–15s for the hero, plus reels.
- [ ] **Real food photos.** The 7 food photos on their current site are generic stock-style images at 800px. Real photos of their own dishes would be much better (≥1600px).
- [ ] Interior / counter / staff photos
- [ ] Real WhatsApp number for Canary Kebab (Hippie Chippy's is used for now), and email
- [ ] Delivery: own drivers or Just Eat / Glovo / Uber Eats? Links, delivery area, minimum order
- [ ] Second branch (Av. del Jablillo 47): hours, phone, same menu?
- [ ] Allergens per dish. Their current menu data has the fields but they're empty, and Spanish law requires this information.
- [ ] Is the meat halal? Vegan options (falafel)?
- [ ] Owner story / years open
- [ ] Domain (canarykebab.com / .es?), and permission to quote Google reviews

## 7. Useful URLs

- Google Maps embed: `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3644.1335042141764!2d-13.491666599999999!3d28.9979169!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xc489d5fc2130a71%3A0x564c4062f58f2760!2sCanary%20Kebab%20%26%20Snack%20Bar!5e1!3m2!1ses!2ses!4v1786360397884!5m2!1ses!2ses`
- Directions: `https://www.google.com/maps/dir/?api=1&destination=Canary+Kebab+%26+Snack+Bar%2C+Avda.+de+las+Islas+Canarias+3%2C+Costa+Teguise&destination_place_id=ChIJcQoTwl-dSAwRYCeP9WJATFY`
- TripAdvisor: https://www.tripadvisor.com/Restaurant_Review-g659633-d26366078-Reviews-Canary_Kebab_Snack_Bar_Costa_Teguise-Costa_Teguise_Lanzarote_Canary_Islands.html
- Current website: https://canary-kebab.123restaurant.es/
- Gastroranking: https://gastroranking.es/r/canary-kebab-snack-bar_230574/
