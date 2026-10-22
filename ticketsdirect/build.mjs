// Static site generator for Tickets Direct Excursions Lanzarote.
// Zero dependencies: `node build.mjs` writes the full EN/ES site to ./dist.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { guides, UPDATED } from "./src/content/guides.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => JSON.parse(fs.readFileSync(path.join(here, p), "utf8"));
const site = read("src/data/site.json");
const tours = read("src/data/tours.json");
const categories = read("src/data/categories.json");
const resorts = read("src/data/resorts.json");
const places = read("src/data/places.json");
const { offices } = read("src/data/offices.json");
const reviews = read("src/data/reviews.json");

const SITE = (process.env.SITE_URL || site.url).replace(/\/$/, "");
const OUT = path.join(here, "dist");
const LANGS = ["en", "es"];
const ORG_ID = `${SITE}/#organization`;

// ---------- i18n ----------
const T = {
  en: {
    locale: "en_GB", htmlLang: "en",
    nav: { tours: "All excursions", activities: "Activities", resorts: "Where you stay", islands: "Islands & places", guides: "Guides", offices: "Our offices", about: "About us" },
    from: "From", book: "Book now", ask: "Ask on WhatsApp", viewTour: "View excursion", deposit: "Small deposit online, rest on the day",
    freeCancel: "Free cancellation up to 24h", duration: "Duration", pack: "Multi-excursion pack", hours: (h) => (h < 1 ? `${Math.round(h * 60)} min` : `${h} ${h === 1 ? "hour" : "hours"}`),
    home: "Home", faqTitle: "Frequently asked questions", related: "You may also like", popular: "Most popular excursions",
    highlights: "Highlights", goodToKnow: "Good to know", seeAll: "See all", allTours: "All excursions",
    gtk: ["Pickup point and time are confirmed when you book.", "Reserve online with a small deposit and pay the balance on the day.", "Free cancellation up to 24 hours before the activity.", "Questions? Real local people answer 24h on WhatsApp."],
    wildlife: "Dolphins and other wildlife live in the wild: sightings are likely but never guaranteed.",
    updated: "Updated", by: "By the Tickets Direct team, Lanzarote",
    stay: "Where are you staying?", stayLead: "We have offices in the three main resorts. Pick yours for the best excursions, travel times and your nearest office.",
    distances: "Approximate travel times", officeHere: "Our office here", ourOffices: "Our offices in Lanzarote",
    finderTitle: "Find your excursion", resortAny: "Any resort", catAny: "Any activity", find: "Show excursions",
    filters: { all: "All", family: "Family", couples: "Couples", adventure: "Adventure", "half-day": "Half day", "full-day": "Full day", "island-hop": "Other islands", wildlife: "Wildlife", "rainy-day": "Windy / rainy day", pack: "Packs" },
    maxPrice: "Max price", results: "excursions", noResults: "No excursions match these filters.",
    contact: "Contact", call: "Call", email: "Email", whatsapp: "WhatsApp", followUs: "Follow us",
    reviewsTitle: "What our guests say", readReviews: "Read our reviews on Tripadvisor",
    heroTitle: "Lanzarote excursions, booked direct with the locals",
    heroLead: `Boat trips, volcano tours, buggies and island hopping, sold by a Lanzarote agency since ${site.foundingYear}, with ${site.officeCount} offices in Costa Teguise, Puerto del Carmen and Playa Blanca.`,
    whyTitle: "Why book with Tickets Direct?",
    whyLead: "We are the only excursion company that sells online and has walk-in offices in all three main resorts of Lanzarote. Book on the web, then talk to us face to face.",
    heritageTitle: "A Lanzarote company since 2000",
    heritage: "Tickets Direct grew out of Lineas Marítimas Romero, one of the island's best-known boat companies. We only work in Lanzarote, and every recommendation comes from people who live here.",
    islandsTitle: "Islands & must-see places", guidesTitle: "Plan your trip: local guides",
    chat: { open: "Need help choosing?", title: "Tickets Direct assistant", hello: "Hi! I can help you find the right excursion. Where are you staying, and what do you feel like doing?", placeholder: "e.g. boat trip with kids under €60", send: "Send", human: "Talk to a person on WhatsApp", chips: ["Boat trips", "With kids", "Under €70", "Windy day plan", "Cruise passenger"] },
    notFound: "Page not found", notFoundLead: "This page doesn't exist, but our excursions do.",
    legal: "Legal notice", privacy: "Privacy", cookies: "Cookies", terms: "Terms", cancellation: "Cancellation policy",
    officesLead: `Book online or visit us in person. We have ${site.officeCount} offices across Lanzarote's main resorts.`,
    addressTbc: "Ask us on WhatsApp for directions to this office.", directions: "Directions",
    aboutTitle: "About Tickets Direct Excursions Lanzarote",
    priceTable: ["Excursion", "Type", "Duration", "From"],
    contactTitle: "Contact Tickets Direct", contactLead: "Real local people, 24 hours a day, in English and Spanish.",
  },
  es: {
    locale: "es_ES", htmlLang: "es",
    nav: { tours: "Todas las excursiones", activities: "Actividades", resorts: "Dónde te alojas", islands: "Islas y lugares", guides: "Guías", offices: "Oficinas", about: "Quiénes somos" },
    from: "Desde", book: "Reservar", ask: "Preguntar por WhatsApp", viewTour: "Ver excursión", deposit: "Pequeño depósito online, resto el día de la excursión",
    freeCancel: "Cancelación gratuita hasta 24 h", duration: "Duración", pack: "Pack de varias excursiones", hours: (h) => (h < 1 ? `${Math.round(h * 60)} min` : `${String(h).replace(".", ",")} ${h === 1 ? "hora" : "horas"}`),
    home: "Inicio", faqTitle: "Preguntas frecuentes", related: "También te puede gustar", popular: "Excursiones más populares",
    highlights: "Lo más destacado", goodToKnow: "Información útil", seeAll: "Ver todas", allTours: "Todas las excursiones",
    gtk: ["El punto y la hora de recogida se confirman al reservar.", "Reserva online con un pequeño depósito y paga el resto el día de la excursión.", "Cancelación gratuita hasta 24 horas antes de la actividad.", "¿Dudas? Personas reales te responden 24 h por WhatsApp."],
    wildlife: "Los delfines y demás fauna viven en libertad: es probable verlos, pero nunca está garantizado.",
    updated: "Actualizado", by: "Por el equipo de Tickets Direct, Lanzarote",
    stay: "¿Dónde te alojas?", stayLead: "Tenemos oficinas en los tres grandes centros turísticos. Elige el tuyo para ver las mejores excursiones, tiempos de viaje y tu oficina más cercana.",
    distances: "Tiempos de viaje aproximados", officeHere: "Nuestra oficina aquí", ourOffices: "Nuestras oficinas en Lanzarote",
    finderTitle: "Encuentra tu excursión", resortAny: "Cualquier zona", catAny: "Cualquier actividad", find: "Ver excursiones",
    filters: { all: "Todas", family: "Familias", couples: "Parejas", adventure: "Aventura", "half-day": "Medio día", "full-day": "Día completo", "island-hop": "Otras islas", wildlife: "Fauna", "rainy-day": "Día de viento / lluvia", pack: "Packs" },
    maxPrice: "Precio máx.", results: "excursiones", noResults: "Ninguna excursión coincide con estos filtros.",
    contact: "Contacto", call: "Llamar", email: "Email", whatsapp: "WhatsApp", followUs: "Síguenos",
    reviewsTitle: "Lo que dicen nuestros clientes", readReviews: "Lee nuestras opiniones en Tripadvisor",
    heroTitle: "Excursiones en Lanzarote, reservadas directo con los de aquí",
    heroLead: `Barcos, volcanes, buggies y otras islas, de la mano de una agencia de Lanzarote desde ${site.foundingYear}, con ${site.officeCount} oficinas en Costa Teguise, Puerto del Carmen y Playa Blanca.`,
    whyTitle: "¿Por qué reservar con Tickets Direct?",
    whyLead: "Somos la única empresa de excursiones que vende online y tiene oficinas en los tres grandes centros turísticos de Lanzarote. Reserva en la web y habla con nosotros en persona.",
    heritageTitle: "Una empresa de Lanzarote desde 2000",
    heritage: "Tickets Direct nació de Líneas Marítimas Romero, una de las navieras más conocidas de la isla. Solo trabajamos en Lanzarote, y cada recomendación viene de gente que vive aquí.",
    islandsTitle: "Islas y lugares imprescindibles", guidesTitle: "Planifica tu viaje: guías locales",
    chat: { open: "¿Te ayudamos a elegir?", title: "Asistente de Tickets Direct", hello: "¡Hola! Te ayudo a encontrar la excursión ideal. ¿Dónde te alojas y qué te apetece hacer?", placeholder: "p. ej. barco con niños por menos de 60 €", send: "Enviar", human: "Hablar con una persona por WhatsApp", chips: ["Barcos", "Con niños", "Menos de 70 €", "Plan para día de viento", "Vengo en crucero"] },
    notFound: "Página no encontrada", notFoundLead: "Esta página no existe, pero nuestras excursiones sí.",
    legal: "Aviso legal", privacy: "Privacidad", cookies: "Cookies", terms: "Condiciones", cancellation: "Política de cancelación",
    officesLead: `Reserva online o visítanos en persona. Tenemos ${site.officeCount} oficinas en los principales centros turísticos de Lanzarote.`,
    addressTbc: "Escríbenos por WhatsApp y te indicamos cómo llegar a esta oficina.", directions: "Cómo llegar",
    aboutTitle: "Sobre Tickets Direct Excursions Lanzarote",
    priceTable: ["Excursión", "Tipo", "Duración", "Desde"],
    contactTitle: "Contacta con Tickets Direct", contactLead: "Personas reales de aquí, 24 horas al día, en español e inglés.",
  },
};

