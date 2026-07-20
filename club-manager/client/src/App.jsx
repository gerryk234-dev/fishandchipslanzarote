import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { api, DEMO } from "./api.js";
import { useScale } from "./scale.js";

const DemoBadge = () => DEMO ? (
  <div className="mono" style={{ position: "fixed", top: 8, right: 8, zIndex: 70, background: "#4A3A22", color: "#E3B04B", fontSize: 11, letterSpacing: 1, padding: "4px 9px", borderRadius: 6, fontWeight: 800, pointerEvents: "none" }}>
    DEMO · DATOS DE PRUEBA
  </div>
) : null;

/* ========= ONE LIFE LANZAROTE — Club Manager V3 =========
   Multi-device edition: todos los datos viven en el servidor.
   - Cada dispositivo se autoriza una vez con el código del club
   - PIN de administrador verificado en el servidor
   - Los mostradores se sincronizan solos (sondeo cada 15 s)
========================================================== */

const C = {
  bg: "#171C15", surface: "#20261D", surface2: "#272E23", line: "#3D4838",
  text: "#FFFFFF", muted: "#C6CFBB", green: "#9CCC7B", greenDark: "#3E5233",
  amber: "#EDBD58", red: "#E07E5C", blue: "#8FB8D9",
};

const CATS = [
  { id: "flores", label: "Weed" }, { id: "hash", label: "Hash" },
  { id: "polen", label: "Polen" }, { id: "dry", label: "Dry" },
  { id: "comestibles", label: "Sweets & Cookies" }, { id: "bebidas", label: "Bebidas" },
];

const POLL_MS = 15000;
const todayISO = () => new Date().toISOString().slice(0, 10);
/* the club charges in tokens (1 tk = 1 €) — all amounts display as tokens */
const eur = (n) => `${n.toLocaleString("es-ES", { maximumFractionDigits: 2 })} tk`;
const timeStr = (d) => new Date(d).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
const dateES = (iso) => new Date(iso + "T12:00").toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
const isoOf = (ts) => new Date(ts).toISOString().slice(0, 10);

