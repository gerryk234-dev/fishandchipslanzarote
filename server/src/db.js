import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hashSecret, randomHex } from "./auth.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.CLUB_DATA_DIR || join(__dirname, "..", "data");
mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(join(DATA_DIR, "club.db"));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    initials TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    cat TEXT NOT NULL,
    unit TEXT NOT NULL,
    price_local REAL NOT NULL,
    price_tourist REAL NOT NULL,
    stock REAL NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    num TEXT,
    name TEXT NOT NULL,
    nationality TEXT NOT NULL DEFAULT '—',
    type TEXT,                          -- 'local' | 'turista' | NULL while pending
    status TEXT NOT NULL,               -- 'pendiente' | 'activo' | 'baja'
    joined TEXT NOT NULL,               -- ISO date
    sponsor_num TEXT
  );
  CREATE TABLE IF NOT EXISTS invites (
    code TEXT PRIMARY KEY,
    sponsor_num TEXT NOT NULL,
    sponsor_name TEXT NOT NULL,
    created TEXT NOT NULL,
    used_by TEXT
  );
  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts INTEGER NOT NULL,                -- epoch ms
    member_id INTEGER NOT NULL REFERENCES members(id),
    employee_id INTEGER NOT NULL,       -- 0 = admin
    employee_name TEXT NOT NULL,
    payment TEXT NOT NULL,              -- 'efectivo' | 'tarjeta'
    total REAL NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    qty REAL NOT NULL,
    unit TEXT NOT NULL,
    price REAL NOT NULL                 -- unit price charged (snapshot)
  );
  CREATE INDEX IF NOT EXISTS idx_sales_ts ON sales(ts);
  CREATE INDEX IF NOT EXISTS idx_sales_member ON sales(member_id);
`);

export const getSetting = (key) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? row.value : null;
};
export const setSetting = (key, value) => {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, String(value));
};

/* ---- first-run seed ---- */
const seeded = getSetting("seeded");
if (!seeded) {
  const seedProducts = [
    ["Amnesia Haze", "flores", "g", 7, 10, 48],
    ["Critical", "flores", "g", 6, 9, 32],
    ["Gorilla Glue", "flores", "g", 8, 12, 21],
    ["Hash Marroquí", "hash", "g", 6, 9, 40],
    ["Hash Premium", "hash", "g", 9, 13, 15],
    ["Polen Clásico", "polen", "g", 5, 8, 55],
    ["Dry Sift", "dry", "g", 10, 14, 9],
    ["Space Cookie", "comestibles", "ud", 5, 7, 24],
    ["Brownie", "comestibles", "ud", 5, 7, 18],
    ["Gominolas", "comestibles", "ud", 4, 6, 30],
    ["Agua", "bebidas", "ud", 1, 1.5, 60],
    ["Refresco", "bebidas", "ud", 1.5, 2, 44],
  ];
  const insP = db.prepare(
    "INSERT INTO products (name, cat, unit, price_local, price_tourist, stock) VALUES (?, ?, ?, ?, ?, ?)"
  );
  for (const p of seedProducts) insP.run(...p);

  const seedMembers = [
    ["OL-0001", "Carlos Medina", "España", "local", "activo", "2026-03-12", null],
    ["OL-0002", "Laura Betancor", "España", "local", "activo", "2026-03-15", null],
    ["OL-0003", "James Whitfield", "Reino Unido", "turista", "activo", "2026-06-28", "OL-0001"],
    ["OL-0004", "Anna Keller", "Alemania", "turista", "activo", "2026-07-01", "OL-0002"],
    ["OL-0005", "Yeray Cabrera", "España", "local", "activo", "2026-04-02", null],
  ];
  const insM = db.prepare(
    "INSERT INTO members (num, name, nationality, type, status, joined, sponsor_num) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  for (const m of seedMembers) insM.run(...m);

  for (const [name, initials] of [["Mattia", "MA"], ["Daimond", "DA"], ["Max", "MX"]]) {
    db.prepare("INSERT INTO employees (name, initials) VALUES (?, ?)").run(name, initials);
  }

  setSetting("member_seq", "5");
  setSetting("club_code_hash", hashSecret(process.env.CLUB_CODE || "onelife"));
  setSetting("admin_pin_hash", hashSecret(process.env.ADMIN_PIN || "1234"));
  setSetting("token_secret", randomHex(32));
  setSetting("seeded", "1");
  setSetting("employees_v2", "1");
  console.log(`[db] first run: seeded demo data (club code: ${process.env.CLUB_CODE ? "from CLUB_CODE env" : "onelife"} · admin PIN: ${process.env.ADMIN_PIN ? "from ADMIN_PIN env" : "1234"})`);
}

/* ---- migrations for databases created before these features ---- */
if (!getSetting("employees_v2")) {
  db.exec("UPDATE employees SET active = 0");
  for (const [name, initials] of [["Mattia", "MA"], ["Daimond", "DA"], ["Max", "MX"]]) {
    db.prepare("INSERT INTO employees (name, initials) VALUES (?, ?)").run(name, initials);
  }
  setSetting("employees_v2", "1");
  console.log("[db] migrated staff list to: Mattia, Daimond, Max");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS closures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts INTEGER NOT NULL,                -- epoch ms of the close
    day TEXT NOT NULL,                  -- ISO date the shift covers
    employee_id INTEGER NOT NULL,
    employee_name TEXT NOT NULL,
    from_ts INTEGER NOT NULL,           -- first sale included
    to_ts INTEGER NOT NULL,             -- close moment
    sales_n INTEGER NOT NULL,
    total REAL NOT NULL,               -- tokens
    cash REAL NOT NULL,
    card REAL NOT NULL,
    fiado REAL NOT NULL,
    grams REAL NOT NULL,
    units INTEGER NOT NULL,            -- sweets/edibles/drinks count
    note TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_closures_day ON closures(day);
`);

