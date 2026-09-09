import express from "express";
import cookieParser from "cookie-parser";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { db, getSetting, setSetting } from "./db.js";
import { verifySecret, hashSecret, randomHex, signToken, verifyToken } from "./auth.js";
import { generateCard } from "./card.js";
import { sendWelcome, sendPlain } from "./mailer.js";
import { startImporter, runImportOnce, downloadPhoto } from "./importer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;
const TOKEN_SECRET = getSetting("token_secret");
const SESSION_DAYS = 180;

const app = express();
app.use(express.json({ limit: "6mb" })); // member selfies arrive as data URLs
app.use(express.urlencoded({ extended: true, limit: "6mb" })); // website form webhooks post form-encoded
app.use(cookieParser());

/* secret in the website-registration webhook URL, so only your site can post
   sign-ups straight into the app. Generated once, shown to the admin in-app. */
let WEBHOOK_KEY = getSetting("webhook_key");
if (!WEBHOOK_KEY) { WEBHOOK_KEY = randomHex(12); setSetting("webhook_key", WEBHOOK_KEY); }

/* Public health/version check — open in a browser to see what version the
   server is really running. It lives under /api/ so the service worker never
   caches it: this always reflects the live server, not the cached app. */
let RUNNING_VERSION = "?";
try { RUNNING_VERSION = readFileSync(join(__dirname, "..", "..", "VERSION"), "utf8").trim(); } catch { /* no file */ }
app.get("/api/version", (_req, res) => res.json({ version: RUNNING_VERSION, time: new Date().toISOString() }));

/* ================= auth ================= */

const setSession = (res, payload) => {
  const exp = Date.now() + SESSION_DAYS * 24 * 3600 * 1000;
  res.cookie("session", signToken({ ...payload, exp }, TOKEN_SECRET), {
    httpOnly: true,
    sameSite: "lax",
    secure: "auto",
    maxAge: SESSION_DAYS * 24 * 3600 * 1000,
  });
};

const sessionOf = (req) => verifyToken(req.cookies?.session, TOKEN_SECRET);

/* passwords are case-insensitive and whitespace-trimmed everywhere, so staff
   can't get locked out by a stray capital or an autocorrect space on mobile */
const normPass = (s) => String(s ?? "").trim().toLowerCase();

const requireDevice = (req, res, next) => {
  const s = sessionOf(req);
  if (!s?.d) return res.status(401).json({ error: "device_not_authorized" });
  req.session = s;
  next();
};

const requireAdmin = (req, res, next) => {
  const s = sessionOf(req);
  if (!s?.d) return res.status(401).json({ error: "device_not_authorized" });
  if (!s.a) return res.status(403).json({ error: "admin_required" });
  req.session = s;
  next();
};

app.post("/api/auth/device", (req, res) => {
  const { code } = req.body || {};
  if (!verifySecret(normPass(code), getSetting("club_code_hash"))) {
    return res.status(401).json({ error: "bad_code" });
  }
  setSession(res, { d: 1 });
  res.json({ ok: true });
});

app.post("/api/auth/admin", requireDevice, (req, res) => {
  const { pin } = req.body || {};
  if (!verifySecret(normPass(pin), getSetting("admin_pin_hash"))) {
    return res.status(401).json({ error: "bad_pin" });
  }
  setSession(res, { d: 1, a: 1 });
  res.json({ ok: true });
});

app.post("/api/auth/admin/logout", requireDevice, (req, res) => {
  setSession(res, { d: 1 });
  res.json({ ok: true });
});

/* verify an employee's personal password before they take the counter */
app.post("/api/auth/employee", requireDevice, (req, res) => {
  const emp = db.prepare("SELECT * FROM employees WHERE id = ? AND active = 1").get(req.body?.employeeId);
  if (!emp) return res.status(400).json({ error: "bad_employee" });
  if (emp.pass_hash && !verifySecret(normPass(req.body?.password), emp.pass_hash)) {
    return res.status(401).json({ error: "bad_password" });
  }
  res.json({ ok: true });
});

/* change passwords from inside the app (admin only) — no cPanel needed.
   Body may include any of: { clubCode, adminPass, employees: { <id>: "<newpass>" } }
   An empty string for an employee clears their password (no prompt for them). */
app.post("/api/admin/passwords", requireAdmin, (req, res) => {
  const { clubCode, adminPass, employees } = req.body || {};
  if (typeof clubCode === "string" && clubCode.trim()) setSetting("club_code_hash", hashSecret(normPass(clubCode)));
  if (typeof adminPass === "string" && adminPass.trim()) setSetting("admin_pin_hash", hashSecret(normPass(adminPass)));
  if (employees && typeof employees === "object") {
    for (const [id, pass] of Object.entries(employees)) {
      if (typeof pass !== "string") continue;
      const hash = pass.trim() ? hashSecret(normPass(pass)) : null;
      db.prepare("UPDATE employees SET pass_hash = ? WHERE id = ? AND active = 1").run(hash, Number(id));
    }
  }
  res.json({ ok: true });
});

/* ================= state ================= */