// ---------- routes ----------
const SEG = {
  en: { tour: "trip", tours: "tours", activity: "activities", resort: "excursions-from", place: "destinations", guide: "guides", offices: "offices", about: "about", faq: "faq", contact: "contact" },
  es: { tour: "excursion", tours: "excursiones", activity: "actividades", resort: "excursiones-desde", place: "destinos", guide: "guias", offices: "oficinas", about: "sobre-nosotros", faq: "preguntas-frecuentes", contact: "contacto" },
};
const prefix = (lang) => (lang === "en" ? "" : `/${lang}`);
function url(lang, kind, slug) {
  if (kind === "home") return `${prefix(lang)}/`;
  const seg = SEG[lang][kind];
  return slug ? `${prefix(lang)}/${seg}/${slug}/` : `${prefix(lang)}/${seg}/`;
}
const abs = (p) => SITE + p;

// ---------- helpers ----------
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const catBy = Object.fromEntries(categories.map((c) => [c.slug, c]));
const tourBy = Object.fromEntries(tours.map((t) => [t.slug, t]));
const placeBy = Object.fromEntries(places.map((p) => [p.slug, p]));
const resortBy = Object.fromEntries(resorts.map((r) => [r.slug, r]));

function price(lang, n) {
  const s = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return lang === "en" ? `€${s}` : `${s.replace(".", ",")} €`;
}
const dur = (lang, t) => (t.hours == null ? T[lang].pack : T[lang].hours(t.hours));
const bookingUrl = (t) => `${site.bookingBase}${t.slug}/`;
const waLink = (text) => `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
const waTour = (lang, t) => waLink(lang === "en" ? `Hi! I'd like to ask about "${t.name.en}".` : `¡Hola! Quiero información sobre "${t.name.es}".`);

const ICONS = {
  boat: '<path d="M3 17l2 3h14l2-3H3zm2-2h14L12 4 5 15zm7-8v8"/>',
  buggy: '<circle cx="6.5" cy="17" r="2.5"/><circle cx="17.5" cy="17" r="2.5"/><path d="M4 14l2-5h8l4 5h2v3M9 17h6M8 9V6h5"/>',
  bus: '<rect x="4" y="4" width="16" height="13" rx="2"/><path d="M4 11h16M8 20v-3m8 3v-3"/>',
  wave: '<path d="M2 15c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 19c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M12 11V4l5 3-5 2"/>',
  sub: '<path d="M3 13a7 4 0 0 0 14 0 7 4 0 0 0-14 0zM17 13h4M10 9V6h3"/><circle cx="8" cy="13" r="1"/><circle cx="12" cy="13" r="1"/>',
  ferry: '<path d="M2 18c2 1 4 1 6 0s4-1 6 0 4 1 6 0M4 15l1-5h14l1 5M8 10V6h8v4"/>',
  pack: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
  chat: '<path d="M4 5h16v11H8l-4 4V5z"/>',
  wa: '<path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2L9 8.5z"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
};
const icon = (name, cls = "i") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ""}</svg>`;

// ---------- components ----------
function tourCard(lang, t) {
  const c = catBy[t.cat];
  const L = T[lang];
  const media = t.image
    ? `<img src="${esc(t.image)}" alt="${esc(t.name[lang])}" loading="lazy" width="640" height="400">`
    : `<div class="card-art art-${c.color}">${icon(c.icon, "art-icon")}</div>`;
  return `<article class="card" data-cat="${t.cat}" data-tags="${t.tags.join(" ")}" data-price="${t.price}" data-hours="${t.hours ?? ""}">
  <a class="card-link" href="${url(lang, "tour", t.slug)}">
    <div class="card-media">${media}<span class="badge">${esc(c.name[lang])}</span></div>
    <div class="card-body">
      <h3>${esc(t.name[lang])}</h3>
      <p class="card-meta">${icon("clock")}${esc(dur(lang, t))}</p>
      <p class="card-sum">${esc(t.summary[lang].split(". ")[0].replace(/\.$/, ""))}.</p>
      <p class="card-price"><span>${L.from}</span> <strong>${price(lang, t.price)}</strong>${t.priceNote ? ` <small>${esc(t.priceNote[lang])}</small>` : ""}</p>
    </div>
  </a>
</article>`;
}
const cardGrid = (lang, list) => `<div class="grid cards">${list.map((t) => tourCard(lang, t)).join("\n")}</div>`;

function faqBlock(lang, faqs, title) {
  if (!faqs?.length) return "";
  const head = title === false ? "" : `<h2 id="faq-h">${esc(title || T[lang].faqTitle)}</h2>`;
  return `<section class="faq"${head ? ' aria-labelledby="faq-h"' : ""}>${head}
${faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("\n")}
</section>`;
}

function breadcrumbs(lang, items) {
  const all = [[T[lang].home, url(lang, "home")], ...items];
  const html = `<nav class="crumbs" aria-label="Breadcrumb"><ol>${all.map(([n, u], i) => (i === all.length - 1 ? `<li aria-current="page">${esc(n)}</li>` : `<li><a href="${u}">${esc(n)}</a></li>`)).join("")}</ol></nav>`;
  const ld = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: all.map(([n, u], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: abs(u) })) };
  return { html, ld };
}

function trustStrip(lang) {
  const icons = ["shield", "pin", "check", "check", "star", "chat"];
  return `<ul class="trust">${site.promises[lang].map(([h, p], i) => `<li>${icon(icons[i])}<div><strong>${esc(h)}</strong><span>${esc(p)}</span></div></li>`).join("")}</ul>`;
}

function officeList(lang, list) {
  const L = T[lang];
  return `<div class="grid offices">${list
    .map((o) => {
      const r = resortBy[o.resort];
      const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.mapsQuery)}`;
      return `<article class="office" id="${o.id}">
  <h3>${icon("pin")}${esc(o.name)}</h3>
  ${o.streetAddress ? `<p>${esc(o.streetAddress)}<br>${esc(o.postalCode || "")} ${esc(o.locality)}, Lanzarote</p>` : `<p>${esc(o.locality)}, Lanzarote<br><small>${esc(L.addressTbc)}</small></p>`}
  ${o.hours ? `<p><small>${esc(o.hours)}</small></p>` : ""}
  <p class="office-links"><a href="${maps}" rel="noopener" target="_blank">${L.directions}</a> · <a href="${url(lang, "resort", r.slug)}">${esc(r.name)}</a></p>
</article>`;
    })
    .join("\n")}</div>`;
}

