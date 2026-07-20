/* In-browser clone of the server API for the DEMO build (VITE_DEMO).
   Mirrors server/src/index.js logic; state persists in localStorage.
   Demo credentials: club code "onelife", admin PIN "1234". */

const KEY = "onelife-demo-v1";
const CATS = ["flores", "hash", "polen", "dry", "comestibles", "bebidas"];
let mem = null; // fallback when localStorage is unavailable

const isoOf = (ts) => new Date(ts).toISOString().slice(0, 10);

function seed() {
  const products = [
    [1, "Amnesia Haze", "flores", "g", 7, 10, 48], [2, "Critical", "flores", "g", 6, 9, 32],
    [3, "Gorilla Glue", "flores", "g", 8, 12, 21], [4, "Hash Marroquí", "hash", "g", 6, 9, 40],
    [5, "Hash Premium", "hash", "g", 9, 13, 15], [6, "Polen Clásico", "polen", "g", 5, 8, 55],
    [7, "Dry Sift", "dry", "g", 10, 14, 9], [8, "Space Cookie", "comestibles", "ud", 5, 7, 24],
    [9, "Brownie", "comestibles", "ud", 5, 7, 18], [10, "Gominolas", "comestibles", "ud", 4, 6, 30],
    [11, "Agua", "bebidas", "ud", 1, 1.5, 60], [12, "Refresco", "bebidas", "ud", 1.5, 2, 44],
  ].map(([id, name, cat, unit, priceLocal, priceTourist, stock]) => ({ id, name, cat, unit, priceLocal, priceTourist, stock, active: 1 }));

  const members = [
    [1, "OL-0001", "Carlos Medina", "España", "local", "2026-03-12", null, "+34 600 123 451", null],
    [2, "OL-0002", "Laura Betancor", "España", "local", "2026-03-15", null, "+34 600 123 452", "laura@example.com"],
    [3, "OL-0003", "James Whitfield", "Reino Unido", "turista", "2026-06-28", "OL-0001", "+44 7700 900123", null],
    [4, "OL-0004", "Anna Keller", "Alemania", "turista", "2026-07-01", "OL-0002", null, "anna@example.com"],
    [5, "OL-0005", "Yeray Cabrera", "España", "local", "2026-04-02", null, "+34 600 123 455", null],
  ].map(([id, num, name, nationality, type, joined, sponsor, phone, email]) =>
    ({ id, num, name, nationality, type, status: "activo", joined, sponsor, phone, email }));

  const employees = [
    { id: 1, name: "Mattia", initials: "MA" },
    { id: 2, name: "Daimond", initials: "DA" },
    { id: 3, name: "Max", initials: "MX" },
  ];

  // realistic-looking recent sales so Informes has something to show
  const sales = [];
  let saleId = 1;
  const now = new Date();
  for (let back = 9; back >= 0; back--) {
    const n = 2 + ((back * 7) % 4); // 2-5 sales/day, deterministic
    for (let k = 0; k < n; k++) {
      const d = new Date(now);
      d.setDate(now.getDate() - back);
      d.setHours(12 + ((k * 3) % 10), (k * 17) % 60, 0, 0);
      const m = members[(back + k) % members.length];
      const emp = employees[(back + k) % employees.length];
      const p = products[(back * 3 + k * 5) % 7]; // gram products mostly
      const qty = [1, 2, 3.5, 5, 1.5][(back + k) % 5];
      const price = m.type === "turista" ? p.priceTourist : p.priceLocal;
      const items = [{ productId: p.id, name: p.name, qty, unit: p.unit, price }];
      if ((back + k) % 3 === 0) {
        const p2 = products[7 + ((back + k) % 5)];
        const price2 = m.type === "turista" ? p2.priceTourist : p2.priceLocal;
        items.push({ productId: p2.id, name: p2.name, qty: 1, unit: p2.unit, price: price2 });
      }
      const total = Math.round(items.reduce((s, i) => s + i.qty * i.price, 0) * 100) / 100;
      sales.push({ id: saleId++, ts: d.getTime(), memberId: m.id, employeeId: emp.id, employeeName: emp.name, payment: (back + k) % 3 === 1 ? "tarjeta" : "efectivo", items, total });
    }
  }

  return {
    products, members, employees, invites: [], sales,
    memberSeq: 5, productSeq: 12, saleSeq: saleId,
    auth: { device: false, admin: false },
  };
}

