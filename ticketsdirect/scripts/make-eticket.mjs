// Generates a PDF e-ticket from a booking JSON file, matching the Tickets Direct layout.
//   node scripts/make-eticket.mjs <booking.json> [out.pdf]
// Renders eticket/eticket.mjs to HTML, draws the QR, and prints to PDF with the pre-installed
// Chromium (Playwright). This same renderer is what the booking API / staff tool will call.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import QRCode from "qrcode";
import { renderEticket, eticketNumber } from "../eticket/eticket.mjs";

// Playwright is installed globally in this environment; resolve it from the global modules path.
const { chromium } = await import(`${execSync("npm root -g").toString().trim()}/playwright/index.mjs`).catch(() => import("playwright"));

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SITE = (process.env.SITE_URL || "https://excursionsticketsdirect.com").replace(/\/$/, "");
const dataPath = process.argv[2];
if (!dataPath) { console.error("usage: node scripts/make-eticket.mjs <booking.json> [out.pdf]"); process.exit(1); }
const d = JSON.parse(fs.readFileSync(dataPath, "utf8"));
d.number = d.number || eticketNumber(d.bookingNumber, d.date, d.suffix);

const logoFile = path.join(root, "src/assets/brand/logo-header.png");
const logo = fs.existsSync(logoFile) ? `data:image/png;base64,${fs.readFileSync(logoFile).toString("base64")}` : "";
const verifyUrl = d.verifyUrl || `${SITE}/e/${d.number}`;
const qr = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 300, errorCorrectionLevel: "M" });

const html = renderEticket(d, { logo, qr });
const out = process.argv[3] || path.join(root, `eticket/out/${d.number}.pdf`);
fs.mkdirSync(path.dirname(out), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: out, format: "A4", printBackground: true, margin: { top: "14mm", bottom: "14mm", left: "12mm", right: "12mm" } });
await browser.close();
console.log(`wrote ${path.relative(process.cwd(), out)}  (verify: ${verifyUrl})`);