function reviewsBlock(lang) {
  const L = T[lang];
  const list = reviews.items.filter((r) => !r.lang || r.lang === lang);
  const quotes = list.length
    ? `<div class="grid reviews">${list.slice(0, 6).map((r) => `<figure class="review"><div class="stars" aria-label="${r.rating}/5">${"★".repeat(r.rating)}</div><blockquote>${esc(r.text)}</blockquote><figcaption>${esc(r.author)} · ${esc(r.source)}</figcaption></figure>`).join("")}</div>`
    : "";
  return `<section class="band"><div class="wrap"><h2>${L.reviewsTitle}</h2>${quotes}<p><a class="btn ghost" href="${site.social.tripadvisor}" rel="noopener" target="_blank">${icon("star")}${L.readReviews}</a></p></div></section>`;
}

function expandShortcodes(lang, html) {
  return html
    .replace(/\[\[tours:([^\]]+)\]\]/g, (_, list) => cardGrid(lang, list.split(",").map((s) => tourBy[s.trim()]).filter(Boolean)))
    .replace(/\[\[prices\]\]/g, () => priceTable(lang));
}

function priceTable(lang) {
  const [h1, h2, h3, h4] = T[lang].priceTable;
  const rows = categories.flatMap((c) =>
    tours.filter((t) => t.cat === c.slug).sort((a, b) => a.price - b.price).map((t) => `<tr><td><a href="${url(lang, "tour", t.slug)}">${esc(t.name[lang])}</a></td><td>${esc(c.name[lang])}</td><td>${esc(dur(lang, t))}</td><td><strong>${price(lang, t.price)}</strong>${t.priceNote ? ` <small>${esc(t.priceNote[lang])}</small>` : ""}</td></tr>`),
  );
  return `<div class="table-wrap"><table class="prices"><thead><tr><th>${h1}</th><th>${h2}</th><th>${h3}</th><th>${h4}</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}

// ---------- structured data ----------
const sameAs = Object.values(site.social).filter(Boolean);
function orgLd() {
  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "@id": ORG_ID,
    name: site.name,
    alternateName: ["Tickets Direct", "Excursions Tickets Direct"],
    url: SITE + "/",
    logo: `${SITE}/assets/logo.svg`,
    image: `${SITE}/assets/og-default.png`,
    telephone: site.phone,
    email: site.email,
    foundingDate: String(site.foundingYear),
    description: `Excursion booking agency in Lanzarote since ${site.foundingYear}, with roots in ${site.heritage}. Offices in Costa Teguise, Puerto del Carmen and Playa Blanca.`,
    areaServed: { "@type": "Place", name: "Lanzarote, Canary Islands, Spain" },
    knowsLanguage: ["en", "es"],
    priceRange: `€${Math.min(...tours.map((t) => t.price))}–€${Math.max(...tours.map((t) => t.price))}`,
    sameAs,
    contactPoint: [{ "@type": "ContactPoint", telephone: site.phone, contactType: "customer service", availableLanguage: ["English", "Spanish"], hoursAvailable: { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], opens: "00:00", closes: "23:59" } }],
    department: offices.filter((o) => o.streetAddress).map(officeLd),
  };
}
function officeLd(o) {
  return {
    "@type": "TravelAgency",
    "@id": `${SITE}/offices/#${o.id}`,
    name: o.name,
    telephone: o.phone || site.phone,
    address: { "@type": "PostalAddress", streetAddress: o.streetAddress, postalCode: o.postalCode || undefined, addressLocality: o.locality, addressRegion: "Las Palmas", addressCountry: "ES" },
    parentOrganization: { "@id": ORG_ID },
  };
}
function tourLd(lang, t) {
  const page = abs(url(lang, "tour", t.slug));
  return {
    "@context": "https://schema.org",
    "@type": ["Product", "TouristTrip"],
    "@id": `${page}#trip`,
    name: t.name[lang],
    description: t.summary[lang],
    url: page,
    image: t.image ? abs(t.image) : `${SITE}/assets/og-default.png`,
    inLanguage: lang,
    category: catBy[t.cat].name[lang],
    brand: { "@id": ORG_ID },
    provider: { "@id": ORG_ID },
    touristType: t.tags.includes("family") ? "Families" : undefined,
    itinerary: t.places.length ? { "@type": "ItemList", itemListElement: t.places.map((p, i) => ({ "@type": "ListItem", position: i + 1, item: { "@type": "TouristDestination", name: placeBy[p].name[lang] } })) } : undefined,
    offers: {
      "@type": "Offer",
      price: t.price.toFixed(2),
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: page,
      seller: { "@id": ORG_ID },
    },
    ...(t.rating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: t.rating.value, reviewCount: t.rating.count } } : {}),
  };
}
const faqLd = (faqs) => (faqs?.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) } : null);
const itemListLd = (lang, list) => ({ "@context": "https://schema.org", "@type": "ItemList", itemListElement: list.map((t, i) => ({ "@type": "ListItem", position: i + 1, url: abs(url(lang, "tour", t.slug)), name: t.name[lang] })) });

// ---------- layout ----------
function header(lang, alt) {
  const L = T[lang];
  const other = lang === "en" ? "es" : "en";
  return `<a class="skip" href="#main">${lang === "en" ? "Skip to content" : "Saltar al contenido"}</a>
<header class="site-head"><div class="wrap head-row">
  <a class="logo" href="${url(lang, "home")}" aria-label="${esc(site.name)}"><img src="/assets/logo.svg" alt="" width="36" height="36"><span><strong>Tickets Direct</strong><small>Excursions Lanzarote</small></span></a>
  <button class="menu-btn" aria-expanded="false" aria-controls="nav">${lang === "en" ? "Menu" : "Menú"}</button>
  <nav id="nav" class="nav" aria-label="Main">
    <a href="${url(lang, "tours")}">${L.nav.tours}</a>
    <div class="dd"><button aria-expanded="false">${L.nav.activities}</button><div class="dd-menu">${categories.map((c) => `<a href="${url(lang, "activity", c.slug)}">${esc(c.name[lang])}</a>`).join("")}</div></div>
    <div class="dd"><button aria-expanded="false">${L.nav.resorts}</button><div class="dd-menu">${resorts.map((r) => `<a href="${url(lang, "resort", r.slug)}">${esc(r.name)}</a>`).join("")}<a href="${url(lang, "guide", "lanzarote-shore-excursions-cruise-port")}">${lang === "en" ? "Cruise passengers" : "Cruceristas"}</a></div></div>
    <div class="dd"><button aria-expanded="false">${L.nav.islands}</button><div class="dd-menu">${places.map((p) => `<a href="${url(lang, "place", p.slug)}">${esc(p.name[lang])}</a>`).join("")}</div></div>
    <a href="${url(lang, "guide")}">${L.nav.guides}</a>
    <a href="${url(lang, "offices")}">${L.nav.offices}</a>
    <a class="lang" href="${alt[other]}" hreflang="${other}" lang="${other}">${other.toUpperCase()}</a>
    <a class="btn wa small" href="${waLink(lang === "en" ? "Hi! I'd like help choosing an excursion." : "¡Hola! Quiero ayuda para elegir una excursión.")}" rel="noopener">${icon("wa")}WhatsApp</a>
  </nav>
</div></header>`;
}

function footer(lang) {
  const L = T[lang];
  const legal = (p) => `https://excursionsticketsdirect.com/${p}/`;
  return `<footer class="site-foot"><div class="wrap foot-grid">
  <div><p class="logo foot-logo"><img src="/assets/logo.svg" alt="" width="32" height="32"><strong>Tickets Direct</strong></p>
    <p>${esc(L.heritage)}</p>
    <p><a href="tel:${site.phoneHref}">${icon("phone")}${site.phone}</a><br><a href="mailto:${site.email}">${icon("mail")}${site.email}</a><br><a href="https://wa.me/${site.whatsapp}" rel="noopener">${icon("wa")}WhatsApp 24h</a></p></div>
  <div><h2>${L.nav.activities}</h2><ul>${categories.map((c) => `<li><a href="${url(lang, "activity", c.slug)}">${esc(c.name[lang])}</a></li>`).join("")}</ul></div>
  <div><h2>${L.nav.resorts}</h2><ul>${resorts.map((r) => `<li><a href="${url(lang, "resort", r.slug)}">${esc(r.name)}</a></li>`).join("")}</ul><h2>${L.nav.islands}</h2><ul>${places.slice(0, 4).map((p) => `<li><a href="${url(lang, "place", p.slug)}">${esc(p.name[lang])}</a></li>`).join("")}</ul></div>
  <div><h2>Tickets Direct</h2><ul><li><a href="${url(lang, "about")}">${L.nav.about}</a></li><li><a href="${url(lang, "offices")}">${L.nav.offices}</a></li><li><a href="${url(lang, "faq")}">${L.faqTitle}</a></li><li><a href="${url(lang, "contact")}">${L.contact}</a></li><li><a href="${url(lang, "guide")}">${L.nav.guides}</a></li></ul>
    <h2>${L.followUs}</h2><ul class="social">${Object.entries(site.social).filter(([, v]) => v).map(([k, v]) => `<li><a href="${v}" rel="noopener" target="_blank">${k[0].toUpperCase() + k.slice(1)}</a></li>`).join("")}</ul></div>
</div>
<div class="wrap foot-legal"><p>© ${new Date().getFullYear()} ${esc(site.name)} · <a href="${legal("cancellation-policy")}">${L.cancellation}</a> · <a href="${legal("terms-and-conditions")}">${L.terms}</a> · <a href="${legal("privacy-policy")}">${L.privacy}</a> · <a href="${legal("cookie-policy")}">${L.cookies}</a> · <a href="${legal("legal-notice")}">${L.legal}</a></p></div>
</footer>`;
}