const productRow = (p) => ({
  id: p.id, name: p.name, cat: p.cat, unit: p.unit,
  priceLocal: p.price_local, priceTourist: p.price_tourist, stock: p.stock,
});
const memberRow = (m) => ({
  id: m.id, num: m.num, name: m.name, nationality: m.nationality,
  type: m.type, status: m.status, joined: m.joined, sponsor: m.sponsor_num,
  email: m.email || null, phone: m.phone || null, document: m.document || null,
});
const saleWithItems = (s) => ({
  id: s.id, ts: s.ts, memberId: s.member_id, employeeId: s.employee_id,
  employeeName: s.employee_name, payment: s.payment, total: s.total,
  paid: !!s.paid, paidTs: s.paid_ts || null, paidMethod: s.paid_method || null,
  items: db.prepare("SELECT * FROM sale_items WHERE sale_id = ?").all(s.id)
    .map((i) => ({ productId: i.product_id, name: i.name, qty: i.qty, unit: i.unit, price: i.price })),
});

app.get("/api/state", requireDevice, (req, res) => {
  const debts = new Map(
    db.prepare("SELECT member_id, ROUND(SUM(total), 2) d FROM sales WHERE paid = 0 GROUP BY member_id").all()
      .map((r) => [r.member_id, r.d])
  );
  res.json({
    isAdmin: !!req.session.a,
    webhookKey: req.session.a ? WEBHOOK_KEY : undefined,
    products: db.prepare("SELECT * FROM products WHERE active = 1 ORDER BY id").all().map(productRow),
    members: db.prepare("SELECT * FROM members WHERE status != 'baja' ORDER BY id").all()
      .map((m) => ({ ...memberRow(m), debt: debts.get(m.id) || 0 })),
    employees: db.prepare("SELECT id, name, initials, pass_hash FROM employees WHERE active = 1 ORDER BY id").all()
      .map((e) => ({ id: e.id, name: e.name, initials: e.initials, hasPass: !!e.pass_hash })),
    invites: db.prepare("SELECT * FROM invites ORDER BY created DESC").all()
      .map((i) => ({ code: i.code, sponsorNum: i.sponsor_num, sponsorName: i.sponsor_name, created: i.created, usedBy: i.used_by })),
  });
});

/* ================= sales ================= */

app.post("/api/sales", requireDevice, (req, res) => {
  const { memberId, employeeId, payment, items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "empty_cart" });
  if (!["efectivo", "tarjeta", "fiado"].includes(payment)) return res.status(400).json({ error: "bad_payment" });

  const member = db.prepare("SELECT * FROM members WHERE id = ?").get(memberId);
  if (!member || member.status !== "activo") return res.status(400).json({ error: "member_not_active" });

  // employee chooses local/tourist price per sale; falls back to the member's type
  const priceMode = req.body?.priceMode === "turista" ? "turista"
    : req.body?.priceMode === "local" ? "local"
    : (member.type === "turista" ? "turista" : "local");

  let employeeName = "Administrador";
  const empId = Number(employeeId) || 0;
  if (empId !== 0) {
    const emp = db.prepare("SELECT * FROM employees WHERE id = ? AND active = 1").get(empId);
    if (!emp) return res.status(400).json({ error: "bad_employee" });
    employeeName = emp.name;
  } else if (!req.session.a) {
    return res.status(400).json({ error: "bad_employee" });
  }

  db.exec("BEGIN");
  try {
    let total = 0;
    const lines = [];
    // aggregate requested qty per product, then validate stock once per product
    const wanted = new Map();
    for (const it of items) {
      const qty = Number(it.qty);
      if (!Number.isFinite(qty) || qty <= 0) throw { code: 400, error: "bad_qty" };
      wanted.set(it.productId, (wanted.get(it.productId) || 0) + qty);
    }
    for (const [productId, qty] of wanted) {
      const p = db.prepare("SELECT * FROM products WHERE id = ? AND active = 1").get(productId);
      if (!p) throw { code: 400, error: "bad_product" };
      if (qty > p.stock) throw { code: 409, error: "insufficient_stock", product: p.name, stock: p.stock };
      const unitPrice = priceMode === "turista" ? p.price_tourist : p.price_local;
      total += qty * unitPrice;
      lines.push({ productId, name: p.name, qty, unit: p.unit, price: unitPrice });
      db.prepare("UPDATE products SET stock = ROUND(stock - ?, 2) WHERE id = ?").run(qty, productId);
    }
    total = Math.round(total * 100) / 100;

    const now = Date.now();
    const isPaid = payment !== "fiado" ? 1 : 0;
    const info = db.prepare(
      "INSERT INTO sales (ts, member_id, employee_id, employee_name, payment, total, paid, paid_ts, paid_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(now, member.id, empId, employeeName, payment, total, isPaid, isPaid ? now : null, isPaid ? payment : null);
    const saleId = Number(info.lastInsertRowid);
    const insItem = db.prepare(
      "INSERT INTO sale_items (sale_id, product_id, name, qty, unit, price) VALUES (?, ?, ?, ?, ?, ?)"
    );
    for (const l of lines) insItem.run(saleId, l.productId, l.name, l.qty, l.unit, l.price);

    db.exec("COMMIT");
    res.json(saleWithItems(db.prepare("SELECT * FROM sales WHERE id = ?").get(saleId)));
  } catch (e) {
    db.exec("ROLLBACK");
    if (e && e.code) return res.status(e.code).json(e);
    console.error(e);
    res.status(500).json({ error: "internal" });
  }
});

