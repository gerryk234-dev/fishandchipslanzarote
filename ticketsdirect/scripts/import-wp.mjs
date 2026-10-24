// Imports the live tour catalogue from the WordPress / WP Travel Engine site into
// src/data/catalog.json and optimised images into src/assets/img/.
//   npm run import            (uses cached API responses in .cache/wp when present)
//   npm run import -- --fresh (ignores the cache)
// Content stays editable in WordPress; re-run this, then `npm run build`.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WP = (process.env.WP_URL || "https://excursionsticketsdirect.com").replace(/\/$/, "");
const API = `${WP}/wp-json`;
const CACHE = path.join(root, ".cache/wp");
const IMG_DIR = path.join(root, "src/assets/img/trips");
const FRESH = process.argv.includes("--fresh");
const GALLERY_MAX = 4;
const UA = "Mozilla/5.0 (compatible; TicketsDirectImporter/1.0)";

fs.mkdirSync(CACHE, { recursive: true });
fs.mkdirSync(IMG_DIR, { recursive: true });

// ---------- http with cache ----------
async function fetchCached(url, { as = "json", maxBytes } = {}) {
  const key = crypto.createHash("sha1").update(url).digest("hex");
  const file = path.join(CACHE, key + (as === "json" ? ".json" : as === "text" ? ".txt" : ".bin"));
  if (!FRESH && fs.existsSync(file)) {
    const buf = fs.readFileSync(file);
    return as === "json" ? JSON.parse(buf) : as === "text" ? buf.toString() : buf;
  }
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA } });
      if (res.status === 400 && as === "json") return null; // past the last page
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      let buf;
      if (maxBytes) {
        // Only the <head> is needed for hreflang links; stop reading early.
        const reader = res.body.getReader();
        const chunks = [];
        let size = 0;
        while (size < maxBytes) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          size += value.length;
        }
        reader.cancel().catch(() => {});
        buf = Buffer.concat(chunks);
      } else {
        buf = Buffer.from(await res.arrayBuffer());
      }
      fs.writeFileSync(file, buf);
      return as === "json" ? JSON.parse(buf) : as === "text" ? buf.toString() : buf;
    } catch (err) {
      if (attempt >= 3) throw err;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (i < items.length) {
        const n = i++;
        out[n] = await fn(items[n], n);
      }
    }),
  );
  return out;
}

