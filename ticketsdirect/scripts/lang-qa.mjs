// Quality check for a translated language: scans dist/<lang>/ pages for English leaking into the
// interface and FAQs, broken interpolation, title/meta length, and target-keyword coverage.
// Usage: node scripts/lang-qa.mjs de
import fs from "node:fs";
import path from "node:path";

const lang = process.argv[2] || "de";
const root = path.join(path.dirname(path.dirname(new URL(import.meta.url).pathname)), "dist", lang);
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name === "index.html") files.push(p); } })(root);

// English words that should never appear in interface text (headings, buttons, FAQ questions, meta).
// Tour names and imported descriptions are allowed to stay English, so body <p>/<li> prose is ignored.
const EN_MARK = /\b(Book now|Overview|Frequently asked|Need help|All excursions|Where you stay|Our offices|How much does|Can I cancel|Do you offer|Are there any|Do you match|What (are|is)|Where (do|can|is)|Is (it|this)|Prices at a glance|Other offices|Book Direct|Our top picks|Approximate travel|Choose a date|Checking availability|Watch the video|Good to know|You may also like|Most popular|What's included|Not included)\b/;
const DE_KEYWORDS = ["Ausflüge", "Bootstour", "Timanfaya", "Buggy", "La Graciosa", "Jetski", "Katamaran", "Vulkan", "Wassersport"];

const issues = [];
const add = (file, kind, detail) => issues.push({ page: "/" + path.relative(path.dirname(root), file).replace(/\/index\.html$/, "/"), kind, detail });

const titles = [];
for (const f of files) {
  const h = fs.readFileSync(f, "utf8");
  const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1]?.replace(/&amp;/g, "&") || "";
  const meta = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "";
  const h1 = (h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1]?.replace(/<[^>]+>/g, "").trim() || "";
  const summaries = [...h.matchAll(/<summary>([\s\S]*?)<\/summary>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").trim());
  const h2s = [...h.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").trim());
  titles.push({ title, len: title.length });

  if (!title) add(f, "empty-title", "");
  if (title.length > 65) add(f, "title-too-long", `${title.length}: ${title}`);
  if (meta && meta.length > 160) add(f, "meta-too-long", `${meta.length}`);
  if (!meta) add(f, "no-meta", "");
  for (const s of [title, meta, h1, ...h2s, ...summaries]) {
    if (/\$\{|undefined|NaN|\[object|Ã.|Â./.test(s)) add(f, "broken-text", s.slice(0, 80));
    const m = s.match(EN_MARK);
    if (m) add(f, "english-in-ui", `"${m[0]}" in: ${s.slice(0, 70)}`);
  }
  // FAQ questions that are clearly English
  for (const s of summaries) if (/^(How|Can|Do|Does|Are|Is|What|Where|When|Why|Will)\b/.test(s)) add(f, "english-faq", s.slice(0, 70));
}

const kwHits = DE_KEYWORDS.filter((k) => titles.some((t) => t.title.includes(k)));
const byKind = {};
for (const i of issues) byKind[i.kind] = (byKind[i.kind] || 0) + 1;
console.log(`QA for /${lang}/ — ${files.length} pages`);
console.log("issue counts:", JSON.stringify(byKind, null, 0));
console.log("German keywords present in titles:", kwHits.join(", ") || "NONE");
const show = (kind, n = 6) => { const l = issues.filter((i) => i.kind === kind); if (l.length) { console.log(`\n${kind} (${l.length}):`); l.slice(0, n).forEach((i) => console.log(`  ${i.page}  ${i.detail}`)); } };
["empty-title", "broken-text", "english-in-ui", "english-faq", "title-too-long", "no-meta", "meta-too-long"].forEach((k) => show(k));
fs.writeFileSync(path.join(path.dirname(root), `../docs/audit/lang-qa-${lang}.json`), JSON.stringify({ pages: files.length, byKind, kwHits, issues }, null, 1));