app.get("/api/members/:id/sales", requireDevice, (req, res) => {
  const rows = db.prepare("SELECT * FROM sales WHERE member_id = ? ORDER BY ts DESC LIMIT 100").all(req.params.id);
  res.json(rows.map(saleWithItems));
});

/* settle a member's whole tab (all unpaid sales) */
app.post("/api/members/:id/settle", requireDevice, (req, res) => {
  const method = ["efectivo", "tarjeta"].includes(req.body?.method) ? req.body.method : "efectivo";
  const owed = db.prepare("SELECT ROUND(COALESCE(SUM(total),0),2) t, COUNT(*) n FROM sales WHERE member_id = ? AND paid = 0").get(req.params.id);
  if (!owed.n) return res.status(400).json({ error: "no_debt" });
  db.prepare("UPDATE sales SET paid = 1, paid_ts = ?, paid_method = ? WHERE member_id = ? AND paid = 0")
    .run(Date.now(), method, req.params.id);
  res.json({ ok: true, settled: owed.t, sales: owed.n });
});

/* ================= caja / shift close ================= */

function summarize(rows) {
  let total = 0, cash = 0, card = 0, fiado = 0, grams = 0, units = 0;
  for (const s of rows) {
    total += s.total;
    if (!s.paid) fiado += s.total;
    else if ((s.paid_method || s.payment) === "efectivo") cash += s.total;
    else if ((s.paid_method || s.payment) === "tarjeta") card += s.total;
    const items = db.prepare("SELECT unit, qty FROM sale_items WHERE sale_id = ?").all(s.id);
    for (const i of items) {
      if (i.unit === "g") grams += i.qty; else units += i.qty;
    }
  }
  const r2 = (n) => Math.round(n * 100) / 100;
  return { salesN: rows.length, total: r2(total), cash: r2(cash), card: r2(card), fiado: r2(fiado), grams: r2(grams), units: r2(units) };
}

/* everything sold since the last shift close (or start of today), for the Caja screen */
app.get("/api/caja/open", requireDevice, (req, res) => {
  const startOfDay = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00").getTime();
  const lastClose = db.prepare("SELECT to_ts FROM closures ORDER BY to_ts DESC LIMIT 1").get();
  const from = Math.max(startOfDay, lastClose?.to_ts || 0);
  const rows = db.prepare("SELECT * FROM sales WHERE ts >= ? ORDER BY ts DESC").all(from);
  res.json({ from, sales: rows.map(saleWithItems), summary: summarize(rows) });
});

/* close the shift: snapshot the summary, store it, and email the report */
app.post("/api/caja/close", requireDevice, async (req, res) => {
  const empId = Number(req.body?.employeeId) || 0;
  let employeeName = "Administrador";
  if (empId !== 0) {
    const emp = db.prepare("SELECT * FROM employees WHERE id = ? AND active = 1").get(empId);
    if (!emp) return res.status(400).json({ error: "bad_employee" });
    employeeName = emp.name;
  }
  const now = Date.now();
  const startOfDay = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00").getTime();
  const lastClose = db.prepare("SELECT to_ts FROM closures ORDER BY to_ts DESC LIMIT 1").get();
  const from = Math.max(startOfDay, lastClose?.to_ts || 0);
  const rows = db.prepare("SELECT * FROM sales WHERE ts >= ? AND ts <= ?").all(from, now);
  const s = summarize(rows);
  const day = new Date().toISOString().slice(0, 10);
  const info = db.prepare(
    "INSERT INTO closures (ts, day, employee_id, employee_name, from_ts, to_ts, sales_n, total, cash, card, fiado, grams, units, note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
  ).run(now, day, empId, employeeName, from, now, s.salesN, s.total, s.cash, s.card, s.fiado, s.grams, s.units, String(req.body?.note || "").slice(0, 500) || null);

  const report = [
    "One Life Lanzarote — Cierre de turno",
    `Empleado: ${employeeName}`,
    `Fecha: ${new Date(now).toLocaleString("es-ES")}`,
    "",
    `Ventas: ${s.salesN}`,
    `TOTAL: ${s.total} tk`,
    `Efectivo: ${s.cash} tk`,
    `Tarjeta: ${s.card} tk`,
    `Fiado (pendiente): ${s.fiado} tk`,
    `Gramos: ${s.grams} g`,
    `Sweets/Bebidas: ${s.units} ud`,
  ].join("\n");
  // automatically email the report to the club address
  let emailStatus = "skipped";
  try {
    emailStatus = await sendPlain(process.env.CLOSE_EMAIL || "onelifesocialclub@gmail.com",
      `Cierre de turno ${day} — ${employeeName}`, report);
  } catch (e) { console.error("[close-email]", e.message); emailStatus = "failed"; }

  res.json({ id: Number(info.lastInsertRowid), day, employeeName, from, to: now, ...s, emailStatus, report });
});

/* admin: day-by-day list of shift closes */
app.get("/api/closures", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM closures ORDER BY ts DESC LIMIT 500").all();
  res.json(rows.map((c) => ({
    id: c.id, ts: c.ts, day: c.day, employeeName: c.employee_name,
    from: c.from_ts, to: c.to_ts, salesN: c.sales_n, total: c.total,
    cash: c.cash, card: c.card, fiado: c.fiado, grams: c.grams, units: c.units, note: c.note || null,
  })));
});