/* ---------- styles ---------- */
const S = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
    * { box-sizing: border-box; } body { margin: 0; font-weight: 500; }
    button, input, select { font-weight: 700; }
    ::selection { background: ${C.greenDark}; }
    .mono { font-family: 'IBM Plex Mono', monospace; }
    button { font-family: 'Outfit', sans-serif; cursor: pointer; }
    input, select { font-family: 'Outfit', sans-serif; }
    input:focus, select:focus, button:focus-visible { outline: 2px solid ${C.green}; outline-offset: 2px; }
    .row:hover { background: ${C.surface2}; }
    .fadein { animation: fade .25s ease; }
    @keyframes fade { from { opacity: 0; transform: translateY(4px);} to { opacity: 1; transform: none;} }
    @media (prefers-reduced-motion: reduce) { .fadein { animation: none; } }
    .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .hamburger { display: none; }
    .drawer-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 60; }
    .drawer { position: fixed; top: 0; left: 0; bottom: 0; width: 240px; background: ${C.surface};
              border-right: 1px solid ${C.line}; z-index: 61; padding: 18px 12px;
              display: flex; flex-direction: column; gap: 4px; }
    .drawer .navbtn { width: 100%; }
    .sheet { position: fixed; top: 4vh; left: 0; right: 0; margin: 0 auto; z-index: 61;
             width: min(720px, 94vw); max-height: 90vh; overflow-y: auto;
             background: ${C.surface}; border: 1px solid ${C.line}; border-radius: 14px; padding: 22px; }
    @media (max-width: 760px) { .sheet { width: 96vw; padding: 16px; max-height: 92vh; } }
    /* ---- mobile ---- */
    @media (max-width: 760px) {
      .app-shell { flex-direction: column !important; }
      .sidebar { width: 100% !important; flex-direction: row !important; align-items: center !important;
                 gap: 2px !important; padding: 8px 10px !important; border-right: none !important;
                 border-bottom: 1px solid ${C.line}; overflow-x: auto; }
      .sidebar .brand { display: none; }
      .hamburger { display: block; }
      .sidebar .navbtn { padding: 9px 11px !important; font-size: 14px !important; white-space: nowrap; }
      .sidebar .userbox { margin-top: 0 !important; margin-left: auto; border-top: none !important;
                          padding: 0 4px !important; text-align: right; flex-shrink: 0; }
      .app-main { padding: 14px !important; }
      .split { flex-direction: column !important; }
      .side-col { width: 100% !important; }
      .side-col > div { position: static !important; }
      .day-detail { margin-left: 0 !important; }
      .table-wrap table { min-width: 560px; }
      input, select { font-size: 16px !important; } /* stop iOS zoom-on-focus */
    }
  `}</style>
);

const Badge = ({ kind }) => {
  const map = {
    local: { bg: C.greenDark, fg: C.green, t: "LOCAL" },
    turista: { bg: "#2B3B47", fg: C.blue, t: "TURISTA" },
    pendiente: { bg: "#4A3A22", fg: C.amber, t: "PENDIENTE" },
    admin: { bg: "#4A3A22", fg: C.amber, t: "ADMIN" },
  };
  const m = map[kind]; if (!m) return null;
  return <span className="mono" style={{ background: m.bg, color: m.fg, fontSize: 11, letterSpacing: 1, padding: "3px 8px", borderRadius: 4, fontWeight: 700 }}>{m.t}</span>;
};

const Btn = ({ children, onClick, kind = "ghost", size = "md", disabled, style }) => {
  const base = {
    border: `1px solid ${C.line}`, borderRadius: 8, color: C.text, background: C.surface2,
    padding: size === "lg" ? "14px 20px" : size === "sm" ? "6px 12px" : "10px 16px",
    fontSize: size === "lg" ? 16 : 14, fontWeight: 700, opacity: disabled ? 0.4 : 1,
  };
  if (kind === "primary") { base.background = C.green; base.color = "#16210F"; base.border = `1px solid ${C.green}`; }
  if (kind === "amber") { base.background = C.amber; base.color = "#2A2008"; base.border = `1px solid ${C.amber}`; }
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...style }}>{children}</button>;
};

const Panel = ({ children, style, className }) => (
  <div className={className} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, ...style }}>{children}</div>
);

const Field = (props) => (
  <input {...props} style={{ width: "100%", padding: "11px 14px", background: C.bg, border: `1px solid ${C.line}`, borderRadius: 8, color: C.text, fontSize: 16, ...props.style }} />
);

/* ================================ APP ================================ */
export default function App() {
  const [phase, setPhase] = useState("loading"); // loading | device | ready | offline
  const [data, setData] = useState(null);        // {products, members, employees, invites, isAdmin}
  const [user, setUser] = useState(null);        // employee object or {admin:true}
  const [tab, setTab] = useState("dispensar");
  const [hist, setHist] = useState([]);          // visited-tab stack for the Volver button
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const notify = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); }, []);

  const refresh = useCallback(async () => {
    try {
      const state = await api.get("/api/state");
      setData(state);
      setPhase("ready");
    } catch (e) {
      if (e.status === 401) { setPhase("device"); setUser(null); }
      else setPhase((p) => (p === "ready" ? "ready" : "offline"));
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  if (phase === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.muted, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit', sans-serif" }}>
        <S />Conectando con el servidor del club…
      </div>
    );
  }

  if (phase === "offline") {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.text, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit', sans-serif" }}>
        <S />
        <div style={{ textAlign: "center" }}>
          <div style={{ color: C.red, fontWeight: 800, marginBottom: 8 }}>Sin conexión con el servidor</div>
          <div style={{ color: C.muted, fontSize: 15, marginBottom: 16 }}>Comprueba que el servidor del club esté en marcha.</div>
          <Btn kind="primary" onClick={() => { setPhase("loading"); refresh(); }}>Reintentar</Btn>
        </div>
      </div>
    );
  }

  if (phase === "device") {
    return <DeviceLogin onDone={refresh} />;
  }

  if (!user) {
    return (
      <Login
        employees={data.employees}
        onUser={async (e) => {
          if (data.isAdmin) { try { await api.post("/api/auth/admin/logout"); } catch { /* ignore */ } await refresh(); }
          setUser(e);
          setTab("dispensar"); setHist([]);
        }}
        onAdmin={async (pin) => {
          await api.post("/api/auth/admin", { pin });
          await refresh();
          setUser({ admin: true, name: "Administrador" });
          setTab("informes"); setHist([]);
        }}
      />
    );
  }

  const isAdmin = !!user.admin;
  const NAV = isAdmin
    ? [{ id: "informes", label: "Informes" }, { id: "socios", label: "Socios" }, { id: "inventario", label: "Inventario" }, { id: "dispensar", label: "Dispensar" }]
    : [{ id: "dispensar", label: "Dispensar" }, { id: "socios", label: "Socios" }, { id: "inventario", label: "Inventario" }];
  const pendingCount = data.members.filter((m) => m.status === "pendiente").length;

  const goTab = (id) => {
    if (id !== tab) { setHist((h) => [...h.slice(-19), tab]); setTab(id); }
    setMenuOpen(false);
  };
  const goBack = () => {
    setHist((h) => {
      if (!h.length) return h;
      setTab(h[h.length - 1]);
      return h.slice(0, -1);
    });
  };
  const logout = async () => {
    if (isAdmin) { try { await api.post("/api/auth/admin/logout"); } catch { /* ignore */ } await refresh(); }
    setUser(null); setHist([]);
  };

  const navButtons = (extraClass) => NAV.map((n) => (
    <button key={n.id} className={"navbtn " + (extraClass || "")} onClick={() => goTab(n.id)}
      style={{ textAlign: "left", padding: "11px 12px", borderRadius: 8, border: "none", fontSize: 16, fontWeight: 700, background: tab === n.id ? C.greenDark : "transparent", color: tab === n.id ? C.green : C.muted, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
      {n.label}
      {n.id === "socios" && pendingCount > 0 && <span className="mono" style={{ background: C.amber, color: "#2A2008", borderRadius: 10, fontSize: 12, padding: "1px 7px", fontWeight: 800 }}>{pendingCount}</span>}
    </button>
  ));

  return (
    <div className="app-shell" style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Outfit', sans-serif", display: "flex" }}>
      <S />
      <aside className="sidebar" style={{ width: 190, borderRight: `1px solid ${C.line}`, padding: "20px 12px", display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
        <button className="hamburger" onClick={() => setMenuOpen(true)} aria-label="Abrir menú"
          style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 8, color: C.text, fontSize: 20, padding: "7px 12px", flexShrink: 0 }}>☰</button>
        <div className="mono brand" style={{ color: C.green, letterSpacing: 3, fontSize: 11, padding: "0 10px", marginBottom: 14 }}>ONE LIFE<br />LANZAROTE</div>
        {navButtons()}
        <div className="userbox" style={{ marginTop: "auto", padding: 10, borderTop: `1px solid ${C.line}` }}>
          <div style={{ fontSize: 13, color: C.muted }}>{isAdmin ? "Sesión" : "En mostrador"}</div>
          <div style={{ fontWeight: 800, display: "flex", gap: 8, alignItems: "center" }}>{user.name} {isAdmin && <Badge kind="admin" />}</div>
          <button onClick={logout}
            style={{ marginTop: 8, width: "100%", background: "transparent", border: `1px solid ${C.red}`, color: C.red, borderRadius: 8, padding: "8px 10px", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {menuOpen && (
        <>
          <div className="drawer-backdrop" onClick={() => setMenuOpen(false)} />
          <div className="drawer fadein">
            <div className="mono" style={{ color: C.green, letterSpacing: 3, fontSize: 11, padding: "0 10px", marginBottom: 10 }}>ONE LIFE<br />LANZAROTE</div>
            {navButtons()}
            <div style={{ marginTop: "auto", padding: 10, borderTop: `1px solid ${C.line}` }}>
              <div style={{ fontWeight: 800, display: "flex", gap: 8, alignItems: "center" }}>{user.name} {isAdmin && <Badge kind="admin" />}</div>
              <button onClick={() => { setMenuOpen(false); logout(); }}
                style={{ marginTop: 10, width: "100%", background: "transparent", border: `1px solid ${C.red}`, color: C.red, borderRadius: 8, padding: "10px 10px", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </>
      )}

      <main className="app-main" style={{ flex: 1, padding: 24, overflow: "auto" }}>
        {hist.length > 0 && (
          <button onClick={goBack}
            style={{ background: "none", border: "none", color: C.muted, fontSize: 15, fontWeight: 700, padding: 0, marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            ← Volver
          </button>
        )}
        {tab === "dispensar" && <Dispensar data={data} refresh={refresh} user={user} notify={notify} />}
        {tab === "socios" && <Socios data={data} refresh={refresh} notify={notify} isAdmin={isAdmin} />}
        {tab === "inventario" && <Inventario data={data} refresh={refresh} notify={notify} />}
        {tab === "informes" && isAdmin && <Informes data={data} />}
      </main>

      {toast && (
        <div className="fadein mono" style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: C.green, color: "#16210F", padding: "10px 22px", borderRadius: 8, fontWeight: 700, fontSize: 15, zIndex: 50 }}>{toast}</div>
      )}
      <DemoBadge />
    </div>
  );
}

/* ============================ DEVICE LOGIN ============================ */
function DeviceLogin({ onDone }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!code.trim() || busy) return;
    setBusy(true);
    try {
      await api.post("/api/auth/device", { code: code.trim() });
      await onDone();
    } catch {
      setErr(true); setCode("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Outfit', sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <S />
      <div style={{ textAlign: "center" }} className="fadein">
        <div className="mono" style={{ color: C.green, letterSpacing: 4, fontSize: 13, marginBottom: 8 }}>ONE LIFE LANZAROTE</div>
        <h1 style={{ fontSize: 34, fontWeight: 800, margin: "0 0 6px" }}>Club Manager</h1>
        <p style={{ color: C.muted, marginBottom: 24 }}>Autoriza este dispositivo con el código del club</p>
        <input autoFocus type="password" value={code} className="mono"
          onChange={(e) => { setCode(e.target.value); setErr(false); }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Código del club"
          style={{ fontSize: 20, textAlign: "center", width: 260, padding: "12px 0", background: C.surface, border: `1px solid ${err ? C.red : C.line}`, borderRadius: 10, color: C.text }} />
        {err && <div style={{ color: C.red, fontSize: 14, marginTop: 8 }}>Código incorrecto</div>}
        <div style={{ marginTop: 18 }}>
          <Btn kind="primary" size="lg" onClick={submit} disabled={busy || !code.trim()}>Autorizar dispositivo</Btn>
        </div>
        <div className="mono" style={{ color: C.muted, fontSize: 12, marginTop: 16 }}>
          {DEMO ? "demo — código: onelife" : "Solo hace falta una vez por dispositivo"}
        </div>
      </div>
      <DemoBadge />
    </div>
  );
}

/* ============================ LOGIN ============================ */
function Login({ employees, onUser, onAdmin }) {
  const [pinMode, setPinMode] = useState(false);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  const tryPin = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onAdmin(pin);
    } catch {
      setErr(true); setPin("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Outfit', sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <S />
      <div style={{ textAlign: "center" }} className="fadein">
        <div className="mono" style={{ color: C.green, letterSpacing: 4, fontSize: 13, marginBottom: 8 }}>ONE LIFE LANZAROTE</div>
        <h1 style={{ fontSize: 34, fontWeight: 800, margin: "0 0 6px" }}>Club Manager</h1>

        {!pinMode ? (
          <>
            <p style={{ color: C.muted, marginBottom: 32 }}>¿Quién está en el mostrador?</p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              {employees.map((e) => (
                <button key={e.id} onClick={() => onUser(e)}
                  style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: "26px 30px", color: C.text, width: 130 }}>
                  <div className="mono" style={{ width: 52, height: 52, borderRadius: "50%", background: C.greenDark, color: C.green, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontWeight: 800 }}>{e.initials}</div>
                  <div style={{ fontWeight: 700 }}>{e.name}</div>
                </button>
              ))}
            </div>
            <button onClick={() => setPinMode(true)} style={{ marginTop: 28, background: "none", border: `1px solid ${C.line}`, color: C.amber, borderRadius: 8, padding: "10px 22px", fontWeight: 700 }}>
              Acceso administrador
            </button>
          </>
        ) : (
          <div style={{ marginTop: 20 }}>
            <p style={{ color: C.muted, marginBottom: 14 }}>Introduce el PIN de administrador</p>
            <input autoFocus type="password" inputMode="numeric" value={pin} maxLength={6}
              onChange={(e) => { setPin(e.target.value); setErr(false); }}
              onKeyDown={(e) => e.key === "Enter" && tryPin()}
              className="mono"
              style={{ fontSize: 26, letterSpacing: 12, textAlign: "center", width: 200, padding: "12px 0", background: C.surface, border: `1px solid ${err ? C.red : C.line}`, borderRadius: 10, color: C.text }} />
            {err && <div style={{ color: C.red, fontSize: 14, marginTop: 8 }}>PIN incorrecto</div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18 }}>
              <Btn onClick={() => setPinMode(false)}>Volver</Btn>
              <Btn kind="amber" onClick={tryPin} disabled={busy}>Entrar</Btn>
            </div>
            {DEMO && <div className="mono" style={{ color: C.muted, fontSize: 12, marginTop: 16 }}>demo — PIN: 1234</div>}
          </div>
        )}
      </div>
      <DemoBadge />
    </div>
  );
}

/* ============================ DISPENSAR ============================ */
function Dispensar({ data, refresh, user, notify }) {
  const { products, members } = data;
  const [q, setQ] = useState("");
  const [member, setMember] = useState(null);
  const [cat, setCat] = useState("flores");
  const [cart, setCart] = useState([]);
  const [payment, setPayment] = useState("efectivo");
  const [qtyFor, setQtyFor] = useState(null);
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState(false);
  const scale = useScale();
  const fresh = scale.reading && Date.now() - scale.reading.ts < 3000 ? scale.reading : null;

  const active = members.filter((m) => m.status === "activo");
  const results = q ? active.filter((m) => (m.name + m.num).toLowerCase().includes(q.toLowerCase())) : [];
  const priceOf = (p) => (member?.type === "turista" ? p.priceTourist : p.priceLocal);
  const total = cart.reduce((s, i) => s + i.qty * i.price, 0);

  const addToCart = (p, n) => {
    const amount = parseFloat(String(n).replace(",", "."));
    if (!amount || amount <= 0) return;
    const already = cart.filter((i) => i.productId === p.id).reduce((s, i) => s + i.qty, 0);
    if (already + amount > p.stock) { notify(`Stock insuficiente: quedan ${p.stock} ${p.unit}`); return; }
    setCart((c) => [...c, { productId: p.id, name: p.name, qty: amount, unit: p.unit, price: priceOf(p) }]);
    setQtyFor(null); setQty("");
  };

  const confirm = async () => {
    if (!member || cart.length === 0 || busy) return;
    setBusy(true);
    try {
      const sale = await api.post("/api/sales", {
        memberId: member.id,
        employeeId: user.admin ? 0 : user.id,
        payment,
        items: cart.map((i) => ({ productId: i.productId, qty: i.qty })),
      });
      notify(`Dispensación registrada — ${eur(sale.total)}`);
      setCart([]); setMember(null); setQ(""); setPayment("efectivo");
      refresh();
    } catch (e) {
      if (e.data?.error === "insufficient_stock") {
        notify(`Stock insuficiente de ${e.data.product}: quedan ${e.data.stock}`);
        refresh();
      } else {
        notify("No se pudo registrar — revisa la conexión");
      }
    } finally {
      setBusy(false);
    }
  };

  const gramBtns = [0.5, 1, 2, 3.5, 5];

  return (
    <div className="fadein split" style={{ display: "flex", gap: 20 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "0 0 16px" }}>
          <h2 style={{ margin: 0, fontSize: 24 }}>Dispensar</h2>
          {scale.supported && !scale.connected && (
            <Btn size="sm" onClick={() => scale.connect().catch(() => notify("No se pudo conectar con la báscula"))}>⚖ Conectar báscula</Btn>
          )}
          {scale.connected && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: "6px 12px" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: fresh ? (fresh.stable ? C.green : C.amber) : C.red, flexShrink: 0 }} />
              <span className="mono" style={{ fontSize: 20, fontWeight: 700, minWidth: 90, textAlign: "right" }}>
                {fresh ? `${fresh.value.toFixed(2)} ${fresh.unit}` : "— g"}
              </span>
              <Btn size="sm" onClick={scale.tare}>Tara</Btn>
              <button onClick={scale.disconnect} title="Desconectar báscula"
                style={{ background: "none", border: "none", color: C.muted, padding: 0, fontSize: 15 }}>✕</button>
            </div>
          )}
        </div>
        {!member ? (
          <Panel style={{ padding: 18 }}>
            <div style={{ fontSize: 14, color: C.muted, marginBottom: 8 }}>1 · Buscar socio</div>
            <Field value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre o nº de socio…" />
            <div style={{ marginTop: 10 }}>
              {results.map((m) => (
                <div key={m.id} className="row" onClick={() => { setMember(m); setQ(""); }}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 10px", borderRadius: 8, cursor: "pointer" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{m.name}</div>
                    <div className="mono" style={{ fontSize: 13, color: C.muted }}>{m.num}</div>
                  </div>
                  <Badge kind={m.type} />
                </div>
              ))}
              {q && results.length === 0 && <div style={{ color: C.muted, padding: 10 }}>Sin resultados. Comprueba que el socio esté aprobado.</div>}
            </div>
          </Panel>
        ) : (
          <Panel style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 800 }}>{member.name}</div>
                <div className="mono" style={{ fontSize: 13, color: C.muted }}>{member.num}</div>
              </div>
              <Badge kind={member.type} />
            </div>
            <Btn size="sm" onClick={() => { setMember(null); setCart([]); }}>Cambiar socio</Btn>
          </Panel>
        )}

        {member && (
          <>
            <div style={{ display: "flex", gap: 8, margin: "0 0 12px", flexWrap: "wrap" }}>
              {CATS.map((c) => (
                <button key={c.id} onClick={() => setCat(c.id)}
                  style={{ padding: "8px 14px", borderRadius: 20, border: `1px solid ${cat === c.id ? C.green : C.line}`, background: cat === c.id ? C.greenDark : "transparent", color: cat === c.id ? C.green : C.muted, fontWeight: 700, fontSize: 14 }}>
                  {c.label}
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
              {products.filter((p) => p.cat === cat).map((p) => (
                <Panel key={p.id} style={{ padding: 14 }}>
                  <div style={{ fontWeight: 800, marginBottom: 2 }}>{p.name}</div>
                  <div className="mono" style={{ fontSize: 14, color: C.amber, marginBottom: 2 }}>{eur(priceOf(p))} / {p.unit}</div>
                  <div className="mono" style={{ fontSize: 12, color: p.stock <= 10 ? C.red : C.muted, marginBottom: 10 }}>stock {p.stock} {p.unit}</div>
                  {qtyFor === p.id ? (
                    <div>
                      {p.unit === "g" && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                          {gramBtns.map((g) => (
                            <button key={g} onClick={() => addToCart(p, g)} className="mono"
                              style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.line}`, background: C.surface2, color: C.text, fontSize: 14 }}>{g}g</button>
                          ))}
                          {scale.connected && (
                            <button className="mono" disabled={!fresh || !fresh.stable || fresh.unit !== "g" || fresh.value <= 0}
                              onClick={() => fresh && addToCart(p, +fresh.value.toFixed(2))}
                              title={fresh && fresh.unit !== "g" ? "Pon la báscula en gramos" : "Usar el peso de la báscula"}
                              style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.green}`, background: C.greenDark, color: C.green, fontSize: 14, fontWeight: 700, opacity: !fresh || !fresh.stable || fresh.unit !== "g" || fresh.value <= 0 ? 0.4 : 1 }}>
                              ⚖ {fresh && fresh.unit === "g" ? `${fresh.value.toFixed(2)}g` : "báscula"}
                            </button>
                          )}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 6 }}>
                        <input autoFocus value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" placeholder={p.unit === "g" ? "gramos" : "cantidad"}
                          style={{ width: "100%", minWidth: 0, padding: "8px 10px", background: C.bg, border: `1px solid ${C.line}`, borderRadius: 6, color: C.text }} />
                        <Btn size="sm" kind="primary" onClick={() => addToCart(p, qty)}>OK</Btn>
                      </div>
                    </div>
                  ) : (
                    <Btn size="sm" style={{ width: "100%" }} onClick={() => { setQtyFor(p.id); setQty(""); }}>Añadir</Btn>
                  )}
                </Panel>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="side-col" style={{ width: 300, flexShrink: 0 }}>
        <Panel style={{ padding: 18, position: "sticky", top: 0 }}>
          <div className="mono" style={{ textAlign: "center", color: C.muted, fontSize: 12, letterSpacing: 2, borderBottom: `1px dashed ${C.line}`, paddingBottom: 10, marginBottom: 10 }}>
            TICKET · {user.name.toUpperCase()}
          </div>
          {!member && <div style={{ color: C.muted, fontSize: 14, textAlign: "center", padding: "18px 0" }}>Selecciona un socio para empezar</div>}
          {member && (
            <div className="mono" style={{ fontSize: 14 }}>
              <div style={{ color: C.muted, marginBottom: 8 }}>{member.num} · {member.type?.toUpperCase()}</div>
              {cart.length === 0 && <div style={{ color: C.muted, padding: "10px 0" }}>— sin artículos —</div>}
              {cart.map((i, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", gap: 8 }}>
                  <span style={{ flex: 1 }}>{i.name}</span>
                  <span style={{ color: C.muted }}>{i.qty}{i.unit === "g" ? "g" : "×"}</span>
                  <span style={{ color: C.amber }}>{eur(i.qty * i.price)}</span>
                  <button onClick={() => setCart((c) => c.filter((_, j) => j !== idx))} style={{ background: "none", border: "none", color: C.red, padding: 0 }}>✕</button>
                </div>
              ))}
              <div style={{ borderTop: `1px dashed ${C.line}`, marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 700 }}>
                <span>TOTAL</span><span style={{ color: C.amber }}>{eur(total)}</span>
              </div>
              <div style={{ display: "flex", gap: 8, margin: "14px 0" }}>
                {["efectivo", "tarjeta"].map((p) => (
                  <button key={p} onClick={() => setPayment(p)}
                    style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${payment === p ? C.green : C.line}`, background: payment === p ? C.greenDark : "transparent", color: payment === p ? C.green : C.muted, fontWeight: 700, fontSize: 14 }}>
                    {p === "efectivo" ? "Efectivo" : "Tarjeta"}
                  </button>
                ))}
              </div>
              <Btn kind="amber" size="lg" style={{ width: "100%" }} disabled={cart.length === 0 || busy} onClick={confirm}>
                {busy ? "Registrando…" : "Registrar dispensación"}
              </Btn>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ============================ SOCIOS ============================ */

