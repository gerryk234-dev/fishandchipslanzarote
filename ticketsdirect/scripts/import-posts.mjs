// Imports the WordPress blog posts (EN + ES) into src/data/posts.json, keeping their URLs.
//   npm run import:posts            (uses cached API responses in .cache/wp when present)
//   npm run import:posts -- --fresh (ignores the cache)
// Posts are built with Elementor. Only the article itself is kept: text, headings, images,
// galleries and FAQs. Embedded WP Travel Engine tour cards become a list of tour paths, so the
// new site shows its own cards with current prices instead of copying old ones.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WP = (process.env.WP_URL || "https://excursionsticketsdirect.com").replace(/\/$/, "");
const API = `${WP}/wp-json/wp/v2`;
const CACHE = path.join(root, ".cache/wp");
const IMG_DIR = path.join(root, "src/assets/img/posts");
const FRESH = process.argv.includes("--fresh");
const UA = "Mozilla/5.0 (compatible; TicketsDirectImporter/1.0)";

fs.mkdirSync(CACHE, { recursive: true });
fs.mkdirSync(IMG_DIR, { recursive: true });

async function fetchCached(url, { as = "json", maxBytes } = {}) {
  const key = crypto.createHash("sha1").update(url).digest("hex");
  const file = path.join(CACHE, key + (as === "json" ? ".json" : as === "text" ? ".txt" : ".bin"));
  if (!FRESH && fs.existsSync(file)) {
    const buf = fs.readFileSync(file);
    return as === "json" ? JSON.parse(buf) : as === "text" ? buf.toString() : buf;
  }
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  let buf = Buffer.from(await res.arrayBuffer());
  if (maxBytes) buf = buf.subarray(0, maxBytes);
  fs.writeFileSync(file, buf);
  return as === "json" ? JSON.parse(buf) : as === "text" ? buf.toString() : buf;
}