async function allPages(base) {
  const out = [];
  for (let page = 1; page < 10; page++) {
    const batch = await fetchCached(`${base}${base.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
    if (!Array.isArray(batch) || !batch.length) break;
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

// ---------- text helpers ----------
const decode = (s) =>
  String(s ?? "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&hellip;/g, "…")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&rsquo;/g, "’")
    .replace(/&lsquo;/g, "‘")
    .replace(/&ldquo;/g, "“")
    .replace(/&rdquo;/g, "”")
    .replace(/&euro;/g, "€");
const text = (html) => decode(String(html ?? "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/[ \t\r]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
const escHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Reduce WordPress HTML to a small, safe subset: paragraphs, h3, lists, bold/italic.
function cleanHtml(html) {
  let s = String(html ?? "");
  s = s.replace(/<(script|style|iframe|noscript|form|svg)[\s\S]*?<\/\1>/gi, "");
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  const blocks = [];
  // Tokenise into tags and text; rebuild with an allow-list and no attributes.
  const allow = { p: "p", h1: "h3", h2: "h3", h3: "h3", h4: "h3", h5: "h3", ul: "ul", ol: "ol", li: "li", strong: "strong", b: "strong", em: "em", i: "em", br: "br" };
  s = s.replace(/<\s*(\/?)\s*([a-z0-9]+)[^>]*>/gi, (_, close, tag) => {
    const t = allow[tag.toLowerCase()];
    if (!t) return " ";
    if (t === "br") return "<br>";
    return `<${close}${t}>`;
  });
  s = decode(s);
  // Re-escape text content (decode turned &lt; back into <, so escape anything that isn't our own tag).
  s = s.split(/(<\/?(?:p|h3|ul|ol|li|strong|em)>|<br>)/g).map((part, i) => (i % 2 ? part : escHtml(part))).join("");
  s = s.replace(/\s+/g, " ");
  s = s.replace(/<(p|h3|li|strong|em)>\s*<\/\1>/g, "");
  s = s.replace(/\s*(<\/?(?:p|h3|ul|ol|li)>)\s*/g, "$1");
  // Text that isn't inside a block becomes a paragraph.
  if (!/^<(p|h3|ul|ol)>/.test(s)) s = `<p>${s}`;
  if (!/<\/(p|h3|ul|ol)>$/.test(s)) s = `${s}</p>`;
  return s.replace(/<p><\/p>/g, "").trim();
}
const lines = (arr) => (Array.isArray(arr) ? arr : String(arr ?? "").split("\n")).map((x) => text(x)).filter(Boolean);
const pathOf = (link) => {
  try {
    return new URL(link).pathname;
  } catch {
    return null;
  }
};

// ---------- fetch everything ----------
console.log("fetching trips…");
const tripsEn = await allPages(`${API}/wptravelengine/v2/trips`);
const tripsEsRaw = await allPages(`${API}/wptravelengine/v2/trips?lang=es`);
const tripsEs = tripsEsRaw.filter((t) => /\/es\//.test(t.link));
console.log(`  ${tripsEn.length} EN, ${tripsEs.length} ES trips`);

console.log("fetching taxonomies…");
const TAX = ["trip_types", "destination", "activities", "location", "tour_language"];
const tax = { en: {}, es: {} };
for (const t of TAX) {
  tax.en[t] = await allPages(`${API}/wp/v2/${t}?_fields=id,name,slug,count,description,link,parent`);
  tax.es[t] = await allPages(`${API}/wp/v2/${t}?lang=es&_fields=id,name,slug,count,description,link,parent`);
}

console.log("fetching prices…");
const packages = await pool(tripsEn, 4, (t) => fetchCached(`${API}/wptravelengine/v2/trips/${t.id}/packages`));

// EN ↔ ES pairs come from the hreflang links WPML prints in each page's <head>.
console.log("matching translations…");
async function esLinkOf(enLink) {
  // The site prints no hreflang tags, so read WPML's language switcher (about 200 KB into the page).
  const html = await fetchCached(enLink, { as: "text", maxBytes: 400000 });
  const sw = html.match(/wpml-ls-item-es[^>]*>\s*<a[^>]*href=["']([^"']+)["']/i);
  if (sw) return sw[1];
  const m = html.match(/<link[^>]+hreflang=["']es["'][^>]*>/i);
  const href = m && m[0].match(/href=["']([^"']+)["']/i);
  return href ? href[1] : null;
}
const tripEsLinks = await pool(tripsEn, 4, (t) => esLinkOf(t.link).catch(() => null));
const termEsLinks = {};
for (const t of ["trip_types", "destination", "activities"]) {
  const links = await pool(tax.en[t], 4, (term) => esLinkOf(term.link).catch(() => null));
  tax.en[t].forEach((term, i) => (termEsLinks[`${t}:${term.id}`] = links[i]));
}

// ---------- images ----------
console.log("downloading images…");
async function saveImage(url, base) {
  const out = { src: `/assets/img/trips/${base}.webp`, thumb: `/assets/img/trips/${base}-s.webp` };
  const full = path.join(IMG_DIR, `${base}.webp`);
  const small = path.join(IMG_DIR, `${base}-s.webp`);
  if (FRESH || !fs.existsSync(full) || !fs.existsSync(small)) {
    const buf = await fetchCached(url, { as: "bin" });
    const img = sharp(buf).rotate();
    await img.clone().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 62 }).toFile(full);
    await img.clone().resize({ width: 560, height: 350, fit: "cover" }).webp({ quality: 58 }).toFile(small);
  }
  const meta = await sharp(full).metadata();
  return { ...out, w: meta.width, h: meta.height };
}

// ---------- build catalogue ----------
const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
const esTermByLink = {};
for (const t of ["trip_types", "destination", "activities"]) for (const term of tax.es[t]) esTermByLink[`${t}:${term.link}`] = term;
const esTripByLink = Object.fromEntries(tripsEs.map((t) => [t.link, t]));

function termOut(t, term) {
  const es = esTermByLink[`${t}:${termEsLinks[`${t}:${term.id}`]}`];
  return {
    id: term.id,
    slug: term.slug,
    parent: term.parent || 0,
    count: term.count,
    name: { en: decode(term.name), es: decode(es?.name || term.name) },
    path: { en: pathOf(term.link), es: es ? pathOf(es.link) : null },
    description: { en: cleanHtml(term.description), es: es ? cleanHtml(es.description) : "" },
  };
}

function prices(pkgs) {
  const list = (Array.isArray(pkgs) ? pkgs : []).map((p) => ({
    id: p.id,
    name: decode(p.name),
    primary: !!p.is_primary,
    categories: (p.traveler_categories || []).map((c) => ({
      label: decode(c.label),
      ages: decode(c.age_group || ""),
      price: Number(c.has_sale && c.sale_price !== "" ? c.sale_price : c.price) || 0,
      regular: Number(c.price) || 0,
      unit: c.pricing_type?.value || "per-person",
    })),
  }));
  const primary = list.find((p) => p.primary) || list[0];
  const adult = primary?.categories.find((c) => /adult|adulto/i.test(c.label)) || primary?.categories[0];
  const child = primary?.categories.find((c) => /child|niñ|kid/i.test(c.label));
  const all = list.flatMap((p) => p.categories.map((c) => c.price)).filter((n) => n > 0);
  return { from: adult?.price || (all.length ? Math.min(...all) : null), unit: adult?.unit || "per-person", child: child ? { price: child.price, ages: child.ages } : null, packages: list };
}

const durationHours = (d) => {
  if (!d) return null;
  const n = Number(d.period) || 0;
  const unit = String(d.unit || "").toLowerCase();
  if (unit.startsWith("day")) return n * 24;
  if (unit.startsWith("min")) return Math.round((n / 60) * 100) / 100;
  return n + (Number(d.minutes) || 0) / 60;
};

const trips = [];
for (const [i, t] of tripsEn.entries()) {
  const esLink = tripEsLinks[i];
  const es = esLink ? esTripByLink[esLink] : null;
  const slug = t.slug;
  const imgUrls = [t.yoast_head_json?.og_image?.[0]?.url, ...(t.gallery || []).map((g) => g.url)].filter(Boolean);
  const uniq = [...new Set(imgUrls)].slice(0, GALLERY_MAX + 1);
  const alts = Object.fromEntries((t.gallery || []).map((g) => [g.url, decode(g.alt || "")]));
  const images = [];
  for (const [n, u] of uniq.entries()) {
    try {
      images.push({ ...(await saveImage(u, `${slug}-${n}`)), alt: alts[u] || decode(t.title.rendered) });
    } catch (err) {
      console.warn(`  image failed for ${slug}: ${err.message}`);
    }
  }
  const pick = (en, esVal) => ({ en, es: esVal ?? null });
  trips.push({
    id: t.id,
    slug,
    path: { en: pathOf(t.link), es: es ? pathOf(es.link) : null },
    name: pick(decode(t.title.rendered), es ? decode(es.title.rendered) : null),
    seo: pick(
      { title: decode(t.yoast_head_json?.title || ""), description: decode(t.yoast_head_json?.description || "") },
      es ? { title: decode(es.yoast_head_json?.title || ""), description: decode(es.yoast_head_json?.description || "") } : null,
    ),
    overview: pick(cleanHtml(t.overview), es ? cleanHtml(es.overview) : null),
    includes: pick(lines(t.cost_includes), es ? lines(es.cost_includes) : null),
    excludes: pick(lines(t.cost_excludes), es ? lines(es.cost_excludes) : null),
    itinerary: pick(
      (t.itineraries || []).map((s) => ({ title: text(s.title), text: text(s.content) })).filter((s) => s.title),
      es ? (es.itineraries || []).map((s) => ({ title: text(s.title), text: text(s.content) })).filter((s) => s.title) : null,
    ),
    faqs: pick(
      (t.faqs || []).map((f) => [text(f.question), text(f.answer)]).filter(([q, a]) => q && a),
      es ? (es.faqs || []).map((f) => [text(f.question), text(f.answer)]).filter(([q, a]) => q && a) : null,
    ),
    info: pick(
      (t.trip_info || []).map((x) => [text(x.label), text(x.content)]).filter(([a, b]) => a && b),
      es ? (es.trip_info || []).map((x) => [text(x.label), text(x.content)]).filter(([a, b]) => a && b) : null,
    ),
    duration: t.duration ? { period: Number(t.duration.period) || 0, unit: t.duration.unit, minutes: Number(t.duration.minutes) || 0 } : null,
    hours: durationHours(t.duration),
    minAge: Number(t.age_limit?.min) || null,
    depositPercent: t.partial_payment?.payment_type === "percent" ? Number(t.partial_payment.percentage) || null : null,
    price: prices(packages[i]),
    types: t.trip_types || [],
    destinations: t.destination || [],
    activities: t.activities || [],
    pickups: t.location || [],
    languages: t.tour_language || [],
    images,
    video: (t.video_gallery || []).map((v) => (v.url || "").replace(/^\/\//, "https://")).filter(Boolean)[0] || null,
    // Used only to rank "most popular"; booking counts are never published.
    popularity: Object.values(t["booked-seats"] || {}).reduce((n, b) => n + (Number(b?.booked) || 0), 0),
    modified: t.modified_gmt ? t.modified_gmt.slice(0, 10) : null,
  });
  if ((i + 1) % 10 === 0) console.log(`  ${i + 1}/${tripsEn.length}`);
}

const catalog = {
  source: WP,
  importedAt: new Date().toISOString().slice(0, 10),
  trips,
  terms: Object.fromEntries(["trip_types", "destination", "activities", "location", "tour_language"].map((t) => [t, tax.en[t].map((term) => termOut(t, term))])),
};
fs.writeFileSync(path.join(root, "src/data/catalog.json"), JSON.stringify(catalog, null, 1));
const missingEs = trips.filter((t) => !t.path.es).map((t) => t.slug);
console.log(`wrote ${trips.length} trips, ${trips.reduce((n, t) => n + t.images.length, 0)} images`);
if (missingEs.length) console.warn(`no Spanish version found for: ${missingEs.join(", ")}`);
