# Canary Kebab & Snack Bar website

A static website for Canary Kebab & Snack Bar (Costa Teguise, Lanzarote), built the same way as the Hippie Chippy site in the parent folder: six self-contained HTML pages with inline CSS and JS, no build step, bilingual EN/ES.

Preview locally:
```bash
cd canary-kebab && python3 -m http.server 8000   # open http://localhost:8000
```

## Pages
| Page | Content |
|---|---|
| `index.html` | Video hero (2 clips; portrait files on phones, landscape on desktop), favourites, "open till 2am" banner, gallery with lightbox, reviews, WhatsApp ordering, latest 3 blog posts, both locations with maps |
| `menu.html` | Full menu: 71 dishes in 7 categories + 112 drinks, filter tabs, "Add to order" on every dish, allergen notice |
| `about.html` | Story, values, photos, reviews, locations |
| `blog.html` | 5 bilingual articles shown in a pop-up (`const blogs = [...]`) |
| `contact.html` | Phone, WhatsApp, Facebook, hours, both locations, message form that opens WhatsApp |
| `reels.html` | The two promo videos with sound |

## Conventions (same as Hippie Chippy)
- **No shared files.** The nav, footer, styles, language switcher and order pop-up are copied into every page. A change to any of them must be made in **all six pages**.
- **Languages:** text is in pairs, `<span data-lang="en">` / `<span data-lang="es">`. `setLang()` toggles `body.lang-es` and saves the choice in `localStorage` (`ck_lang`). First-time visitors whose browser is set to Spanish get Spanish automatically.
- **Colours** (`:root`): `--rust` #4F1C23 burgundy, `--gold` #DF9E2F, `--sea` #C8202F neon red, `--ink` #22090D, `--cream`, `--mist`, `--sage`, `--chalk`. Fonts: Bebas Neue (headings) + DM Sans (text).

## Keep in sync when things change
| What | Where it appears |
|---|---|
| **WhatsApp number**: currently **+34 695 07 17 65** (Hippie Chippy's, temporary) | Every page: footer, floating button, `WA_NUMBER` in the order script, contact cards. Change all with `sed -i 's/34695071765/34NEWNUMBER/g; s/+34 695 07 17 65/+34 NEW NUMBER/g' *.html` |
| Phone +34 928 33 35 30, hours 13:00–02:00, addresses | Visible text + the JSON-LD block in every `<head>` |
| **Menu prices** | `menu.html` cards, the `MENU_ITEMS` order list in **every page**, the favourites on `index.html`, prices quoted in blog articles, and `data/MENU.md` / `data/*.json` |
| Blog articles | `const blogs` in `index.html` **and** `blog.html` |
| Google rating (4.5, 297 reviews) | Hero badge, reviews section (index + about), JSON-LD |

## Before going live
- [ ] **Domain.** Once chosen, add `<link rel="canonical">` and `og:url` to every page, change `og:image` to absolute URLs, and add `sitemap.xml` / `robots.txt`.
- [ ] Replace the temporary WhatsApp number.
- [ ] Hours and phone for the second shop (Av. del Jablillo 47). The site currently says "open late, call to check".
- [ ] Owner's OK for customers' faces (gallery, about page) and the two Google Maps photos.
- [ ] Per-dish allergen list (currently a general notice).
- [ ] Better photos of the Indian dishes: the samosa photo is a stock image from their old site.
- [ ] Deployment. This folder lives inside the Hippie Chippy repo, so pushing to `main` would publish it at `hippiechippy.com/canary-kebab/`. For its own domain, move this folder to a separate repo or hosting.

## Assets
See `BRIEF.md`, `images/README.md`, `videos/README.md`. The site uses `images/web/` (resized copies), `images/logo/`, `videos/hero/` and `videos/reels/`. The full-size originals are in `images/from-videos/`, `images/google-maps/` and `images/from-website/`.
