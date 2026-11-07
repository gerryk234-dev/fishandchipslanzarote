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
  // Every Google profile we run; only physical ones are walk-in offices shown on the site.
  const profiles = read("offices.json").offices;
  const offices = profiles.filter((o) => o.physical !== false);

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

  // Tours with a price are bookable. Tours without one (no package in WP Travel Engine) still keep
  // their page and URL, sold on request, so their search traffic isn't lost.
  const normalise = (t) => {
      const cats = t.types.map((id) => catByWp[id]).filter(Boolean);
      const primary = cats.find((c) => !c.secondary && c.slug !== "special-packs") || cats.find((c) => !c.secondary) || cats[0] || categories[0];
      const tags = Object.entries(ACT).filter(([, ids]) => ids.some((id) => t.activities.includes(id))).map(([k]) => k);
      if (t.types.includes(265) || t.types.includes(561)) tags.push("adventure");
      if (t.destinations.some((d) => DEST_ISLANDS.includes(d))) tags.push("island-hop");
      if (t.destinations.some((d) => DEST_INDOOR.includes(d)) || t.types.includes(273)) tags.push("rainy-day");
      if (t.types.includes(272)) tags.push("pack");
      if (t.types.includes(269)) tags.push("nightlife");
      const es = !!t.path.es;
      // de/it/fr have no source content yet, so they fall back to English (staff translate later).
      const EXTRA = ["de", "it", "fr"];
      const has = (v) => v != null && (Array.isArray(v) ? v.length : v);
      const both = (field) => { const o = { en: field.en, es: es && has(field.es) ? field.es : field.en }; for (const l of EXTRA) o[l] = has(field[l]) ? field[l] : field.en; return o; };
      const oneline = (field) => { const o = { en: field.en, es: es && field.es ? field.es : field.en }; for (const l of EXTRA) o[l] = field[l] || field.en; return o; };
      return {
        id: t.id,
        slug: t.slug,
        path: t.path,
        hasEs: es,
        name: oneline(t.name),
        seo: both(t.seo),
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
    };
  const tours = raw.trips.filter((t) => t.price?.from && t.path?.en).map(normalise);
  const enquiryTours = raw.trips.filter((t) => !t.price?.from && t.path?.en).map(normalise);

  // Meeting / collection points (src/data/pickups.json), resolved per tour.
  const pk = fs.existsSync(path.join(dataDir, "pickups.json")) ? read("pickups.json") : { points: [], assignments: [] };
  const pointBy = Object.fromEntries((pk.points || []).map((p) => [p.id, p]));
  for (const t of [...tours, ...enquiryTours]) {
    const seen = new Set();
    t.pickupPoints = (pk.assignments || [])
      .filter((a) => (a.tours || []).includes(t.slug) || (a.categories || []).some((c) => t.cats.includes(c)))
      .flatMap((a) => a.points || [])
      .filter((x) => pointBy[x.point] && !seen.has(x.point) && seen.add(x.point))
      .map((x) => ({ ...pointBy[x.point], time: x.time || null }));
  }
  const tourBy = Object.fromEntries([...tours, ...enquiryTours].map((t) => [t.slug, t]));
  const catBy = Object.fromEntries(categories.map((c) => [c.slug, c]));
  const destinations = (terms.destination || [])
    .filter((d) => d.path?.en && tours.some((t) => t.destinations.includes(d.id)))
    .map((d) => ({ ...d, curated: placeByWp[d.id] || null }));

  // Any {en, es, …} language map gets de/it/fr filled from English until it is translated.
  const fillLang = (o, seen = new Set()) => {
    if (!o || typeof o !== "object" || seen.has(o)) return;
    seen.add(o);
    if ("en" in o && "es" in o) for (const l of ["de", "it", "fr"]) if (!(l in o)) o[l] = o.en;
    // Never fill `path`: URLs are language-prefixed by the generator, not copied from English.
    for (const [k, v] of Object.entries(o)) if (k !== "path") fillLang(v, seen);
  };
  [site, categories, resorts, places, destinations].forEach((x) => fillLang(x));

  return { site, raw, categories, resorts, places, offices, profiles, pickupPoints: pk.points || [], tours, enquiryTours, tourBy, catBy, destinations, destTerm, locTerm, placeByWp, importedAt: raw.importedAt };
}

export const UNIT = {
  en: { "per-person": "per person", "per-group": "per group", "per-vehicle": "per vehicle", "per-2-person": "for 2 people", "per-ship": "per boat" },
  es: { "per-person": "por persona", "per-group": "por grupo", "per-vehicle": "por vehículo", "per-2-person": "para 2 personas", "per-ship": "por barco" },
  de: { "per-person": "pro Person", "per-group": "pro Gruppe", "per-vehicle": "pro Fahrzeug", "per-2-person": "für 2 Personen", "per-ship": "pro Boot" },
  it: { "per-person": "a persona", "per-group": "a gruppo", "per-vehicle": "a veicolo", "per-2-person": "per 2 persone", "per-ship": "a barca" },
  fr: { "per-person": "par personne", "per-group": "par groupe", "per-vehicle": "par véhicule", "per-2-person": "pour 2 personnes", "per-ship": "par bateau" },
};

export function formatPrice(lang, n) {
  const s = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return lang === "en" ? `€${s}` : `${s.replace(".", ",")} €`;
}

export function formatDuration(lang, t) {
  const d = t.duration;
  if (!d || !d.period) return "Flexible";
  const n = d.period;
  const u = String(d.unit || "hours").toLowerCase();
  const words = {
    en: { hour: ["hour", "hours"], day: ["day", "days"], minute: ["min", "min"] },
    es: { hour: ["hora", "horas"], day: ["día", "días"], minute: ["min", "min"] },
    de: { hour: ["Stunde", "Stunden"], day: ["Tag", "Tage"], minute: ["Min.", "Min."] },
    it: { hour: ["ora", "ore"], day: ["giorno", "giorni"], minute: ["min", "min"] },
    fr: { hour: ["heure", "heures"], day: ["jour", "jours"], minute: ["min", "min"] },
  }[lang] || { hour: ["hour", "hours"], day: ["day", "days"], minute: ["min", "min"] };
  const key = u.startsWith("day") ? "day" : u.startsWith("min") ? "minute" : "hour";
  let s = `${String(n).replace(".", lang === "en" ? "." : ",")} ${words[key][n === 1 ? 0 : 1]}`;
  if (key === "hour" && d.minutes) s += ` ${d.minutes} min`;
  return s;
}
