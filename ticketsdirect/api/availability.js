// GET /api/availability?id=<WordPress trip id> — live dates for the booking panel (Vercel function).
// Proxies WP Travel Engine's public availability endpoint, trims it to what the panel needs and
// caches it briefly at the edge so a busy tour page doesn't hit WordPress on every view.
import path from "node:path";
import { loadCatalog } from "../src/lib/catalog.mjs";

const WP = (process.env.WP_URL || "https://excursionsticketsdirect.com").replace(/\/$/, "");
const DAYS_AHEAD = 180;
const { tours } = loadCatalog(path.join(process.cwd(), "src", "data"));
const tripIds = new Set(tours.map((t) => String(t.id)));

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  const id = String(req.query?.id ?? "");
  if (!tripIds.has(id)) return res.status(404).json({ error: "unknown_trip" });

  let raw;
  try {
    const r = await fetch(`${WP}/wp-json/wptravelengine/v3/trips/${id}/dates`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(String(r.status));
    raw = await r.json();
  } catch (err) {
    console.error("availability_upstream", id, err.message);
    return res.status(502).json({ error: "availability_unavailable" });
  }

  const today = new Date().toISOString().slice(0, 10);
  const until = new Date(Date.now() + DAYS_AHEAD * 864e5).toISOString().slice(0, 10);
  const packages = (Array.isArray(raw) ? raw : []).map((entry) => ({
    id: entry.package?.id,
    name: entry.package?.name || "",
    dates: Object.entries(entry.dates || {})
      .filter(([d]) => d >= today && d <= until)
      .map(([date, v]) => ({
        date,
        times: Array.isArray(v.times) ? v.times.map((t) => (typeof t === "string" ? t : t?.time || t?.start || null)).filter(Boolean) : [],
        seatsLeft: v.seats === "" || v.seats == null ? null : Number(v.seats),
        prices: (v.pricing || []).map((p) => ({ id: p.id, label: p.label, price: Number(p.price) || 0 })),
      }))
      .filter((d) => d.seatsLeft === null || d.seatsLeft > 0),
  }));

  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  return res.status(200).json({ id: Number(id), packages });
}