function chatWidget(lang) {
  const c = T[lang].chat;
  return `<div id="td-chat" class="chat" data-lang="${lang}" hidden>
  <div class="chat-head"><strong>${icon("chat")}${c.title}</strong><button class="chat-x" aria-label="Close">×</button></div>
  <div class="chat-log" aria-live="polite"><div class="msg bot">${esc(c.hello)}</div></div>
  <div class="chat-chips">${c.chips.map((x) => `<button type="button">${esc(x)}</button>`).join("")}</div>
  <form class="chat-form"><label class="sr" for="chat-in">${esc(c.placeholder)}</label><input id="chat-in" autocomplete="off" maxlength="500" placeholder="${esc(c.placeholder)}"><button class="btn small">${c.send}</button></form>
  <a class="chat-human" href="https://wa.me/${site.whatsapp}" rel="noopener" target="_blank">${icon("wa")}${c.human}</a>
</div>
<button id="td-chat-open" class="chat-fab">${icon("chat")}<span>${c.open}</span></button>`;
}

function page({ lang, path: p, alt, title, description, body, ld = [], ogType = "website", noindex = false }) {
  const L = T[lang];
  const canonical = abs(p);
  const ldAll = [orgLd(), ...ld].filter(Boolean);
  const html = `<!doctype html>
<html lang="${L.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
${alt ? LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${abs(alt[l])}">`).join("\n") + `\n<link rel="alternate" hreflang="x-default" href="${abs(alt.en)}">` : ""}
${noindex ? '<meta name="robots" content="noindex">' : '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">'}
<meta name="geo.region" content="ES-GC"><meta name="geo.placename" content="Lanzarote">
<meta property="og:type" content="${ogType}"><meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}"><meta property="og:image" content="${SITE}/assets/og-default.png"><meta property="og:locale" content="${L.locale}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#123c4a">
<link rel="icon" href="/assets/logo.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Inter:wght@400;500;600&display=swap">
<link rel="stylesheet" href="/assets/styles.css?v=${BUILD_ID}">
<link rel="alternate" type="text/plain" title="LLM summary" href="/llms.txt">
${ldAll.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join("\n")}
</head>
<body>
${header(lang, alt || { en: url("en", "home"), es: url("es", "home") })}
<main id="main">
${body}
</main>
${footer(lang)}
${chatWidget(lang)}
<script>window.TD={lang:"${lang}",wa:"${site.whatsapp}",api:"/api/chat",data:"/data/tours-${lang}.json"};</script>
<script src="/assets/app.js?v=${BUILD_ID}" defer></script>
</body>
</html>`;
  write(p, html);
}

function write(p, content) {
  const file = p.endsWith("/") ? path.join(OUT, p, "index.html") : path.join(OUT, p);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  if (p.endsWith("/") || p.endsWith(".html")) pages.push(p);
}
const pages = [];
const altMap = []; // [{en, es}] for sitemap
const BUILD_ID = Date.now().toString(36);
const altOf = (kind, slug) => ({ en: url("en", kind, slug), es: url("es", kind, slug) });

// ---------- pages ----------
function homePage(lang) {
  const L = T[lang];
  const alt = altOf("home");
  const popular = tours.filter((t) => t.popular).slice(0, 8);
  const homeFaqs = lang === "en"
    ? [
        ["What are the best excursions in Lanzarote?", "The most booked are Lanzarote's Highlights Tour (Timanfaya and the north, €99), the La Graciosa All-Inclusive Catamaran Cruise (€64) and the Sunset Catamaran & Dolphins (€51)."],
        ["Where are Tickets Direct's offices?", `We have ${site.officeCount} offices in Lanzarote's main resorts: Costa Teguise, Puerto del Carmen and Playa Blanca.`],
        ["How do I pay?", "Reserve online with a small deposit and pay the balance on the day of the activity. Cancellation is free up to 24 hours before."],
        ["Is Tickets Direct a local company?", `Yes. We have been selling excursions in Lanzarote since ${site.foundingYear} and grew out of ${site.heritage}, one of the island's best-known boat companies.`],
      ]
    : [
        ["¿Cuáles son las mejores excursiones en Lanzarote?", "Las más reservadas son Lo Mejor de Lanzarote (Timanfaya y el norte, 99 €), el crucero en catamarán todo incluido a La Graciosa (64 €) y el Catamarán al atardecer y delfines (51 €)."],
        ["¿Dónde están las oficinas de Tickets Direct?", `Tenemos ${site.officeCount} oficinas en los principales centros turísticos: Costa Teguise, Puerto del Carmen y Playa Blanca.`],
        ["¿Cómo se paga?", "Reservas online con un pequeño depósito y pagas el resto el día de la actividad. La cancelación es gratuita hasta 24 horas antes."],
        ["¿Tickets Direct es una empresa local?", `Sí. Vendemos excursiones en Lanzarote desde ${site.foundingYear} y nacimos de Líneas Marítimas Romero, una de las navieras más conocidas de la isla.`],
      ];
  const body = `
<section class="hero"><div class="wrap hero-grid">
  <div>
    <p class="eyebrow">${lang === "en" ? `Local agency · since ${site.foundingYear}` : `Agencia local · desde ${site.foundingYear}`}</p>
    <h1>${esc(L.heroTitle)}</h1>
    <p class="lead">${esc(L.heroLead)}</p>
    <form class="finder" action="${url(lang, "tours")}" method="get">
      <h2 class="sr">${L.finderTitle}</h2>
      <label><span>${L.stay}</span><select name="resort"><option value="">${L.resortAny}</option>${resorts.map((r) => `<option value="${r.slug}">${esc(r.name)}</option>`).join("")}</select></label>
      <label><span>${L.nav.activities}</span><select name="cat"><option value="">${L.catAny}</option>${categories.map((c) => `<option value="${c.slug}">${esc(c.name[lang])}</option>`).join("")}</select></label>
      <button class="btn">${L.find}</button>
    </form>
    <p class="hero-chips">${["family", "couples", "adventure", "island-hop", "rainy-day"].map((k) => `<a href="${url(lang, "tours")}?tag=${k}">${esc(L.filters[k])}</a>`).join("")}</p>
  </div>
  <div class="hero-card" aria-hidden="true">
    <div class="hero-art"></div>
    <div class="hero-stat"><strong>${site.foundingYear}</strong><span>${lang === "en" ? "founded in Lanzarote" : "fundada en Lanzarote"}</span></div>
    <div class="hero-stat s2"><strong>${site.officeCount}</strong><span>${lang === "en" ? "offices in 3 resorts" : "oficinas en 3 zonas"}</span></div>
  </div>
</div></section>
<section class="wrap">${trustStrip(lang)}</section>
<section class="wrap section"><div class="sec-head"><h2>${L.popular}</h2><a href="${url(lang, "tours")}">${L.seeAll} →</a></div>${cardGrid(lang, popular)}</section>
<section class="band"><div class="wrap section"><h2>${L.stay}</h2><p class="lead">${esc(L.stayLead)}</p>
<div class="grid resorts">${resorts.map((r) => `<a class="resort" href="${url(lang, "resort", r.slug)}"><span class="resort-art"></span><strong>${esc(r.name)}</strong><span>${esc(r.intro[lang].split(". ")[0])}.</span><span class="more">${icon("pin")}${lang === "en" ? "Tours & our office" : "Excursiones y oficina"} →</span></a>`).join("")}</div></div></section>
<section class="wrap section"><h2>${L.nav.activities}</h2><div class="grid cats">${categories.map((c) => `<a class="cat cat-${c.color}" href="${url(lang, "activity", c.slug)}">${icon(c.icon, "cat-icon")}<strong>${esc(c.name[lang])}</strong><span>${L.from} ${price(lang, Math.min(...tours.filter((t) => t.cat === c.slug).map((t) => t.price)))}</span></a>`).join("")}</div></section>
<section class="band dark"><div class="wrap section why"><div><h2>${L.whyTitle}</h2><p class="lead">${esc(L.whyLead)}</p><h3>${L.heritageTitle}</h3><p>${esc(L.heritage)}</p><p><a class="btn light" href="${url(lang, "about")}">${L.nav.about}</a> <a class="btn ghost light" href="${url(lang, "offices")}">${L.nav.offices}</a></p></div>
<ul class="why-list">${site.promises[lang].map(([h, p]) => `<li>${icon("check")}<div><strong>${esc(h)}</strong><span>${esc(p)}</span></div></li>`).join("")}</ul></div></section>
<section class="wrap section"><h2>${L.islandsTitle}</h2><div class="grid places">${places.map((p) => `<a class="place" href="${url(lang, "place", p.slug)}"><strong>${esc(p.name[lang])}</strong><span>${esc(p.facts[lang][0][1])}</span></a>`).join("")}</div></section>
<section class="wrap section"><div class="sec-head"><h2>${L.guidesTitle}</h2><a href="${url(lang, "guide")}">${L.seeAll} →</a></div><div class="grid guides">${guides.slice(0, 6).map((g) => `<a class="guide" href="${url(lang, "guide", g.slug)}"><strong>${esc(g[lang].title)}</strong><span>${esc(g[lang].meta.slice(0, 120))}…</span></a>`).join("")}</div></section>
${reviewsBlock(lang)}
<div class="wrap section">${faqBlock(lang, homeFaqs)}</div>`;
  page({
    lang, path: alt[lang], alt,
    title: lang === "en" ? "Lanzarote Excursions & Tours 2026 | Book Direct with Tickets Direct" : "Excursiones en Lanzarote 2026 | Reserva directo con Tickets Direct",
    description: lang === "en"
      ? `Book Lanzarote excursions direct with the local agency: boat trips from €51, Timanfaya tours, La Graciosa, buggies and more. ${site.officeCount} offices, free cancellation up to 24h.`
      : `Reserva excursiones en Lanzarote directo con la agencia local: barcos desde 51 €, Timanfaya, La Graciosa, buggies y más. ${site.officeCount} oficinas, cancelación gratuita hasta 24 h.`,
    body,
    ld: [
      { "@context": "https://schema.org", "@type": "WebSite", "@id": `${SITE}/#website`, url: SITE + "/", name: site.name, inLanguage: ["en", "es"], publisher: { "@id": ORG_ID } },
      itemListLd(lang, popular),
      faqLd(homeFaqs),
    ],
  });
  altMap.push(alt);
}

