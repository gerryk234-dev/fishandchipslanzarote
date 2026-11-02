// Read-only export of Search Console and GA4 data through the seo-reader service account.
// Usage: node scripts/google-data.mjs [--days 480]
// Needs GOOGLE_SERVICE_ACCOUNT_JSON (the whole key file) or GOOGLE_SA_PRIVATE_KEY (just its
// "private_key" value). Writes to .cache/google/, which is git-ignored: this is private business
// data and the repository is public, so never commit it.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const outDir = path.join(root, ".cache/google");
const GSC_SITE = process.env.GSC_SITE || "sc-domain:excursionsticketsdirect.com";
const GA4_PROPERTY = process.env.GA4_PROPERTY || "380597293";
const days = Number(process.argv[process.argv.indexOf("--days") + 1]) || 480;

function credentials() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const j = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    return { email: j.client_email, key: j.private_key };
  }
  if (process.env.GOOGLE_SA_PRIVATE_KEY) {
    return {
      email: process.env.GOOGLE_SA_EMAIL || "seo-reader@sunny-idiom-407419.iam.gserviceaccount.com",
      key: process.env.GOOGLE_SA_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }
  throw new Error("Set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SA_PRIVATE_KEY in the environment.");
}

async function token({ email, key }) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const scope = "https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/analytics.readonly";
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: email, scope, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
  const jwt = `${unsigned}.${crypto.createSign("RSA-SHA256").update(unsigned).sign(key, "base64url")}`;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`token: ${JSON.stringify(j)}`);
  return j.access_token;
}

const iso = (d) => d.toISOString().slice(0, 10);
const end = new Date(Date.now() - 2 * 864e5); // Search Console data lags about two days
const start = new Date(end.getTime() - days * 864e5);

async function post(url, access, body) {
  const r = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${access}`, "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) return { error: j.error?.message || r.status };
  return j;
}

async function gsc(access, dimensions, rowLimit = 25000) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/searchAnalytics/query`;
  return post(url, access, { startDate: iso(start), endDate: iso(end), dimensions, rowLimit, dataState: "final" });
}

async function ga4(access, dimensions, metrics) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY}:runReport`;
  return post(url, access, { dateRanges: [{ startDate: iso(start), endDate: iso(end) }], dimensions: dimensions.map((name) => ({ name })), metrics: metrics.map((name) => ({ name })), limit: 10000 });
}

const access = await token(credentials());
fs.mkdirSync(outDir, { recursive: true });
const reports = {
  "gsc-queries": () => gsc(access, ["query"]),
  "gsc-pages": () => gsc(access, ["page"]),
  "gsc-query-page": () => gsc(access, ["query", "page"]),
  "gsc-country-device": () => gsc(access, ["country", "device"]),
  "gsc-months": () => gsc(access, ["date"]),
  "ga4-source-medium": () => ga4(access, ["sessionSourceMedium"], ["sessions", "engagedSessions", "keyEvents", "purchaseRevenue"]),
  "ga4-landing-pages": () => ga4(access, ["landingPagePlusQueryString"], ["sessions", "keyEvents"]),
  "ga4-months": () => ga4(access, ["yearMonth", "sessionDefaultChannelGroup"], ["sessions", "keyEvents"]),
};
for (const [name, run] of Object.entries(reports)) {
  const data = await run();
  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(data, null, 1));
  console.log(name, data.error ? `error: ${data.error}` : `${(data.rows || []).length} rows`);
}
console.log(`period ${iso(start)} to ${iso(end)}; files in ${path.relative(process.cwd(), outDir)}/ (not committed)`);
