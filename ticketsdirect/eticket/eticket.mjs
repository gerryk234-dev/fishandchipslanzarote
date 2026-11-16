// Renders a bilingual (EN/ES) e-ticket as a self-contained HTML document, matching the Tickets
// Direct e-ticket layout. A PDF is produced from this HTML by scripts/make-eticket.mjs.
// renderEticket(data, { logo, qr }) -> HTML string. logo/qr are data URIs (optional).

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const money = (n) => (n == null || n === "" ? "" : `${Number(n).toFixed(2).replace(".", ",")}€`);
const dmy = (s) => {
  if (!s) return "";
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(s);
};

// A row in the two-column bilingual info grid. value2/label2 make a second cell on the same row.
const cell = (en, es, value) => `<div class="cell"><span class="lbl">${esc(en)} / ${esc(es)}</span><span class="val">${value}</span></div>`;

export function eticketNumber(bookingNumber, dateISO, suffix) {
  const d = (dateISO || new Date().toISOString().slice(0, 10)).replace(/-/g, "");
  const s = (suffix || Math.random().toString(16).slice(2, 6)).toUpperCase();
  return `ETD-${bookingNumber}-${d}-${s}`;
}

export function renderEticket(d, { logo = "", qr = "" } = {}) {
  const num = d.number || eticketNumber(d.bookingNumber || "", d.date);
  const rates = (d.rates || []).filter((r) => Number(r.units) > 0);
  const computedTotal = rates.reduce((s, r) => s + Number(r.units) * Number(r.price), 0);
  const total = d.total != null && d.total !== "" ? Number(d.total) : computedTotal;
  const deposit = Number(d.depositPaid || 0);
  const pending = d.pending != null && d.pending !== "" ? Number(d.pending) : total - deposit;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(num)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font: 11px/1.45 "Helvetica Neue", Arial, sans-serif; color: #1f2430; margin: 0; }
  .brand { background: #2f2483; text-align: center; padding: 12px; border-radius: 4px; }
  .brand img { width: 210px; max-width: 70%; height: auto; display: inline-block; }
  h1 { color: #0077c8; text-align: center; font-size: 17px; margin: 14px 0 12px; letter-spacing: .3px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #dfe4ee; border-radius: 6px; overflow: hidden; margin-bottom: 14px; }
  .meta > div { padding: 6px 10px; border-right: 1px solid #eef1f7; border-bottom: 1px solid #eef1f7; }
  h2 { color: #0077c8; font-size: 12.5px; margin: 16px 0 7px; }
  .grid { border: 1px solid #dfe4ee; border-radius: 6px; overflow: hidden; }
  .grid .row { display: grid; grid-template-columns: 1fr 1fr; }
  .grid .row.full { grid-template-columns: 1fr; }
  .cell { padding: 6px 10px; border-right: 1px solid #eef1f7; border-bottom: 1px solid #eef1f7; }
  .cell .lbl { display: block; color: #8a93a6; font-size: 9px; text-transform: none; }
  .cell .val { display: block; font-weight: 600; color: #1f2430; }
  table.rates { width: 100%; border-collapse: collapse; margin-top: 2px; }
  table.rates th { background: #0077c8; color: #fff; font-weight: 600; text-align: left; padding: 6px 10px; font-size: 10px; }
  table.rates th.n, table.rates td.n { text-align: right; }
  table.rates td { padding: 6px 10px; border-bottom: 1px solid #eef1f7; }
  .totals { margin-top: 8px; }
  .totals .line { display: flex; justify-content: space-between; padding: 4px 10px; }
  .totals .grand { background: #eaf4fb; color: #0077c8; font-weight: 700; font-size: 13px; border-radius: 4px; }
  .note { color: #6b7280; font-size: 9px; font-style: italic; margin: 6px 10px 0; }
  .notes-box { margin-top: 12px; background: #fff8e1; border: 1px solid #f3e4ac; border-radius: 6px; padding: 8px 10px; }
  .notes-box b { color: #8a6d1a; }
  .verify { text-align: center; margin: 22px 0 10px; page-break-before: always; }
  .verify img { width: 150px; height: 150px; }
  .verify p { color: #6b7280; font-size: 9.5px; margin: 6px 0 0; }
  .verify .vt { color: #1f2430; font-weight: 700; font-size: 11px; margin-top: 8px; }
  .terms h2 { text-align: left; }
  .terms p { color: #4b5563; margin: 6px 0; }
  .foot { text-align: center; color: #9aa3b2; font-size: 9px; margin-top: 20px; }
  .cancelled { color: #b42318; border: 2px solid #b42318; border-radius: 6px; text-align: center; padding: 6px; font-weight: 700; margin-bottom: 12px; text-transform: uppercase; }
</style></head>
<body>
  ${logo ? `<div class="brand"><img src="${logo}" alt="Excursions Tickets Direct"></div>` : ""}
  <h1>E-Ticket ${esc(num)}</h1>
  ${d.cancelled ? `<div class="cancelled">Cancelled / Cancelado</div>` : ""}
  <div class="meta">
    ${cell("Booking number", "Número de reserva", `#${esc(d.bookingNumber)}`)}
    ${cell("E-ticket date", "Fecha", esc(dmy(d.date)))}
    ${cell("Locator", "Localizador", esc(d.locator))}
    ${cell("Seller", "Vendedor", esc(d.seller || "VENTA ONLINE"))}
  </div>

  <h2>Purchasing Information / Información de compra</h2>
  <div class="grid">
    <div class="row">${cell("Tour", "Excursión", esc(d.tour))}${cell("Departure", "Salida", esc(dmy(d.departure)))}</div>
    <div class="row">${cell("Language", "Idioma", esc((d.language || "").toUpperCase()))}${cell("Package", "Paquete", esc(d.package))}</div>
    <div class="row">${cell("Customer", "Cliente", esc(d.customerName))}${cell("Country", "País", esc(d.country))}</div>
    <div class="row">${cell("Phone", "Teléfono", esc(d.phone))}${cell("Email", "Email", esc(d.email))}</div>
    <div class="row full">${cell("Hotel & room", "Hotel y habitación", esc(d.hotelRoom))}</div>
    <div class="row">${cell("Pickup point", "Punto de recogida", esc(d.pickupPoint))}${cell("Pickup time", "Hora de recogida", esc(d.pickupTime))}</div>
  </div>

  <h2>Price / Precio</h2>
  <table class="rates">
    <thead><tr><th>Rate / Tarifa</th><th class="n">Units / Uds.</th><th class="n">Price / Precio</th><th class="n">Subtotal</th></tr></thead>
    <tbody>${rates.map((r) => `<tr><td>${esc(r.label)}</td><td class="n">${esc(r.units)}</td><td class="n">${money(r.price)}</td><td class="n">${money(Number(r.units) * Number(r.price))}</td></tr>`).join("")}</tbody>
  </table>
  <div class="totals">
    <div class="line grand"><span>Total</span><span>${money(total)}</span></div>
    <div class="line"><span>Deposit paid / Depósito pagado</span><span>${money(deposit)}</span></div>
    <div class="line"><span>Pending / Pendiente</span><span>${money(pending)}</span></div>
  </div>
  <p class="note">* Pending amount to be paid to the excursion staff at the time of departure. / Importe pendiente a pagar al personal de la excursión en el momento de la salida.</p>

  ${d.notes ? `<div class="notes-box"><b>Notes / Notas:</b><br>${esc(d.notes).replace(/\n/g, "<br>")}</div>` : ""}

  <div class="verify">
    ${qr ? `<img src="${qr}" alt="QR">` : ""}
    <p class="vt">Verify this e-ticket / Verificar este e-ticket</p>
    <p>Scan to open the current valid or cancelled version. / Escanee para abrir la versión vigente o cancelada.</p>
  </div>

  <div class="terms">
    <h2>Terms &amp; Conditions / Términos y condiciones</h2>
    <p>We reserve the right to cancel excursions and change itineraries should circumstances require. In case of cancellation without prior notice, all expenses required by the excursion providers will be deducted from the amount paid. Children under the age of 3 go free.</p>
    <p>Se reserva el derecho de anular las excursiones y modificar itinerarios si las circunstancias lo requieren. En caso de cancelación, sin aviso previo, se descontará del importe pagado todos aquellos gastos que exijan los distintos proveedores de excursiones. Niños hasta 3 años gratis.</p>
  </div>

  <p class="foot">Excursions Tickets Direct · E-ticket ${esc(num)} · Booking #${esc(d.bookingNumber)}</p>
</body></html>`;
}