function tourPage(lang, t) {
  const L = T[lang];
  const c = catBy[t.cat];
  const alt = altOf("tour", t.slug);
  const bc = breadcrumbs(lang, [[c.name[lang], url(lang, "activity", c.slug)], [t.name[lang], alt[lang]]]);
  const related = tours.filter((x) => x.cat === t.cat && x.slug !== t.slug).slice(0, 3);
  const fill = related.length < 3 ? tours.filter((x) => x.popular && x.cat !== t.cat).slice(0, 3 - related.length) : [];
  const d = dur(lang, t);
  const faqs = lang === "en"
    ? [
        [`How long is the ${t.name.en}?`, t.hours == null ? "This is a pack of several excursions; each one runs on its own day, confirmed with you after booking." : `The ${t.name.en} lasts about ${d}.`],
        [`How much does the ${t.name.en} cost?`, `From ${price("en", t.price)}${t.priceNote ? ` ${t.priceNote.en}` : ""}. You reserve online with a small deposit and pay the balance on the day.`],
        ["Can I cancel?", "Yes, cancellation is free up to 24 hours before the activity."],
        ["Where is the pickup?", "Pickup point and time depend on where you are staying and are confirmed when you book. Ask us on WhatsApp if you are unsure."],
      ]
    : [
        [`¿Cuánto dura la excursión «${t.name.es}»?`, t.hours == null ? "Es un pack de varias excursiones; cada una se realiza en su día, que confirmamos contigo tras la reserva." : `Dura aproximadamente ${d}.`],
        [`¿Cuánto cuesta la excursión «${t.name.es}»?`, `Desde ${price("es", t.price)}${t.priceNote ? ` ${t.priceNote.es}` : ""}. Reservas online con un pequeño depósito y pagas el resto el día de la excursión.`],
        ["¿Puedo cancelar?", "Sí, la cancelación es gratuita hasta 24 horas antes de la actividad."],
        ["¿Dónde es la recogida?", "El punto y la hora de recogida dependen de tu alojamiento y se confirman al reservar. Pregúntanos por WhatsApp si tienes dudas."],
      ];
  const gtk = [...L.gtk];
  if (t.tags.includes("wildlife")) gtk.splice(1, 0, L.wildlife);
  const body = `
<div class="wrap">${bc.html}</div>
<article class="wrap tour">
  <div class="tour-main">
    <div class="tour-hero ${t.image ? "" : `art-${c.color}`}">${t.image ? `<img src="${esc(t.image)}" alt="${esc(t.name[lang])}" width="1200" height="700">` : icon(c.icon, "art-icon big")}</div>
    <p class="eyebrow"><a href="${url(lang, "activity", c.slug)}">${esc(c.name[lang])}</a></p>
    <h1>${esc(t.name[lang])}</h1>
    <ul class="facts"><li>${icon("clock")}${esc(d)}</li><li>${icon("check")}${L.freeCancel}</li><li>${icon("shield")}${L.deposit}</li></ul>
    <p class="lead">${esc(t.summary[lang])}</p>
    <h2>${L.highlights}</h2>
    <ul class="ticks">${t.highlights[lang].map((h) => `<li>${icon("check")}${esc(h)}</li>`).join("")}</ul>
    ${t.places.length ? `<h2>${lang === "en" ? "Places on this excursion" : "Lugares de esta excursión"}</h2><p class="pills">${t.places.map((p) => `<a href="${url(lang, "place", p)}">${esc(placeBy[p].name[lang])}</a>`).join("")}</p>` : ""}
    <h2>${L.goodToKnow}</h2>
    <ul class="ticks muted">${gtk.map((g) => `<li>${icon("check")}${esc(g)}</li>`).join("")}</ul>
    ${faqBlock(lang, faqs)}
  </div>
  <aside class="book-box" aria-label="${L.book}">
    <p class="bb-price"><span>${L.from}</span> <strong>${price(lang, t.price)}</strong>${t.priceNote ? ` <small>${esc(t.priceNote[lang])}</small>` : ""}</p>
    <p class="bb-meta">${icon("clock")}${esc(d)}</p>
    <a class="btn block" href="${bookingUrl(t)}" rel="noopener">${L.book}</a>
    <a class="btn wa block" href="${waTour(lang, t)}" rel="noopener" target="_blank">${icon("wa")}${L.ask}</a>
    <ul class="bb-trust"><li>${icon("check")}${L.freeCancel}</li><li>${icon("check")}${L.deposit}</li><li>${icon("pin")}${lang === "en" ? `${site.officeCount} offices across Lanzarote` : `${site.officeCount} oficinas en Lanzarote`}</li><li>${icon("shield")}${lang === "en" ? `Local agency since ${site.foundingYear}` : `Agencia local desde ${site.foundingYear}`}</li></ul>
  </aside>
</article>
<div class="mobile-book"><span><small>${L.from}</small> <strong>${price(lang, t.price)}</strong></span><a class="btn" href="${bookingUrl(t)}" rel="noopener">${L.book}</a></div>
<section class="wrap section"><h2>${L.related}</h2>${cardGrid(lang, [...related, ...fill])}</section>`;
  page({
    lang, path: alt[lang], alt, ogType: "product",
    title: `${t.name[lang]} | ${L.from} ${price(lang, t.price)} | Tickets Direct Lanzarote`,
    description: `${t.summary[lang].split(". ")[0]}. ${d}, ${L.from.toLowerCase()} ${price(lang, t.price)}. ${L.freeCancel}.`.slice(0, 300),
    body,
    ld: [tourLd(lang, t), bc.ld, faqLd(faqs)],
  });
  altMap.push(alt);
}