/* client-side selfie resize → JPEG data URL (~keeps uploads small) */
function fileToDataUrl(file, maxSide = 640) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad_image")); };
    img.src = url;
  });
}

const Avatar = ({ photo, name, size = 56 }) => photo ? (
  <img src={photo} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.greenDark}`, flexShrink: 0 }} />
) : (
  <div className="mono" style={{ width: size, height: size, borderRadius: "50%", background: C.greenDark, color: C.green, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size / 2.6, flexShrink: 0 }}>
    {(name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
  </div>
);

/* 30-day single-series bar chart (per dataviz spec: thin bars, 2px gaps,
   recessive grid, direct label on the max only, per-bar tooltip) */
function BarChart({ data, color, fmt }) {
  const W = 320, H = 100, padL = 4, padR = 4, padT = 16, padB = 15;
  const max = Math.max(...data.map((d) => d.v), 0);
  if (max <= 0) return <div style={{ color: C.muted, fontSize: 14, padding: "14px 0" }}>Sin movimientos en 30 días.</div>;
  const iw = (W - padL - padR) / data.length;
  const bw = Math.max(2, iw - 2);
  const plotH = H - padT - padB;
  const maxIdx = data.reduce((mi, d, i) => (d.v > data[mi].v ? i : mi), 0);
  const labelX = Math.min(Math.max(padL + maxIdx * iw + bw / 2, 24), W - 24);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img">
      {[0.5, 1].map((f) => (
        <line key={f} x1={padL} x2={W - padR} y1={H - padB - plotH * f} y2={H - padB - plotH * f} stroke={C.line} strokeWidth="0.6" />
      ))}
      <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} stroke={C.line} strokeWidth="1" />
      {data.map((d, i) => {
        const h = (d.v / max) * plotH;
        return (
          <rect key={d.date} x={padL + i * iw + 1} y={H - padB - h} width={bw} height={Math.max(h, d.v > 0 ? 1.5 : 0)} rx="1.5" fill={color} opacity={i === maxIdx ? 1 : 0.82}>
            <title>{`${dateES(d.date)} · ${fmt(d.v)}`}</title>
          </rect>
        );
      })}
      <text x={labelX} y={H - padB - (data[maxIdx].v / max) * plotH - 5} textAnchor="middle" fontSize="10.5" fontWeight="700" fill={C.text} fontFamily="'IBM Plex Mono', monospace">{fmt(data[maxIdx].v)}</text>
      {data.map((d, i) => (i % 7 === 3 ? (
        <text key={"t" + d.date} x={padL + i * iw + bw / 2} y={H - 4} textAnchor="middle" fontSize="8.5" fill={C.muted} fontFamily="'IBM Plex Mono', monospace">{d.date.slice(8, 10)}/{d.date.slice(5, 7)}</text>
      ) : null))}
    </svg>
  );
}

const EMPTY_NEW_MEMBER = { name: "", nationality: "", phone: "", email: "", type: "local", photo: null };

function Socios({ data, refresh, notify }) {
  const { members } = data;
  const [q, setQ] = useState("");
  const [selId, setSelId] = useState(null);
  const [detail, setDetail] = useState(null);   // full member incl photo
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [approveType, setApproveType] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [nm, setNm] = useState(EMPTY_NEW_MEMBER);
  const [saving, setSaving] = useState(false);

  const pending = members.filter((m) => m.status === "pendiente");
  const active = members.filter((m) => m.status === "activo" && (m.name + m.num).toLowerCase().includes(q.toLowerCase()));

  useEffect(() => {
    if (!selId) { setDetail(null); setStats(null); setHistory([]); return; }
    let alive = true;
    api.get(`/api/members/${selId}`).then((d) => alive && setDetail(d)).catch(() => {});
    api.get(`/api/members/${selId}/stats`).then((s) => alive && setStats(s)).catch(() => {});
    api.get(`/api/members/${selId}/sales`).then((h) => alive && setHistory(h)).catch(() => {});
    return () => { alive = false; };
  }, [selId]);

  const onPhoto = async (e, setter, current) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try { setter({ ...current, photo: await fileToDataUrl(f) }); }
    catch { notify("No se pudo leer la imagen"); }
  };

  const saveNew = async () => {
    if (!nm.name.trim() || saving) { if (!nm.name.trim()) notify("El nombre es obligatorio"); return; }
    setSaving(true);
    try {
      const r = await api.post("/api/members", nm);
      const msg = { sent: `${r.member.num} creado — email de bienvenida enviado`,
        not_configured: `${r.member.num} creado — configura el email (SMTP) para el envío automático`,
        no_email: `${r.member.num} creado — sin email, entrégale el carnet en el club`,
        failed: `${r.member.num} creado — el email falló, reintenta desde su ficha` }[r.emailStatus] || `${r.member.num} creado`;
      notify(msg);
      setShowAdd(false); setNm(EMPTY_NEW_MEMBER);
      refresh();
    } catch {
      notify("No se pudo crear el socio");
    } finally {
      setSaving(false);
    }
  };

  const approve = async (m) => {
    const type = approveType[m.id] || "local";
    try {
      await api.post(`/api/members/${m.id}/approve`, { type });
      notify(`${m.name} aprobado como ${type.toUpperCase()}`);
      refresh();
    } catch {
      notify("No se pudo aprobar");
    }
  };

  const removeMember = async (m) => {
    if (!window.confirm(`¿Dar de baja a ${m.name} (${m.num || "pendiente"})?\nSu historial se conserva pero dejará de aparecer en las listas.`)) return;
    try {
      await api.del(`/api/members/${m.id}`);
      notify(`${m.name} dado de baja`);
      setSelId(null);
      refresh();
    } catch {
      notify("No se pudo dar de baja");
    }
  };

  const inputStyle = { padding: "12px 14px", background: C.bg, border: `1px solid ${C.line}`, borderRadius: 8, color: C.text, fontSize: 16, width: "100%", minWidth: 0 };
  const P = stats;
  const periods = P ? [["7 DÍAS", P.d7], ["30 DÍAS", P.d30], ["6 MESES", P.d180], ["1 AÑO", P.d365]] : [];

  return (
    <div className="fadein">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 24 }}>Socios</h2>
        <Btn kind="primary" onClick={() => setShowAdd(true)}>＋ Añadir nuevo socio</Btn>
      </div>

      {pending.length > 0 && (
        <Panel style={{ padding: 18, marginBottom: 20, borderColor: C.amber + "66" }}>
          <div style={{ fontWeight: 800, marginBottom: 10, fontSize: 17 }}>Solicitudes de la web <span className="mono" style={{ color: C.amber }}>({pending.length})</span></div>
          {pending.map((m) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 0", borderTop: `1px solid ${C.line}`, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{m.name}</div>
                <div className="mono" style={{ fontSize: 13, color: C.muted }}>
                  {m.nationality} · solicitud {m.joined}
                  {m.phone ? ` · 📞 ${m.phone}` : ""}{m.email ? ` · ✉ ${m.email}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {["local", "turista"].map((t) => (
                  <button key={t} onClick={() => setApproveType((s) => ({ ...s, [m.id]: t }))}
                    style={{ padding: "8px 13px", borderRadius: 8, fontSize: 14, fontWeight: 700, border: `1px solid ${(approveType[m.id] || "local") === t ? C.green : C.line}`, background: (approveType[m.id] || "local") === t ? C.greenDark : "transparent", color: (approveType[m.id] || "local") === t ? C.green : C.muted }}>
                    {t === "local" ? "Local" : "Turista"}
                  </button>
                ))}
                <Btn kind="primary" size="sm" onClick={() => approve(m)}>Aprobar</Btn>
              </div>
            </div>
          ))}
        </Panel>
      )}

      <Panel style={{ padding: 18 }}>
        <Field placeholder="Buscar socio…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 10 }} />
        {active.map((m) => (
          <div key={m.id} className="row" onClick={() => setSelId(m.id)}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 10px", borderRadius: 8, cursor: "pointer" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Avatar photo={null} name={m.name} size={42} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{m.name}</div>
                <div className="mono" style={{ fontSize: 13, color: C.muted }}>{m.num} · alta {m.joined}</div>
              </div>
            </div>
            <Badge kind={m.type} />
          </div>
        ))}
        {active.length === 0 && <div style={{ color: C.muted, fontSize: 15, padding: 8 }}>Sin resultados.</div>}
      </Panel>

      {/* ---- add member sheet ---- */}
      {showAdd && (
        <>
          <div className="drawer-backdrop" onClick={() => !saving && setShowAdd(false)} />
          <div className="sheet fadein">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <h3 style={{ margin: 0, fontSize: 20 }}>Añadir nuevo socio</h3>
              <button onClick={() => !saving && setShowAdd(false)} style={{ background: "none", border: "none", color: C.muted, fontSize: 22, cursor: "pointer", padding: 4 }}>✕</button>
            </div>
            <div style={{ fontSize: 14, color: C.muted, marginBottom: 14 }}>
              Al guardar se le asigna su número OL y, si tiene email, recibe automáticamente su carnet en PDF con la bienvenida y las condiciones del club.
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
              <label style={{ cursor: "pointer", textAlign: "center" }}>
                <Avatar photo={nm.photo} name={nm.name || "?"} size={96} />
                <div style={{ color: C.green, fontSize: 13, fontWeight: 700, marginTop: 6 }}>{nm.photo ? "Cambiar foto" : "📷 Subir selfie"}</div>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onPhoto(e, setNm, nm)} />
              </label>
              <div style={{ flex: 1, minWidth: 220, display: "grid", gap: 10 }}>
                <input style={inputStyle} placeholder="Nombre completo *" value={nm.name} onChange={(e) => setNm({ ...nm, name: e.target.value })} />
                <input style={inputStyle} placeholder="Nacionalidad" value={nm.nationality} onChange={(e) => setNm({ ...nm, nationality: e.target.value })} />
                <input style={inputStyle} placeholder="Teléfono (WhatsApp)" inputMode="tel" value={nm.phone} onChange={(e) => setNm({ ...nm, phone: e.target.value })} />
                <input style={inputStyle} placeholder="Email" type="email" value={nm.email} onChange={(e) => setNm({ ...nm, email: e.target.value })} />
                <div style={{ display: "flex", gap: 8 }}>
                  {["local", "turista"].map((t) => (
                    <button key={t} onClick={() => setNm({ ...nm, type: t })}
                      style={{ flex: 1, padding: "11px 0", borderRadius: 8, fontSize: 15, fontWeight: 700, border: `1px solid ${nm.type === t ? C.green : C.line}`, background: nm.type === t ? C.greenDark : "transparent", color: nm.type === t ? C.green : C.muted }}>
                      {t === "local" ? "Local" : "Turista"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <Btn kind="primary" size="lg" style={{ width: "100%" }} disabled={saving || !nm.name.trim()} onClick={saveNew}>
                {saving ? "Guardando…" : "Guardar socio y enviar carnet"}
              </Btn>
            </div>
          </div>
        </>
      )}

      {/* ---- member profile sheet ---- */}
      {selId && (
        <>
          <div className="drawer-backdrop" onClick={() => setSelId(null)} />
          <div className="sheet fadein">
            {!detail ? (
              <div style={{ color: C.muted, padding: 20 }}>Cargando ficha…</div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0, alignSelf: "center" }}>
                    <div style={{ fontWeight: 800, fontSize: 22, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>{detail.name} <Badge kind={detail.type} /></div>
                    <div className="mono" style={{ fontSize: 17, color: C.amber, fontWeight: 800, margin: "4px 0" }}>{detail.num}</div>
                    <div className="mono" style={{ fontSize: 14, color: C.muted }}>
                      {detail.nationality} · alta {detail.joined}{detail.sponsor ? ` · avalado por ${detail.sponsor}` : ""}
                    </div>
                    {detail.phone && <div className="mono" style={{ fontSize: 14, color: C.muted, marginTop: 3 }}>📞 {detail.phone}</div>}
                    {detail.email && <div className="mono" style={{ fontSize: 14, color: C.muted, marginTop: 3 }}>✉ {detail.email}</div>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                    <button onClick={() => setSelId(null)} style={{ background: "none", border: "none", color: C.muted, fontSize: 24, cursor: "pointer", padding: "0 2px", lineHeight: 1 }}>✕</button>
                    <Avatar photo={detail.photo} name={detail.name} size={104} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, margin: "18px 0" }}>
                  {periods.map(([label, v]) => (
                    <div key={label} style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 14px" }}>
                      <div className="mono" style={{ fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 4 }}>{label}</div>
                      <div className="mono" style={{ fontSize: 18, fontWeight: 800, color: C.amber }}>{eur(v.spent)}</div>
                      <div className="mono" style={{ fontSize: 14, color: C.green, fontWeight: 700 }}>{v.grams} g · {v.ops} ops</div>
                    </div>
                  ))}
                  {!P && <div style={{ color: C.muted, fontSize: 14 }}>Cargando estadísticas…</div>}
                </div>

                {P && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginBottom: 18 }}>
                    <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}>
                      <div className="mono" style={{ fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 8 }}>TOKENS · ÚLTIMOS 30 DÍAS</div>
                      <BarChart data={P.daily.map((d) => ({ date: d.date, v: d.spent }))} color={C.amber} fmt={(v) => eur(v)} />
                    </div>
                    <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}>
                      <div className="mono" style={{ fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 8 }}>CONSUMO (g) · ÚLTIMOS 30 DÍAS</div>
                      <BarChart data={P.daily.map((d) => ({ date: d.date, v: d.grams }))} color={C.green} fmt={(v) => `${v} g`} />
                    </div>
                  </div>
                )}

                {P && P.byProduct?.length > 0 && (
                  <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14, marginBottom: 18 }}>
                    <div className="mono" style={{ fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 10 }}>PRODUCTOS CONSUMIDOS · ÚLTIMO AÑO</div>
                    {P.byProduct.map((p) => (
                      <div key={p.name + p.unit} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", borderTop: `1px solid ${C.line}` }}>
                        <span style={{ fontWeight: 700, fontSize: 15, flex: 1, minWidth: 0 }}>{p.name}</span>
                        <span className="mono" style={{ color: C.green, fontSize: 14, fontWeight: 700 }}>{p.qty} {p.unit === "g" ? "g" : "ud"}</span>
                        <span className="mono" style={{ color: C.amber, fontSize: 14, fontWeight: 700, width: 86, textAlign: "right" }}>{eur(p.tokens)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
                  {!DEMO && (
                    <a href={`/api/members/${detail.id}/card.pdf`} style={{ textDecoration: "none" }}>
                      <Btn>📄 Descargar carnet PDF</Btn>
                    </a>
                  )}
                  <Btn style={{ color: C.red, borderColor: C.red }} onClick={() => removeMember(detail)}>Dar de baja</Btn>
                </div>

                <div className="mono" style={{ fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 8 }}>HISTORIAL DE CONSUMO</div>
                {history.length === 0 && <div style={{ color: C.muted, fontSize: 14 }}>Sin dispensaciones registradas.</div>}
                {history.map((s) => (
                  <div key={s.id} style={{ borderTop: `1px dashed ${C.line}`, padding: "8px 0" }} className="mono">
                    <div style={{ fontSize: 12, color: C.muted }}>{new Date(s.ts).toLocaleDateString("es-ES")} · {timeStr(s.ts)} · {s.employeeName}</div>
                    {s.items.map((i, idx) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                        <span>{i.name}</span><span style={{ color: C.muted }}>{i.qty}{i.unit === "g" ? "g" : "×"}</span><span style={{ color: C.amber }}>{eur(i.qty * i.price)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ============================ INVENTARIO ============================ */
const EMPTY_PRODUCT = { name: "", cat: "flores", unit: "g", priceLocal: "", priceTourist: "", stock: "" };

function Inventario({ data, refresh, notify }) {
  const { products } = data;
  const [adding, setAdding] = useState(null);
  const [amount, setAmount] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [np, setNp] = useState(EMPTY_PRODUCT);
  const [editId, setEditId] = useState(null);
  const [ep, setEp] = useState({ name: "", priceLocal: "", priceTourist: "" });

  const num = (v) => parseFloat(String(v).replace(",", "."));

  const addStock = async (p) => {
    const n = num(amount);
    if (!n || n <= 0) return;
    try {
      await api.post(`/api/products/${p.id}/stock`, { amount: n });
      notify(`+${n} ${p.unit} añadidos a ${p.name}`);
      setAdding(null); setAmount("");
      refresh();
    } catch {
      notify("No se pudo actualizar el stock");
    }
  };

  const createProduct = async () => {
    const pl = num(np.priceLocal), pt = num(np.priceTourist), st = num(np.stock || "0");
    if (!np.name.trim() || !Number.isFinite(pl) || !Number.isFinite(pt)) { notify("Completa nombre y precios"); return; }
    try {
      await api.post("/api/products", { name: np.name, cat: np.cat, unit: np.unit, priceLocal: pl, priceTourist: pt, stock: Number.isFinite(st) ? st : 0 });
      notify(`${np.name.trim()} añadido al inventario`);
      setShowNew(false); setNp(EMPTY_PRODUCT);
      refresh();
    } catch {
      notify("No se pudo crear el producto");
    }
  };

  const saveEdit = async (p) => {
    const pl = num(ep.priceLocal), pt = num(ep.priceTourist);
    if (!ep.name.trim() || !Number.isFinite(pl) || !Number.isFinite(pt)) { notify("Completa nombre y precios"); return; }
    try {
      await api.patch(`/api/products/${p.id}`, { name: ep.name, priceLocal: pl, priceTourist: pt });
      notify("Producto actualizado");
      setEditId(null);
      refresh();
    } catch {
      notify("No se pudo guardar");
    }
  };

  const removeProduct = async (p) => {
    if (!window.confirm(`¿Quitar "${p.name}" del inventario?\nEl historial de ventas se conserva.`)) return;
    try {
      await api.del(`/api/products/${p.id}`);
      notify(`${p.name} eliminado`);
      refresh();
    } catch {
      notify("No se pudo eliminar");
    }
  };

  const inputStyle = { padding: "9px 10px", background: C.bg, border: `1px solid ${C.line}`, borderRadius: 6, color: C.text, fontSize: 15, width: "100%", minWidth: 0 };

  return (
    <div className="fadein">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "0 0 16px" }}>
        <h2 style={{ margin: 0, fontSize: 24 }}>Inventario</h2>
        <Btn size="sm" kind="primary" onClick={() => setShowNew(!showNew)}>{showNew ? "Cancelar" : "+ Producto"}</Btn>
      </div>

      {showNew && (
        <Panel style={{ padding: 18, marginBottom: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Nuevo producto</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <input style={inputStyle} placeholder="Nombre" value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} />
            <select style={inputStyle} value={np.cat} onChange={(e) => setNp({ ...np, cat: e.target.value })}>
              {CATS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <select style={inputStyle} value={np.unit} onChange={(e) => setNp({ ...np, unit: e.target.value })}>
              <option value="g">por gramos (g)</option>
              <option value="ud">por unidad (ud)</option>
            </select>
            <input style={inputStyle} placeholder="Precio local (tk)" inputMode="decimal" value={np.priceLocal} onChange={(e) => setNp({ ...np, priceLocal: e.target.value })} />
            <input style={inputStyle} placeholder="Precio turista (tk)" inputMode="decimal" value={np.priceTourist} onChange={(e) => setNp({ ...np, priceTourist: e.target.value })} />
            <input style={inputStyle} placeholder="Stock inicial" inputMode="decimal" value={np.stock} onChange={(e) => setNp({ ...np, stock: e.target.value })} />
          </div>
          <div style={{ marginTop: 12 }}><Btn kind="primary" onClick={createProduct}>Guardar producto</Btn></div>
        </Panel>
      )}

      <Panel className="table-wrap">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
          <thead>
            <tr className="mono" style={{ color: C.muted, fontSize: 12, letterSpacing: 1, textAlign: "left" }}>
              {["PRODUCTO", "CATEGORÍA", "P. LOCAL", "P. TURISTA", "STOCK", ""].map((h) => (
                <th key={h} style={{ padding: "12px 16px", borderBottom: `1px solid ${C.line}`, fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              editId === p.id ? (
                <tr key={p.id}>
                  <td style={{ padding: "8px 16px" }}>
                    <input autoFocus style={{ ...inputStyle, minWidth: 140 }} value={ep.name} onChange={(e) => setEp({ ...ep, name: e.target.value })} />
                  </td>
                  <td style={{ padding: "8px 16px", color: C.muted }}>{CATS.find((c) => c.id === p.cat)?.label}</td>
                  <td style={{ padding: "8px 16px" }}>
                    <input style={{ ...inputStyle, width: 80 }} inputMode="decimal" value={ep.priceLocal} onChange={(e) => setEp({ ...ep, priceLocal: e.target.value })} />
                  </td>
                  <td style={{ padding: "8px 16px" }}>
                    <input style={{ ...inputStyle, width: 80 }} inputMode="decimal" value={ep.priceTourist} onChange={(e) => setEp({ ...ep, priceTourist: e.target.value })} />
                  </td>
                  <td className="mono" style={{ padding: "8px 16px", color: C.muted }}>{p.stock} {p.unit}</td>
                  <td style={{ padding: "8px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <span style={{ display: "inline-flex", gap: 6 }}>
                      <Btn size="sm" kind="primary" onClick={() => saveEdit(p)}>Guardar</Btn>
                      <Btn size="sm" onClick={() => setEditId(null)}>Cancelar</Btn>
                    </span>
                  </td>
                </tr>
              ) : (
                <tr key={p.id} className="row">
                  <td style={{ padding: "12px 16px", fontWeight: 700 }}>{p.name}</td>
                  <td style={{ padding: "12px 16px", color: C.muted }}>{CATS.find((c) => c.id === p.cat)?.label}</td>
                  <td className="mono" style={{ padding: "12px 16px", color: C.amber }}>{eur(p.priceLocal)}/{p.unit}</td>
                  <td className="mono" style={{ padding: "12px 16px", color: C.amber }}>{eur(p.priceTourist)}/{p.unit}</td>
                  <td className="mono" style={{ padding: "12px 16px", color: p.stock <= 10 ? C.red : C.text }}>
                    {p.stock} {p.unit} {p.stock <= 10 && <span style={{ fontSize: 11, letterSpacing: 1 }}>· BAJO</span>}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                    {adding === p.id ? (
                      <span style={{ display: "inline-flex", gap: 6 }}>
                        <input autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder={p.unit}
                          style={{ width: 80, padding: "6px 10px", background: C.bg, border: `1px solid ${C.line}`, borderRadius: 6, color: C.text }} />
                        <Btn size="sm" kind="primary" onClick={() => addStock(p)}>OK</Btn>
                        <Btn size="sm" onClick={() => setAdding(null)}>✕</Btn>
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", gap: 6 }}>
                        <Btn size="sm" onClick={() => { setAdding(p.id); setAmount(""); setEditId(null); }}>+ Stock</Btn>
                        <Btn size="sm" onClick={() => { setEditId(p.id); setAdding(null); setEp({ name: p.name, priceLocal: String(p.priceLocal), priceTourist: String(p.priceTourist) }); }}>✎</Btn>
                        <Btn size="sm" style={{ color: C.red }} onClick={() => removeProduct(p)}>🗑</Btn>
                      </span>
                    )}
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

/* ============================ INFORMES (ADMIN) ============================ */
function Informes({ data }) {
  const { members } = data;
  const [period, setPeriod] = useState("dia"); // dia | semana | mes
  const [anchor, setAnchor] = useState(todayISO());
  const [openDay, setOpenDay] = useState(null);
  const [sales, setSales] = useState([]);
  const reqRef = useRef(0);

  /* --- period boundaries --- */
  const range = useMemo(() => {
    const d = new Date(anchor + "T12:00");
    if (period === "dia") return { from: anchor, to: anchor, label: dateES(anchor) };
    if (period === "semana") {
      const day = (d.getDay() + 6) % 7; // Monday=0
      const from = new Date(d); from.setDate(d.getDate() - day);
      const to = new Date(from); to.setDate(from.getDate() + 6);
      const f = from.toISOString().slice(0, 10), t = to.toISOString().slice(0, 10);
      return { from: f, to: t, label: `${dateES(f)} – ${dateES(t)}` };
    }
    const f = anchor.slice(0, 8) + "01";
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const t = `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, "0")}-${String(to.getDate()).padStart(2, "0")}`;
    return { from: f, to: t, label: d.toLocaleDateString("es-ES", { month: "long", year: "numeric" }) };
  }, [period, anchor]);

  useEffect(() => {
    const id = ++reqRef.current;
    api.get(`/api/reports?from=${range.from}&to=${range.to}`)
      .then((rows) => { if (reqRef.current === id) setSales(rows); })
      .catch(() => {});
  }, [range]);

  const move = (dir) => {
    const d = new Date(anchor + "T12:00");
    if (period === "dia") d.setDate(d.getDate() + dir);
    if (period === "semana") d.setDate(d.getDate() + 7 * dir);
    if (period === "mes") d.setMonth(d.getMonth() + dir);
    setAnchor(d.toISOString().slice(0, 10));
    setOpenDay(null);
  };

  const inRange = sales;
  const total = inRange.reduce((s, x) => s + x.total, 0);
  const cash = inRange.filter((s) => s.payment === "efectivo").reduce((s, x) => s + x.total, 0);
  const card = total - cash;
  const grams = inRange.reduce((s, x) => s + x.items.filter((i) => i.unit === "g").reduce((a, i) => a + i.qty, 0), 0);

  /* --- per day breakdown, ordered --- */
  const byDay = {};
  inRange.forEach((s) => {
    const d = isoOf(s.ts);
    byDay[d] = byDay[d] || { total: 0, n: 0, sales: [] };
    byDay[d].total += s.total; byDay[d].n += 1; byDay[d].sales.push(s);
  });
  const days = Object.entries(byDay).sort((a, b) => b[0].localeCompare(a[0]));
  const maxDay = Math.max(1, ...days.map(([, v]) => v.total));

  const byEmp = {};
  inRange.forEach((s) => {
    byEmp[s.employeeName] = byEmp[s.employeeName] || { t: 0, n: 0 };
    byEmp[s.employeeName].t += s.total; byEmp[s.employeeName].n += 1;
  });

  const byProduct = {};
  inRange.forEach((s) => s.items.forEach((i) => {
    byProduct[i.name] = byProduct[i.name] || { qty: 0, unit: i.unit, rev: 0 };
    byProduct[i.name].qty += i.qty; byProduct[i.name].rev += i.qty * i.price;
  }));
  const prodRows = Object.entries(byProduct).sort((a, b) => b[1].rev - a[1].rev);

  const Stat = ({ label, value, color }) => (
    <Panel style={{ padding: 18, flex: 1, minWidth: 150 }}>
      <div className="mono" style={{ fontSize: 12, color: C.muted, letterSpacing: 2, marginBottom: 6 }}>{label}</div>
      <div className="mono" style={{ fontSize: 26, fontWeight: 700, color: color || C.text }}>{value}</div>
    </Panel>
  );

  return (
    <div className="fadein">
      <h2 style={{ margin: "0 0 16px", fontSize: 24 }}>Informes</h2>

      {/* period controls */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden" }}>
          {[["dia", "Día"], ["semana", "Semana"], ["mes", "Mes"]].map(([id, l]) => (
            <button key={id} onClick={() => { setPeriod(id); setOpenDay(null); }}
              style={{ padding: "10px 18px", border: "none", fontWeight: 700, fontSize: 15, background: period === id ? C.greenDark : "transparent", color: period === id ? C.green : C.muted }}>
              {l}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Btn size="sm" onClick={() => move(-1)}>←</Btn>
          <span className="mono" style={{ fontSize: 14, color: C.text, minWidth: 170, textAlign: "center", textTransform: "capitalize" }}>{range.label}</span>
          <Btn size="sm" onClick={() => move(1)}>→</Btn>
          <Btn size="sm" onClick={() => { setAnchor(todayISO()); setOpenDay(null); }}>Hoy</Btn>
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <Stat label="TOKENS" value={eur(total)} color={C.amber} />
        <Stat label="EFECTIVO" value={eur(cash)} />
        <Stat label="TARJETA" value={eur(card)} />
        <Stat label="DISPENSACIONES" value={inRange.length} color={C.green} />
        <Stat label="GRAMOS" value={`${+grams.toFixed(2)} g`} />
      </div>

      {period !== "dia" && (
        <Panel style={{ padding: 18, marginBottom: 20 }}>
          <div className="mono" style={{ fontSize: 12, color: C.muted, letterSpacing: 2, marginBottom: 12 }}>TOKENS POR DÍA</div>
          {days.length === 0 && <div style={{ color: C.muted, fontSize: 14 }}>Sin movimientos en este periodo.</div>}
          {days.map(([d, v]) => (
            <div key={d}>
              <div className="row" onClick={() => setOpenDay(openDay === d ? null : d)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 6px", borderRadius: 8, cursor: "pointer" }}>
                <span className="mono" style={{ width: 110, fontSize: 14, textTransform: "capitalize" }}>{dateES(d)}</span>
                <div style={{ flex: 1, height: 10, background: C.bg, borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ width: `${(v.total / maxDay) * 100}%`, height: "100%", background: C.green }} />
                </div>
                <span className="mono" style={{ fontSize: 14, color: C.muted, width: 60, textAlign: "right" }}>{v.n} ops</span>
                <span className="mono" style={{ fontSize: 14, color: C.amber, width: 90, textAlign: "right" }}>{eur(v.total)}</span>
              </div>
              {openDay === d && (
                <div className="day-detail" style={{ margin: "4px 0 10px 116px" }}>
                  {[...v.sales].sort((a, b) => b.ts - a.ts).map((s) => {
                    const m = members.find((x) => x.id === s.memberId);
                    return (
                      <div key={s.id} className="mono" style={{ display: "flex", gap: 12, fontSize: 13, color: C.muted, padding: "4px 0", flexWrap: "wrap" }}>
                        <span>{timeStr(s.ts)}</span>
                        <span style={{ color: C.text }}>{m?.name || "—"}</span>
                        <span>{s.items.map((i) => `${i.name} ${i.qty}${i.unit === "g" ? "g" : "×"}`).join(", ")}</span>
                        <span>{s.employeeName}</span>
                        <span>{s.payment}</span>
                        <span style={{ color: C.amber }}>{eur(s.total)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </Panel>
      )}

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <Panel style={{ flex: 1, padding: 18, minWidth: 280 }}>
          <div className="mono" style={{ fontSize: 12, color: C.muted, letterSpacing: 2, marginBottom: 12 }}>POR EMPLEADO</div>
          {Object.keys(byEmp).length === 0 && <div style={{ color: C.muted, fontSize: 14 }}>Sin movimientos.</div>}
          {Object.entries(byEmp).sort((a, b) => b[1].t - a[1].t).map(([name, v]) => (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderTop: `1px solid ${C.line}` }}>
              <span style={{ fontWeight: 700 }}>{name}</span>
              <span className="mono" style={{ color: C.muted }}>{v.n} ops</span>
              <span className="mono" style={{ color: C.amber }}>{eur(v.t)}</span>
            </div>
          ))}
        </Panel>
        <Panel style={{ flex: 1, padding: 18, minWidth: 280 }}>
          <div className="mono" style={{ fontSize: 12, color: C.muted, letterSpacing: 2, marginBottom: 12 }}>POR PRODUCTO</div>
          {prodRows.length === 0 && <div style={{ color: C.muted, fontSize: 14 }}>Sin movimientos.</div>}
          {prodRows.map(([name, d]) => (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderTop: `1px solid ${C.line}` }}>
              <span style={{ fontWeight: 700 }}>{name}</span>
              <span className="mono" style={{ color: C.muted }}>{+d.qty.toFixed(2)} {d.unit}</span>
              <span className="mono" style={{ color: C.amber }}>{eur(d.rev)}</span>
            </div>
          ))}
        </Panel>
      </div>

      {period === "dia" && (
        <Panel style={{ marginTop: 20, padding: 18 }}>
          <div className="mono" style={{ fontSize: 12, color: C.muted, letterSpacing: 2, marginBottom: 12 }}>REGISTRO DEL DÍA</div>
          {inRange.length === 0 && <div style={{ color: C.muted, fontSize: 14 }}>Sin dispensaciones este día.</div>}
          {[...inRange].sort((a, b) => b.ts - a.ts).map((s) => {
            const m = members.find((x) => x.id === s.memberId);
            return (
              <div key={s.id} className="mono" style={{ display: "flex", gap: 14, padding: "9px 0", borderTop: `1px solid ${C.line}`, fontSize: 14, flexWrap: "wrap" }}>
                <span style={{ color: C.muted }}>{timeStr(s.ts)}</span>
                <span style={{ flex: 1, minWidth: 140 }}>{m?.name || "—"}</span>
                <span style={{ color: C.muted }}>{s.items.map((i) => `${i.name} ${i.qty}${i.unit === "g" ? "g" : "×"}`).join(", ")}</span>
                <span style={{ color: C.muted }}>{s.employeeName}</span>
                <span>{s.payment}</span>
                <span style={{ color: C.amber }}>{eur(s.total)}</span>
              </div>
            );
          })}
        </Panel>
      )}
    </div>
  );
}
