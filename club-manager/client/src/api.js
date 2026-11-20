/* Thin fetch wrapper for the club API. All calls use the session cookie.
   In the DEMO build (VITE_DEMO) every call is served by mockApi.js instead. */

import { mockRequest } from "./mockApi.js";

export const DEMO = !!import.meta.env.VITE_DEMO;

async function request(method, path, body) {
  if (DEMO) return mockRequest(method, path, body);
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/* ---- offline support ----
   - GET /api/state is cached so the counter keeps showing members/products offline
   - sales made offline are queued locally and re-sent automatically on reconnect */
const isNetworkError = (e) => !e.status; // no HTTP status → the request never reached the server
let offlineListener = null;
export function setOfflineListener(cb) { offlineListener = cb; }
const notifyOffline = () => { try { offlineListener?.(); } catch { /* ignore */ } };

async function getCached(path) {
  try {
    const d = await request("GET", path);
    try { localStorage.setItem("cache:" + path, JSON.stringify(d)); } catch { /* full */ }
    return d;
  } catch (e) {
    if (isNetworkError(e)) {
      const c = localStorage.getItem("cache:" + path);
      if (c) return { ...JSON.parse(c), _offline: true };
    }
    throw e;
  }
}

const QK = "offline-sales";
const readQ = () => { try { return JSON.parse(localStorage.getItem(QK) || "[]"); } catch { return []; } };
const writeQ = (q) => { try { localStorage.setItem(QK, JSON.stringify(q)); } catch { /* ignore */ } notifyOffline(); };
export const queuedCount = () => readQ().length;

/* register a sale; if offline, queue it and report back as queued */
export async function postSale(body, total) {
  if (DEMO) return request("POST", "/api/sales", body);
  try {
    return await request("POST", "/api/sales", body);
  } catch (e) {
    if (isNetworkError(e)) {
      const q = readQ();
      q.push({ body, total, ts: Date.now() });
      writeQ(q);
      return { queued: true, total };
    }
    throw e; // real server error (e.g. insufficient stock) — surface it
  }
}

/* re-send queued sales; drops any the server rejects with a reason */
export async function flushSales() {
  if (DEMO) return { sent: 0, left: 0 };
  let q = readQ();
  if (!q.length) return { sent: 0, left: 0 };
  const left = [];
  let sent = 0;
  for (const item of q) {
    try { await request("POST", "/api/sales", item.body); sent++; }
    catch (e) { if (isNetworkError(e)) left.push(item); /* else: server rejected, drop it */ }
  }
  writeQ(left);
  return { sent, left: left.length };
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => flushSales().catch(() => {}));
  setInterval(() => { if (navigator.onLine) flushSales().catch(() => {}); }, 20000);
}

export const api = {
  get: (path) => request("GET", path),
  getCached,
  post: (path, body) => request("POST", path, body ?? {}),
  patch: (path, body) => request("PATCH", path, body ?? {}),
  del: (path) => request("DELETE", path),
};