function categoryPage(lang, c) {
  const list = tours.filter((t) => t.cat === c.slug).sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0) || a.price - b.price);
  const alt = altOf("activity", c.slug);
  const bc = breadcrumbs(lang, [[T[lang].nav.activities, url(lang, "tours")], [c.name[lang], alt[lang]]]);
  const body = `<div class="wrap">${bc.html}</div>
<section class="wrap section page-head"><p class="eyebrow">${icon(c.icon)}${esc(c.name[lang])}</p><h1>${esc(c.h1[lang])}</h1><p class="lead">${esc(c.intro[lang])}</p></section>
<section class="wrap">${cardGrid(lang, list)}</section>
<section class="wrap section">${faqBlock(lang, c.faqs[lang])}</section>
<section class="wrap section"><h2>${T[lang].nav.activities}</h2><p class="pills">${categories.filter((x) => x.slug !== c.slug).map((x) => `<a href="${url(lang, "activity", x.slug)}">${esc(x.name[lang])}</a>`).join("")}</p></section>`;
  page({ lang, path: alt[lang], alt, title: c.h1[lang], description: c.meta[lang], body, ld: [itemListLd(lang, list), bc.ld, faqLd(c.faqs[lang])] });
  altMap.push(alt);
}

function resortPage(lang, r) {
  const L = T[lang];
  const alt = altOf("resort", r.slug);
  const bc = breadcrumbs(lang, [[L.nav.resorts, url(lang, "offices")], [r.name, alt[lang]]]);
  const picks = r.picks.map((s) => tourBy[s]).filter(Boolean);
  const local = offices.filter((o) => o.resort === r.slug);
  const body = `<div class="wrap">${bc.html}</div>
<section class="wrap section page-head"><p class="eyebrow">${icon("pin")}${esc(r.name)}, Lanzarote</p><h1>${esc(r.h1[lang])}</h1><p class="lead">${esc(r.intro[lang])}</p></section>
<section class="wrap split">
  <div><h2>${lang === "en" ? `Our top picks from ${r.name}` : `Nuestras recomendaciones desde ${r.name}`}</h2>${cardGrid(lang, picks)}</div>
  <aside class="side"><h2>${L.distances}</h2><table class="dist"><tbody>${r.distances[lang].map(([a, b]) => `<tr><th scope="row">${esc(a)}</th><td>${esc(b)}</td></tr>`).join("")}</tbody></table>
  <h2>${L.officeHere}</h2>${officeList(lang, local)}</aside>
</section>
<section class="wrap section"><h2>${L.allTours}</h2><p>${lang === "en" ? `Every excursion we sell is available to guests staying in ${r.name}; pickup details are confirmed when you book.` : `Todas nuestras excursiones están disponibles si te alojas en ${r.name}; los detalles de recogida se confirman al reservar.`} <a href="${url(lang, "tours")}?resort=${r.slug}">${L.seeAll} →</a></p></section>
<section class="wrap section">${faqBlock(lang, r.faqs[lang])}</section>`;
  page({ lang, path: alt[lang], alt, title: `${r.h1[lang].split(":")[0]} | Tickets Direct`, description: r.meta[lang], body, ld: [itemListLd(lang, picks), bc.ld, faqLd(r.faqs[lang]), ...local.filter((o) => o.streetAddress).map((o) => ({ "@context": "https://schema.org", ...officeLd(o) }))] });
  altMap.push(alt);
}

function placePage(lang, pl) {
  const L = T[lang];
  const alt = altOf("place", pl.slug);
  const bc = breadcrumbs(lang, [[L.nav.islands, url(lang, "tours")], [pl.name[lang], alt[lang]]]);
  const list = tours.filter((t) => t.places.includes(pl.slug));
  const body = `<div class="wrap">${bc.html}</div>
<section class="wrap section page-head"><p class="eyebrow">${icon("pin")}${esc(pl.name[lang])}</p><h1>${esc(pl.h1[lang])}</h1></section>
<section class="wrap split"><div><p class="lead">${esc(pl.intro[lang])}</p></div>
<aside class="side"><h2>${lang === "en" ? "Quick facts" : "Datos rápidos"}</h2><table class="dist"><tbody>${pl.facts[lang].map(([a, b]) => `<tr><th scope="row">${esc(a)}</th><td>${esc(b)}</td></tr>`).join("")}</tbody></table></aside></section>
<section class="wrap section"><h2>${lang === "en" ? `Excursions to ${pl.name.en}` : `Excursiones a ${pl.name.es}`}</h2>${cardGrid(lang, list)}</section>`;
  page({
    lang, path: alt[lang], alt, title: `${pl.h1[lang].split(":")[0]} | Tickets Direct`, description: pl.meta[lang], body,
    ld: [{ "@context": "https://schema.org", "@type": "TouristDestination", name: pl.name[lang], description: pl.intro[lang], url: abs(alt[lang]), containedInPlace: { "@type": "Place", name: "Canary Islands, Spain" } }, itemListLd(lang, list), bc.ld],
  });
  altMap.push(alt);
}

function guidePage(lang, g) {
  const L = T[lang];
  const G = g[lang];
  const alt = altOf("guide", g.slug);
  const bc = breadcrumbs(lang, [[L.nav.guides, url(lang, "guide")], [G.h1.split(":")[0], alt[lang]]]);
  const others = guides.filter((x) => x.slug !== g.slug).slice(0, 4);
  const body = `<div class="wrap">${bc.html}</div>
<article class="wrap prose-wrap"><header class="page-head"><p class="eyebrow">${L.nav.guides}</p><h1>${esc(G.h1)}</h1><p class="byline">${L.by} · ${L.updated} <time datetime="${UPDATED}">${UPDATED}</time></p><p class="lead">${esc(G.lead)}</p></header>
<div class="prose">${expandShortcodes(lang, G.body)}</div>
${faqBlock(lang, G.faqs)}
<aside class="cta-box"><h2>${lang === "en" ? "Need help choosing?" : "¿Te ayudamos a elegir?"}</h2><p>${esc(L.whyLead)}</p><p><a class="btn" href="${url(lang, "tours")}">${L.allTours}</a> <a class="btn wa" href="https://wa.me/${site.whatsapp}" rel="noopener" target="_blank">${icon("wa")}WhatsApp</a></p></aside>
</article>
<section class="wrap section"><h2>${L.guidesTitle}</h2><div class="grid guides">${others.map((x) => `<a class="guide" href="${url(lang, "guide", x.slug)}"><strong>${esc(x[lang].title)}</strong></a>`).join("")}</div></section>`;
  page({
    lang, path: alt[lang], alt, ogType: "article", title: `${G.title} | Tickets Direct`, description: G.meta, body,
    ld: [{ "@context": "https://schema.org", "@type": "Article", headline: G.h1, description: G.meta, inLanguage: lang, datePublished: UPDATED, dateModified: UPDATED, author: { "@id": ORG_ID }, publisher: { "@id": ORG_ID }, mainEntityOfPage: abs(alt[lang]), image: `${SITE}/assets/og-default.png` }, bc.ld, faqLd(G.faqs)],
  });
  altMap.push(alt);
}

function guidesIndex(lang) {
  const L = T[lang];
  const alt = altOf("guide");
  const bc = breadcrumbs(lang, [[L.nav.guides, alt[lang]]]);
  const body = `<div class="wrap">${bc.html}</div><section class="wrap section page-head"><h1>${L.guidesTitle}</h1><p class="lead">${lang === "en" ? "Honest, practical advice from the people who sell Lanzarote's excursions every day." : "Consejos honestos y prácticos de quienes venden excursiones en Lanzarote cada día."}</p></section>
<section class="wrap"><div class="grid guides">${guides.map((g) => `<a class="guide" href="${url(lang, "guide", g.slug)}"><strong>${esc(g[lang].title)}</strong><span>${esc(g[lang].meta)}</span></a>`).join("")}</div></section>
<section class="wrap section"><h2>${L.nav.islands}</h2><div class="grid places">${places.map((p) => `<a class="place" href="${url(lang, "place", p.slug)}"><strong>${esc(p.h1[lang].split(":")[0])}</strong></a>`).join("")}</div></section>`;
  page({ lang, path: alt[lang], alt, title: `${L.guidesTitle} | Tickets Direct`, description: lang === "en" ? "Local guides to Lanzarote excursions: prices, cruise stops, windy days, families, winter and booking tips." : "Guías locales de excursiones en Lanzarote: precios, cruceros, días de viento, familias, invierno y consejos de reserva.", body, ld: [bc.ld] });
  altMap.push(alt);
}

