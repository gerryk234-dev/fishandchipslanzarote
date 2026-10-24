// Generates docs/google-business-profiles.md: copy-paste content for each office's
// Google Business Profile, built from the live catalogue so prices and services stay correct.
//   npm run gbp
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCatalog, formatPrice, formatDuration } from "../src/lib/catalog.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const C = loadCatalog(path.join(root, "src/data"));
const { site, tours, resorts, offices, profiles } = C;
const raw = JSON.parse(fs.readFileSync(path.join(root, "src/data/offices.json"), "utf8"));
const SITE = site.url.replace(/\/$/, "");
const utm = (p, office) => `${SITE}${p}?utm_source=google&utm_medium=organic&utm_campaign=gbp&utm_content=${office}`;
const byPop = (a, b) => b.popularity - a.popularity;
const resortPath = { en: (r) => `/excursions-from/${r.slug}/` };

const DESC = {
  "costa-teguise": {
    en: `Tickets Direct is Lanzarote's local excursion agency, selling tours since 2000 with roots in Lineas Marítimas Romero. From our Costa Teguise office we book every excursion on the island: La Graciosa catamaran cruises, Timanfaya volcano tours, Jameos del Agua and the caves, buggy adventures, dolphin cruises, water sports, Rancho Texas and island trips to Fuerteventura and Lobos. Pickup from Costa Teguise is available on most tours. Reserve online with a deposit, pay the rest on the day, free cancellation up to 24h. We speak English and Spanish and answer WhatsApp 24h. ${site.officeCount} offices across Costa Teguise, Puerto del Carmen and Playa Blanca.`,
    es: `Tickets Direct es la agencia local de excursiones de Lanzarote, desde 2000 y con la herencia de Líneas Marítimas Romero. En nuestra oficina de Costa Teguise reservamos todas las excursiones de la isla: catamarán a La Graciosa, volcanes de Timanfaya, Jameos del Agua y cuevas, buggies, delfines, deportes acuáticos, Rancho Texas y excursiones a Fuerteventura y Lobos. Recogida en Costa Teguise en la mayoría de excursiones. Reserva online con depósito, paga el resto el día y cancela gratis hasta 24 h antes. WhatsApp 24 h. ${site.officeCount} oficinas en Costa Teguise, Puerto del Carmen y Playa Blanca.`,
  },
  "puerto-del-carmen": {
    en: `Tickets Direct is Lanzarote's local excursion agency, selling tours since 2000 with roots in Lineas Marítimas Romero. From our Puerto del Carmen office we book every excursion on the island: dolphin and sunset cruises, Lobos Island, Timanfaya volcano tours, buggies, jet skis, parasailing, submarine, diving, Rancho Texas and day trips to La Graciosa and Fuerteventura. Pickup from Puerto del Carmen is available on most tours. Reserve online with a deposit, pay the rest on the day, free cancellation up to 24h. English and Spanish spoken, WhatsApp 24h. ${site.officeCount} offices across Costa Teguise, Puerto del Carmen and Playa Blanca.`,
    es: `Tickets Direct es la agencia local de excursiones de Lanzarote, desde 2000 y con la herencia de Líneas Marítimas Romero. En nuestra oficina de Puerto del Carmen reservamos todas las excursiones de la isla: delfines y atardeceres en barco, Isla de Lobos, volcanes de Timanfaya, buggies, motos de agua, parasailing, submarino, buceo, Rancho Texas y excursiones a La Graciosa y Fuerteventura. Recogida en Puerto del Carmen en la mayoría de excursiones. Reserva online con depósito, paga el resto el día y cancela gratis hasta 24 h antes. WhatsApp 24 h.`,
  },
  "playa-blanca": {
    en: `Tickets Direct is Lanzarote's local excursion agency, selling tours since 2000 with roots in Lineas Marítimas Romero. From our Playa Blanca offices we book every excursion on the island: fast ferries and day trips to Fuerteventura and Lobos, Papagayo catamaran cruises, jet skis, parasailing, Aqualava water park, Timanfaya volcano tours, buggies and La Graciosa. Pickup from Playa Blanca is available on most tours. Reserve online with a deposit, pay the rest on the day, free cancellation up to 24h. English and Spanish spoken, WhatsApp 24h. ${site.officeCount} offices across Costa Teguise, Puerto del Carmen and Playa Blanca.`,
    es: `Tickets Direct es la agencia local de excursiones de Lanzarote, desde 2000 y con la herencia de Líneas Marítimas Romero. En nuestras oficinas de Playa Blanca reservamos todas las excursiones de la isla: ferris rápidos y excursiones a Fuerteventura y Lobos, catamaranes a Papagayo, motos de agua, parasailing, Aqualava, volcanes de Timanfaya, buggies y La Graciosa. Recogida en Playa Blanca en la mayoría de excursiones. Reserva online con depósito, paga el resto el día y cancela gratis hasta 24 h antes. WhatsApp 24 h.`,
  },
};

