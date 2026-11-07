// Email bodies for the booking flow, in the language the customer booked in (en/es/de/it/fr).
// The booking record stores `bookingLang` (the website/checkout language); the API passes it here.
// confirmationEmail() goes out when payment succeeds; eticketEmail() when staff confirm (PDF attached).

const money = (n) => `${Number(n || 0).toFixed(2).replace(".", ",")}€`;
const BRAND = "#2f2483";
const WA = "+34 633 229 244";

function shell(bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#f5f7fc;font-family:Arial,Helvetica,sans-serif;color:#1f2430">
  <div style="max-width:560px;margin:0 auto;padding:20px">
    <div style="background:${BRAND};color:#fff;padding:16px 20px;border-radius:10px 10px 0 0;font-size:18px;font-weight:bold">Excursions Tickets Direct</div>
    <div style="background:#fff;padding:22px 20px;border-radius:0 0 10px 10px;font-size:15px;line-height:1.55">${bodyHtml}</div>
    <p style="color:#9aa3b2;font-size:12px;text-align:center;margin:16px 0">Excursions Tickets Direct · Lanzarote · info@excursionsticketsdirect.com · WhatsApp ${WA}</p>
  </div></body></html>`;
}

// One language pack per supported language. {ref}/{name}/{deposit}/{tour}/{date}/{point}/{time} are filled in.
const PACK = {
  en: {
    confirmSubject: (b) => `Payment received – Tickets Direct (booking #${b.ref})`,
    confirm: (b) => [`Hi ${b.name},`,
      `<strong>We've received your payment.</strong> Thank you for booking with Tickets Direct.`,
      `This confirms your <strong>${b.deposit} deposit</strong> for <strong>${b.tour}</strong>${b.date ? ` on ${b.date}` : ""}. The balance is paid on the day of the excursion.`,
      `We'll shortly send you a <strong>second email and a WhatsApp message</strong> confirming your excursion, with your <strong>e-ticket</strong> and your pickup point and time.`,
      `Booking reference: <strong>#${b.ref}</strong>`,
      `Any questions? Message us on WhatsApp at ${WA}, 24h.`,
      `Kind regards,<br>The Tickets Direct team, Lanzarote`],
    eticketSubject: (b) => `Your e-ticket – ${b.tour} (booking #${b.ref})`,
    eticket: (b) => [`Hi ${b.name},`,
      `<strong>Your excursion is confirmed!</strong> Your e-ticket is attached.`,
      `<strong>${b.tour}</strong>${b.date ? ` · ${b.date}` : ""}<br>Pickup: <strong>${b.point || "to be confirmed"}</strong> at <strong>${b.time || "—"}</strong>`,
      `Bring the e-ticket (on your phone is fine) on the day. The balance is paid to the staff at pickup.`,
      `Questions? WhatsApp ${WA}.`,
      `Enjoy!<br>Tickets Direct, Lanzarote`],
    whatsapp: (b) => `Hi ${b.name}! Your excursion ${b.tour}${b.date ? ` (${b.date})` : ""} is confirmed. Pickup: ${b.point || ""} at ${b.time || ""}. Your e-ticket is attached. Tickets Direct`,
  },
  es: {
    confirmSubject: (b) => `Pago recibido – Tickets Direct (reserva #${b.ref})`,
    confirm: (b) => [`Hola ${b.name},`,
      `<strong>Hemos recibido tu pago.</strong> Gracias por reservar con Tickets Direct.`,
      `Esto confirma tu <strong>depósito de ${b.deposit}</strong> para <strong>${b.tour}</strong>${b.date ? ` el ${b.date}` : ""}. El resto se paga el día de la excursión.`,
      `En breve te enviaremos un <strong>segundo correo y un mensaje de WhatsApp</strong> confirmando tu excursión, con tu <strong>e-ticket</strong> y el punto y la hora de recogida.`,
      `Referencia de reserva: <strong>#${b.ref}</strong>`,
      `¿Alguna pregunta? Escríbenos por WhatsApp al ${WA}, 24 h.`,
      `Un saludo,<br>El equipo de Tickets Direct, Lanzarote`],
    eticketSubject: (b) => `Tu e-ticket – ${b.tour} (reserva #${b.ref})`,
    eticket: (b) => [`Hola ${b.name},`,
      `<strong>¡Tu excursión está confirmada!</strong> Adjuntamos tu e-ticket.`,
      `<strong>${b.tour}</strong>${b.date ? ` · ${b.date}` : ""}<br>Recogida: <strong>${b.point || "por confirmar"}</strong> a las <strong>${b.time || "—"}</strong>`,
      `Lleva el e-ticket (en el móvil vale) el día de la excursión. El importe pendiente se paga al personal en la recogida.`,
      `¿Dudas? WhatsApp ${WA}.`,
      `¡Buen viaje!<br>Tickets Direct, Lanzarote`],
    whatsapp: (b) => `¡Hola ${b.name}! Tu excursión ${b.tour}${b.date ? ` (${b.date})` : ""} está confirmada. Recogida: ${b.point || ""} a las ${b.time || ""}. Te adjuntamos el e-ticket. Tickets Direct`,
  },
  de: {
    confirmSubject: (b) => `Zahlung erhalten – Tickets Direct (Buchung #${b.ref})`,
    confirm: (b) => [`Hallo ${b.name},`,
      `<strong>Wir haben deine Zahlung erhalten.</strong> Danke, dass du bei Tickets Direct gebucht hast.`,
      `Hiermit bestätigen wir deine <strong>Anzahlung von ${b.deposit}</strong> für <strong>${b.tour}</strong>${b.date ? ` am ${b.date}` : ""}. Der Rest wird am Tag des Ausflugs bezahlt.`,
      `In Kürze senden wir dir eine <strong>zweite E-Mail und eine WhatsApp-Nachricht</strong>, die deinen Ausflug bestätigt, mit deinem <strong>E-Ticket</strong> sowie Abholort und -zeit.`,
      `Buchungsreferenz: <strong>#${b.ref}</strong>`,
      `Fragen? Schreib uns auf WhatsApp unter ${WA}, rund um die Uhr.`,
      `Herzliche Grüße,<br>Dein Tickets-Direct-Team, Lanzarote`],
    eticketSubject: (b) => `Dein E-Ticket – ${b.tour} (Buchung #${b.ref})`,
    eticket: (b) => [`Hallo ${b.name},`,
      `<strong>Dein Ausflug ist bestätigt!</strong> Dein E-Ticket ist angehängt.`,
      `<strong>${b.tour}</strong>${b.date ? ` · ${b.date}` : ""}<br>Abholung: <strong>${b.point || "wird noch bestätigt"}</strong> um <strong>${b.time || "—"}</strong>`,
      `Bring das E-Ticket (auf dem Handy reicht) am Tag des Ausflugs mit. Der Restbetrag wird bei der Abholung an das Personal bezahlt.`,
      `Fragen? WhatsApp ${WA}.`,
      `Gute Fahrt!<br>Tickets Direct, Lanzarote`],
    whatsapp: (b) => `Hallo ${b.name}! Dein Ausflug ${b.tour}${b.date ? ` (${b.date})` : ""} ist bestätigt. Abholung: ${b.point || ""} um ${b.time || ""}. Dein E-Ticket ist angehängt. Tickets Direct`,
  },
  it: {
    confirmSubject: (b) => `Pagamento ricevuto – Tickets Direct (prenotazione #${b.ref})`,
    confirm: (b) => [`Ciao ${b.name},`,
      `<strong>Abbiamo ricevuto il tuo pagamento.</strong> Grazie per aver prenotato con Tickets Direct.`,
      `Questo conferma il tuo <strong>acconto di ${b.deposit}</strong> per <strong>${b.tour}</strong>${b.date ? ` il ${b.date}` : ""}. Il saldo si paga il giorno dell'escursione.`,
      `A breve ti invieremo una <strong>seconda email e un messaggio WhatsApp</strong> per confermare la tua escursione, con il tuo <strong>e-ticket</strong> e il punto e l'orario di ritiro.`,
      `Riferimento prenotazione: <strong>#${b.ref}</strong>`,
      `Domande? Scrivici su WhatsApp al ${WA}, 24 h.`,
      `Cordiali saluti,<br>Il team di Tickets Direct, Lanzarote`],
    eticketSubject: (b) => `Il tuo e-ticket – ${b.tour} (prenotazione #${b.ref})`,
    eticket: (b) => [`Ciao ${b.name},`,
      `<strong>La tua escursione è confermata!</strong> Il tuo e-ticket è in allegato.`,
      `<strong>${b.tour}</strong>${b.date ? ` · ${b.date}` : ""}<br>Ritiro: <strong>${b.point || "da confermare"}</strong> alle <strong>${b.time || "—"}</strong>`,
      `Porta l'e-ticket (va bene sul telefono) il giorno dell'escursione. Il saldo si paga al personale al momento del ritiro.`,
      `Domande? WhatsApp ${WA}.`,
      `Buon divertimento!<br>Tickets Direct, Lanzarote`],
    whatsapp: (b) => `Ciao ${b.name}! La tua escursione ${b.tour}${b.date ? ` (${b.date})` : ""} è confermata. Ritiro: ${b.point || ""} alle ${b.time || ""}. In allegato il tuo e-ticket. Tickets Direct`,
  },
  fr: {
    confirmSubject: (b) => `Paiement reçu – Tickets Direct (réservation #${b.ref})`,
    confirm: (b) => [`Bonjour ${b.name},`,
      `<strong>Nous avons bien reçu votre paiement.</strong> Merci d'avoir réservé avec Tickets Direct.`,
      `Ceci confirme votre <strong>acompte de ${b.deposit}</strong> pour <strong>${b.tour}</strong>${b.date ? ` le ${b.date}` : ""}. Le solde se paie le jour de l'excursion.`,
      `Nous vous enverrons prochainement un <strong>second e-mail et un message WhatsApp</strong> confirmant votre excursion, avec votre <strong>e-ticket</strong> ainsi que le point et l'heure de prise en charge.`,
      `Référence de réservation : <strong>#${b.ref}</strong>`,
      `Des questions ? Écrivez-nous sur WhatsApp au ${WA}, 24h/24.`,
      `Cordialement,<br>L'équipe Tickets Direct, Lanzarote`],
    eticketSubject: (b) => `Votre e-ticket – ${b.tour} (réservation #${b.ref})`,
    eticket: (b) => [`Bonjour ${b.name},`,
      `<strong>Votre excursion est confirmée !</strong> Votre e-ticket est en pièce jointe.`,
      `<strong>${b.tour}</strong>${b.date ? ` · ${b.date}` : ""}<br>Prise en charge : <strong>${b.point || "à confirmer"}</strong> à <strong>${b.time || "—"}</strong>`,
      `Présentez l'e-ticket (sur le téléphone, c'est parfait) le jour de l'excursion. Le solde se paie au personnel lors de la prise en charge.`,
      `Des questions ? WhatsApp ${WA}.`,
      `Bonne excursion !<br>Tickets Direct, Lanzarote`],
    whatsapp: (b) => `Bonjour ${b.name} ! Votre excursion ${b.tour}${b.date ? ` (${b.date})` : ""} est confirmée. Prise en charge : ${b.point || ""} à ${b.time || ""}. Votre e-ticket est en pièce jointe. Tickets Direct`,
  },
};

// Normalise a booking into the fields the packs use.
const fields = (b) => ({
  name: b.customerName || "",
  ref: b.bookingNumber || b.reference || "",
  deposit: money(b.depositPaid),
  tour: b.tour || (b.bookingLang === "es" ? "tu excursión" : "your excursion"),
  date: b.departure || "",
  point: b.pickupPoint || "",
  time: b.pickupTime || "",
});

// lang defaults to the language the customer booked in.
export function confirmationEmail(b, lang = b.bookingLang || "en") {
  const p = PACK[lang] || PACK.en;
  const f = fields(b);
  const lines = p.confirm(f);
  return { subject: p.confirmSubject(f), html: shell(lines.map((l) => `<p>${l}</p>`).join("")), text: lines.map((l) => l.replace(/<[^>]+>/g, "")).join("\n\n") };
}

export function eticketEmail(b, lang = b.bookingLang || "en") {
  const p = PACK[lang] || PACK.en;
  const f = fields(b);
  const lines = p.eticket(f);
  return { subject: p.eticketSubject(f), html: shell(lines.map((l) => `<p>${l}</p>`).join("")), text: lines.map((l) => l.replace(/<[^>]+>/g, "")).join("\n\n"), whatsapp: p.whatsapp(f) };
}