function toursIndex(lang) {
  const L = T[lang];
  const alt = altOf("tours");
  const bc = breadcrumbs(lang, [[L.allTours, alt[lang]]]);
  const sorted = [...tours].sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0));
  const body = `<div class="wrap">${bc.html}</div>
<section class="wrap section page-head"><h1>${lang === "en" ? "All Lanzarote Excursions 2026" : "Todas las excursiones en Lanzarote 2026"}</h1><p class="lead">${lang === "en" ? `${tours.length} excursions, from ${price(lang, Math.min(...tours.map((t) => t.price)))}. Filter by activity, who you're travelling with or budget.` : `${tours.length} excursiones, desde ${price(lang, Math.min(...tours.map((t) => t.price)))}. Filtra por actividad, con quién viajas o presupuesto.`}</p></section>
<section class="wrap filters" id="filters" aria-label="Filters">
  <div class="chips" data-filter="tag">${Object.entries(L.filters).map(([k, v]) => `<button type="button" data-value="${k === "all" ? "" : k}"${k === "all" ? ' aria-pressed="true"' : ""}>${esc(v)}</button>`).join("")}</div>
  <div class="filter-row">
    <label><span>${L.nav.activities}</span><select data-filter="cat"><option value="">${L.catAny}</option>${categories.map((c) => `<option value="${c.slug}">${esc(c.name[lang])}</option>`).join("")}</select></label>
    <label><span>${L.stay}</span><select data-filter="resort"><option value="">${L.resortAny}</option>${resorts.map((r) => `<option value="${r.slug}">${esc(r.name)}</option>`).join("")}</select></label>
    <label><span>${L.maxPrice}</span><select data-filter="max"><option value="">—</option>${[60, 70, 100, 150, 250].map((n) => `<option value="${n}">${price(lang, n)}</option>`).join("")}</select></label>
  </div>
  <p class="count" aria-live="polite"><span>${tours.length}</span> ${L.results}</p>
</section>
<section class="wrap" id="results">${cardGrid(lang, sorted)}<p class="empty" hidden>${L.noResults}</p></section>
<section class="wrap section"><h2>${lang === "en" ? "Prices at a glance" : "Precios de un vistazo"}</h2>${priceTable(lang)}</section>`;
  page({ lang, path: alt[lang], alt, title: lang === "en" ? "All Lanzarote Excursions & Prices 2026 | Tickets Direct" : "Todas las excursiones en Lanzarote y precios 2026 | Tickets Direct", description: lang === "en" ? `Compare all ${tours.length} Lanzarote excursions: boat trips, Timanfaya, buggies, water sports and island trips, with prices from ${price(lang, Math.min(...tours.map((t) => t.price)))}.` : `Compara las ${tours.length} excursiones en Lanzarote: barcos, Timanfaya, buggies, deportes acuáticos y otras islas, desde ${price(lang, Math.min(...tours.map((t) => t.price)))}.`, body, ld: [itemListLd(lang, sorted), bc.ld] });
  altMap.push(alt);
}

function officesPage(lang) {
  const L = T[lang];
  const alt = altOf("offices");
  const bc = breadcrumbs(lang, [[L.nav.offices, alt[lang]]]);
  const body = `<div class="wrap">${bc.html}</div>
<section class="wrap section page-head"><h1>${L.ourOffices}</h1><p class="lead">${esc(L.officesLead)}</p></section>
${resorts.map((r) => `<section class="wrap section"><h2><a href="${url(lang, "resort", r.slug)}">${esc(r.name)}</a></h2>${officeList(lang, offices.filter((o) => o.resort === r.slug))}</section>`).join("")}
<section class="wrap section">${trustStrip(lang)}</section>`;
  page({ lang, path: alt[lang], alt, title: `${L.ourOffices} | Costa Teguise, Puerto del Carmen, Playa Blanca`, description: L.officesLead, body, ld: [bc.ld, ...offices.filter((o) => o.streetAddress).map((o) => ({ "@context": "https://schema.org", ...officeLd(o) }))] });
  altMap.push(alt);
}

function aboutPage(lang) {
  const L = T[lang];
  const alt = altOf("about");
  const bc = breadcrumbs(lang, [[L.nav.about, alt[lang]]]);
  const text = lang === "en"
    ? `<p>Tickets Direct Excursions Lanzarote is an excursion booking agency founded in ${site.foundingYear}. We grew out of ${site.heritage}, one of the best-known boat companies on the island, and today we sell boat trips, island tours, buggies, water sports and trips to La Graciosa, Lobos and Fuerteventura.</p>
<p>We only work in Lanzarote. We are the only excursion company that sells online and also has walk-in offices in all three main resorts (Costa Teguise, Puerto del Carmen and Playa Blanca), with ${site.officeCount} offices in total. You can book on the web at night and talk to us face to face the next morning.</p>
<h2>Our promises</h2>`
    : `<p>Tickets Direct Excursions Lanzarote es una agencia de excursiones fundada en ${site.foundingYear}. Nacimos de Líneas Marítimas Romero, una de las navieras más conocidas de la isla, y hoy vendemos excursiones en barco, por la isla, buggies, deportes acuáticos y viajes a La Graciosa, Lobos y Fuerteventura.</p>
<p>Solo trabajamos en Lanzarote. Somos la única empresa de excursiones que vende online y además tiene oficinas en los tres grandes centros turísticos (Costa Teguise, Puerto del Carmen y Playa Blanca), con ${site.officeCount} oficinas en total. Puedes reservar en la web por la noche y hablar con nosotros en persona a la mañana siguiente.</p>
<h2>Nuestros compromisos</h2>`;
  const body = `<div class="wrap">${bc.html}</div><article class="wrap prose-wrap"><header class="page-head"><h1>${L.aboutTitle}</h1><p class="lead">${esc(L.whyLead)}</p></header><div class="prose">${text}</div>${trustStrip(lang)}<div class="prose"><h2>${L.ourOffices}</h2></div>${officeList(lang, offices)}</article>${reviewsBlock(lang)}`;
  page({ lang, path: alt[lang], alt, title: `${L.aboutTitle} | ${lang === "en" ? "Since" : "Desde"} ${site.foundingYear}`, description: `${L.heritage}`.slice(0, 160), body, ld: [bc.ld, { "@context": "https://schema.org", "@type": "AboutPage", url: abs(alt[lang]), about: { "@id": ORG_ID } }] });
  altMap.push(alt);
}

function faqPage(lang) {
  const L = T[lang];
  const alt = altOf("faq");
  const bc = breadcrumbs(lang, [[L.faqTitle, alt[lang]]]);
  const all = [...categories.flatMap((c) => c.faqs[lang]), ...guides.flatMap((g) => g[lang].faqs)];
  const seen = new Set();
  const uniq = all.filter(([q]) => (seen.has(q) ? false : seen.add(q)));
  const body = `<div class="wrap">${bc.html}</div><section class="wrap section page-head"><h1>${L.faqTitle}</h1><p class="lead">${esc(L.contactLead)}</p></section><div class="wrap">${faqBlock(lang, uniq, false)}</div>`;
  page({ lang, path: alt[lang], alt, title: `${L.faqTitle} | Tickets Direct Lanzarote`, description: lang === "en" ? "Answers to the most common questions about Lanzarote excursions: boat trips, weather, cancellations, prices, kids and pickups." : "Respuestas a las preguntas más comunes sobre excursiones en Lanzarote: barcos, tiempo, cancelaciones, precios, niños y recogidas.", body, ld: [bc.ld, faqLd(uniq)] });
  altMap.push(alt);
}

function contactPage(lang) {
  const L = T[lang];
  const alt = altOf("contact");
  const bc = breadcrumbs(lang, [[L.contact, alt[lang]]]);
  const body = `<div class="wrap">${bc.html}</div><section class="wrap section page-head"><h1>${L.contactTitle}</h1><p class="lead">${esc(L.contactLead)}</p></section>
