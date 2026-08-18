import express from "express";
import cookieParser from "cookie-parser";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { db, getSetting, setSetting } from "./db.js";
import { verifySecret, hashSecret, signToken, verifyToken } from "./auth.js";
import { generateCard } from "./card.js";
import { sendWelcome, sendPlain } from "./mailer.js";
import { startImporter, runImportOnce } from "./importer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;
const TOKEN_SECRET = getSetting("token_secret");
const SESSION_DAYS = 180;

const app = express();
app.use(express.json({ limit: "4mb" })); // member selfies arrive as data URLs
app.use(cookieParser());

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

function insertApplication({ name, nationality, code, email, phone, document }) {
  let invite = null;
  if (code) {
    invite = db.prepare("SELECT * FROM invites WHERE code = ? AND used_by IS NULL").get(code);
    if (!invite) return { error: "bad_invite" };
  }
  db.exec("BEGIN");
  try {
    db.prepare(
      "INSERT INTO members (num, name, nationality, type, status, joined, sponsor_num, email, phone, document) VALUES (NULL, ?, ?, NULL, 'pendiente', ?, ?, ?, ?, ?)"
    ).run(name, nationality, new Date().toISOString().slice(0, 10), invite ? invite.sponsor_num : null, email || null, phone || null, document || null);
    if (invite) db.prepare("UPDATE invites SET used_by = ? WHERE code = ?").run(name, invite.code);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return { ok: true };
}

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

app.delete("/api/members/:id", requireDevice, (req, res) => {
  const m = db.prepare("SELECT * FROM members WHERE id = ? AND status != 'baja'").get(req.params.id);
  if (!m) return res.status(400).json({ error: "bad_member" });
  db.prepare("UPDATE members SET status = 'baja' WHERE id = ?").run(m.id); // history stays intact
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
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(join(dist, "index.html")));
}

app.listen(PORT, () => {
  console.log(`[server] One Life Club Manager listening on :${PORT}`);
  startImporter();
});
