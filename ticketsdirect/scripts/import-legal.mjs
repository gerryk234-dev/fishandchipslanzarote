// Imports the legal pages (privacy, cookies, terms, legal notice; EN + ES) from WordPress into
// src/data/legal.json, so they live on the new site and WordPress can be switched off.
//   npm run import:legal            (uses cached API responses in .cache/wp when present)
//   npm run import:legal -- --fresh (ignores the cache)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WP = (process.env.WP_URL || "https://excursionsticketsdirect.com").replace(/\/$/, "");
const API = `${WP}/wp-json/wp/v2`;
const CACHE = path.join(root, ".cache/wp");
const FRESH = process.argv.includes("--fresh");
const UA = "Mozilla/5.0 (compatible; TicketsDirectImporter/1.0)";
fs.mkdirSync(CACHE, { recursive: true });

// slug (EN URL), then the WordPress page ids for EN and ES.
const PAGES = [
  { slug: { en: "privacy-policy", es: "politica-de-privacidad" }, id: { en: 3, es: 6698 } },
  { slug: { en: "cookie-policy", es: "politica-de-cookies" }, id: { en: 2210, es: 6693 } },
  { slug: { en: "terms-and-conditions", es: "condiciones-generales" }, id: { en: 1071, es: 6700 } },
  { slug: { en: "legal-notice", es: "aviso-legal" }, id: { en: 1705, es: 6695 } },
];

async function page(id) {
  const url = `${API}/pages/${id}`;
  const key = crypto.createHash("sha1").update(url).digest("hex");
  const file = path.join(CACHE, key + ".json");
  if (!FRESH && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file));
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(file, buf);
  return JSON.parse(buf);
}

const decode = (s) =>
  String(s ?? "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'")
    .replace(/&hellip;/g, "…").replace(/&euro;/g, "€").replace(/&amp;/g, "&");
const txt = (h) => decode(String(h ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const pathOf = (link) => { const u = new URL(link, WP); return u.host === new URL(WP).host ? decodeURI(u.pathname) : link; };

// Keep a safe subset: headings, paragraphs, lists, tables, emphasis, internal links.
function clean(html) {
  let s = String(html ?? "");
  s = s.replace(/<(script|style|iframe|noscript|form|svg|button)[\s\S]*?<\/\1>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
  const allow = { p: "p", h1: "h2", h2: "h2", h3: "h3", h4: "h3", h5: "h4", ul: "ul", ol: "ol", li: "li", strong: "strong", b: "strong", em: "em", i: "em", table: "table", thead: "thead", tbody: "tbody", tr: "tr", th: "th", td: "td", blockquote: "blockquote" };
  let out = "";
  for (const part of s.split(/(<[^>]+>)/g)) {
    const m = part.match(/^<\s*(\/?)\s*([a-z0-9]+)([^>]*)>$/i);
    if (!m) { out += esc(decode(part)); continue; }
    const [, close, raw, attrs] = m;
    const tag = raw.toLowerCase();
    if (tag === "br") { out += "<br>"; continue; }
    if (tag === "a") {
      if (close) { out += "</a>"; continue; }
      const href = decode(attrs.match(/href=["']([^"']*)["']/i)?.[1] || "");
      const internal = /^https?:\/\/(www\.)?excursionsticketsdirect\.com/i.test(href) || href.startsWith("/");
      out += internal ? `<a href="${esc(pathOf(href))}">` : (/^(mailto:|tel:)/i.test(href) ? `<a href="${esc(href)}">` : "<a>");
      continue;
    }
    if (allow[tag]) out += `<${close}${allow[tag]}>`;
  }
  out = out.replace(/<a>([\s\S]*?)<\/a>/g, "$1").replace(/\s+/g, " ");
  for (let i = 0; i < 3; i++) out = out.replace(/<(p|h2|h3|h4|li|strong|em)>\s*<\/(p|h2|h3|h4|li|strong|em)>/g, "");
  return out.replace(/\s*(<\/?(?:p|h2|h3|h4|ul|ol|li|table|thead|tbody|tr|blockquote)>)\s*/g, "$1").trim();
}

// Elementor wraps the text in widgets; take the text-editor widgets, else the whole body.
function body(html) {
  const widgets = [...html.matchAll(/data-widget_type="text-editor[^"]*"[^>]*>([\s\S]*?)(?=data-widget_type=|$)/g)].map((m) => m[1]);
  const joined = widgets.length ? widgets.join(" ") : html;
  return clean(joined);
}

const out = [];
for (const pg of PAGES) {
  const row = { slug: pg.slug, title: {}, html: {}, modified: null };
  for (const lang of ["en", "es"]) {
    const p = await page(pg.id[lang]);
    row.title[lang] = txt(p.title.rendered);
    row.html[lang] = body(p.content.rendered);
    const mod = p.modified_gmt?.slice(0, 10);
    if (!row.modified || mod > row.modified) row.modified = mod;
    console.log(`  ${pg.slug[lang]} (${lang}) ${row.html[lang].length} chars`);
  }
  out.push(row);
}
fs.writeFileSync(path.join(root, "src/data/legal.json"), JSON.stringify({ source: WP, importedAt: new Date().toISOString().slice(0, 10), pages: out }, null, 1));
console.log(`wrote ${out.length} legal pages`);