function load() {
  if (mem) return mem;
  try {
    const raw = localStorage.getItem(KEY);
    mem = raw ? JSON.parse(raw) : seed();
  } catch {
    mem = seed();
  }
  return mem;
}
function save(s) {
  mem = s;
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* memory only */ }
}

const fail = (status, error, extra) => {
  const e = new Error(error);
  e.status = status;
  e.data = { error, ...extra };
  throw e;
};

const clone = (x) => JSON.parse(JSON.stringify(x));

export async function mockRequest(method, path, body) {
  const s = load();
  const [route, query] = path.split("?");
  const q = Object.fromEntries(new URLSearchParams(query || ""));
  const needDevice = () => { if (!s.auth.device) fail(401, "device_not_authorized"); };
  const needAdmin = () => { needDevice(); if (!s.auth.admin) fail(403, "admin_required"); };
  let m;

  if (method === "POST" && route === "/api/auth/device") {
    if (String(body?.code) !== "onelife") fail(401, "bad_code");
    s.auth.device = true; save(s); return { ok: true };
  }
  if (method === "POST" && route === "/api/auth/admin") {
    needDevice();
    if (String(body?.pin) !== "1234") fail(401, "bad_pin");
    s.auth.admin = true; save(s); return { ok: true };
  }
  if (method === "POST" && route === "/api/auth/admin/logout") {
    needDevice(); s.auth.admin = false; save(s); return { ok: true };
  }
  if (method === "GET" && route === "/api/state") {
    needDevice();
    return clone({
      isAdmin: s.auth.admin,
      products: s.products.filter((p) => p.active),
      members: s.members.filter((x) => x.status !== "baja"),
      employees: s.employees,
      invites: s.invites,
    });
  }
  if (method === "POST" && route === "/api/sales") {
    needDevice();
    const { memberId, employeeId, payment, items } = body || {};
    if (!Array.isArray(items) || !items.length) fail(400, "empty_cart");
    const member = s.members.find((x) => x.id === memberId && x.status === "activo");
    if (!member) fail(400, "member_not_active");
    const empId = Number(employeeId) || 0;
    let employeeName = "Administrador";
    if (empId !== 0) {
      const emp = s.employees.find((e) => e.id === empId);
      if (!emp) fail(400, "bad_employee");
      employeeName = emp.name;
    } else if (!s.auth.admin) fail(400, "bad_employee");
    const wanted = new Map();
    for (const it of items) {
      const qty = Number(it.qty);
      if (!Number.isFinite(qty) || qty <= 0) fail(400, "bad_qty");
      wanted.set(it.productId, (wanted.get(it.productId) || 0) + qty);
    }
    let total = 0;
    const lines = [];
    for (const [pid, qty] of wanted) {
      const p = s.products.find((x) => x.id === pid && x.active);
      if (!p) fail(400, "bad_product");
      if (qty > p.stock) fail(409, "insufficient_stock", { product: p.name, stock: p.stock });
      const price = member.type === "turista" ? p.priceTourist : p.priceLocal;
      total += qty * price;
      lines.push({ productId: pid, name: p.name, qty, unit: p.unit, price });
    }
    for (const [pid, qty] of wanted) {
      const p = s.products.find((x) => x.id === pid);
      p.stock = Math.round((p.stock - qty) * 100) / 100;
    }
    const sale = { id: s.saleSeq++, ts: Date.now(), memberId: member.id, employeeId: empId, employeeName, payment, items: lines, total: Math.round(total * 100) / 100 };
    s.sales.push(sale); save(s);
    return clone(sale);
  }
  if (method === "GET" && (m = route.match(/^\/api\/members\/(\d+)\/sales$/))) {
    needDevice();
    return clone(s.sales.filter((x) => x.memberId === Number(m[1])).sort((a, b) => b.ts - a.ts).slice(0, 100));
  }
  if (method === "GET" && (m = route.match(/^\/api\/members\/(\d+)\/stats$/))) {
    needDevice();
    const id = Number(m[1]);
    const now = Date.now();
    const DAY = 24 * 3600 * 1000;
    const rows = s.sales.filter((x) => x.memberId === id).map((x) => ({
      ts: x.ts, total: x.total,
      grams: x.items.filter((i) => i.unit === "g").reduce((a, i) => a + i.qty, 0),
    }));
    const agg = (days) => {
      const sel = rows.filter((r) => r.ts >= now - days * DAY);
      return {
        spent: Math.round(sel.reduce((a, r) => a + r.total, 0) * 100) / 100,
        grams: Math.round(sel.reduce((a, r) => a + r.grams, 0) * 100) / 100,
        ops: sel.length,
      };
    };
    const daily = [];
    for (let back = 29; back >= 0; back--) {
      const iso = new Date(now - back * DAY).toISOString().slice(0, 10);
      const dayStart = new Date(iso + "T00:00:00").getTime();
      const sel = rows.filter((r) => r.ts >= dayStart && r.ts < dayStart + DAY);
      daily.push({
        date: iso,
        spent: Math.round(sel.reduce((a, r) => a + r.total, 0) * 100) / 100,
        grams: Math.round(sel.reduce((a, r) => a + r.grams, 0) * 100) / 100,
      });
    }
    const byProductMap = {};
    for (const sale of s.sales.filter((x) => x.memberId === id && x.ts >= now - 365 * DAY)) {
      for (const i of sale.items) {
        const k = i.name;
        byProductMap[k] = byProductMap[k] || { name: i.name, unit: i.unit, qty: 0, tokens: 0 };
        byProductMap[k].qty += i.qty;
        byProductMap[k].tokens += i.qty * i.price;
      }
    }
    const byProduct = Object.values(byProductMap)
      .map((p) => ({ ...p, qty: Math.round(p.qty * 100) / 100, tokens: Math.round(p.tokens * 100) / 100 }))
      .sort((a, b) => b.tokens - a.tokens);
    return { d7: agg(7), d30: agg(30), d180: agg(180), d365: agg(365), daily, byProduct };
  }
  if (method === "GET" && (m = route.match(/^\/api\/members\/(\d+)$/))) {
    needDevice();
    const mem2 = s.members.find((x) => x.id === Number(m[1]));
    if (!mem2) fail(404, "bad_member");
    return clone({ ...mem2, photo: mem2.photo || null });
  }
  if (method === "POST" && route === "/api/members") {
    needDevice();
    const name = String(body?.name || "").trim();
    if (!name) fail(400, "name_required");
    s.memberSeq += 1;
    const member = {
      id: Date.now(), num: "OL-" + String(s.memberSeq).padStart(4, "0"), name,
      nationality: String(body?.nationality || "").trim() || "—",
      type: body?.type === "turista" ? "turista" : "local",
      status: "activo", joined: isoOf(Date.now()), sponsor: null,
      phone: String(body?.phone || "").trim() || null,
      email: String(body?.email || "").trim() || null,
      document: String(body?.document || "").trim() || null,
      photo: typeof body?.photo === "string" && body.photo.startsWith("data:image/") ? body.photo : null,
    };
    s.members.push(member); save(s);
    return clone({ member, emailStatus: member.email ? "not_configured" : "no_email" });
  }
  if (method === "POST" && route === "/api/invites") {
    needDevice();
    const sponsor = s.members.find((x) => x.id === Number(body?.sponsorId) && x.status === "activo");
    if (!sponsor) fail(400, "bad_sponsor");
    const code = "OL-INV-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    s.invites.push({ code, sponsorNum: sponsor.num, sponsorName: sponsor.name, created: isoOf(Date.now()), usedBy: null });
    save(s);
    return { code };
  }
  if (method === "POST" && route === "/api/applications") {
    needDevice();
    const name = String(body?.name || "").trim();
    if (!name) fail(400, "name_required");
    const code = String(body?.code || "").trim().toUpperCase();
    let invite = null;
    if (code) {
      invite = s.invites.find((i) => i.code === code && !i.usedBy);
      if (!invite) fail(400, "bad_invite");
      invite.usedBy = name;
    }
    s.members.push({
      id: Date.now(), num: null, name, nationality: String(body?.nationality || "").trim() || "—",
      type: null, status: "pendiente", joined: isoOf(Date.now()), sponsor: invite ? invite.sponsorNum : null,
      phone: String(body?.phone || "").trim() || null, email: String(body?.email || "").trim() || null,
      document: String(body?.document || "").trim() || null,
    });
    save(s);
    return { ok: true };
  }
  if (method === "POST" && (m = route.match(/^\/api\/members\/(\d+)\/approve$/))) {
    needDevice();
    const mem2 = s.members.find((x) => x.id === Number(m[1]) && x.status === "pendiente");
    if (!mem2) fail(400, "not_pending");
    s.memberSeq += 1;
    mem2.status = "activo";
    mem2.type = body?.type === "turista" ? "turista" : "local";
    mem2.num = "OL-" + String(s.memberSeq).padStart(4, "0");
    save(s);
    return { ok: true, num: mem2.num };
  }
  if (method === "DELETE" && (m = route.match(/^\/api\/members\/(\d+)$/))) {
    needDevice();
    const mem2 = s.members.find((x) => x.id === Number(m[1]) && x.status !== "baja");
    if (!mem2) fail(400, "bad_member");
    mem2.status = "baja"; save(s);
    return { ok: true };
  }
  if (method === "POST" && route === "/api/products") {
    needDevice();
    const name = String(body?.name || "").trim();
    if (!name) fail(400, "name_required");
    if (!CATS.includes(body?.cat)) fail(400, "bad_cat");
    if (!["g", "ud"].includes(body?.unit)) fail(400, "bad_unit");
    const pl = Number(body?.priceLocal), pt = Number(body?.priceTourist), st = Number(body?.stock ?? 0);
    if (!Number.isFinite(pl) || pl < 0 || !Number.isFinite(pt) || pt < 0) fail(400, "bad_price");
    const p = { id: ++s.productSeq, name, cat: body.cat, unit: body.unit, priceLocal: pl, priceTourist: pt, stock: Math.round((Number.isFinite(st) ? st : 0) * 100) / 100, active: 1 };
    s.products.push(p); save(s);
    return clone(p);
  }
  if (method === "PATCH" && (m = route.match(/^\/api\/products\/(\d+)$/))) {
    needDevice();
    const p = s.products.find((x) => x.id === Number(m[1]) && x.active);
    if (!p) fail(400, "bad_product");
    const name = body?.name !== undefined ? String(body.name).trim() : p.name;
    if (!name) fail(400, "name_required");
    const pl = body?.priceLocal !== undefined ? Number(body.priceLocal) : p.priceLocal;
    const pt = body?.priceTourist !== undefined ? Number(body.priceTourist) : p.priceTourist;
    if (!Number.isFinite(pl) || pl < 0 || !Number.isFinite(pt) || pt < 0) fail(400, "bad_price");
    Object.assign(p, { name, priceLocal: pl, priceTourist: pt }); save(s);
    return clone(p);
  }
  if (method === "DELETE" && (m = route.match(/^\/api\/products\/(\d+)$/))) {
    needDevice();
    const p = s.products.find((x) => x.id === Number(m[1]) && x.active);
    if (!p) fail(400, "bad_product");
    p.active = 0; save(s);
    return { ok: true };
  }
  if (method === "POST" && (m = route.match(/^\/api\/products\/(\d+)\/stock$/))) {
    needDevice();
    const n = Number(body?.amount);
    if (!Number.isFinite(n) || n <= 0) fail(400, "bad_amount");
    const p = s.products.find((x) => x.id === Number(m[1]) && x.active);
    if (!p) fail(400, "bad_product");
    p.stock = Math.round((p.stock + n) * 100) / 100; save(s);
    return { ok: true, stock: p.stock };
  }
  if (method === "GET" && route === "/api/reports") {
    needAdmin();
    const fromTs = new Date(q.from + "T00:00:00").getTime();
    const toTs = new Date(q.to + "T23:59:59.999").getTime();
    return clone(s.sales.filter((x) => x.ts >= fromTs && x.ts <= toTs).sort((a, b) => b.ts - a.ts));
  }
  fail(404, "not_found");
}
