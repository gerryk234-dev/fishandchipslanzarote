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
  console.log("[db] first run: seeded demo data (club code: onelife · admin PIN: 1234 — change with npm run set-secrets)");
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

const memberCols = db.prepare("SELECT name FROM pragma_table_info('members')").all().map((c) => c.name);
if (!memberCols.includes("email")) db.exec("ALTER TABLE members ADD COLUMN email TEXT");
if (!memberCols.includes("phone")) db.exec("ALTER TABLE members ADD COLUMN phone TEXT");
