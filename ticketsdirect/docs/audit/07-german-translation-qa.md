# German translation QA

Checked 7 November 2026 with `npm run lang-qa de` (scans every built `/de/` page) plus manual review. The scan report is saved to `lang-qa-de.json`.

## What was checked

1. **Broken language** — literal `${…}` interpolation, `undefined`, `NaN`, mojibake (`Ã`, `Â`), empty titles/headings. **Result: none found** across all 196 German pages.
2. **English leaking into the German interface** — navigation, buttons, section headings, the booking panel, the finder, the app page, the chat assistant, trust badges, and the templated FAQs.
3. **SEO** — German `<title>` and meta patterns, title/description length, and that target German keywords appear.
4. **Search intent** — the templated FAQ questions, in each market's own wording from the keyword research (`06-language-research.md`).

## Verified German (accurate, reviewed)

The whole **interface and the templated SEO layer** is German, not machine-mangled:

- Navigation, menu, buttons ("Jetzt buchen", "Auf WhatsApp fragen"), finder ("Wo wohnst du?", "Ausflüge anzeigen"), filters, counters, trust badges.
- Category names: Bootstouren, Buggy- & Abenteuertouren, Inselrundfahrten mit dem Bus, Wassersport, Unterwasser-Erlebnisse, Fähren & Inseltrips, Pakete & Rabatte.
- Page titles and meta descriptions follow the ranking patterns from the research ("…auf Lanzarote 2026", "Ausflüge ab [Ort]", price as "ab 64 €", "kostenlose Stornierung bis 24 Std.").
- Keywords present in German titles: **Ausflüge, Bootstouren, Timanfaya, Buggy, La Graciosa, Jetski, Wassersport**.
- **Templated FAQs are German** — the search-intent questions:
  - Home: "Was sind die besten Ausflüge auf Lanzarote?", "Wie bezahle ich?"
  - Tour: "Wie viel kostet dieser Ausflug?", "Kann ich stornieren?"
  - Resort/combo: "Was ist der beste Ausflug ab [Ort]?", "Gibt es Abholung in [Ort]?"
  - Offers: "Bietet ihr Gruppenrabatte an?", "Gibt es Sonderangebote?"
- Resort landing pages (Costa Teguise, Puerto del Carmen, Playa Blanca): German h1, meta and FAQs.

## Still English — by design, pending native review

These are **content**, not interface, and were deliberately left in English rather than shipped as rough machine translation. A German-speaking staff member translates/approves them before the German site goes live, using the glossary in `06-language-research.md` for consistent terms:

- **Tour names and descriptions** (the ~107k-word long tail) and each tour's own WordPress FAQs.
- **Blog posts and guides** on `/de/`.
- **Category and resort intro paragraphs** (the body prose; their titles, meta and FAQs are German).
- The "languages" list on tour pages (e.g. "English, French, German, Spanish").

The QA scan still counts these as "English" (≈1,000 FAQ lines, mostly tour and blog content) — that is the expected, visible measure of what remains for staff translation, not a fault.

## How to re-check

- `npm run lang-qa de` after any change. It re-scans and rewrites `lang-qa-de.json`.
- The same command works for `it` and `fr` once those languages are enabled.

## Honest summary

The **German interface and SEO/snippet/FAQ layer are complete and accurate German**, verified free of broken strings and following the researched keywords and search-intent questions. The **long-form content is English until your staff translate it**, which is the agreed approach and is what the remaining scan counts represent.
