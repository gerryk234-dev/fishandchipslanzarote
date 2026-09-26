# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Marketing website for **Hippie Chippy**, a fish & chip restaurant in Costa Teguise, Lanzarote (https://www.hippiechippy.com). It is a plain static site: six hand-authored HTML pages plus image/video assets. There is **no build system, no package manager, no framework, no tests, and no linter** — do not look for or add them.

## Development

There is nothing to build. Preview locally with any static server, e.g.:

```bash
python3 -m http.server 8000
```

Deployment is triggered externally by pushing to `main` (commit history shows pushes to `main` kick off a rebuild/deploy). `deploy.tar.gz` is a committed tarball snapshot of the whole site (all HTML, PDF, images, videos); be aware it can be stale relative to the checked-in HTML files.

## Architecture: six self-contained pages

Pages: `index.html` (main page — hero video slideshow, full menu section, reviews, embedded blog articles), `menu.html`, `about.html`, `blog.html`, `contact.html`, `reels.html`.

Every page is fully self-contained: all CSS lives in `<style>` blocks and all JavaScript in inline `<script>` blocks inside that page. **There are no shared CSS or JS files.** Consequently, the nav bar, footer, design tokens, language switcher, and mobile-menu JS are duplicated in every page. Any change to a shared element (nav links, footer contact details, opening hours, colors) must be applied to **all six HTML files**, not just one.

Other deliberate duplication to keep in sync:

- **Menu items** exist in three places: `.menu-card` markup in `index.html`, `.menu-card` markup in `menu.html`, and the downloadable `HippieChippy-Menu.pdf`. Cards carry `data-cat` (`fish`, `burgers`, `breakfast`, `sides`, `extras`) used by the inline `filterMenu()` tabs.
- **Blog articles** are a `const blogs = [...]` JavaScript array duplicated in both `index.html` and `blog.html`, rendered into modals at runtime.
- **Business facts** (phone/WhatsApp numbers, address, opening hours, ratings) appear in visible text, `wa.me/...` links, and the Schema.org JSON-LD block in each page's `<head>`. The customer WhatsApp order number is **+34 612 22 58 43** (`wa.me/34612225843`); the landline is +34 928 46 76 14. Past number updates have missed pages, so grep the whole repo when changing contact details: `grep -rn '612225843' *.html`.

## Key conventions

- **Bilingual EN/ES**: translated content is marked `data-lang="en"` / `data-lang="es"`; `body.lang-es` (toggled by `setLang()`, persisted in `localStorage` under `hc_lang`) shows/hides the right variant via CSS. Dynamic JS content (blog rendering) checks `document.body.classList.contains('lang-es')`. New user-facing text needs both language variants.
- **Design tokens**: each page defines the same CSS custom properties on `:root` — `--cream`, `--ink`, `--sea`, `--gold`, `--rust`, `--sage`, `--mist`, `--chalk`, `--radius`, `--transition` — with fonts Fraunces (`--ff-display`) and DM Sans (`--ff-body`) loaded from Google Fonts. Reuse these variables rather than hard-coding colors.
- **SEO is a first-class concern**: pages carry extensive meta tags, geo tags, Open Graph, and Restaurant JSON-LD. Keep structured data consistent with visible content when editing hours, ratings, or contact info.
- **Assets**: `images/img1.jpg` … `img39.jpg` and `logo.jpg` have non-descriptive names — view an image before reusing it. `videos/video1.mp4`–`video4.mp4` power the hero slideshow on `index.html`. Images use `loading="lazy"` and descriptive, SEO-oriented `alt` text.

## `decades/` — separate site

`decades/index.html` is a **separate, unrelated site** for Decades Sports & Show Bar (CC Calipso, Costa Teguise), not part of Hippie Chippy. It is a single self-contained bilingual page (same `data-lang` / `body.lang-es` convention, but its own design tokens and `decades_lang` storage key). Hippie Chippy's "apply to all six pages" rule does not apply to it. Takeaway number: +34 631 275 201 (reservations are not a focus — keep CTAs on takeaway, not booking). Menu prices were transcribed from photos of the bar's menu board — re-check them against the current menu when editing. Event posters live in `decades/images/`: `julie-h-music.jpg` (used Tue and Sat) is a designed composite of Julie H's own Facebook poster photo under a stage-lights backdrop; karaoke, Soul & Motown sign, Retro Brothers, happy hour and House of Fun are perspective-corrected and colour-enhanced extracts from a photo of the bar's poster board; `sports-night.jpg` and `quiz-night.jpg` are designed posters (not official ones). Menu dish images are inline SVG illustrations (`<symbol id="d-…">` in the page's `<defs>`), not photos. The Sports Night (Monday) and Pub Quiz (Thursday) days were chosen by us — confirm with the bar.