const decode = (s) =>
  String(s ?? "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&hellip;/g, "…")
    .replace(/&euro;/g, "€")
    .replace(/&amp;/g, "&");
const text = (html) => decode(String(html ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const pathOf = (link) => {
  const u = new URL(link, WP);
  return u.host === new URL(WP).host ? decodeURI(u.pathname) : link;
};
const safeHref = (h) => {
  const href = decode(h || "").trim();
  if (/^(https?:|mailto:|tel:)/i.test(href)) return pathOf(href);
  return href.startsWith("/") ? href : null;
};

// Keep a small article subset: headings, paragraphs, lists, tables, links, images, emphasis.
function cleanArticle(html) {
  let s = String(html ?? "");
  s = s.replace(/<(script|style|iframe|noscript|form|svg|button|label|del|ins)[\s\S]*?<\/\1>/gi, "");
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  const allow = { p: "p", h1: "h2", h2: "h2", h3: "h3", h4: "h3", h5: "h3", ul: "ul", ol: "ol", li: "li", strong: "strong", b: "strong", em: "em", i: "em", blockquote: "blockquote", table: "table", thead: "thead", tbody: "tbody", tr: "tr", th: "th", td: "td" };
  const parts = s.split(/(<[^>]+>)/g);
  let out = "";
  for (const part of parts) {
    const m = part.match(/^<\s*(\/?)\s*([a-z0-9]+)([^>]*)>$/i);
    if (!m) { out += esc(decode(part)); continue; }
    const [, close, rawTag, attrs] = m;
    const tag = rawTag.toLowerCase();
    if (tag === "br") { out += "<br>"; continue; }
    if (tag === "a") {
      if (close) { out += "</a>"; continue; }
      const href = safeHref(attrs.match(/href=["']([^"']*)["']/i)?.[1]);
      out += href ? `<a href="${esc(href)}"${/^https?:/.test(href) ? ' rel="noopener"' : ""}>` : "<a>";
      continue;
    }
    if (tag === "img") {
      const src = decode(attrs.match(/\s(?:data-lazy-src|data-src|src)=["']([^"']+)["']/i)?.[1] || "");
      if (/^https?:\/\//.test(src)) out += `<img src="${esc(src)}" alt="${esc(decode(attrs.match(/alt=["']([^"']*)["']/i)?.[1] || ""))}" loading="lazy">`;
      continue;
    }
    if (allow[tag]) out += `<${close}${allow[tag]}>`;
  }
  out = out.replace(/<a>([\s\S]*?)<\/a>/g, "$1").replace(/\s+/g, " ");
  for (let i = 0; i < 3; i++) out = out.replace(/<(p|h2|h3|li|strong|em|a[^>]*)>\s*<\/(p|h2|h3|li|strong|em|a)>/g, "");
  return out.replace(/\s*(<\/?(?:p|h2|h3|ul|ol|li|table|thead|tbody|tr|blockquote)>)\s*/g, "$1").trim();
}

// Split Elementor markup into its widgets and keep the article parts as blocks.
function blocks(html) {
  const starts = [...html.matchAll(/<div[^>]*data-widget_type="([^"]+)"[^>]*>/g)];
  if (!starts.length) return [{ t: "html", html: cleanArticle(html) }];
  const out = [];
  starts.forEach((m, i) => {
    const type = m[1].split(".")[0];
    const chunk = html.slice(m.index + m[0].length, i + 1 < starts.length ? starts[i + 1].index : html.length);
    if (/^(theme-post-featured-image|post-info|theme-post-title|share-buttons|post-navigation|posts|post-comments|author-box|breadcrumbs)$/.test(type)) return;
    if (/^wptravelengine/.test(type)) {
      const paths = [...new Set([...chunk.matchAll(/href=["']([^"']*\/trip\/[^"']+)["']/g)].map((x) => pathOf(x[1])))];
      if (paths.length) out.push({ t: "tours", paths });
      return;
    }
    if (type === "gallery") {
      const imgs = [...chunk.matchAll(/data-thumbnail="([^"]+)"[^>]*?aria-label="([^"]*)"/g)].map((x) => ({ src: decode(x[1]), alt: decode(x[2]) }));
      if (imgs.length) out.push({ t: "gallery", images: imgs });
      return;
    }
    if (type === "uael-faq") {
      // One accordion item per title; WordPress writes the attribute as class= "uael-accordion-title".
      const items = chunk.split(/<div class=\s*"uael-accordion-title/).slice(1).map((item) => [
        text(item.match(/uael-question-span[^>]*>([\s\S]*?)<\/span>/)?.[1]),
        cleanArticle(item.split(/uael-accordion-content[^>]*>/)[1] || ""),
      ]).filter(([q, a]) => q && a);
      if (items.length) out.push({ t: "faq", items });
      return;
    }
    const cleaned = cleanArticle(chunk);
    if (cleaned) out.push({ t: "html", html: cleaned });
  });
  return out;
}

async function esLinkOf(enLink) {
  // The site prints no hreflang tags, so read WPML's language switcher.
  const html = await fetchCached(enLink, { as: "text", maxBytes: 400000 });
  return html.match(/wpml-ls-item-es[^>]*>\s*<a[^>]*href=["']([^"']+)["']/i)?.[1] || null;
}

const SUFFIX = /\s*[-–|]\s*Excursion(s|es) in Lanzarote\s*\|.*$|\s*[-–|]\s*Excursiones en Lanzarote\s*\|.*$|\s*\|\s*Excursions Tickets Direct\s*$/i;
async function postOut(p) {
  const y = p.yoast_head_json || {};
  return {
    path: pathOf(p.link),
    title: text(p.title.rendered),
    seoTitle: text(y.title || p.title.rendered).replace(SUFFIX, ""),
    description: text(y.description || p.excerpt.rendered).slice(0, 300),
    blocks: blocks(p.content.rendered),
  };
}

async function featured(p, slug) {
  if (!p.featured_media) return null;
  const media = await fetchCached(`${API}/media/${p.featured_media}`);
  const file = path.join(IMG_DIR, `${slug}.webp`);
  if (FRESH || !fs.existsSync(file)) {
    const buf = await fetchCached(media.source_url, { as: "bin" });
    await sharp(buf).rotate().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 62 }).toFile(file);
  }
  const meta = await sharp(file).metadata();
  return { src: `/assets/img/posts/${slug}.webp`, w: meta.width, h: meta.height, alt: text(media.alt_text || media.title?.rendered || "") };
}

const en = await fetchCached(`${API}/posts?per_page=100`);
const posts = [];
for (const p of en) {
  const esLink = await esLinkOf(p.link).catch(() => null);
  const esSlug = esLink && decodeURI(new URL(esLink).pathname).split("/").filter(Boolean).pop();
  const es = esSlug ? (await fetchCached(`${API}/posts?slug=${encodeURIComponent(esSlug)}&lang=es`))[0] : null;
  const [enOut, esOut] = [await postOut(p), es ? await postOut(es) : null];
  posts.push({
    id: p.id,
    slug: p.slug,
    date: p.date_gmt.slice(0, 10),
    modified: p.modified_gmt.slice(0, 10),
    image: await featured(p, p.slug),
    path: { en: enOut.path, es: esOut?.path || null },
    title: { en: enOut.title, es: esOut?.title || null },
    seoTitle: { en: enOut.seoTitle, es: esOut?.seoTitle || null },
    description: { en: enOut.description, es: esOut?.description || null },
    blocks: { en: enOut.blocks, es: esOut?.blocks || null },
  });
  console.log(`  ${p.slug}${es ? " + es" : " (no Spanish version)"}`);
}
posts.sort((a, b) => b.date.localeCompare(a.date));
fs.writeFileSync(path.join(root, "src/data/posts.json"), JSON.stringify({ source: WP, importedAt: new Date().toISOString().slice(0, 10), posts }, null, 1));
console.log(`wrote ${posts.length} posts`);
