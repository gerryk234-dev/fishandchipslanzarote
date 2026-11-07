// Email bodies for the booking flow (EN/ES). Plain, brand-light, mobile-friendly HTML + a text
// fallback. Used by the booking API: the confirmation goes out the moment payment succeeds; the
// e-ticket email goes out when staff confirm and generate the PDF (attached).

const money = (n) => `${Number(n).toFixed(2).replace(".", ",")}€`;
const BRAND = "#2f2483";

function shell(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#f5f7fc;font-family:Arial,Helvetica,sans-serif;color:#1f2430">
  <div style="max-width:560px;margin:0 auto;padding:20px">
    <div style="background:${BRAND};color:#fff;padding:16px 20px;border-radius:10px 10px 0 0;font-size:18px;font-weight:bold">Excursions Tickets Direct</div>
    <div style="background:#fff;padding:22px 20px;border-radius:0 0 10px 10px;font-size:15px;line-height:1.55">${bodyHtml}</div>
    <p style="color:#9aa3b2;font-size:12px;text-align:center;margin:16px 0">Excursions Tickets Direct · Lanzarote · info@excursionsticketsdirect.com · WhatsApp +34 633 229 244</p>
  </div></body></html>`;
}

// Sent immediately after payment: confirms the deposit and explains the e-ticket follows by email + WhatsApp.
export function confirmationEmail(b, lang = "en") {
  const name = b.customerName || "";
  const paid = money(b.depositPaid || 0);
  if (lang === "es") {
    const body = `<p>Hola ${name},</p>
      <p><strong>Hemos recibido tu pago.</strong> Gracias por reservar con Tickets Direct.</p>
      <p>Esto confirma tu <strong>depósito de ${paid}</strong> para <strong>${b.tour || "tu excursión"}</strong>${b.departure ? ` el ${b.departure}` : ""}. El resto se paga el día de la excursión.</p>
      <p>En breve te enviaremos un <strong>segundo correo y un mensaje de WhatsApp</strong> confirmando tu excursión, con tu <strong>e-ticket</strong>, el punto y la hora de recogida.</p>
      <p>Referencia de reserva: <strong>#${b.bookingNumber || b.reference || ""}</strong></p>
      <p>¿Alguna pregunta? Escríbenos por WhatsApp al +34 633 229 244, 24 h.</p>
      <p>Un saludo,<br>El equipo de Tickets Direct, Lanzarote</p>`;
    return { subject: `Pago recibido – Tickets Direct (reserva #${b.bookingNumber || b.reference || ""})`, html: shell("Pago recibido", body), text: body.replace(/<[^>]+>/g, "") };
  }
  const body = `<p>Hi ${name},</p>
    <p><strong>We've received your payment.</strong> Thank you for booking with Tickets Direct.</p>
    <p>This confirms your <strong>${paid} deposit</strong> for <strong>${b.tour || "your excursion"}</strong>${b.departure ? ` on ${b.departure}` : ""}. The balance is paid on the day of the excursion.</p>
    <p>We'll shortly send you a <strong>second email and a WhatsApp message</strong> confirming your excursion, with your <strong>e-ticket</strong> and your pickup point and time.</p>
    <p>Booking reference: <strong>#${b.bookingNumber || b.reference || ""}</strong></p>
    <p>Any questions? Message us on WhatsApp at +34 633 229 244, 24h.</p>
    <p>Kind regards,<br>The Tickets Direct team, Lanzarote</p>`;
  return { subject: `Payment received – Tickets Direct (booking #${b.bookingNumber || b.reference || ""})`, html: shell("Payment received", body), text: body.replace(/<[^>]+>/g, "") };
}

// Sent when staff confirm the booking: the e-ticket PDF is attached; same text is also the WhatsApp message.
export function eticketEmail(b, lang = "en") {
  const name = b.customerName || "";
  if (lang === "es") {
    const body = `<p>Hola ${name},</p>
      <p><strong>¡Tu excursión está confirmada!</strong> Adjuntamos tu e-ticket.</p>
      <p><strong>${b.tour || ""}</strong>${b.departure ? ` · ${b.departure}` : ""}<br>
      Recogida: <strong>${b.pickupPoint || "por confirmar"}</strong> a las <strong>${b.pickupTime || "—"}</strong></p>
      <p>Lleva el e-ticket (en el móvil vale) el día de la excursión. El importe pendiente se paga al personal en la recogida.</p>
      <p>¿Dudas? WhatsApp +34 633 229 244.</p>
      <p>¡Buen viaje!<br>Tickets Direct, Lanzarote</p>`;
    return { subject: `Tu e-ticket – ${b.tour || "excursión"} (reserva #${b.bookingNumber || ""})`, html: shell("Tu e-ticket", body), text: body.replace(/<[^>]+>/g, ""), whatsapp: `¡Hola ${name}! Tu excursión ${b.tour || ""}${b.departure ? ` (${b.departure})` : ""} está confirmada. Recogida: ${b.pickupPoint || ""} a las ${b.pickupTime || ""}. Te adjuntamos el e-ticket. Tickets Direct` };
  }
  const body = `<p>Hi ${name},</p>
    <p><strong>Your excursion is confirmed!</strong> Your e-ticket is attached.</p>
    <p><strong>${b.tour || ""}</strong>${b.departure ? ` · ${b.departure}` : ""}<br>
    Pickup: <strong>${b.pickupPoint || "to be confirmed"}</strong> at <strong>${b.pickupTime || "—"}</strong></p>
    <p>Bring the e-ticket (on your phone is fine) on the day. The balance is paid to the staff at pickup.</p>
    <p>Questions? WhatsApp +34 633 229 244.</p>
    <p>Enjoy!<br>Tickets Direct, Lanzarote</p>`;
  return { subject: `Your e-ticket – ${b.tour || "excursion"} (booking #${b.bookingNumber || ""})`, html: shell("Your e-ticket", body), text: body.replace(/<[^>]+>/g, ""), whatsapp: `Hi ${name}! Your excursion ${b.tour || ""}${b.departure ? ` (${b.departure})` : ""} is confirmed. Pickup: ${b.pickupPoint || ""} at ${b.pickupTime || ""}. Your e-ticket is attached. Tickets Direct` };
}
