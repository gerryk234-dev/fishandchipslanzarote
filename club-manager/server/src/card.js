import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

/* Membership card PDF: page 1 is the carnet (photo, name, OL code),
   page 2 is the welcome briefing + club policy disclaimer. */

const BG = rgb(0.09, 0.11, 0.082);       // #171C15
const SURFACE = rgb(0.125, 0.15, 0.114); // #20261D
const GREEN = rgb(0.56, 0.75, 0.435);    // #8FBF6F
const AMBER = rgb(0.89, 0.69, 0.294);    // #E3B04B
const INK = rgb(1, 1, 1);
const MUTED = rgb(0.7, 0.74, 0.65);

export const WELCOME_TEXT = (name) => `Hola ${name},

¡Bienvenido/a a One Life Lanzarote!

Tu solicitud ha sido aprobada y ya formas parte de nuestra asociación.
En este documento encontrarás tu carnet de socio con tu número
identificativo personal. Preséntalo (impreso o en el móvil) junto con
tu documento de identidad en cada visita al club.

Horario y dirección: consulta onelifelanzarote.com
Cualquier duda, contáctanos por WhatsApp o responde a este correo.

Nos vemos pronto,
El equipo de One Life Lanzarote`;

export const TERMS_TEXT = `CONDICIONES DE USO Y POLÍTICA DE SOCIOS (RESUMEN)

1. One Life Lanzarote es una asociación privada de personas adultas.
   El acceso está reservado exclusivamente a socios registrados.
2. La condición de socio es personal e intransferible. El carnet no
   puede cederse a terceros.
3. Todo consumo se realiza dentro del ámbito privado de la asociación.
   Está prohibida la extracción o distribución a terceros.
4. El socio declara ser mayor de edad y haberse inscrito de forma
   voluntaria, sin publicidad ni promoción alguna.
5. La asociación puede suspender o revocar la condición de socio en
   caso de incumplimiento de las normas internas.
6. Los datos personales se tratan de forma confidencial conforme al
   RGPD y solo para la gestión interna de la asociación. Puedes
   ejercer tus derechos de acceso, rectificación y supresión
   escribiendo a la asociación.

(Documento orientativo — revisa el texto definitivo con tu asesor legal.)`;

function dataUrlToBytes(dataUrl) {
  const m = /^data:image\/(jpeg|jpg|png);base64,(.+)$/i.exec(dataUrl || "");
  if (!m) return null;
  return { type: m[1].toLowerCase(), bytes: Buffer.from(m[2], "base64") };
}

export async function generateCard(member) {
  const doc = await PDFDocument.create();
  const mono = await doc.embedFont(StandardFonts.Courier);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const body = await doc.embedFont(StandardFonts.Helvetica);

  /* ---- page 1: the card (A6 landscape) ---- */
  const W = 420, H = 298;
  const p = doc.addPage([W, H]);
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: BG });
  p.drawRectangle({ x: 14, y: 14, width: W - 28, height: H - 28, color: SURFACE, borderColor: GREEN, borderWidth: 1.5 });

  p.drawText("ONE LIFE LANZAROTE", { x: 34, y: H - 52, size: 13, font: mono, color: GREEN });
  p.drawText("CARNET DE SOCIO", { x: 34, y: H - 70, size: 9, font: mono, color: MUTED });

  // photo box
  const px = 34, py = 44, pw = 110, ph = 140;
  const img = dataUrlToBytes(member.photo);
  if (img) {
    try {
      const embedded = img.type === "png" ? await doc.embedPng(img.bytes) : await doc.embedJpg(img.bytes);
      const scale = Math.max(pw / embedded.width, ph / embedded.height);
      const iw = embedded.width * scale, ih = embedded.height * scale;
      p.drawImage(embedded, { x: px + (pw - iw) / 2, y: py + (ph - ih) / 2, width: iw, height: ih });
    } catch {
      p.drawRectangle({ x: px, y: py, width: pw, height: ph, color: BG });
    }
  } else {
    p.drawRectangle({ x: px, y: py, width: pw, height: ph, color: BG });
    p.drawText("SIN FOTO", { x: px + 28, y: py + ph / 2, size: 9, font: mono, color: MUTED });
  }
  p.drawRectangle({ x: px, y: py, width: pw, height: ph, borderColor: GREEN, borderWidth: 1, color: undefined, opacity: 0 });

  const tx = px + pw + 24;
  p.drawText(member.name, { x: tx, y: 158, size: 17, font: bold, color: INK });
  p.drawText(member.num || "", { x: tx, y: 126, size: 24, font: mono, color: AMBER });
  p.drawText(`Tipo: ${member.type === "turista" ? "TURISTA" : "LOCAL"}`, { x: tx, y: 100, size: 10, font: mono, color: INK });
  p.drawText(`Alta: ${member.joined}`, { x: tx, y: 84, size: 10, font: mono, color: MUTED });
  if (member.nationality && member.nationality !== "—") {
    p.drawText(`Nacionalidad: ${member.nationality}`, { x: tx, y: 68, size: 10, font: mono, color: MUTED });
  }
  p.drawText("Personal e intransferible · presentar con documento de identidad", { x: 34, y: 26, size: 7.5, font: body, color: MUTED });

  /* ---- page 2: welcome + terms (A4) ---- */
  const p2 = doc.addPage([595, 842]);
  p2.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: BG });
  p2.drawText("ONE LIFE LANZAROTE", { x: 60, y: 780, size: 14, font: mono, color: GREEN });
  let y = 740;
  const writeBlock = (text, font, size, color, lineGap) => {
    for (const line of text.split("\n")) {
      p2.drawText(line, { x: 60, y, size, font, color });
      y -= lineGap;
    }
  };
  writeBlock(WELCOME_TEXT(member.name), body, 11, INK, 16);
  y -= 14;
  writeBlock(TERMS_TEXT, body, 9, MUTED, 13);

  return Buffer.from(await doc.save());
}
