// Builds the 301 redirect map from every old WordPress URL to its page on the new site.
// Usage: npm run build && npm run redirects
// Reads src/data/migration/old-urls.json, checks each path against dist/, and writes:
//   - the "redirects" list in vercel.json (exact paths, plus a wildcard for /wp-content/)
//   - docs/migration/redirect-map.csv (from, to, rule) for review
// Pages that still live on WordPress (checkout, accounts, legal) go to BOOKING_ORIGIN.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCatalog } from "../src/lib/catalog.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, "dist");
if (!fs.existsSync(path.join(dist, "index.html"))) throw new Error("Run npm run build first.");
const BOOK = (process.env.BOOKING_ORIGIN || "https://book.excursionsticketsdirect.com").replace(/\/$/, "");
const { catBy } = loadCatalog(path.join(root, "src/data"));
const old = JSON.parse(fs.readFileSync(path.join(root, "src/data/migration/old-urls.json"), "utf8")).paths;

const exists = (p) => fs.existsSync(path.join(dist, p, p.endsWith("/") ? "index.html" : ""));
const cat = (slug, es) => catBy[slug].path[es ? "es" : "en"] || catBy[slug].path.en;
const L = (es, en, esPath) => (es ? esPath : en);
const tours = (es) => L(es, "/trip/", "/es/trip/");
const guides = (es) => L(es, "/guides/", "/es/guias/");
const dest = (es, en, esPath) => L(es, `/destinations/${en}/`, `/es/destinations/${esPath}/`);