/* admin: trigger a Gmail import now and report the result */
app.post("/api/import/run", requireAdmin, async (req, res) => {
  try {
    const r = await runImportOnce();
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: e.message || "import_failed" });
  }
});

/* ================= members / invites ================= */

app.post("/api/invites", requireDevice, (req, res) => {
  const sponsor = db.prepare("SELECT * FROM members WHERE id = ? AND status = 'activo'").get(req.body?.sponsorId);
  if (!sponsor) return res.status(400).json({ error: "bad_sponsor" });
  let code;
  do {
    code = "OL-INV-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  } while (db.prepare("SELECT 1 FROM invites WHERE code = ?").get(code));
  db.prepare("INSERT INTO invites (code, sponsor_num, sponsor_name, created) VALUES (?, ?, ?, ?)")
    .run(code, sponsor.num, sponsor.name, new Date().toISOString().slice(0, 10));
  res.json({ code });
});

function insertApplication({ name, nationality, code, email, phone, document, photo }) {
  let invite = null;
  if (code) {
    invite = db.prepare("SELECT * FROM invites WHERE code = ? AND used_by IS NULL").get(code);
    if (!invite) return { error: "bad_invite" };
  }
  db.exec("BEGIN");
  try {
    db.prepare(
      "INSERT INTO members (num, name, nationality, type, status, joined, sponsor_num, email, phone, document, photo) VALUES (NULL, ?, ?, NULL, 'pendiente', ?, ?, ?, ?, ?, ?)"
    ).run(name, nationality, new Date().toISOString().slice(0, 10), invite ? invite.sponsor_num : null, email || null, phone || null, document || null, photo || null);
    if (invite) db.prepare("UPDATE invites SET used_by = ? WHERE code = ?").run(name, invite.code);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return { ok: true };
}

/* Pull a field from a submission that may be flat JSON, Elementor's
   form_fields[...] map, or a fields[x][value] structure — matched by any of
   several aliases, case/space/punctuation-insensitive. */
function fieldFrom(body, aliases) {
  const bag = {};
  const norm = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, "");
  const add = (obj) => {
    if (!obj || typeof obj !== "object") return;
    for (const [k, v] of Object.entries(obj)) {
      const val = v && typeof v === "object" && "value" in v ? v.value : v;
      if (val != null && typeof val !== "object") bag[norm(k)] = String(val);
    }
  };
  add(body); add(body?.form_fields); add(body?.fields); add(body?.data);
  for (const a of aliases) { const k = norm(a); if (bag[k] && bag[k].trim()) return bag[k].trim(); }
  return "";
}
const firstUrl = (s) => { const m = String(s || "").match(/https?:\/\/[^\s,'"]+/); return m ? m[0] : ""; };

app.post("/api/applications", requireDevice, (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name) return res.status(400).json({ error: "name_required" });
  const r = insertApplication({
    name,
    nationality: String(req.body?.nationality || "").trim() || "—",
    code: String(req.body?.code || "").trim().toUpperCase(),
    email: String(req.body?.email || "").trim(),
    phone: String(req.body?.phone || "").trim(),
    document: String(req.body?.document || "").trim(),
  });
  if (r.error) return res.status(400).json(r);
  res.json(r);
});

/* public web registration (linked from onelifelanzarote.com) */
const regAttempts = new Map(); // ip -> [timestamps]
app.post("/api/public/register", (req, res) => {
  const ip = req.ip || "?";
  const now = Date.now();
  const recent = (regAttempts.get(ip) || []).filter((t) => now - t < 3600_000);
  if (recent.length >= 5) return res.status(429).json({ error: "too_many_requests" });
  recent.push(now);
  regAttempts.set(ip, recent);

  if (String(req.body?.web || "").trim()) return res.json({ ok: true }); // honeypot: silently drop bots
  const name = String(req.body?.name || "").trim().slice(0, 120);
  const phone = String(req.body?.phone || "").trim().slice(0, 40);
  const email = String(req.body?.email || "").trim().slice(0, 120);
  if (!name) return res.status(400).json({ error: "name_required" });
  if (!phone && !email) return res.status(400).json({ error: "contact_required" });
  const r = insertApplication({
    name,
    nationality: String(req.body?.nationality || "").trim().slice(0, 60) || "—",
    code: String(req.body?.code || "").trim().toUpperCase().slice(0, 20),
    email, phone,
    document: String(req.body?.document || "").trim().slice(0, 40),
  });
  if (r.error) return res.status(400).json(r);
  res.json({ ok: true });
});

/* ---- direct website connection (onelifelanzarote.com registration form) ----
   Point the form's "Webhook" action here and every sign-up lands in the app
   instantly as a pending member — selfie included — with no Gmail in between:
     https://club.onelifelanzarote.com/api/hook/register?key=<WEBHOOK_KEY>
   Accepts flat JSON, Elementor form_fields[...], or fields[x][value].
   The key authorises the trusted server-to-server call (no IP throttling). */
/* remember the last ~15 webhook outcomes so the admin can see the pattern
   (which sign-ups arrived, which were skipped as duplicates, etc.) */
function logHook(result) {
  try {
    setSetting("last_hook_result", result);
    const arr = JSON.parse(getSetting("hook_log") || "[]");
    arr.unshift({ t: new Date().toISOString(), result });
    setSetting("hook_log", JSON.stringify(arr.slice(0, 15)));
  } catch { /* ignore */ }
}

app.post("/api/hook/register", async (req, res) => {
  // capture what arrived (any attempt) so the admin can diagnose from /api/hook/last
  try {
    setSetting("last_hook", JSON.stringify({
      t: new Date().toISOString(),
      keyOk: String(req.query.key || req.body?.key || "").trim() === WEBHOOK_KEY,
      contentType: req.headers["content-type"] || "",
      body: req.body,
    }).slice(0, 8000));
  } catch { /* ignore */ }

  const key = String(req.query.key || req.body?.key || "").trim();
  if (key !== WEBHOOK_KEY) return res.status(401).json({ error: "bad_key" });

  const name = fieldFrom(req.body, ["name", "full name", "fullname", "nombre", "nombre completo", "your-name", "form_fields[name]"]).slice(0, 120);
  if (!name) { logHook("name_required"); return res.status(400).json({ error: "name_required" }); }
  const email = fieldFrom(req.body, ["email", "correo", "e-mail", "your-email"]).slice(0, 120);
  const phone = fieldFrom(req.body, ["phone", "phone number", "telefono", "teléfono", "whatsapp", "movil", "móvil", "tel"]).slice(0, 40);
  const nationality = fieldFrom(req.body, ["nationality", "nacionalidad", "country", "pais", "país"]).slice(0, 60) || "—";
  const document = fieldFrom(req.body, ["document", "dni", "nie", "passport", "pasaporte", "id passport number", "id/ passport number", "id", "documento"]).slice(0, 40);
  const selfieUrl = firstUrl(fieldFrom(req.body, ["selfie", "photo", "foto", "upload a selfie", "upload", "image", "picture", "foto/selfie"]));

  // skip anyone we already have
  if (memberExists({ email, document, name })) {
    logHook("duplicate: " + name);
    return res.json({ ok: true, duplicate: true });
  }

  // Create the member NOW (no photo yet) and reply immediately, so the website's
  // form gets a fast answer and doesn't time out. The selfie is fetched in the
  // background and attached a moment later.
  let memberId = null;
  try {
    const info = db.prepare(
      "INSERT INTO members (num, name, nationality, type, status, joined, sponsor_num, email, phone, document, photo) VALUES (NULL, ?, ?, NULL, 'pendiente', ?, NULL, ?, ?, ?, NULL)"
    ).run(name, nationality, new Date().toISOString().slice(0, 10), email || null, phone || null, document || null);
    memberId = Number(info.lastInsertRowid);
    logHook("ok: " + name);
    console.log(`[webhook] registro web: ${name}`);
  } catch (e) {
    logHook("error: " + e.message);
    return res.status(500).json({ error: "server_error" });
  }
  res.json({ ok: true });

  // fetch the selfie afterwards, without holding up the reply. If the download
  // fails (too big / odd type), store the URL itself so the browser can show it.
  if (selfieUrl && memberId) {
    downloadPhoto(selfieUrl)
      .then((photo) => db.prepare("UPDATE members SET photo = ? WHERE id = ?").run(photo || selfieUrl, memberId))
      .catch(() => { try { db.prepare("UPDATE members SET photo = ? WHERE id = ?").run(selfieUrl, memberId); } catch {} });
  }
});

/* diagnostic: open in a browser to see the last submission the form sent, and how
   the app read it — reveals the exact field names to use:
     https://club.onelifelanzarote.com/api/hook/last?key=<WEBHOOK_KEY> */
app.get("/api/hook/last", (req, res) => {
  if (String(req.query.key || "").trim() !== WEBHOOK_KEY) return res.status(401).json({ error: "bad_key" });
  const raw = getSetting("last_hook");
  res.json({
    received: raw ? JSON.parse(raw) : null,
    result: getSetting("last_hook_result") || null,
    recent: JSON.parse(getSetting("hook_log") || "[]"),
    hint: raw ? undefined : "No form submission has reached the app yet.",
  });
});

app.delete("/api/members/:id", requireDevice, (req, res) => {
  const m = db.prepare("SELECT * FROM members WHERE id = ? AND status != 'baja'").get(req.params.id);
  if (!m) return res.status(400).json({ error: "bad_member" });
  db.prepare("UPDATE members SET status = 'baja' WHERE id = ?").run(m.id); // history stays intact
  res.json({ ok: true });
});

/* skip an incoming person we already have (by email, document, or exact name) */
function memberExists({ email, document, name }) {
  if (email && db.prepare("SELECT 1 FROM members WHERE lower(email) = lower(?)").get(email)) return true;
  if (document && db.prepare("SELECT 1 FROM members WHERE upper(document) = upper(?)").get(document)) return true;
  if (name && db.prepare("SELECT 1 FROM members WHERE lower(name) = lower(?) AND status != 'baja'").get(name)) return true;
  return false;
}

/* minimal RFC-4180 CSV parser (handles quotes, commas and newlines in fields) */
function parseCSV(text) {
  const s = String(text).replace(/\r\n?/g, "\n");
  const rows = []; let row = [], field = "", inQ = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/* bulk-import members from a CSV exported from the website (or a spreadsheet).
   Header row is matched by column name; each row becomes a pending member. */
app.post("/api/members/import-csv", requireAdmin, async (req, res) => {
  const rows = parseCSV(req.body?.csv || "");
  if (rows.length < 2) return res.status(400).json({ error: "empty_csv" });
  const norm = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, "");
  const header = rows[0].map(norm);
  const col = (aliases) => { for (const a of aliases) { const j = header.indexOf(norm(a)); if (j >= 0) return j; } return -1; };
  const cols = {
    name: col(["name", "full name", "fullname", "nombre", "nombre completo"]),
    email: col(["email", "correo", "e-mail"]),
    phone: col(["phone", "phone number", "telefono", "teléfono", "whatsapp", "movil", "móvil"]),
    nationality: col(["nationality", "nacionalidad", "country", "pais", "país"]),
    document: col(["document", "dni", "nie", "passport", "pasaporte", "id passport number", "id/ passport number", "id", "documento"]),
    selfie: col(["selfie", "photo", "foto", "upload a selfie", "image", "picture"]),
  };
  if (cols.name < 0) return res.status(400).json({ error: "no_name_column" });
  let imported = 0, skipped = 0;
  for (let r = 1; r < rows.length; r++) {
    const get = (k) => (cols[k] >= 0 ? String(rows[r][cols[k]] || "").trim() : "");
    const name = get("name").slice(0, 120);
    if (!name) { skipped++; continue; }
    const email = get("email").slice(0, 120), document = get("document").slice(0, 40);
    if (memberExists({ email, document, name })) { skipped++; continue; }
    let photo = null;
    const url = firstUrl(get("selfie"));
    if (url) { try { photo = await downloadPhoto(url); } catch { /* no photo */ } }
    try {
      insertApplication({ name, nationality: get("nationality").slice(0, 60) || "—", code: "", email, phone: get("phone").slice(0, 40), document, photo });
      imported++;
    } catch { skipped++; }
  }
  console.log(`[csv] importados ${imported}, saltados ${skipped}`);
  res.json({ imported, skipped });
});

/* set or replace a member's photo (data-URL selfie), e.g. from the counter camera */
app.patch("/api/members/:id/photo", requireDevice, (req, res) => {
  const m = db.prepare("SELECT * FROM members WHERE id = ? AND status != 'baja'").get(req.params.id);
  if (!m) return res.status(400).json({ error: "bad_member" });
  const photo = req.body?.photo;
  if (photo && !PHOTO_RE.test(photo)) return res.status(400).json({ error: "bad_photo" });
  db.prepare("UPDATE members SET photo = ? WHERE id = ?").run(photo || null, m.id);
  res.json({ ok: true });
});

const PHOTO_RE = /^data:image\/(jpeg|jpg|png);base64,[A-Za-z0-9+/=]+$/;

/* direct add by staff: creates an ACTIVE member with number, sends welcome email */
app.post("/api/members", requireDevice, async (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name) return res.status(400).json({ error: "name_required" });
  const type = req.body?.type === "turista" ? "turista" : "local";
  const photo = req.body?.photo && PHOTO_RE.test(req.body.photo) ? req.body.photo : null;
  db.exec("BEGIN");
  let member;
  try {
    const seq = Number(getSetting("member_seq")) + 1;
    setSetting("member_seq", String(seq));
    const num = "OL-" + String(seq).padStart(4, "0");
    const info = db.prepare(
      "INSERT INTO members (num, name, nationality, type, status, joined, sponsor_num, email, phone, photo, document) VALUES (?, ?, ?, ?, 'activo', ?, NULL, ?, ?, ?, ?)"
    ).run(num, name, String(req.body?.nationality || "").trim() || "—", type,
      new Date().toISOString().slice(0, 10),
      String(req.body?.email || "").trim() || null,
      String(req.body?.phone || "").trim() || null, photo,
      String(req.body?.document || "").trim() || null);
    member = db.prepare("SELECT * FROM members WHERE id = ?").get(Number(info.lastInsertRowid));
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    console.error(e);
    return res.status(500).json({ error: "internal" });
  }
  let emailStatus = "no_email";
  try {
    const pdf = await generateCard(member);
    emailStatus = await sendWelcome(member, pdf);
  } catch (e) {
    console.error("[card]", e.message);
    emailStatus = "failed";
  }
  res.json({ member: memberRow(member), emailStatus });
});

/* full detail incl. photo (state list intentionally excludes photos) */
app.get("/api/members/:id", requireDevice, (req, res) => {
  const m = db.prepare("SELECT * FROM members WHERE id = ?").get(req.params.id);
  if (!m) return res.status(404).json({ error: "bad_member" });
  res.json({ ...memberRow(m), photo: m.photo || null });
});

/* consumption/spend aggregates + bucketed series for the profile charts.
   ?days=7..1095 selects the chart/byProduct window (daily ≤31, weekly ≤190, else monthly) */
app.get("/api/members/:id/stats", requireDevice, (req, res) => {
  const memberId = Number(req.params.id);
  const days = Math.min(1095, Math.max(7, Number(req.query.days) || 30));
  const now = Date.now();
  const DAY = 24 * 3600 * 1000;
  const windowStart = now - days * DAY;
  const rows = db.prepare("SELECT * FROM sales WHERE member_id = ? AND ts >= ? ORDER BY ts")
    .all(memberId, Math.min(windowStart, now - 365 * DAY));
  const withGrams = rows.map((s) => ({
    ts: s.ts, total: s.total, paid: s.paid,
    grams: db.prepare("SELECT COALESCE(SUM(qty),0) g FROM sale_items WHERE sale_id = ? AND unit = 'g'").get(s.id).g,
    units: db.prepare("SELECT COALESCE(SUM(qty),0) u FROM sale_items WHERE sale_id = ? AND unit = 'ud'").get(s.id).u,
  }));
  const agg = (d) => {
    const sel = withGrams.filter((s) => s.ts >= now - d * DAY);
    return {
      spent: Math.round(sel.reduce((a, s) => a + s.total, 0) * 100) / 100,
      grams: Math.round(sel.reduce((a, s) => a + s.grams, 0) * 100) / 100,
      units: Math.round(sel.reduce((a, s) => a + s.units, 0) * 100) / 100,
      ops: sel.length,
    };
  };
  const debt = db.prepare("SELECT ROUND(COALESCE(SUM(total),0),2) t FROM sales WHERE member_id = ? AND paid = 0").get(memberId).t;

  // bucketed series across the selected window
  const bucketDays = days <= 31 ? 1 : days <= 190 ? 7 : 30;
  const buckets = Math.ceil(days / bucketDays);
  const series = [];
  for (let b = buckets - 1; b >= 0; b--) {
    const end = now - b * bucketDays * DAY;
    const start = end - bucketDays * DAY;
    const sel = withGrams.filter((s) => s.ts > start && s.ts <= end);
    series.push({
      date: new Date(end).toISOString().slice(0, 10),
      spent: Math.round(sel.reduce((a, s) => a + s.total, 0) * 100) / 100,
      grams: Math.round(sel.reduce((a, s) => a + s.grams, 0) * 100) / 100,
      units: Math.round(sel.reduce((a, s) => a + s.units, 0) * 100) / 100,
    });
  }
  const byProduct = db.prepare(`
    SELECT si.name, si.unit, ROUND(SUM(si.qty), 2) qty, ROUND(SUM(si.qty * si.price), 2) tokens,
           ROUND(SUM(CASE WHEN s.paid = 0 THEN si.qty * si.price ELSE 0 END), 2) owed
    FROM sale_items si JOIN sales s ON s.id = si.sale_id
    WHERE s.member_id = ? AND s.ts >= ?
    GROUP BY si.name, si.unit ORDER BY tokens DESC
  `).all(memberId, windowStart);
  res.json({ d7: agg(7), d30: agg(30), d180: agg(180), d365: agg(365), debt, days, series, daily: series, byProduct });
});

app.get("/api/members/:id/card.pdf", requireDevice, async (req, res) => {
  const m = db.prepare("SELECT * FROM members WHERE id = ?").get(req.params.id);
  if (!m || !m.num) return res.status(404).json({ error: "bad_member" });
  const pdf = await generateCard(m);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="OneLife-${m.num}.pdf"`);
  res.send(pdf);
});

app.post("/api/members/:id/approve", requireDevice, async (req, res) => {
  const type = req.body?.type === "turista" ? "turista" : "local";
  const m = db.prepare("SELECT * FROM members WHERE id = ? AND status = 'pendiente'").get(req.params.id);
  if (!m) return res.status(400).json({ error: "not_pending" });
  db.exec("BEGIN");
  let num;
  try {
    const seq = Number(getSetting("member_seq")) + 1;
    num = "OL-" + String(seq).padStart(4, "0");
    setSetting("member_seq", String(seq));
    db.prepare("UPDATE members SET status = 'activo', type = ?, num = ? WHERE id = ?").run(type, num, m.id);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  // approved members get their card by email too (web/imported applicants)
  let emailStatus = "no_email";
  try {
    const fresh = db.prepare("SELECT * FROM members WHERE id = ?").get(m.id);
    const pdf = await generateCard(fresh);
    emailStatus = await sendWelcome(fresh, pdf);
  } catch (e) {
    console.error("[card]", e.message);
    emailStatus = "failed";
  }
  res.json({ ok: true, num, emailStatus });
});

/* approve every pending member at once (assigns OL numbers, keeps any type
   already set, else uses the given default). No emails sent — fast for big
   imported batches; staff can send a card individually from a profile later. */
app.post("/api/members/approve-all", requireAdmin, (req, res) => {
  const type = req.body?.type === "turista" ? "turista" : "local";
  const pend = db.prepare("SELECT id FROM members WHERE status = 'pendiente' ORDER BY id").all();
  let approved = 0;
  db.exec("BEGIN");
  try {
    let seq = Number(getSetting("member_seq"));
    for (const p of pend) {
      seq += 1;
      const num = "OL-" + String(seq).padStart(4, "0");
      db.prepare("UPDATE members SET status = 'activo', type = COALESCE(type, ?), num = ? WHERE id = ?").run(type, num, p.id);
      approved++;
    }
    setSetting("member_seq", String(seq));
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    console.error("[approve-all]", e.message);
    return res.status(500).json({ error: "internal" });
  }
  console.log(`[approve-all] activados ${approved} socios`);
  res.json({ approved });
});

/* ================= inventory ================= */

const PRODUCT_CATS = ["flores", "hash", "polen", "dry", "comestibles", "bebidas"];

app.post("/api/products", requireDevice, (req, res) => {
  const name = String(req.body?.name || "").trim();
  const cat = req.body?.cat;
  const unit = req.body?.unit;
  const priceLocal = Number(req.body?.priceLocal);
  const priceTourist = Number(req.body?.priceTourist);
  const stock = Number(req.body?.stock ?? 0);
  if (!name) return res.status(400).json({ error: "name_required" });
  if (!PRODUCT_CATS.includes(cat)) return res.status(400).json({ error: "bad_cat" });
  if (!["g", "ud"].includes(unit)) return res.status(400).json({ error: "bad_unit" });
  if (!Number.isFinite(priceLocal) || priceLocal < 0 || !Number.isFinite(priceTourist) || priceTourist < 0) {
    return res.status(400).json({ error: "bad_price" });
  }
  if (!Number.isFinite(stock) || stock < 0) return res.status(400).json({ error: "bad_stock" });
  const info = db.prepare(
    "INSERT INTO products (name, cat, unit, price_local, price_tourist, stock) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(name, cat, unit, priceLocal, priceTourist, Math.round(stock * 100) / 100);
  res.json(productRow(db.prepare("SELECT * FROM products WHERE id = ?").get(Number(info.lastInsertRowid))));
});

app.patch("/api/products/:id", requireDevice, (req, res) => {
  const p = db.prepare("SELECT * FROM products WHERE id = ? AND active = 1").get(req.params.id);
  if (!p) return res.status(400).json({ error: "bad_product" });
  const name = req.body?.name !== undefined ? String(req.body.name).trim() : p.name;
  const priceLocal = req.body?.priceLocal !== undefined ? Number(req.body.priceLocal) : p.price_local;
  const priceTourist = req.body?.priceTourist !== undefined ? Number(req.body.priceTourist) : p.price_tourist;
  if (!name) return res.status(400).json({ error: "name_required" });
  if (!Number.isFinite(priceLocal) || priceLocal < 0 || !Number.isFinite(priceTourist) || priceTourist < 0) {
    return res.status(400).json({ error: "bad_price" });
  }
  db.prepare("UPDATE products SET name = ?, price_local = ?, price_tourist = ? WHERE id = ?")
    .run(name, priceLocal, priceTourist, p.id);
  res.json(productRow(db.prepare("SELECT * FROM products WHERE id = ?").get(p.id)));
});

app.delete("/api/products/:id", requireDevice, (req, res) => {
  const p = db.prepare("SELECT * FROM products WHERE id = ? AND active = 1").get(req.params.id);
  if (!p) return res.status(400).json({ error: "bad_product" });
  db.prepare("UPDATE products SET active = 0 WHERE id = ?").run(p.id); // history in sale_items keeps its snapshot
  res.json({ ok: true });
});

app.post("/api/products/:id/stock", requireDevice, (req, res) => {
  const n = Number(req.body?.amount);
  if (!Number.isFinite(n) || n <= 0) return res.status(400).json({ error: "bad_amount" });
  const p = db.prepare("SELECT * FROM products WHERE id = ? AND active = 1").get(req.params.id);
  if (!p) return res.status(400).json({ error: "bad_product" });
  db.prepare("UPDATE products SET stock = ROUND(stock + ?, 2) WHERE id = ?").run(n, p.id);
  res.json({ ok: true, stock: db.prepare("SELECT stock FROM products WHERE id = ?").get(p.id).stock });
});

/* ================= reports (admin) ================= */

app.get("/api/reports", requireAdmin, (req, res) => {
  const { from, to } = req.query;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from || "") || !/^\d{4}-\d{2}-\d{2}$/.test(to || "")) {
    return res.status(400).json({ error: "bad_range" });
  }
  // interpret range in server-local time
  const fromTs = new Date(from + "T00:00:00").getTime();
  const toTs = new Date(to + "T23:59:59.999").getTime();
  const rows = db.prepare("SELECT * FROM sales WHERE ts BETWEEN ? AND ? ORDER BY ts DESC").all(fromTs, toTs);
  res.json(rows.map(saleWithItems));
});

/* ================= static client ================= */

app.get("/registro", (_req, res) => res.sendFile(join(__dirname, "..", "public", "registro.html")));

const dist = join(__dirname, "..", "..", "client", "dist");
const noCache = (res) => res.setHeader("Cache-Control", "no-cache, must-revalidate");
if (existsSync(dist)) {
  // hashed /assets/* can cache forever; sw.js + index.html must always revalidate
  // so a new deploy is picked up immediately (no stale app stuck on a device)
  app.use(express.static(dist, {
    setHeaders: (res, p) => { if (p.endsWith("sw.js") || p.endsWith("index.html")) noCache(res); },
  }));
  app.get(/^\/(?!api\/).*/, (_req, res) => { noCache(res); res.sendFile(join(dist, "index.html")); });
}

app.listen(PORT, () => {
  console.log(`[server] One Life Club Manager listening on :${PORT}`);
  startImporter();
});