const memberCols = db.prepare("SELECT name FROM pragma_table_info('members')").all().map((c) => c.name);
if (!memberCols.includes("email")) db.exec("ALTER TABLE members ADD COLUMN email TEXT");
if (!memberCols.includes("phone")) db.exec("ALTER TABLE members ADD COLUMN phone TEXT");
if (!memberCols.includes("photo")) db.exec("ALTER TABLE members ADD COLUMN photo TEXT"); // data-URL selfie
if (!memberCols.includes("document")) db.exec("ALTER TABLE members ADD COLUMN document TEXT"); // ID/passport number

const saleCols = db.prepare("SELECT name FROM pragma_table_info('sales')").all().map((c) => c.name);
if (!saleCols.includes("paid")) {
  // fiado (tab) support: unpaid sales accumulate as member debt until settled
  db.exec("ALTER TABLE sales ADD COLUMN paid INTEGER NOT NULL DEFAULT 1");
  db.exec("ALTER TABLE sales ADD COLUMN paid_ts INTEGER");
  db.exec("ALTER TABLE sales ADD COLUMN paid_method TEXT");
  db.exec("UPDATE sales SET paid_ts = ts, paid_method = payment WHERE paid = 1");
}

const empCols = db.prepare("SELECT name FROM pragma_table_info('employees')").all().map((c) => c.name);
if (!empCols.includes("pass_hash")) db.exec("ALTER TABLE employees ADD COLUMN pass_hash TEXT"); // per-employee login password

/* ---- default passwords (applied ONCE per database) ----
   So the club has working logins the moment it deploys — no cPanel steps needed.
   Stored as scrypt hashes; the plain text never appears here. After this, the admin
   can change any password from the in-app "Contraseñas" screen and it will stick
   (this block never runs again, thanks to the pw_defaults_v1 marker). Environment
   variables (below) still override these on every startup if you ever set them. */
if (!getSetting("pw_defaults_v2")) {
  const DEFAULT_CLUB  = "84e720505ee17848f40d1dc9b98b7f09:ef01d61abc604cc9aa6fc2e94f2a7ecbd481f60026cb1c85155e9c6a98ec03ac";
  const DEFAULT_ADMIN = "8009b48a40274e05b6d45e21c1a957a0:bba860459f48394019e14bd1014307dac1c943458cedd91d4f68b92353c18916";
  const DEFAULT_EMP = {
    MATTIA:  "d0a740e4bf10f44fd1548e1c3694b4e8:6de33a560726bf3f3a4410b1a852102f2966177112f0584c389bdc73608d260f",
    MAX:     "c16aac13380aa8a3f82d0e9cbb7713d6:0d1314334f2de5d65d8a68f5ca7fb120c1b862b643a8896df179e32b293a61af",
    DAIMOND: "5428986b05decba36be460796b4f8237:b4e0c1e9ee49afc509aedf10beb66a8a223f17f27b41e7df9807e15dee4d59f1",
  };
  setSetting("club_code_hash", DEFAULT_CLUB);
  setSetting("admin_pin_hash", DEFAULT_ADMIN);
  const normName = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  for (const emp of db.prepare("SELECT id, name FROM employees WHERE active = 1").all()) {
    const h = DEFAULT_EMP[normName(emp.name)];
    if (h) db.prepare("UPDATE employees SET pass_hash = ? WHERE id = ?").run(h, emp.id);
  }
  setSetting("pw_defaults_v1", "1");
  setSetting("pw_defaults_v2", "1");
  console.log("[db] applied club/admin/employee passwords (change them in-app under Contraseñas)");
}

/* ---- passwords are controlled from cPanel environment variables ----
   Applied on EVERY startup so they can be changed without shell access:
   just edit the env var in cPanel and restart the Node app.
     CLUB_CODE            device / general password
     ADMIN_PIN            admin password (letters + numbers allowed)
     EMP_PASS_<NAME>      per-employee password, e.g. EMP_PASS_MATTIA
   Values are hashed (scrypt) — the plain text never touches the database. */
const norm = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
if (process.env.CLUB_CODE) setSetting("club_code_hash", hashSecret(process.env.CLUB_CODE));
if (process.env.ADMIN_PIN) setSetting("admin_pin_hash", hashSecret(process.env.ADMIN_PIN));
for (const emp of db.prepare("SELECT id, name FROM employees WHERE active = 1").all()) {
  const v = process.env[`EMP_PASS_${norm(emp.name)}`];
  if (v) db.prepare("UPDATE employees SET pass_hash = ? WHERE id = ?").run(hashSecret(v), emp.id);
}