const out = [];
const w = (s = "") => out.push(s);

w(`# Google Business Profile kit: Tickets Direct Excursions Lanzarote`);
w();
w(`Generated ${new Date().toISOString().slice(0, 10)} from the live catalogue (${tours.length} excursions). Re-run \`npm run gbp\` after prices change.`);
w();
w(`Your ${site.officeCount} profiles are the fastest way to beat the small agencies: Google shows the "map pack" above every organic result for searches like *excursions Costa Teguise* or *boat trips Playa Blanca*, and the big platforms (GetYourGuide, Civitatis) have no offices there, so they can't appear in it. Ranking in the map pack depends on **relevance** (categories, services, description), **distance** (you have offices in all three resorts) and **prominence** (reviews, photos, activity). This kit covers all three.`);
w();
w(`## 1. Do this on every profile`);
w();
w(`| Field | What to set |`);
w(`|---|---|`);
w(`| Business name | Your real trading name, the same everywhere: **Tickets Direct Excursions** + the location you use on the shopfront (e.g. "Tickets Direct Excursions Playa Bastián"). Don't add keywords like "Best Boat Trips": Google suspends profiles for it. |`);
w(`| Primary category | **Tour agency** |`);
w(`| Secondary categories | Travel agency · Boat tour agency · Sightseeing tour agency · Tourist information center · Ticket office (only those that are true for that office) |`);
w(`| Phone | The office's own number if it has one, otherwise ${site.phone}. Add WhatsApp under *Chat*. |`);
w(`| Website | The resort page with tracking (links below), not the homepage, so each office ranks for its own area. |`);
w(`| Booking link | ${SITE}/trip/ (Google shows a "Book" button) |`);
w(`| Hours | Real hours, plus holiday hours for Christmas, New Year and Easter. Profiles with missing or wrong hours lose ranking. |`);
w(`| Opening date | 2000 (or the year that office opened) |`);
w(`| Attributes | Languages: English, Spanish (+ German/French if staff speak them) · Accepts credit cards · Online appointments/bookings · Wheelchair accessible entrance (if true) · LGBTQ+ friendly (if you want it shown) |`);
w(`| Service area | Lanzarote, plus La Graciosa and Fuerteventura |`);
w(`| Description | Copy the 750-character description for the resort below (EN as main; Google auto-translates, but add the ES text as an *Update* too) |`);
w();
w(`**NAP consistency:** name, address and phone must match exactly across the profile, the website's offices page (\`src/data/offices.json\`), Tripadvisor, Facebook and directories. Mismatches are one of the most common local-ranking problems.`);
w();
w(`## 2. Per-resort content`);
for (const r of resorts) {
  const list = tours.filter((t) => t.resorts.includes(r.slug)).sort(byPop);
  const officesHere = offices.filter((o) => o.resort === r.slug);
  w();
  w(`### ${r.name}`);
  w();
  w(`Offices in this resort: ${officesHere.map((o) => `[${o.name}](${o.mapsUrl}) (${o.streetAddress})`).join(" · ")}.`);
  w();
  w(`**Website links (one per profile):**`);
  w();
  for (const o of officesHere) w(`- ${o.name}: \`${utm(resortPath.en(r), o.id)}\``);
  w();
  w(`**Description (EN, ${DESC[r.slug].en.length}/750 chars):**`);
  w();
  w(`> ${DESC[r.slug].en}`);
  w();
  w(`**Descripción (ES, ${DESC[r.slug].es.length}/750):**`);
  w();
  w(`> ${DESC[r.slug].es}`);
  w();
  w(`**Services** (Edit profile → Services → add custom services; name ≤ 140 chars, price, short description). ${list.length} tours collect from ${r.name}; add the top 20:`);
  w();
  w(`| Service | Price | Description |`);
  w(`|---|---|---|`);
  for (const t of list.slice(0, 20)) w(`| ${t.name.en} | ${formatPrice("en", t.price)} | ${formatDuration("en", t)}. ${(t.seo.en?.description || "").replace(/\|/g, "/").slice(0, 280)} |`);
  w();
  w(`**Products** (show as photo cards on the profile; add 10, each with its photo from \`src/assets/img/trips/\`, the price and a *Learn more* link):`);
  w();
  for (const t of list.slice(0, 10)) w(`- **${t.name.en}**: ${formatPrice("en", t.price)} · photo \`${t.images[0]?.src.replace("/assets/", "src/assets/") || "-"}\` · link ${utm(t.path.en, `${r.slug}-product`)}`);
}
w();
w(`## 3. Weekly posts (keep every profile active)`);
w();
w(`Post once a week per profile with a photo and a *Book* button. Posts expire from view after a while, but regular activity is a prominence signal. Ready-to-use posts:`);
w();
const pick = [...tours].sort(byPop).slice(0, 12);
pick.forEach((t, i) => {
  w(`${i + 1}. **${t.name.en}**: "${(t.seo.en?.description || "").slice(0, 200)} From ${formatPrice("en", t.price)}, free cancellation up to 24h. Book online or visit our office." Button: *Book* → ${t.path.en}`);
});
w();
w(`Also post: weather updates on windy days (which boats run, land alternatives), seasonal offers (packs), and new tours.`);
w();
w(`## 4. Questions & answers (seed them yourself)`);
w();
w(`Ask these from the profile and answer them as the owner; they show up in Maps and in AI answers:`);
w();
const qa = [
  ["Can I book any excursion in Lanzarote at this office?", `Yes. We sell all ${tours.length} of our excursions at every office, and you can also book online at ${SITE}.`],
  ["Do you offer hotel pickup?", "Yes, most excursions include pickup from your accommodation or the nearest pickup point; the time is on your e-ticket."],
  ["What happens if my boat trip is cancelled because of the wind?", "We move you to another date or a land excursion such as the caves or Timanfaya. Cancellation is free up to 24 hours before."],
  ["Do I pay everything up front?", "No. You pay a deposit when booking and the rest on the day of the excursion."],
  ["Which excursion do you recommend for families?", "The Submarine Safari, dolphin cruises, the La Graciosa catamaran and Rancho Texas are family favourites. Ask us and we'll match it to your children's ages."],
  ["Do you speak English?", "Yes, our staff speak English and Spanish, and WhatsApp support is 24 hours."],
];
for (const [q, a] of qa) w(`- **Q:** ${q}  \n  **A:** ${a}`);
w();
w(`## 5. Reviews: the biggest ranking factor you control`);
w();
w(`1. In each profile: *Ask for reviews* → copy the short review link. Print it as a QR code on the counter, on tickets and in the WhatsApp confirmation.`);
w(`2. Send it the evening after the excursion (WhatsApp works best): "Thanks for booking with Tickets Direct! If you enjoyed the trip, a quick Google review helps our small local team a lot: <link>"`);
w(`3. Ask every customer: never offer discounts or gifts for reviews and never filter who you ask (both break Google's rules and can wipe reviews).`);
w(`4. Reply to every review within 48h, mentioning the tour and the resort naturally:`);
w(`   - EN positive: "Thank you, Sarah! So glad you loved the La Graciosa catamaran. See you at our Costa Teguise office next time you're in Lanzarote!"`);
w(`   - EN negative: "We're sorry the pickup was late. That's not the standard we want. Please message us on WhatsApp ${site.phone} so we can put it right."`);
w(`   - ES positiva: "¡Gracias, Carlos! Nos alegra que disfrutaras del buggy por Timanfaya. ¡Te esperamos en nuestra oficina de Playa Blanca!"`);
w(`5. Copy your best reviews into \`src/data/reviews.json\` (with the reviewer's public name) so they also appear on the website.`);
w();
w(`## 6. Photos`);
w();
w(`Profiles with many recent photos get far more clicks. Per profile: exterior of the office (so people find it), interior with staff, the logo, a cover photo, and 3–5 tour photos per month. Optimised tour photos are already in \`src/assets/img/trips/\`; geotagging is ignored by Google, so focus on quality and frequency.`);
w();
w(`## 7. Audit of your ${profiles.length} profiles`);
w();
w(`What each profile showed when checked, and what to change. The website's offices page and structured data now use exactly these names, addresses and phones, so keep both in sync.`);
w();
w(`| Office | Resort | Rating | Category now | Phone | Fixes |`);
w(`|---|---|---|---|---|---|`);
const resortName = Object.fromEntries(resorts.map((r) => [r.slug, r.name]));
for (const o of profiles) {
  const charter = o.physical === false;
  const g = o.gbp || {};
  const fixes = [];
  if (charter) {
    fixes.push(`not a walk-in office: in the profile set it as a **service-area business** and hide the street address (Google requires staff at the address during opening hours to show it); keep the map pin's area as Puerto Calero`);
    fixes.push(`keep **Boat tour agency** as primary (it's the right fit for a charter-only profile), add *Yacht charter* / *Boat rental service* as secondary if you offer them`);
    fixes.push(`website: keep the boat trips page, with tracking → \`${utm("/trip-types/lanzarote-boat-trips/", o.id)}\``);
    if (g.formerName) fixes.push(`renamed from "${g.formerName}": done ✔. Make sure the new name matches your signage/branding, and don't add more keywords`);
  }
  if (!charter && g.category && g.category !== "Tour agency") fixes.push(`primary category → **Tour agency** (keep "${g.category}" as secondary${/ATV|information/i.test(g.category) ? " only if it's really what customers find there" : ""})`);
  if (!charter && (/^http:/.test(g.website || "") || /\.com\/?$/.test(g.website || ""))) fixes.push(`website → \`${utm(`/excursions-from/${o.resort}/`, o.id)}\``);
  if (!/^Tickets Direct Excursions/.test(o.name)) fixes.push(`name doesn't start with "Tickets Direct Excursions": use the brand first, exactly as on the shopfront${/^Buggy/.test(o.name) ? '; keyword-first names ("Buggy Tours Lanzarote…") risk suspension' : ""}`);
  if (/Tahíche|Apartamento/i.test(o.streetAddress)) fixes.push(`address shows "Apartamento Tahiche 122 … 35508 Lanzarote": put the street first and set the town to **Costa Teguise**`);
  if (o.postalCode === "35510" || o.postalCode === "35518") fixes.push(`Google lists the town as **Tías** (the municipality); make sure "Puerto del Carmen" appears in the address line and description`);
  const want = o.hours?.days === "daily" ? `${o.hours.opens}–${o.hours.closes}`.replace("09:30", "9:30") : null;
  if (want && g.hoursShown !== want) fixes.push(`hours: Google showed **${g.hoursShown || "no hours"}**; set **every day ${want}**, plus holiday hours`);
  else if (want) fixes.push("hours ✔ (add holiday hours for Christmas, New Year and Easter)");
  if (charter) fixes.push(`hours: Google shows ${g.hoursShown}. Use the hours you actually answer charter enquiries / departures run`);
  if (Number(g.rating) < 4.5) fixes.push(`rating ${g.rating}: reply to every low review and start the review routine (section 5) here first`);
  w(`| [${o.name}](${o.mapsUrl}) | ${o.resort ? resortName[o.resort] : `${o.locality} (charters)`} | ${g.rating ?? "?"} | ${g.category ?? "?"} | ${o.phone} | ${fixes.map((f) => `• ${f}`).join("<br>")} |`);
}
w();
w(`**Across all profiles:**`);
w();
w(`- **Website links:** all 10 point to \`http://excursionsticketsdirect.com/\` (the homepage, without https). Point each one to its resort page with the tracking link above, so Google ties each office to its own area and you can see which office brings bookings (Google Analytics → Acquisition → \`utm_content\`).`);
w(`- **Categories:** you currently use 7 different primary categories. Use **Tour agency** as primary on every office, plus secondaries that are true for that office.`);
w(`- **Phones:** 5 different numbers are in use (${[...new Set(offices.map((o) => o.phone))].join(", ")}). That's fine if each one is answered, but the website now shows each office's own number, so update \`offices.json\` if any change.`);
w(`- **Duplicates:** Puerto del Carmen has two profiles on Av. de las Playas (*Buggy Tours…* and *…Puerto del Carmen Beach*, about 300 m apart). If they're the same shop, merge them in Business Profile Manager; duplicates split reviews and can get both suspended.`);
w();
fs.mkdirSync(path.join(root, "docs"), { recursive: true });
fs.writeFileSync(path.join(root, "docs/google-business-profiles.md"), out.join("\n"));
console.log("wrote docs/google-business-profiles.md");