// Keyword rules, tried in order on the path without its language prefix. First match wins.
const RULES = [
  // WordPress keeps running on the booking subdomain: checkout, accounts, affiliates and forms stay there.
  [/^\/(checkout|pedido|excursions-tickets-direct-cart|excursiones-entradas-direct-cart|my-account(-2)?|mi-cuenta(-afiliados)?|affiliate-[a-z-]+|acceso-de-afiliados|afiliarse|lost-password(-affiliates)?|formulario-e-ticket|thank-you|enquiry-thank-you-page|lista-de-deseos|wishlist|resultado-de-la-busqueda|selection-of-the-departure-date-of-the-second-tour|seleccion-de-la-fecha-de-salida-del-segundo-viaje|gsim-europe-clients|clientes-de-gsim-europa)\//, "wordpress", (p) => BOOK + p],
  // Legal pages stay on WordPress until they are copied to the new site.
  [/^\/(privacy-policy|cookie-policy|terms-and-conditions|legal-notice|politica-de-privacidad|politica-de-cookies|condiciones-generales|aviso-legal)\//, "legal (on WordPress until copied)", (p) => BOOK + p],
  [/^\/(contact-us|pongase-en-contacto-con)\//, "page", (p, es) => L(es, "/contact/", "/es/contacto/")],
  [/^\/(about|quienes-somos)\//, "page", (p, es) => L(es, "/about/", "/es/sobre-nosotros/")],
  [/^\/travellers-information\//, "page", (p, es) => L(es, "/faq/", "/es/preguntas-frecuentes/")],
  [/^\/(excursions-tickets-direct-sitemap|excursiones-tickets-direct-mapa-del-sitio)\//, "page", (p, es) => L(es, "/", "/es/")],
  [/^\/(private-tours-and-events|visitas-y-eventos-privados)\//, "page", (p, es) => cat("private", es)],
  [/^\/lanzarote-excursions\/fuerteventura-delights?-day-trip\//, "old trip", () => "/trip/fuerteventura-delight/"],
  [/^\/trip\/private-boat-trip-papagayo-beaches-from-puerto-del-carmen\//, "old trip", (p, es) => cat("private", es)],
  [/^\/trip\/mini-crucero-de-catamaran-de-playa-blanca-a-playa-papagayo\//, "old trip", () => "/es/trip/mini-crucero-en-catamaran-de-playa-blanca-a-playa-papagayo/"],
  // Resort archives become the resort pages.
  [/^\/location\/(lanzarote(-es)?\/)?(costa-teguise)(-es)?\//, "resort", (p, es) => L(es, "/excursions-from/costa-teguise/", "/es/excursiones-desde/costa-teguise/")],
  [/^\/location\/(lanzarote(-es)?\/)?(playa-blanca)(-es)?\//, "resort", (p, es) => L(es, "/excursions-from/playa-blanca/", "/es/excursiones-desde/playa-blanca/")],
  [/^\/location\/(lanzarote(-es)?\/)?(puerto-del-carmen)(-es)?\//, "resort", (p, es) => L(es, "/excursions-from/puerto-del-carmen/", "/es/excursiones-desde/puerto-del-carmen/")],
  [/^\/location\/(lanzarote(-es)?\/)?puerto-calero(-es)?\//, "place", (p, es) => dest(es, "lanzarote/puerto-calero", "lanzarote-es/puerto-calero-es")],
  [/^\/location\/(lanzarote(-es)?\/)?caleta-de-famara(-es)?\//, "place", (p, es) => dest(es, "lanzarote/caleta-de-famara", "lanzarote-es/caleta-de-famara-es")],
  [/^\/location\//, "archive", (p, es) => tours(es)],
  // Activity and blog-category archives become the matching category, place or guide.
  [/^\/(activities|category)\/.*(buggies|buggy|4x4|adventure|aventura)/, "archive", (p, es) => cat("buggy-tours", es)],
  [/^\/(activities|category)\/.*(watersports|water-sports|acuaticas|jet-ski|moto-acuatica)/, "archive", (p, es) => cat("water-sports", es)],
  [/^\/(activities|category)\/.*(private|privadas)/, "archive", (p, es) => cat("private", es)],
  [/^\/(activities|category)\/.*(nightlife|nocturnas)/, "archive", (p, es) => cat("nightlife", es)],
  [/^\/(activities|category)\/.*(bus-tour|autobus|guided-tours|visitas-guiadas)/, "archive", (p, es) => cat("bus-tours", es)],
  [/^\/(activities|category)\/.*(ferries|ferrys)/, "archive", (p, es) => cat("ferries-islands", es)],
  [/^\/(activities|category)\/.*(boat-trips|viajes-en-barco)/, "archive", (p, es) => cat("boat-trips", es)],
  [/^\/(activities|category)\/.*(offers|ofertas)/, "archive", (p, es) => cat("special-packs", es)],
  [/^\/(activities|category)\/.*graciosa/, "archive", (p, es) => dest(es, "la-graciosa", "la-graciosa-es")],
  [/^\/(activities|category)\/.*fuerteventura/, "archive", (p, es) => dest(es, "fuerteventura", "fuerteventura-es")],
  [/^\/(activities|category)\/.*papagayo/, "archive", (p, es) => dest(es, "lanzarote/papagayo-beaches-2", "lanzarote-es/papagayo-playa")],
  [/^\/(activities|category)\/.*(family|familia)/, "archive", (p, es) => `${guides(es)}lanzarote-excursions-with-kids/`],
  [/^\/category\//, "archive", (p, es) => guides(es)],
  [/^\/(activities|actividades|tour_duration|tour_language|trip-difficulty|trip-types|tipos-de-viaje|all-tours|tour-listing|lista-de-visitas)\//, "archive", (p, es) => tours(es)],
  [/^\/trip\/page\/\d+\//, "archive", (p, es) => tours(es)],
  [/^\/(destination|destino)\//, "archive", (p, es) => L(es, "/destinations/", "/es/destinations/")],
  [/^\/destinations\/(lanzarote(-es)?\/)?page\/\d+\//, "archive", (p, es) => L(es, "/destinations/lanzarote/", "/es/destinations/lanzarote-es/")],
  [/^\/destinations\/(.*\/)?(papagayo-beaches-2|papagayo-playa)\//, "place", (p, es) => dest(es, "lanzarote/papagayo-beaches-2", "lanzarote-es/papagayo-playa")],
  [/^\/destinations\/costa-teguise\//, "place", (p, es) => dest(es, "lanzarote/costa-teguise", "lanzarote-es/costa-teguise")],
  [/^\/destinations\/(.*\/)?dunas-corralejo\//, "place", (p, es) => dest(es, "fuerteventura/sand-dunes", "fuerteventura-es/dunas-de-corralejo")],
  [/^\/destinations\/(lanzarote(-es)?\/)?(haria-1000-palm-trees-lanzarote-es)\//, "place", (p, es) => dest(es, "lanzarote/haria-1000-palm-trees-lanzarote-es", "lanzarote-es/haria")],
  [/^\/destinations\/(lanzarote(-es)?\/)?(lagomar-museum)(-es)?\//, "place", (p, es) => dest(es, "lanzarote/lagomar-museum", "lanzarote-es/lagomar-museum-es")],
  [/^\/destinations\/(lanzarote(-es)?\/)?la-geria(-es)?\//, "place", (p, es) => dest(es, "la-geria-2", "la-geria-es")],
  [/^\/destinations\/(lanzarote(-es)?\/)?los-hervideros-hotsprings(-es)?\//, "place", (p, es) => dest(es, "lanzarote/los-hervideros-hotsprings", "lanzarote-es/los-hervideros-hotsprings-es")],
  // Blog posts live at their own URLs (npm run import:posts). Old misspelt variants go to the post itself.
  [/^\/(blog|author|post)\//, "blog", (p, es) => guides(es)],
  [/^\/papagayo-beaches.*(visit|attraction)/i, "blog variant", () => "/papagayo-beaches-lanzarote-how-to-visit-best-tours-boat-trips/"],
  [/^\/jet-ski-lanzarote-best-prices-routes/, "blog variant", () => "/jet-ski-lanzarote-best-tours-prices-routes-everything-you-need-to-know-2026-guide/"],
  [/^\/la-graciosa-day-trip-an-is-it-worth-it\//, "blog variant", () => "/la-graciosa-day-trip-from-lanzarote-is-it-worth-it/"],
  [/^\/excursion-de-un-dia-a-la-lanzarote-merece-la-pena\//, "blog variant", () => "/es/excursion-de-un-dia-a-la-graciosa-desde-lanzarote-merece-la-pena/"],
  // Anything else blog-like that isn't on the new site: the page on the same topic.
  [/graciosa|un-dia-a-la-lanzarote/, "blog topic", (p, es) => dest(es, "la-graciosa", "la-graciosa-es")],
  [/buggy/, "blog topic", (p, es) => cat("buggy-tours", es)],
  [/timanfaya|volcan/, "blog topic", (p, es) => dest(es, "lanzarote/timanfaya-volcano-national-park", "lanzarote-es/volcan-timanfaya-parque-nacional")],
  [/jet-ski/, "blog topic", (p, es) => cat("water-sports", es)],
  [/papagayo/, "blog topic", (p, es) => dest(es, "lanzarote/papagayo-beaches-2", "lanzarote-es/papagayo-playa")],
  [/barco|boat-trips/, "blog topic", (p, es) => cat("boat-trips", es)],
  [/things-to-do|cosas-que-hacer|best-excursions|mejores-excursiones|lanzarote-guide/, "blog topic", (p, es) => `${guides(es)}best-excursions-in-lanzarote/`],
];

const rows = [];
const unmatched = [];
for (const { path: p, liveTo } of old) {
  if (/^\/(es\/)?wp-content\//.test(p) || exists(p)) continue;
  if (liveTo && exists(liveTo)) { rows.push([p, liveTo, "live redirect kept"]); continue; }
  const es = p.startsWith("/es/");
  const bare = es ? p.slice(3) : p;
  const rule = RULES.find(([re]) => re.test(bare));
  if (!rule) { unmatched.push(p); continue; }
  rows.push([p, rule[2](p, es), rule[1]]);
}

// A target on this site must exist, or the redirect would land on a 404.
const broken = rows.filter(([, to]) => to.startsWith("/") && !exists(to));
if (broken.length) throw new Error(`Redirect targets missing from dist:\n${broken.map((r) => r.join(" → ")).join("\n")}`);

const vercelPath = path.join(root, "vercel.json");
const vercel = JSON.parse(fs.readFileSync(vercelPath, "utf8"));
vercel.redirects = [
  { source: "/wp-content/:path*", destination: `${BOOK}/wp-content/:path*`, permanent: true },
  { source: "/es/wp-content/:path*", destination: `${BOOK}/wp-content/:path*`, permanent: true },
  ...rows.map(([from, to]) => ({ source: from, destination: to, permanent: true })),
];
fs.writeFileSync(vercelPath, JSON.stringify(vercel, null, 2) + "\n");

fs.mkdirSync(path.join(root, "docs/migration"), { recursive: true });
const csv = (s) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
fs.writeFileSync(path.join(root, "docs/migration/redirect-map.csv"), ["from,to,rule", ...rows.map((r) => r.map(csv).join(","))].join("\n") + "\n");

const byRule = rows.reduce((o, [, , r]) => ((o[r] = (o[r] || 0) + 1), o), {});
console.log(`${old.length} old paths: ${rows.length} redirects, ${unmatched.length} unmatched`, byRule);
if (unmatched.length) console.log("unmatched:\n" + unmatched.join("\n"));