<section class="wrap grid contact-cards">
<a class="contact-card" href="https://wa.me/${site.whatsapp}" rel="noopener" target="_blank">${icon("wa", "i big")}<strong>WhatsApp 24h</strong><span>${site.phone}</span></a>
<a class="contact-card" href="tel:${site.phoneHref}">${icon("phone", "i big")}<strong>${L.call}</strong><span>${site.phone}</span></a>
<a class="contact-card" href="mailto:${site.email}">${icon("mail", "i big")}<strong>${L.email}</strong><span>${site.email}</span></a>
</section>
<section class="wrap section"><h2>${L.ourOffices}</h2>${officeList(lang, offices)}</section>`;
  page({ lang, path: alt[lang], alt, title: `${L.contactTitle} | WhatsApp 24h`, description: `${L.contactLead} ${site.phone} · ${site.email}`, body, ld: [bc.ld, { "@context": "https://schema.org", "@type": "ContactPage", url: abs(alt[lang]), about: { "@id": ORG_ID } }] });
  altMap.push(alt);
}

function notFound() {
  const L = T.en;
  page({ lang: "en", path: "/404.html", alt: null, noindex: true, title: `${L.notFound} | Tickets Direct`, description: L.notFoundLead, body: `<section class="wrap section page-head"><h1>${L.notFound}</h1><p class="lead">${L.notFoundLead}</p><p><a class="btn" href="/tours/">${L.allTours}</a> <a class="btn ghost" href="/es/">Español</a></p></section>` });
}

// ---------- machine-readable outputs ----------
function sitemap() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${altMap.flatMap((alt) => LANGS.map((l) => `<url><loc>${abs(alt[l])}</loc><lastmod>${UPDATED}</lastmod>${LANGS.map((x) => `<xhtml:link rel="alternate" hreflang="${x}" href="${abs(alt[x])}"/>`).join("")}<xhtml:link rel="alternate" hreflang="x-default" href="${abs(alt.en)}"/></url>`)).join("\n")}
</urlset>`;
  write("/sitemap.xml", xml);
}

function robots() {
  const aiBots = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Google-Extended", "Applebot-Extended", "Bingbot"];
  write("/robots.txt", `# Search engines and AI assistants are welcome: we want travellers to find accurate prices and info.
User-agent: *
Allow: /
Disallow: /api/

${aiBots.map((b) => `User-agent: ${b}\nAllow: /\nDisallow: /api/`).join("\n\n")}

Sitemap: ${SITE}/sitemap.xml
`);
}

function llms() {
  const facts = `- Company: ${site.name} (also "Tickets Direct", "Excursions Tickets Direct")
- Business: excursion and activity booking agency, Lanzarote only (Canary Islands, Spain)
- Founded: ${site.foundingYear}; grew out of ${site.heritage}, a Lanzarote boat company
- Offices: ${site.officeCount} walk-in offices in Costa Teguise, Puerto del Carmen and Playa Blanca
- Booking: online with a small deposit, balance paid on the day; free cancellation up to 24 hours before
- Support: 24h WhatsApp/phone ${site.phone}, ${site.email}; English and Spanish
- Website: ${SITE}/ (English) and ${SITE}/es/ (Spanish)`;
  const list = categories.map((c) => `### ${c.name.en}\n${tours.filter((t) => t.cat === c.slug).map((t) => `- [${t.name.en}](${abs(url("en", "tour", t.slug))}): from ${price("en", t.price)}${t.priceNote ? ` ${t.priceNote.en}` : ""}, ${dur("en", t)}. ${t.summary.en.split(". ")[0]}.`).join("\n")}`).join("\n\n");
  write("/llms.txt", `# ${site.name}

> Local Lanzarote excursion agency since ${site.foundingYear}. The only excursion company that sells online and has walk-in offices in all three main resorts of Lanzarote. Prices below are current "from" prices in euros.

## Key facts
${facts}

## Excursions
${list}

## Guides
${guides.map((g) => `- [${g.en.title}](${abs(url("en", "guide", g.slug))}): ${g.en.meta}`).join("\n")}

## Resorts and places
${resorts.map((r) => `- [Excursions from ${r.name}](${abs(url("en", "resort", r.slug))})`).join("\n")}
${places.map((p) => `- [${p.name.en}](${abs(url("en", "place", p.slug))})`).join("\n")}

## Optional
- [Full catalogue as JSON](${SITE}/data/tours-en.json)
- [Full text for LLMs](${SITE}/llms-full.txt)
- [Spanish site](${SITE}/es/)
`);
  const full = [
    `# ${site.name}: full reference\n\n${facts}\n`,
    ...tours.map((t) => `## ${t.name.en}\nURL: ${abs(url("en", "tour", t.slug))}\nCategory: ${catBy[t.cat].name.en}\nPrice: from ${price("en", t.price)}${t.priceNote ? ` ${t.priceNote.en}` : ""}\nDuration: ${dur("en", t)}\n\n${t.summary.en}\n\nHighlights:\n${t.highlights.en.map((h) => `- ${h}`).join("\n")}\n`),
    ...categories.map((c) => `## FAQ: ${c.name.en}\n${c.faqs.en.map(([q, a]) => `Q: ${q}\nA: ${a}`).join("\n\n")}\n`),
    ...guides.map((g) => `## FAQ: ${g.en.title}\n${g.en.faqs.map(([q, a]) => `Q: ${q}\nA: ${a}`).join("\n\n")}\n`),
  ].join("\n");
  write("/llms-full.txt", full);
}

function dataFiles() {
  for (const lang of LANGS) {
    const data = {
      lang,
      tours: tours.map((t) => ({ slug: t.slug, url: url(lang, "tour", t.slug), name: t.name[lang], cat: t.cat, catName: catBy[t.cat].name[lang], price: t.price, priceLabel: price(lang, t.price), priceNote: t.priceNote?.[lang] || null, hours: t.hours, duration: dur(lang, t), tags: t.tags, places: t.places, summary: t.summary[lang] })),
      resorts: resorts.map((r) => ({ slug: r.slug, name: r.name, url: url(lang, "resort", r.slug), picks: r.picks })),
      guides: guides.map((g) => ({ slug: g.slug, title: g[lang].title, url: url(lang, "guide", g.slug) })),
    };
    write(`/data/tours-${lang}.json`, JSON.stringify(data));
  }
}

function assets() {
  const src = path.join(here, "src/assets");
  fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });
  for (const f of fs.readdirSync(src)) fs.copyFileSync(path.join(src, f), path.join(OUT, "assets", f));
}

// ---------- checks ----------
function checks() {
  const problems = [];
  for (const r of resorts) for (const s of r.picks) if (!tourBy[s]) problems.push(`resort ${r.slug}: unknown tour ${s}`);
  for (const t of tours) {
    if (!catBy[t.cat]) problems.push(`tour ${t.slug}: unknown category ${t.cat}`);
    for (const p of t.places) if (!placeBy[p]) problems.push(`tour ${t.slug}: unknown place ${p}`);
  }
  for (const g of guides) for (const lang of LANGS) for (const [, list] of g[lang].body.matchAll(/\[\[tours:([^\]]+)\]\]/g)) for (const s of list.split(",")) if (!tourBy[s.trim()]) problems.push(`guide ${g.slug}/${lang}: unknown tour ${s}`);
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  const unverified = offices.filter((o) => !o.verified).length;
  if (unverified) console.warn(`warning: ${unverified} office(s) in src/data/offices.json are not verified yet`);
  if (offices.length < site.officeCount) console.warn(`warning: offices.json lists ${offices.length} offices but site.json says ${site.officeCount}`);
}

// ---------- run ----------
checks();
fs.rmSync(OUT, { recursive: true, force: true });
assets();
for (const lang of LANGS) {
  homePage(lang);
  toursIndex(lang);
  tours.forEach((t) => tourPage(lang, t));
  categories.forEach((c) => categoryPage(lang, c));
  resorts.forEach((r) => resortPage(lang, r));
  places.forEach((p) => placePage(lang, p));
  guidesIndex(lang);
  guides.forEach((g) => guidePage(lang, g));
  officesPage(lang);
  aboutPage(lang);
  faqPage(lang);
  contactPage(lang);
}
notFound();
sitemap();
robots();
llms();
dataFiles();
console.log(`built ${pages.length} pages into ${path.relative(process.cwd(), OUT) || "dist"} for ${SITE}`);
