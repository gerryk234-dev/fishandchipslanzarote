// Shared catalogue model used by the site generator (build.mjs) and the assistant (api/chat.js).
// Raw tour data comes from src/data/catalog.json (written by scripts/import-wp.mjs);
// editorial data (category intros, curated places, resorts, offices) lives beside it.
import fs from "node:fs";
import path from "node:path";

// WordPress "activities" term ids → our filter tags.
const ACT = { family: [280], couples: [277], "half-day": [282], "full-day": [281], adventure: [275], wildlife: [289], culture: [276], "island-hop": [278, 279], nightlife: [284], private: [285], offers: [541], recommended: [287] };
const DEST_ISLANDS = [296, 321, 290, 292]; // La Graciosa, Lobos, Fuerteventura, Corralejo
const DEST_INDOOR = [302, 305]; // Cueva de los Verdes, Jameos del Agua

export function loadCatalog(dataDir) {
  const read = (f) => JSON.parse(fs.readFileSync(path.join(dataDir, f), "utf8"));
  const site = read("site.json");
  const raw = read("catalog.json");
  const categories = read("categories.json");
  const resorts = read("resorts.json");
  const places = read("places.json");
  const { offices } = read("offices.json");

  const catByWp = Object.fromEntries(categories.map((c) => [c.wp, c]));
  const resortByWp = Object.fromEntries(resorts.map((r) => [r.wp, r]));
  const placeByWp = Object.fromEntries(places.map((p) => [p.wp, p]));
  const terms = raw.terms;
  const termById = (tax) => Object.fromEntries((terms[tax] || []).map((t) => [t.id, t]));
  const typeTerm = termById("trip_types");
  const destTerm = termById("destination");
  const langTerm = termById("tour_language");
  const locTerm = termById("location");

  // Category pages use the WordPress term URL and description, plus our editorial copy when we have it.
  for (const c of categories) {
    const term = typeTerm[c.wp];
    c.term = term || null;
    c.path = term?.path || { en: null, es: null };
  }

  const tours = raw.trips
    .filter((t) => t.price?.from && t.path?.en)
    .map((t) => {
      const cats = t.types.map((id) => catByWp[id]).filter(Boolean);
      const primary = cats.find((c) => !c.secondary && c.slug !== "special-packs") || cats.find((c) => !c.secondary) || cats[0] || categories[0];
      const tags = Object.entries(ACT).filter(([, ids]) => ids.some((id) => t.activities.includes(id))).map(([k]) => k);
      if (t.types.includes(265) || t.types.includes(561)) tags.push("adventure");
      if (t.destinations.some((d) => DEST_ISLANDS.includes(d))) tags.push("island-hop");
      if (t.destinations.some((d) => DEST_INDOOR.includes(d)) || t.types.includes(273)) tags.push("rainy-day");
      if (t.types.includes(272)) tags.push("pack");
      if (t.types.includes(269)) tags.push("nightlife");
      const es = !!t.path.es;
      const both = (field) => ({ en: field.en, es: es && field.es != null && (Array.isArray(field.es) ? field.es.length : field.es) ? field.es : field.en });
      return {
        id: t.id,
        slug: t.slug,
        path: t.path,
        hasEs: es,
        name: { en: t.name.en, es: es && t.name.es ? t.name.es : t.name.en },
        seo: { en: t.seo.en, es: es && t.seo.es ? t.seo.es : t.seo.en },
        overview: both(t.overview),
        includes: both(t.includes),
        excludes: both(t.excludes),
        itinerary: both(t.itinerary),
        faqs: both(t.faqs),
        info: both(t.info),
        cat: primary.slug,
        cats: [...new Set(cats.map((c) => c.slug))],
        tags: [...new Set(tags)],
        price: t.price.from,
        unit: t.price.unit,
        child: t.price.child,
        packages: t.price.packages,
        deposit: t.depositPercent,
        duration: t.duration,
        hours: t.hours,
        minAge: t.minAge,
        destinations: t.destinations.filter((d) => destTerm[d]),
        pickups: t.pickups.filter((l) => locTerm[l]),
        resorts: t.pickups.map((l) => resortByWp[l]?.slug).filter(Boolean),
        languages: t.languages.map((l) => langTerm[l]?.name?.en).filter(Boolean),
        images: t.images,
        video: t.video,
        popularity: t.popularity || 0,
        modified: t.modified,
      };
    });

  const tourBy = Object.fromEntries(tours.map((t) => [t.slug, t]));
  const catBy = Object.fromEntries(categories.map((c) => [c.slug, c]));
  const destinations = (terms.destination || [])
    .filter((d) => d.path?.en && tours.some((t) => t.destinations.includes(d.id)))
    .map((d) => ({ ...d, curated: placeByWp[d.id] || null }));

  return { site, raw, categories, resorts, places, offices, tours, tourBy, catBy, destinations, destTerm, locTerm, placeByWp, importedAt: raw.importedAt };
}

export const UNIT = {
  en: { "per-person": "per person", "per-group": "per group", "per-vehicle": "per vehicle", "per-2-person": "for 2 people", "per-ship": "per boat" },
  es: { "per-person": "por persona", "per-group": "por grupo", "per-vehicle": "por vehículo", "per-2-person": "para 2 personas", "per-ship": "por barco" },
};

export function formatPrice(lang, n) {
  const s = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return lang === "en" ? `€${s}` : `${s.replace(".", ",")} €`;
}

export function formatDuration(lang, t) {
  const d = t.duration;
  if (!d || !d.period) return lang === "en" ? "Flexible" : "Flexible";
  const n = d.period;
  const u = String(d.unit || "hours").toLowerCase();
  const words = {
    en: { hour: ["hour", "hours"], day: ["day", "days"], minute: ["min", "min"] },
    es: { hour: ["hora", "horas"], day: ["día", "días"], minute: ["min", "min"] },
  }[lang];
  const key = u.startsWith("day") ? "day" : u.startsWith("min") ? "minute" : "hour";
  let s = `${String(n).replace(".", lang === "es" ? "," : ".")} ${words[key][n === 1 ? 0 : 1]}`;
  if (key === "hour" && d.minutes) s += ` ${d.minutes} min`;
  return s;
}
