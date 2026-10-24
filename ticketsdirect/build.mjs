// Static site generator for Tickets Direct Excursions Lanzarote.
// Zero runtime dependencies: `node build.mjs` writes the full EN/ES site + installable app to ./dist.
// Tour content comes from src/data/catalog.json (refresh it with `npm run import`).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { guides, UPDATED } from "./src/content/guides.mjs";
import { loadCatalog, UNIT, formatPrice as price, formatDuration } from "./src/lib/catalog.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const C = loadCatalog(path.join(here, "src/data"));
const { site, tours, tourBy, categories, catBy, resorts, places, offices, destinations } = C;
const reviews = JSON.parse(fs.readFileSync(path.join(here, "src/data/reviews.json"), "utf8"));
const reels = JSON.parse(fs.readFileSync(path.join(here, "src/data/reels.json"), "utf8")).items;

const SITE = (process.env.SITE_URL || site.url).replace(/\/$/, "");
const BOOK = (process.env.BOOKING_ORIGIN || site.bookingOrigin).replace(/\/$/, "");
const OUT = path.join(here, "dist");
const LANGS = ["en", "es"];
const ORG_ID = `${SITE}/#organization`;
const BUILD_ID = Date.now().toString(36);
const mainCats = categories.filter((c) => !c.secondary && tours.some((t) => t.cats.includes(c.slug)));
const minPrice = Math.min(...tours.map((t) => t.price));
const BESTSELLERS = new Set([...tours].sort((a, b) => b.popularity - a.popularity).slice(0, 10).map((t) => t.slug));
// Average of the walk-in offices' Google ratings (shown as such; review counts aren't public here, so no schema).
const ratedOffices = offices.filter((o) => Number(o.gbp?.rating));
const avgRating = ratedOffices.length ? (ratedOffices.reduce((n, o) => n + Number(o.gbp.rating), 0) / ratedOffices.length).toFixed(1) : null;
// Spanish URL segment for activity-by-resort pages.
const CAT_ES = { "boat-trips": "excursiones-en-barco", "buggy-tours": "buggies", "bus-tours": "excursiones-en-autobus", "water-sports": "deportes-acuaticos", underwater: "buceo-y-submarino", "ferries-islands": "ferris-y-otras-islas", "special-packs": "packs", parks: "parques", nightlife: "noche-y-espectaculos", private: "tours-privados" };
const comboSlug = (lang, c) => (lang === "es" ? CAT_ES[c.slug] || c.slug : c.slug);
const combos = resorts.flatMap((r) => mainCats.map((c) => ({ r, c, list: tours.filter((t) => t.resorts.includes(r.slug) && t.cats.includes(c.slug)) }))).filter((x) => x.list.length >= 3);
const comboUrl = (lang, r, c) => `${url(lang, "resort", r.slug)}${comboSlug(lang, c)}/`;

// ---------- i18n ----------
const T = {
  en: {
    locale: "en_GB", htmlLang: "en",
    nav: { tours: "All excursions", activities: "Activities", resorts: "Where you stay", islands: "Destinations", guides: "Guides", offices: "Our offices", about: "About us" },
    from: "From", book: "Book now", ask: "Ask on WhatsApp", child: "Child", adult: "Adult",
    freeCancel: "Free cancellation up to 24h", duration: "Duration",
    home: "Home", faqTitle: "Frequently asked questions", related: "You may also like", popular: "Most popular excursions",
    overview: "Overview", itinerary: "Itinerary", includes: "What's included", excludes: "Not included", pickupsTitle: "Pickup available from", placesTitle: "Places you'll visit", video: "Watch the video", options: "Prices & options", goodToKnow: "Good to know",
    seeAll: "See all", allTours: "All excursions",
    deposit: (p) => (p ? `Pay ${p}% deposit online, the rest on the day` : "Small deposit online, the rest on the day"),
    gtk: ["Pickup point and time are confirmed when you book (e-ticket sent straight away).", "Free cancellation up to 24 hours before the activity.", "Questions? Real local people answer 24h on WhatsApp."],
    wildlife: "Dolphins and other wildlife live in the wild: sightings are likely but never guaranteed.",
    updated: "Updated", by: "By the Tickets Direct team, Lanzarote",
    stay: "Where are you staying?", stayLead: "We have offices in the three main resorts. Pick yours for the excursions that collect from your area, travel times and your nearest office.",
    distances: "Approximate travel times", officeHere: "Our offices here", ourOffices: "Our offices in Lanzarote",
    finderTitle: "Find your excursion", resortAny: "Any resort", catAny: "Any activity", find: "Show excursions",
    filters: { all: "All", family: "Family", couples: "Couples", adventure: "Adventure", "half-day": "Half day", "full-day": "Full day", "island-hop": "Other islands", wildlife: "Wildlife", "rainy-day": "Windy / rainy day", nightlife: "Nightlife", pack: "Packs" },
    maxPrice: "Max price", results: "excursions", noResults: "No excursions match these filters.",
    contact: "Contact", call: "Call", email: "Email", followUs: "Follow us",
    reviewsTitle: "What our guests say", readReviews: "Read our reviews on Tripadvisor", googleReviews: (r, n) => `Rated ${r}★ on average across our ${n} offices on Google. Read the reviews for the office nearest you:`,
    heroTitle: "Lanzarote excursions, booked direct with the locals",
    heroLead: (n) => `${n} boat trips, volcano tours, buggies, water sports and island trips, sold by a Lanzarote agency since ${site.foundingYear}, with ${site.officeCount} offices in Costa Teguise, Puerto del Carmen and Playa Blanca.`,
    whyTitle: "Why book with Tickets Direct?",
    whyLead: "We are the only excursion company that sells online and has walk-in offices in all three main resorts of Lanzarote. Book on the web, then talk to us face to face.",
    heritageTitle: "A Lanzarote company since 2000",
    heritage: "Tickets Direct grew out of Lineas Marítimas Romero, one of the island's best-known boat companies. We only work in Lanzarote, and every recommendation comes from people who live here.",
    islandsTitle: "Destinations & must-see places", guidesTitle: "Plan your trip: local guides",
    chat: { open: "Need help choosing?", title: "Tickets Direct assistant", hello: "Hi! I can help you find the right excursion. Where are you staying, and what do you feel like doing?", placeholder: "e.g. boat trip with kids under €60", send: "Send", human: "Talk to a person on WhatsApp", chips: ["Boat trips", "With kids", "Under €70", "Windy day plan", "Cruise passenger"] },
    notFound: "Page not found", notFoundLead: "This page doesn't exist, but our excursions do.",
    legal: "Legal notice", privacy: "Privacy", cookies: "Cookies", terms: "Terms", cancellation: "Cancellation policy",
    officesLead: `Book online or visit us in person. We have ${site.officeCount} offices across Lanzarote's main resorts.`,
    addressTbc: "Ask us on WhatsApp for directions to this office.", directions: "Directions",
    aboutTitle: "About Tickets Direct Excursions Lanzarote",
    priceTable: ["Excursion", "Type", "Duration", "From"],
    contactTitle: "Contact Tickets Direct", contactLead: "Real local people, 24 hours a day, in English and Spanish.",
    destTitle: "Lanzarote destinations", destLead: "Every place our excursions visit, with the tours that take you there.",
    quickFacts: "Quick facts", toursTo: (n) => `Excursions to ${n}`, aboutPlace: (n) => `About ${n}`,
    langs: "Languages", minAge: (n) => `Minimum age ${n}`, installApp: "Install app",
    bk: { option: "Option", date: "Date", checking: "Checking availability…", pickDate: "Choose a date", noDates: "No online dates right now: ask us on WhatsApp", total: "Total", depositToday: "Deposit today", onDay: "rest on the day", travellers: "Travellers", waBook: "Book on WhatsApp" },
    badges: { best: "Bestseller", family: "Family favourite" },
    reelsTitle: "Watch before you book", reelsLead: "Real clips from our boats, buggies and tours.", reelsNav: "Reels", watchOn: "Watch on", bookThis: "Book this tour", subscribe: "Subscribe on YouTube", tourShorts: "Watch this tour",
    counters: { tours: "excursions", since: "selling since", offices: "walk-in offices", rating: "avg. Google rating of our offices" },
    byActivity: "By activity", fromResort: "From your resort",
    comboH1: (c, r, n) => `${c} from ${r} 2026: ${n} tours with pickup`,
    comboLead: (c, r, n, min, d) => `${n} ${c.toLowerCase()} collect guests from ${r}, from ${min}. Durations range from ${d}. Book online with a deposit, or walk into one of our ${r} offices.`,
    pickupPointsTitle: "Pickup & meeting points", kind: { pickup: "Pickup", meeting: "Meeting point" }, time: "Time", timeOnTicket: "on your e-ticket", collectionIn: (n) => `Collection points in ${n}`,
    app: {
      title: "Get the Tickets Direct app", install: "Install the app", nav: "Get the app",
      lead: "Install Tickets Direct on your phone, tablet or computer: one tap to all Lanzarote excursions, prices and our assistant, even with a weak connection.",
      steps: [
        ["Android phone or tablet", ["Open this site in Chrome.", "Tap “Install the app”, or open the ⋮ menu and choose “Install app”.", "Find Tickets Direct on your home screen."]],
        ["iPhone or iPad", ["Open this site in Safari.", "Tap the Share button (square with an arrow).", "Choose “Add to Home Screen” and tap Add."]],
        ["Windows, Mac or Chromebook", ["Open this site in Chrome or Edge.", "Click the install icon in the address bar, or “Install the app” on this page.", "Tickets Direct opens in its own window and appears in your apps."]],
      ],
      whyTitle: "Why install it?",
      why: ["Opens instantly from your home screen, like any app", "Pages you've visited still work with a weak or no connection", "Assistant, WhatsApp and booking always one tap away", "No app store and no account needed"],
    },
  },
  es: {
    locale: "es_ES", htmlLang: "es",
    nav: { tours: "Todas las excursiones", activities: "Actividades", resorts: "Dónde te alojas", islands: "Destinos", guides: "Guías", offices: "Oficinas", about: "Quiénes somos" },
    from: "Desde", book: "Reservar", ask: "Preguntar por WhatsApp", child: "Niño", adult: "Adulto",
    freeCancel: "Cancelación gratuita hasta 24 h", duration: "Duración",
    home: "Inicio", faqTitle: "Preguntas frecuentes", related: "También te puede gustar", popular: "Excursiones más populares",
    overview: "Descripción", itinerary: "Itinerario", includes: "Qué incluye", excludes: "No incluye", pickupsTitle: "Recogida disponible en", placesTitle: "Lugares que visitarás", video: "Ver el vídeo", options: "Precios y opciones", goodToKnow: "Información útil",
    seeAll: "Ver todas", allTours: "Todas las excursiones",
    deposit: (p) => (p ? `Paga un ${p}% de depósito online y el resto el día de la excursión` : "Pequeño depósito online y el resto el día de la excursión"),
    gtk: ["El punto y la hora de recogida se confirman al reservar (recibes el e-ticket al momento).", "Cancelación gratuita hasta 24 horas antes de la actividad.", "¿Dudas? Personas reales te responden 24 h por WhatsApp."],
    wildlife: "Los delfines y demás fauna viven en libertad: es probable verlos, pero nunca está garantizado.",
    updated: "Actualizado", by: "Por el equipo de Tickets Direct, Lanzarote",
    stay: "¿Dónde te alojas?", stayLead: "Tenemos oficinas en los tres grandes centros turísticos. Elige el tuyo para ver las excursiones con recogida en tu zona, los tiempos de viaje y tu oficina más cercana.",
    distances: "Tiempos de viaje aproximados", officeHere: "Nuestras oficinas aquí", ourOffices: "Nuestras oficinas en Lanzarote",
    finderTitle: "Encuentra tu excursión", resortAny: "Cualquier zona", catAny: "Cualquier actividad", find: "Ver excursiones",
    filters: { all: "Todas", family: "Familias", couples: "Parejas", adventure: "Aventura", "half-day": "Medio día", "full-day": "Día completo", "island-hop": "Otras islas", wildlife: "Fauna", "rainy-day": "Día de viento / lluvia", nightlife: "Noche", pack: "Packs" },
    maxPrice: "Precio máx.", results: "excursiones", noResults: "Ninguna excursión coincide con estos filtros.",
    contact: "Contacto", call: "Llamar", email: "Email", followUs: "Síguenos",
    reviewsTitle: "Lo que dicen nuestros clientes", readReviews: "Lee nuestras opiniones en Tripadvisor", googleReviews: (r, n) => `Valoración media de ${r}★ en Google entre nuestras ${n} oficinas. Lee las opiniones de la oficina más cercana:`,
    heroTitle: "Excursiones en Lanzarote, reservadas directo con los de aquí",
    heroLead: (n) => `${n} excursiones en barco, volcanes, buggies, deportes acuáticos y otras islas, de la mano de una agencia de Lanzarote desde ${site.foundingYear}, con ${site.officeCount} oficinas en Costa Teguise, Puerto del Carmen y Playa Blanca.`,
    whyTitle: "¿Por qué reservar con Tickets Direct?",
    whyLead: "Somos la única empresa de excursiones que vende online y tiene oficinas en los tres grandes centros turísticos de Lanzarote. Reserva en la web y habla con nosotros en persona.",
    heritageTitle: "Una empresa de Lanzarote desde 2000",
    heritage: "Tickets Direct nació de Líneas Marítimas Romero, una de las navieras más conocidas de la isla. Solo trabajamos en Lanzarote, y cada recomendación viene de gente que vive aquí.",
    islandsTitle: "Destinos y lugares imprescindibles", guidesTitle: "Planifica tu viaje: guías locales",
    chat: { open: "¿Te ayudamos a elegir?", title: "Asistente de Tickets Direct", hello: "¡Hola! Te ayudo a encontrar la excursión ideal. ¿Dónde te alojas y qué te apetece hacer?", placeholder: "p. ej. barco con niños por menos de 60 €", send: "Enviar", human: "Hablar con una persona por WhatsApp", chips: ["Barcos", "Con niños", "Menos de 70 €", "Plan para día de viento", "Vengo en crucero"] },
    notFound: "Página no encontrada", notFoundLead: "Esta página no existe, pero nuestras excursiones sí.",
    legal: "Aviso legal", privacy: "Privacidad", cookies: "Cookies", terms: "Condiciones", cancellation: "Política de cancelación",
    officesLead: `Reserva online o visítanos en persona. Tenemos ${site.officeCount} oficinas en los principales centros turísticos de Lanzarote.`,
    addressTbc: "Escríbenos por WhatsApp y te indicamos cómo llegar a esta oficina.", directions: "Cómo llegar",
    aboutTitle: "Sobre Tickets Direct Excursions Lanzarote",
    priceTable: ["Excursión", "Tipo", "Duración", "Desde"],
    contactTitle: "Contacta con Tickets Direct", contactLead: "Personas reales de aquí, 24 horas al día, en español e inglés.",
    destTitle: "Destinos en Lanzarote", destLead: "Todos los lugares que visitan nuestras excursiones, con las excursiones que te llevan.",
    quickFacts: "Datos rápidos", toursTo: (n) => `Excursiones a ${n}`, aboutPlace: (n) => `Sobre ${n}`,
    langs: "Idiomas", minAge: (n) => `Edad mínima ${n}`, installApp: "Instalar app",
    bk: { option: "Opción", date: "Fecha", checking: "Consultando disponibilidad…", pickDate: "Elige una fecha", noDates: "Ahora no hay fechas online: pregúntanos por WhatsApp", total: "Total", depositToday: "Depósito hoy", onDay: "resto el día de la excursión", travellers: "Viajeros", waBook: "Reservar por WhatsApp" },
    badges: { best: "Más vendida", family: "Favorita en familia" },
    reelsTitle: "Míralo antes de reservar", reelsLead: "Vídeos reales de nuestros barcos, buggies y excursiones.", reelsNav: "Vídeos", watchOn: "Ver en", bookThis: "Reservar esta excursión", subscribe: "Suscríbete en YouTube", tourShorts: "Mira esta excursión",
    counters: { tours: "excursiones", since: "vendiendo desde", offices: "oficinas", rating: "valoración media en Google de nuestras oficinas" },
    byActivity: "Por actividad", fromResort: "Desde tu zona",
    comboH1: (c, r, n) => `${c} desde ${r} 2026: ${n} excursiones con recogida`,
    comboLead: (c, r, n, min, d) => `${n} excursiones de ${c.toLowerCase()} recogen en ${r}, desde ${min}. Duración de ${d}. Reserva online con depósito o ven a una de nuestras oficinas de ${r}.`,
    pickupPointsTitle: "Puntos de recogida y encuentro", kind: { pickup: "Recogida", meeting: "Punto de encuentro" }, time: "Hora", timeOnTicket: "en tu e-ticket", collectionIn: (n) => `Puntos de recogida en ${n}`,
    app: {
      title: "Descarga la app de Tickets Direct", install: "Instalar la app", nav: "Descarga la app",
      lead: "Instala Tickets Direct en tu móvil, tablet u ordenador: todas las excursiones de Lanzarote, precios y nuestro asistente a un toque, incluso con mala conexión.",
      steps: [
        ["Móvil o tablet Android", ["Abre esta web en Chrome.", "Pulsa “Instalar la app” o abre el menú ⋮ y elige “Instalar aplicación”.", "Encontrarás Tickets Direct en tu pantalla de inicio."]],
        ["iPhone o iPad", ["Abre esta web en Safari.", "Pulsa el botón Compartir (cuadrado con flecha).", "Elige “Añadir a pantalla de inicio” y pulsa Añadir."]],
        ["Windows, Mac o Chromebook", ["Abre esta web en Chrome o Edge.", "Haz clic en el icono de instalar de la barra de direcciones o en “Instalar la app” en esta página.", "Tickets Direct se abre en su propia ventana y aparece entre tus aplicaciones."]],
      ],
      whyTitle: "¿Por qué instalarla?",
      why: ["Se abre al instante desde tu pantalla de inicio, como cualquier app", "Las páginas que ya visitaste funcionan con poca o sin conexión", "Asistente, WhatsApp y reservas siempre a un toque", "Sin tienda de apps ni registro"],
    },
  },
};

// ---------- routes ----------
// Tours, categories and destinations keep the exact URLs of the WordPress site (from catalog.json),
// so existing Google rankings and backlinks carry over. Our own pages use the segments below.
const SEG = {
  en: { reels: "reels", tours: "trip", resort: "excursions-from", destinations: "destinations", guide: "guides", offices: "offices", about: "about", faq: "faq", contact: "contact", app: "app" },
  es: { reels: "reels", tours: "trip", resort: "excursiones-desde", destinations: "destinations", guide: "guias", offices: "oficinas", about: "sobre-nosotros", faq: "preguntas-frecuentes", contact: "contacto", app: "app" },
};
const prefix = (lang) => (lang === "en" ? "" : `/${lang}`);
function url(lang, kind, slug) {
  if (kind === "home") return `${prefix(lang)}/`;
  if (kind === "tour") return tourBy[slug].path[lang] || tourBy[slug].path.en;
  if (kind === "cat") return catBy[slug].path[lang] || catBy[slug].path.en;
  const seg = SEG[lang][kind];
  return slug ? `${prefix(lang)}/${seg}/${slug}/` : `${prefix(lang)}/${seg}/`;
}
const destUrl = (lang, d) => d.path[lang] || d.path.en;
const abs = (p) => SITE + p;
const altOf = (kind, slug) => ({ en: url("en", kind, slug), es: url("es", kind, slug) });

// ---------- helpers ----------
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const plain = (html) => String(html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const clip = (s, n) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(" ", n)).replace(/[,.;:]$/, "") + "…");
const dur = (lang, t) => formatDuration(lang, t);
const unitLabel = (lang, t) => (t.unit && t.unit !== "per-person" ? UNIT[lang][t.unit] : "");
const summary = (lang, t) => clip(t.seo[lang]?.description || plain(t.overview[lang]), 150);
const bookingUrl = (lang, t) => BOOK + (t.path[lang] || t.path.en);
const waLink = (text) => `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
const waTour = (lang, t) => waLink(lang === "en" ? `Hi! I'd like to ask about "${t.name.en}".` : `¡Hola! Quiero información sobre "${t.name.es}".`);
const catName = (lang, c) => c.name[lang] || c.term?.name?.[lang] || c.slug;
const byPopularity = (a, b) => b.popularity - a.popularity || a.price - b.price;
const toursIn = (pred) => tours.filter(pred).sort(byPopularity);

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
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
  chat: '<path d="M4 5h16v11H8l-4 4V5z"/>',
  wa: '<path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2L9 8.5z"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  mail: '<path d="M3 5h18v14H3z"/><path d="M3 7l9 6 9-6"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  download: '<path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14"/>',
  play: '<path d="M8 5v14l11-7z"/>',
};
const icon = (name, cls = "i") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ""}</svg>`;

// ---------- components ----------
function tourCard(lang, t) {
  const c = catBy[t.cat];
  const L = T[lang];
  const img = t.images[0];
  const media = img
    ? `<img src="${img.thumb}" alt="${esc(img.alt || t.name[lang])}" loading="lazy" decoding="async" width="560" height="350">`
    : `<div class="card-art art-${c.color}">${icon(c.icon, "art-icon")}</div>`;
  const flag = BESTSELLERS.has(t.slug) ? L.badges.best : t.tags.includes("family") && t.child ? L.badges.family : "";
  return `<article class="card rv" data-cat="${t.cats.join(" ")}" data-tags="${t.tags.join(" ")}" data-price="${t.price}" data-resorts="${t.resorts.join(" ")}" data-slug="${t.slug}">
  <a class="card-link" href="${url(lang, "tour", t.slug)}">
    <div class="card-media">${media}<span class="badge">${esc(catName(lang, c))}</span>${flag ? `<span class="flag">${icon("star")}${esc(flag)}</span>` : ""}</div>
    <div class="card-body">
      <h3>${esc(t.name[lang])}</h3>
      <p class="card-meta">${icon("clock")}${esc(dur(lang, t))}</p>
      <p class="card-sum">${esc(summary(lang, t))}</p>
      <p class="card-price"><span>${L.from}</span> <strong>${price(lang, t.price)}</strong>${unitLabel(lang, t) ? ` <small>${esc(unitLabel(lang, t))}</small>` : ""}</p>
    </div>
  </a>
</article>`;
}
const cardGrid = (lang, list) => `<div class="grid cards">${list.map((t) => tourCard(lang, t)).join("\n")}</div>`;
// Horizontal swipe rail (scroll-snap); arrows are enhanced by app.js.
const rail = (inner, label) => `<div class="rail" data-rail><button class="rail-btn prev" type="button" aria-label="${label} ‹">‹</button><div class="rail-track">${inner}</div><button class="rail-btn next" type="button" aria-label="${label} ›">›</button></div>`;

function reelCard(lang, r) {
  const t = r.tour && tourBy[r.tour];
  const img = t?.images[0];
  const title = r.title?.[lang] || t?.name[lang] || "";
  const href = r.platform === "youtube" ? `https://www.youtube.com/shorts/${r.id}` : r.url;
  // Tour photo when linked (self-hosted, fast); otherwise the Short's own vertical cover from YouTube.
  const cover = img ? img.src : r.platform === "youtube" ? `https://i.ytimg.com/vi/${r.id}/oardefault.jpg` : null;
  return `<a class="reel rv" href="${esc(href)}" target="_blank" rel="noopener" data-platform="${r.platform}"${r.platform === "youtube" ? ` data-yt="${r.id}"` : ""}${t ? ` data-book="${url(lang, "tour", t.slug)}"` : ""} data-title="${esc(title)}">
  ${cover ? `<img src="${cover}" alt="" loading="lazy" decoding="async">` : ""}
  <span class="reel-play">${icon("play")}</span>
  <span class="reel-meta"><strong>${esc(title)}</strong>${t ? `<small>${T[lang].from} ${price(lang, t.price)}</small>` : ""}</span>
</a>`;
}

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

const hoursText = (lang, h) => (h.days === "daily" ? (lang === "en" ? `Open every day ${h.opens}–${h.closes}` : `Abierto todos los días ${h.opens}–${h.closes}`) : "");

// WordPress stores traveller types in English only; translate the common ones for display.
const PAX_ES = { adult: "Adulto", adults: "Adultos", child: "Niño", children: "Niños", kid: "Niño", infant: "Bebé", baby: "Bebé", pensioner: "Pensionista", senior: "Mayor", student: "Estudiante", person: "Persona", group: "Grupo", vehicle: "Vehículo" };
const paxLabel = (lang, label) => (lang === "es" && PAX_ES[label.trim().toLowerCase()]) || label;

function pointsTable(lang, list) {
  const L = T[lang];
  const rName = (slug) => resorts.find((r) => r.slug === slug)?.name || "";
  return `<div class="table-wrap"><table class="prices points"><tbody>${list
    .map((p) => `<tr><td><strong>${esc(p.name[lang] || p.name.en)}</strong>${p.notes?.[lang] ? `<br><small>${esc(p.notes[lang])}</small>` : ""}</td><td>${esc(L.kind[p.kind] || L.kind.pickup)}${p.resort ? ` · ${esc(rName(p.resort))}` : ""}</td><td>${p.time ? `<strong>${esc(p.time)}</strong>` : `<small>${L.time} ${L.timeOnTicket}</small>`}</td><td>${p.geo ? `<a href="https://www.google.com/maps/search/?api=1&query=${p.geo.join(",")}" rel="noopener" target="_blank">${L.directions}</a>` : ""}</td></tr>`)
    .join("")}</tbody></table></div>`;
}

function officeList(lang, list) {
  const L = T[lang];
  return `<div class="grid offices">${list
    .map((o) => {
      const r = resorts.find((x) => x.slug === o.resort);
      const maps = o.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.mapsQuery)}`;
      return `<article class="office" id="${o.id}">
  <h3>${icon("pin")}${esc(o.name)}</h3>
  ${Number(o.gbp?.rating) ? `<p class="g-rating"><a href="${o.mapsUrl}" rel="noopener" target="_blank">★ ${esc(o.gbp.rating)} Google</a></p>` : ""}
  ${o.streetAddress ? `<p>${esc(o.streetAddress)}<br>${esc(o.postalCode || "")} ${esc(o.locality)}, Lanzarote</p>` : `<p>${esc(o.locality)}, Lanzarote<br><small>${esc(L.addressTbc)}</small></p>`}
  ${o.phone ? `<p><a href="tel:${o.phone.replace(/\s/g, "")}">${icon("phone")}${esc(o.phone)}</a></p>` : ""}
  ${o.hours ? `<p><small>${icon("clock")}${esc(hoursText(lang, o.hours))}</small></p>` : ""}
  <p class="office-links"><a href="${maps}" rel="noopener" target="_blank">${L.directions}</a>${r ? ` · <a href="${url(lang, "resort", r.slug)}">${esc(r.name)}</a>` : ""}</p>
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
  // Google ratings per office are stronger than the Tripadvisor listing, so point visitors there.
  const best = [...ratedOffices].sort((a, b) => Number(b.gbp.rating) - Number(a.gbp.rating));
  const gLinks = best.map((o) => `<a href="${o.mapsUrl}" rel="noopener" target="_blank">★ ${esc(o.gbp.rating)} · ${esc(o.locality)}</a>`).join("");
  return `<section class="band"><div class="wrap section"><h2>${L.reviewsTitle}</h2>${quotes}${avgRating ? `<p class="lead">${esc(L.googleReviews(avgRating, ratedOffices.length))}</p><p class="pills g-pills">${gLinks}</p>` : ""}</div></section>`;
}

function expandShortcodes(lang, html) {
  return html
    .replace(/\[\[tours:([^\]]+)\]\]/g, (_, list) => cardGrid(lang, list.split(",").map((s) => tourBy[s.trim()]).filter(Boolean)))
    .replace(/\[\[prices\]\]/g, () => priceTable(lang));
}

function priceTable(lang) {
  const [h1, h2, h3, h4] = T[lang].priceTable;
  const rows = mainCats.flatMap((c) =>
    tours.filter((t) => t.cat === c.slug).sort((a, b) => a.price - b.price).map((t) => `<tr><td><a href="${url(lang, "tour", t.slug)}">${esc(t.name[lang])}</a></td><td>${esc(catName(lang, c))}</td><td>${esc(dur(lang, t))}</td><td><strong>${price(lang, t.price)}</strong>${unitLabel(lang, t) ? ` <small>${esc(unitLabel(lang, t))}</small>` : ""}${t.child ? `<br><small>${T[lang].child} ${price(lang, t.child.price)}</small>` : ""}</td></tr>`),
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
    logo: `${SITE}/assets/icons/icon-512.png`,
    image: `${SITE}/assets/og-default.png`,
    telephone: site.phone,
    email: site.email,
    foundingDate: String(site.foundingYear),
    description: `Excursion booking agency in Lanzarote since ${site.foundingYear}, with roots in ${site.heritage}. ${tours.length} excursions; offices in Costa Teguise, Puerto del Carmen and Playa Blanca.`,
    areaServed: { "@type": "Place", name: "Lanzarote, Canary Islands, Spain" },
    knowsLanguage: ["en", "es"],
    priceRange: `€${minPrice}–€${Math.max(...tours.map((t) => t.price))}`,
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
    ...(o.hours?.days === "daily" ? { openingHoursSpecification: { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], opens: o.hours.opens, closes: o.hours.closes } } : {}),
    ...(o.geo ? { geo: { "@type": "GeoCoordinates", latitude: o.geo[0], longitude: o.geo[1] } } : {}),
    ...(o.mapsUrl ? { hasMap: o.mapsUrl } : {}),
    parentOrganization: { "@id": ORG_ID },
  };
}
function tourLd(lang, t) {
  const page = abs(url(lang, "tour", t.slug));
  const primary = (t.packages.find((p) => p.primary) || t.packages[0])?.categories || [];
  const offers = (primary.length ? primary : [{ label: T[lang].adult, price: t.price }])
    .filter((c) => c.price > 0)
    .map((c) => ({ "@type": "Offer", name: c.label, price: c.price.toFixed(2), priceCurrency: "EUR", availability: "https://schema.org/InStock", url: page, seller: { "@id": ORG_ID } }));
  return {
    "@context": "https://schema.org",
    "@type": ["Product", "TouristTrip"],
    "@id": `${page}#trip`,
    name: t.name[lang],
    description: summary(lang, t),
    url: page,
    image: t.images.length ? t.images.map((i) => abs(i.src)) : [`${SITE}/assets/og-default.png`],
    inLanguage: lang,
    category: catName(lang, catBy[t.cat]),
    brand: { "@id": ORG_ID },
    provider: { "@id": ORG_ID },
    ...(t.itinerary[lang].length ? { itinerary: { "@type": "ItemList", itemListElement: t.itinerary[lang].map((s, i) => ({ "@type": "ListItem", position: i + 1, name: s.title })) } } : {}),
    ...(t.destinations.length ? { touristType: t.tags.includes("family") ? "Families" : undefined } : {}),
    offers: offers.length > 1 ? offers : offers[0],
  };
}
const faqLd = (faqs) => (faqs?.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) } : null);
const itemListLd = (lang, list) => ({ "@context": "https://schema.org", "@type": "ItemList", itemListElement: list.map((t, i) => ({ "@type": "ListItem", position: i + 1, url: abs(url(lang, "tour", t.slug)), name: t.name[lang] })) });

// ---------- layout ----------
function header(lang, alt) {
  const L = T[lang];
  const other = lang === "en" ? "es" : "en";
  const otherHref = alt?.[other] || url(other, "home");
  const topDest = destinations.filter((d) => d.curated).concat(destinations.filter((d) => !d.curated).sort((a, b) => b.count - a.count)).slice(0, 8);
  return `<a class="skip" href="#main">${lang === "en" ? "Skip to content" : "Saltar al contenido"}</a>
<header class="site-head"><div class="wrap head-row">
  <a class="logo" href="${url(lang, "home")}" aria-label="${esc(site.name)}"><img src="/assets/logo.svg" alt="" width="36" height="36"><span><strong>Tickets Direct</strong><small>Excursions Lanzarote</small></span></a>
  <button class="menu-btn" aria-expanded="false" aria-controls="nav">${lang === "en" ? "Menu" : "Menú"}</button>
  <nav id="nav" class="nav" aria-label="Main">
    <a href="${url(lang, "tours")}">${L.nav.tours}</a>
    <div class="dd"><button aria-expanded="false">${L.nav.activities}</button><div class="dd-menu">${mainCats.map((c) => `<a href="${url(lang, "cat", c.slug)}">${esc(catName(lang, c))}</a>`).join("")}</div></div>
    <div class="dd"><button aria-expanded="false">${L.nav.resorts}</button><div class="dd-menu">${resorts.map((r) => `<a href="${url(lang, "resort", r.slug)}">${esc(r.name)}</a>`).join("")}<a href="${url(lang, "guide", "lanzarote-shore-excursions-cruise-port")}">${lang === "en" ? "Cruise passengers" : "Cruceristas"}</a></div></div>
    <div class="dd"><button aria-expanded="false">${L.nav.islands}</button><div class="dd-menu">${topDest.map((d) => `<a href="${destUrl(lang, d)}">${esc(d.name[lang])}</a>`).join("")}<a href="${url(lang, "destinations")}">${L.seeAll} →</a></div></div>
    <a href="${url(lang, "reels")}">${L.reelsNav}</a>
    <a href="${url(lang, "guide")}">${L.nav.guides}</a>
    <a href="${url(lang, "offices")}">${L.nav.offices}</a>
    <a class="lang" href="${otherHref}" hreflang="${other}" lang="${other}">${other.toUpperCase()}</a>
    <button class="btn ghost small" data-install hidden>${icon("download")}${L.installApp}</button>
    <a class="btn wa small" href="${waLink(lang === "en" ? "Hi! I'd like help choosing an excursion." : "¡Hola! Quiero ayuda para elegir una excursión.")}" rel="noopener">${icon("wa")}WhatsApp</a>
  </nav>
</div></header>`;
}

function footer(lang) {
  const L = T[lang];
  const legal = (p) => `${BOOK}/${p}/`;
  return `<footer class="site-foot"><div class="wrap foot-grid">
  <div><p class="logo foot-logo"><img src="/assets/logo.svg" alt="" width="32" height="32"><strong>Tickets Direct</strong></p>
    <p>${esc(L.heritage)}</p>
    <p><a href="tel:${site.phoneHref}">${icon("phone")}${site.phone}</a><br><a href="mailto:${site.email}">${icon("mail")}${site.email}</a><br><a href="https://wa.me/${site.whatsapp}" rel="noopener">${icon("wa")}WhatsApp 24h</a></p>
    <p><a class="btn ghost light small" href="${url(lang, "app")}">${icon("download")}${L.app.nav}</a></p></div>
  <div><h2>${L.nav.activities}</h2><ul>${mainCats.map((c) => `<li><a href="${url(lang, "cat", c.slug)}">${esc(catName(lang, c))}</a></li>`).join("")}</ul></div>
  <div><h2>${L.nav.resorts}</h2><ul>${resorts.map((r) => `<li><a href="${url(lang, "resort", r.slug)}">${esc(r.name)}</a></li>`).join("")}</ul><h2>${L.nav.islands}</h2><ul>${destinations.filter((d) => d.curated).map((d) => `<li><a href="${destUrl(lang, d)}">${esc(d.name[lang])}</a></li>`).join("")}<li><a href="${url(lang, "destinations")}">${L.seeAll}</a></li></ul></div>
  <div><h2>Tickets Direct</h2><ul><li><a href="${url(lang, "about")}">${L.nav.about}</a></li><li><a href="${url(lang, "offices")}">${L.nav.offices}</a></li><li><a href="${url(lang, "faq")}">${L.faqTitle}</a></li><li><a href="${url(lang, "contact")}">${L.contact}</a></li><li><a href="${url(lang, "guide")}">${L.nav.guides}</a></li><li><a href="${url(lang, "reels")}">${L.reelsNav}</a></li><li><a href="${url(lang, "app")}">${L.app.nav}</a></li></ul>
    <h2>${L.followUs}</h2><ul class="social">${Object.entries(site.social).filter(([, v]) => v).map(([k, v]) => `<li><a href="${v}" rel="noopener" target="_blank">${k[0].toUpperCase() + k.slice(1)}</a></li>`).join("")}</ul></div>
</div>
<div class="wrap foot-legal"><p>© ${new Date().getFullYear()} ${esc(site.name)} · <a href="${legal("cancellation-policy")}">${L.cancellation}</a> · <a href="${legal("terms-and-conditions")}">${L.terms}</a> · <a href="${legal("privacy-policy")}">${L.privacy}</a> · <a href="${legal("cookie-policy")}">${L.cookies}</a> · <a href="${legal("legal-notice")}">${L.legal}</a></p></div>
</footer>`;
}

function chatWidget(lang) {
  const c = T[lang].chat;
  return `<div id="td-chat" class="chat" data-lang="${lang}" role="dialog" aria-label="${esc(c.title)}" hidden>
  <div class="chat-head"><strong>${icon("chat")}${c.title}</strong><button class="chat-x" aria-label="Close">×</button></div>
  <div class="chat-log" aria-live="polite"><div class="msg bot">${esc(c.hello)}</div></div>
  <div class="chat-chips">${c.chips.map((x) => `<button type="button">${esc(x)}</button>`).join("")}</div>
  <form class="chat-form"><label class="sr" for="chat-in">${esc(c.placeholder)}</label><input id="chat-in" autocomplete="off" maxlength="500" placeholder="${esc(c.placeholder)}"><button class="btn small">${c.send}</button></form>
  <a class="chat-human" href="https://wa.me/${site.whatsapp}" rel="noopener" target="_blank">${icon("wa")}${c.human}</a>
</div>
<dialog id="reel-dialog" class="reel-dialog"><div class="reel-frame"></div><p class="reel-actions"><a class="btn small" data-book href="#">${T[lang].bookThis}</a> <a class="btn ghost small" data-out href="#" target="_blank" rel="noopener">${T[lang].watchOn} YouTube</a> <button class="btn ghost small" data-close type="button">×</button></p></dialog>
<button id="td-chat-open" class="chat-fab">${icon("chat")}<span>${c.open}</span></button>`;
}

const pages = [];
const altMap = []; // [{en, es?}] for the sitemap

function page({ lang, path: p, alt, title, description, body, ld = [], ogType = "website", ogImage, noindex = false }) {
  const L = T[lang];
  const canonical = abs(p);
  const ldAll = [orgLd(), ...ld].filter(Boolean);
  const langs = alt ? LANGS.filter((l) => alt[l]) : [];
  const html = `<!doctype html>
<html lang="${L.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
${langs.length > 1 ? langs.map((l) => `<link rel="alternate" hreflang="${l}" href="${abs(alt[l])}">`).join("\n") + `\n<link rel="alternate" hreflang="x-default" href="${abs(alt.en)}">` : ""}
${noindex ? '<meta name="robots" content="noindex">' : '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">'}
<meta name="geo.region" content="ES-GC"><meta name="geo.placename" content="Lanzarote">
<meta property="og:type" content="${ogType}"><meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}"><meta property="og:image" content="${ogImage ? abs(ogImage) : `${SITE}/assets/og-default.png`}"><meta property="og:locale" content="${L.locale}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0f4c5c">
<link rel="icon" href="/assets/logo.svg" type="image/svg+xml">
<link rel="manifest" href="/manifest-${lang}.webmanifest">
<link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">
<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default"><meta name="apple-mobile-web-app-title" content="Tickets Direct">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Inter:wght@400;500;600&display=swap">
<link rel="stylesheet" href="/assets/styles.css?v=${BUILD_ID}">
<link rel="alternate" type="text/plain" title="LLM summary" href="/llms.txt">
${ldAll.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`).join("\n")}
</head>
<body>
${header(lang, alt)}
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
  if (alt && !noindex) altMap.push(alt);
}

function write(p, content) {
  const file = p.endsWith("/") ? path.join(OUT, p, "index.html") : path.join(OUT, p);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  if (p.endsWith("/") || p.endsWith(".html")) pages.push(p);
}

// ---------- pages ----------
function homePage(lang) {
  const L = T[lang];
  const alt = altOf("home");
  const popular = [...tours].sort(byPopularity).slice(0, 8);
  const topDest = destinations.filter((d) => d.curated).concat(destinations.filter((d) => !d.curated).sort((a, b) => b.count - a.count)).slice(0, 8);
  const slides = popular.filter((t) => t.images.length).slice(0, 4).map((t) => t.images[0]);
  const hero = slides[0];
  const homeFaqs = lang === "en"
    ? [
        ["What are the best excursions in Lanzarote?", `Our most booked excursions are ${popular.slice(0, 3).map((t) => `${t.name.en} (from ${price("en", t.price)})`).join(", ")}.`],
        ["Where are Tickets Direct's offices?", `We have ${site.officeCount} offices in Lanzarote's main resorts: Costa Teguise, Puerto del Carmen and Playa Blanca.`],
        ["How do I pay?", "Reserve online with a deposit and pay the balance on the day of the activity. Cancellation is free up to 24 hours before."],
        ["Is Tickets Direct a local company?", `Yes. We have been selling excursions in Lanzarote since ${site.foundingYear} and grew out of ${site.heritage}, one of the island's best-known boat companies.`],
      ]
    : [
        ["¿Cuáles son las mejores excursiones en Lanzarote?", `Nuestras excursiones más reservadas son ${popular.slice(0, 3).map((t) => `${t.name.es} (desde ${price("es", t.price)})`).join(", ")}.`],
        ["¿Dónde están las oficinas de Tickets Direct?", `Tenemos ${site.officeCount} oficinas en los principales centros turísticos: Costa Teguise, Puerto del Carmen y Playa Blanca.`],
        ["¿Cómo se paga?", "Reservas online con un depósito y pagas el resto el día de la actividad. La cancelación es gratuita hasta 24 horas antes."],
        ["¿Tickets Direct es una empresa local?", `Sí. Vendemos excursiones en Lanzarote desde ${site.foundingYear} y nacimos de Líneas Marítimas Romero, una de las navieras más conocidas de la isla.`],
      ];
  const body = `
<section class="hero2">
  <div class="hero-slides" aria-hidden="true">${slides.map((im, i) => `<img src="${im.src}" alt="" width="${im.w}" height="${im.h}"${i ? ' loading="lazy"' : ' fetchpriority="high"'} style="--i:${i}">`).join("")}</div>
  <div class="wrap hero2-inner">
    <p class="eyebrow">${lang === "en" ? `Local agency · since ${site.foundingYear}` : `Agencia local · desde ${site.foundingYear}`}</p>
    <h1>${esc(L.heroTitle)}</h1>
    <p class="lead">${esc(L.heroLead(tours.length))}</p>
    <form class="finder" action="${url(lang, "tours")}" method="get">
      <h2 class="sr">${L.finderTitle}</h2>
      <label><span>${L.stay}</span><select name="resort"><option value="">${L.resortAny}</option>${resorts.map((r) => `<option value="${r.slug}">${esc(r.name)}</option>`).join("")}</select></label>
      <label><span>${L.nav.activities}</span><select name="cat"><option value="">${L.catAny}</option>${mainCats.map((c) => `<option value="${c.slug}">${esc(catName(lang, c))}</option>`).join("")}</select></label>
      <button class="btn">${L.find}</button>
    </form>
    <p class="hero-chips">${["family", "couples", "adventure", "island-hop", "rainy-day"].map((k) => `<a href="${url(lang, "tours")}?tag=${k}">${esc(L.filters[k])}</a>`).join("")}</p>
  </div>
</section>
<section class="wrap counters" aria-label="Tickets Direct in numbers">
  <div><strong data-count="${tours.length}">${tours.length}</strong><span>${L.counters.tours}</span></div>
  <div><strong data-count="${site.foundingYear}" data-from="1990">${site.foundingYear}</strong><span>${L.counters.since}</span></div>
  <div><strong data-count="${offices.length}">${offices.length}</strong><span>${L.counters.offices}</span></div>
  ${avgRating ? `<div><strong>${avgRating}★</strong><span>${L.counters.rating}</span></div>` : ""}
</section>
<div class="marquee" aria-hidden="true"><div class="marquee-track">${[...site.promises[lang], ...site.promises[lang]].map(([h]) => `<span>${icon("check")}${esc(h)}</span>`).join("")}</div></div>
<section class="wrap section"><div class="sec-head"><h2>${L.popular}</h2><a href="${url(lang, "tours")}">${L.seeAll} (${tours.length}) →</a></div>${rail(popular.map((t) => tourCard(lang, t)).join(""), L.popular)}</section>
${reels.length ? `<section class="section reels-band"><div class="wrap"><div class="sec-head"><div><h2>${L.reelsTitle}</h2><p class="lead">${L.reelsLead}</p></div><a href="${url(lang, "reels")}">${L.seeAll} →</a></div>${rail(reels.slice(0, 10).map((r) => reelCard(lang, r)).join(""), L.reelsTitle)}</div></section>` : ""}
<section class="band"><div class="wrap section"><h2>${L.stay}</h2><p class="lead">${esc(L.stayLead)}</p>
<div class="grid resorts">${resorts.map((r) => `<a class="resort rv" href="${url(lang, "resort", r.slug)}"><span class="resort-art"></span><strong>${esc(r.name)}</strong><span>${esc(r.intro[lang].split(". ")[0])}.</span><span class="more">${icon("pin")}${tours.filter((t) => t.resorts.includes(r.slug)).length} ${lang === "en" ? "excursions with pickup · our office" : "excursiones con recogida · oficina"} →</span></a>`).join("")}</div></div></section>
<section class="wrap section"><h2>${L.nav.activities}</h2><div class="grid cats">${mainCats.map((c) => `<a class="cat cat-${c.color} rv" href="${url(lang, "cat", c.slug)}">${icon(c.icon, "cat-icon")}<strong>${esc(catName(lang, c))}</strong><span>${tours.filter((t) => t.cats.includes(c.slug)).length} · ${L.from} ${price(lang, Math.min(...tours.filter((t) => t.cats.includes(c.slug)).map((t) => t.price)))}</span></a>`).join("")}</div></section>
<section class="band dark"><div class="wrap section why"><div><h2>${L.whyTitle}</h2><p class="lead">${esc(L.whyLead)}</p><h3>${L.heritageTitle}</h3><p>${esc(L.heritage)}</p><p><a class="btn light" href="${url(lang, "about")}">${L.nav.about}</a> <a class="btn ghost light" href="${url(lang, "offices")}">${L.nav.offices}</a></p></div>
<ul class="why-list">${site.promises[lang].map(([h, p]) => `<li>${icon("check")}<div><strong>${esc(h)}</strong><span>${esc(p)}</span></div></li>`).join("")}</ul></div></section>
<section class="wrap section"><div class="sec-head"><h2>${L.islandsTitle}</h2><a href="${url(lang, "destinations")}">${L.seeAll} →</a></div><div class="grid places">${topDest.map((d) => destTile(lang, d)).join("")}</div></section>
<section class="wrap section"><div class="sec-head"><h2>${L.guidesTitle}</h2><a href="${url(lang, "guide")}">${L.seeAll} →</a></div><div class="grid guides">${guides.slice(0, 6).map((g) => `<a class="guide" href="${url(lang, "guide", g.slug)}"><strong>${esc(g[lang].title)}</strong><span>${esc(clip(g[lang].meta, 120))}</span></a>`).join("")}</div></section>
${reviewsBlock(lang)}
<section class="wrap section app-promo"><div><h2>${esc(L.app.title)}</h2><p>${esc(L.app.lead)}</p></div><p><a class="btn" href="${url(lang, "app")}">${icon("download")}${L.app.nav}</a></p></section>
<div class="wrap section">${faqBlock(lang, homeFaqs)}</div>`;
  page({
    lang, path: alt[lang], alt, ogImage: hero?.src,
    title: lang === "en" ? "Lanzarote Excursions & Tours 2026 | Book Direct with Tickets Direct" : "Excursiones en Lanzarote 2026 | Reserva directo con Tickets Direct",
    description: lang === "en"
      ? `Book ${tours.length} Lanzarote excursions direct with the local agency: boat trips, Timanfaya, La Graciosa, buggies and more from ${price("en", minPrice)}. ${site.officeCount} offices, free cancellation up to 24h.`
      : `Reserva ${tours.length} excursiones en Lanzarote directo con la agencia local: barcos, Timanfaya, La Graciosa, buggies y más desde ${price("es", minPrice)}. ${site.officeCount} oficinas, cancelación gratuita 24 h.`,
    body,
    ld: [
      { "@context": "https://schema.org", "@type": "WebSite", "@id": `${SITE}/#website`, url: SITE + "/", name: site.name, inLanguage: ["en", "es"], publisher: { "@id": ORG_ID } },
      itemListLd(lang, popular),
      faqLd(homeFaqs),
    ],
  });
}

function destTile(lang, d) {
  const t = toursIn((x) => x.destinations.includes(d.id)).find((x) => x.images.length);
  const img = t?.images[0];
  return `<a class="place" href="${destUrl(lang, d)}">${img ? `<img src="${img.thumb}" alt="${esc(d.name[lang])}" loading="lazy" width="560" height="350">` : ""}<strong>${esc(d.name[lang])}</strong><span>${tours.filter((x) => x.destinations.includes(d.id)).length} ${T[lang].results}</span></a>`;
}

function tourPage(lang, t) {
  const L = T[lang];
  const c = catBy[t.cat];
  const alt = { en: t.path.en, es: t.hasEs ? t.path.es : null };
  const bc = breadcrumbs(lang, [[catName(lang, c), url(lang, "cat", c.slug)], [t.name[lang], url(lang, "tour", t.slug)]]);
  const related = toursIn((x) => x.cat === t.cat && x.slug !== t.slug).slice(0, 3);
  const fill = related.length < 3 ? [...tours].sort(byPopularity).filter((x) => x.cat !== t.cat).slice(0, 3 - related.length) : [];
  const d = dur(lang, t);
  const ownFaqs = t.faqs[lang];
  const genericFaqs = lang === "en"
    ? [[`How much does the ${t.name.en} cost?`, `From ${price("en", t.price)}${unitLabel("en", t) ? ` ${unitLabel("en", t)}` : " per adult"}${t.child ? `, children (${t.child.ages}) ${price("en", t.child.price)}` : ""}. ${L.deposit(t.deposit)}.`], ["Can I cancel?", "Yes, cancellation is free up to 24 hours before the activity."]]
    : [[`¿Cuánto cuesta ${t.name.es}?`, `Desde ${price("es", t.price)}${unitLabel("es", t) ? ` ${unitLabel("es", t)}` : " por adulto"}${t.child ? `, niños (${t.child.ages}) ${price("es", t.child.price)}` : ""}. ${L.deposit(t.deposit)}.`], ["¿Puedo cancelar?", "Sí, la cancelación es gratuita hasta 24 horas antes de la actividad."]];
  const faqs = [...ownFaqs, ...genericFaqs.filter(([q]) => !ownFaqs.some(([oq]) => oq.toLowerCase() === q.toLowerCase()))];
  const gtk = [...L.gtk];
  if (t.tags.includes("wildlife") || /dolphin|delf/i.test(t.name.en)) gtk.splice(1, 0, L.wildlife);
  const dests = t.destinations.map((id) => destinations.find((x) => x.id === id)).filter(Boolean);
  const pickupNames = t.pickups.map((id) => C.locTerm[id]).filter((x) => x && x.slug !== "lanzarote");
  const yt = t.video && t.video.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/)?.[1];
  const [hero, ...gallery] = t.images;
  const pkgTable = t.packages.filter((p) => p.categories.some((x) => x.price > 0));
  const body = `
<div class="wrap">${bc.html}</div>
<article class="wrap tour">
  <div class="tour-main">
    <div class="gallery">${hero ? `<img class="g-main" src="${hero.src}" alt="${esc(hero.alt || t.name[lang])}" width="${hero.w}" height="${hero.h}" fetchpriority="high">` : `<div class="tour-hero art-${c.color}">${icon(c.icon, "art-icon big")}</div>`}
    ${gallery.length ? `<div class="g-strip">${gallery.map((g) => `<a href="${g.src}" target="_blank" rel="noopener"><img src="${g.thumb}" alt="${esc(g.alt || t.name[lang])}" loading="lazy" width="560" height="350"></a>`).join("")}</div>` : ""}</div>
    <p class="eyebrow"><a href="${url(lang, "cat", c.slug)}">${esc(catName(lang, c))}</a></p>
    <h1>${esc(t.name[lang])}</h1>
    <ul class="facts"><li>${icon("clock")}${esc(d)}</li><li>${icon("check")}${L.freeCancel}</li>${t.languages.length ? `<li>${icon("globe")}${esc(t.languages.join(", "))}</li>` : ""}${t.minAge ? `<li>${icon("shield")}${esc(L.minAge(t.minAge))}</li>` : ""}</ul>
    ${t.overview[lang] ? `<h2>${L.overview}</h2><div class="prose">${t.overview[lang]}</div>` : ""}
    ${t.itinerary[lang].length ? `<h2>${L.itinerary}</h2><ol class="steps">${t.itinerary[lang].map((s) => `<li><strong>${esc(s.title)}</strong>${s.text ? `<p>${esc(s.text)}</p>` : ""}</li>`).join("")}</ol>` : ""}
    ${t.includes[lang].length || t.excludes[lang].length ? `<div class="incl">${t.includes[lang].length ? `<div><h2>${L.includes}</h2><ul class="ticks">${t.includes[lang].map((x) => `<li>${icon("check")}${esc(x)}</li>`).join("")}</ul></div>` : ""}${t.excludes[lang].length ? `<div><h2>${L.excludes}</h2><ul class="ticks no">${t.excludes[lang].map((x) => `<li>${icon("x")}${esc(x)}</li>`).join("")}</ul></div>` : ""}</div>` : ""}
    ${reels.some((r) => r.tour === t.slug) ? `<h2>${L.tourShorts}</h2><div class="tour-shorts">${reels.filter((r) => r.tour === t.slug).slice(0, 4).map((r) => reelCard(lang, r)).join("")}</div>` : ""}
    ${yt && !reels.some((r) => r.tour === t.slug && r.id === yt) ? `<h2>${L.video}</h2><button class="yt" data-yt="${yt}" aria-label="${esc(L.video)}: ${esc(t.name[lang])}"><img src="https://i.ytimg.com/vi/${yt}/hqdefault.jpg" alt="" loading="lazy" width="480" height="360">${icon("play", "yt-play")}</button>` : ""}
    ${pickupNames.length ? `<h2>${L.pickupsTitle}</h2><p class="pills">${pickupNames.map((p) => { const r = resorts.find((x) => x.wp === p.id); return r ? `<a href="${url(lang, "resort", r.slug)}">${esc(p.name[lang])}</a>` : `<span>${esc(p.name[lang])}</span>`; }).join("")}</p>` : ""}
    ${t.pickupPoints.length ? `<h2>${L.pickupPointsTitle}</h2>${pointsTable(lang, t.pickupPoints)}` : ""}
    ${dests.length ? `<h2>${L.placesTitle}</h2><p class="pills">${dests.map((x) => `<a href="${destUrl(lang, x)}">${esc(x.name[lang])}</a>`).join("")}</p>` : ""}
    <h2>${L.goodToKnow}</h2>
    <ul class="ticks muted">${gtk.map((g) => `<li>${icon("check")}${esc(g)}</li>`).join("")}${t.info[lang].filter(([k]) => !/cancel/i.test(k)).map(([k, v]) => `<li>${icon("check")}<span><strong>${esc(k)}:</strong> ${esc(v)}</span></li>`).join("")}</ul>
    ${faqBlock(lang, faqs)}
  </div>
  <aside class="book-box" aria-label="${L.book}">
    <p class="bb-price"><span>${L.from}</span> <strong>${price(lang, t.price)}</strong> <small>${esc(unitLabel(lang, t) || UNIT[lang]["per-person"])}</small></p>
    <p class="bb-meta">${icon("clock")}${esc(d)}</p>
    <form class="bk" id="book" data-trip="${t.id}" data-deposit="${t.deposit || ""}" data-name="${esc(t.name[lang])}" data-i18n="${esc(JSON.stringify(L.bk))}">
      ${pkgTable.length > 1 ? `<label class="bk-field"><span>${L.bk.option}</span><select name="pkg">${pkgTable.map((p, i) => `<option value="${i}" data-id="${p.id ?? ""}">${esc(p.name)}</option>`).join("")}</select></label>` : ""}
      <label class="bk-field bk-live"><span>${L.bk.date}</span><select name="date" disabled><option>${L.bk.checking}</option></select></label>
      ${pkgTable.map((p, i) => `<div class="bk-pax" data-pkg="${i}"${i ? " hidden" : ""}>${p.categories.filter((x) => x.price > 0).map((x, j) => `<div class="bk-row" data-price="${x.price}" data-label="${esc(x.label)}"><span>${esc(paxLabel(lang, x.label))}${x.ages ? ` <small>(${esc(x.ages)})</small>` : ""}</span><b>${price(lang, x.price)}</b><span class="bk-step bk-live"><button type="button" data-d="-1" aria-label="−">−</button><output>${j === 0 ? 2 : 0}</output><button type="button" data-d="1" aria-label="+">+</button></span></div>`).join("")}</div>`).join("")}
      <p class="bk-total bk-live" aria-live="polite"></p>
      <a class="btn block" data-book href="${bookingUrl(lang, t)}" rel="noopener">${L.book}</a>
      <a class="btn wa block" data-wa href="${waTour(lang, t)}" rel="noopener" target="_blank">${icon("wa")}${L.ask}</a>
    </form>
    <ul class="bb-trust"><li>${icon("check")}${L.freeCancel}</li><li>${icon("check")}${esc(L.deposit(t.deposit))}</li><li>${icon("pin")}${lang === "en" ? `${site.officeCount} offices across Lanzarote` : `${site.officeCount} oficinas en Lanzarote`}</li><li>${icon("shield")}${lang === "en" ? `Local agency since ${site.foundingYear}` : `Agencia local desde ${site.foundingYear}`}</li></ul>
  </aside>
</article>
<div class="mobile-book"><span><small>${L.from}</small> <strong>${price(lang, t.price)}</strong></span><a class="btn" href="#book">${L.book}</a></div>
<section class="wrap section"><h2>${L.related}</h2>${cardGrid(lang, [...related, ...fill])}</section>`;
  page({
    lang, path: url(lang, "tour", t.slug), alt, ogType: "product", ogImage: hero?.src,
    title: `${t.name[lang]} | ${L.from} ${price(lang, t.price)} | Tickets Direct Lanzarote`,
    description: clip(`${summary(lang, t)} ${d}, ${L.from.toLowerCase()} ${price(lang, t.price)}. ${L.freeCancel}.`, 300),
    body,
    ld: [tourLd(lang, t), bc.ld, faqLd(faqs)],
  });
}

function categoryPage(lang, c) {
  const list = toursIn((t) => t.cats.includes(c.slug));
  if (!list.length || !c.path.en) return;
  const p = url(lang, "cat", c.slug);
  const alt = { en: c.path.en, es: c.path.es };
  const bc = breadcrumbs(lang, [[T[lang].allTours, url(lang, "tours")], [catName(lang, c), p]]);
  const h1 = c.h1?.[lang] || `${catName(lang, c)} ${lang === "en" ? "in Lanzarote 2026" : "en Lanzarote 2026"}`;
  const intro = c.intro?.[lang];
  const wpText = c.term?.description?.[lang];
  const meta = c.meta?.[lang] || clip(`${catName(lang, c)}: ${list.length} ${T[lang].results} ${lang === "en" ? "in Lanzarote from" : "en Lanzarote desde"} ${price(lang, Math.min(...list.map((t) => t.price)))}. ${T[lang].freeCancel}.`, 160);
  const body = `<div class="wrap">${bc.html}</div>
<section class="wrap section page-head"><p class="eyebrow">${icon(c.icon)}${esc(catName(lang, c))}</p><h1>${esc(h1)}</h1>${intro ? `<p class="lead">${esc(intro)}</p>` : ""}</section>
${combos.some((x) => x.c === c) ? `<section class="wrap"><p class="pills"><strong>${T[lang].fromResort}:</strong> ${combos.filter((x) => x.c === c).map((x) => `<a href="${comboUrl(lang, x.r, c)}">${esc(x.r.name)} (${x.list.length})</a>`).join("")}</p></section>` : ""}
<section class="wrap">${cardGrid(lang, list)}</section>
${wpText && plain(wpText).length > 200 ? `<section class="wrap section"><div class="prose prose-wrap">${wpText}</div></section>` : ""}
<section class="wrap section">${faqBlock(lang, c.faqs?.[lang])}</section>
<section class="wrap section"><h2>${T[lang].nav.activities}</h2><p class="pills">${mainCats.filter((x) => x.slug !== c.slug).map((x) => `<a href="${url(lang, "cat", x.slug)}">${esc(catName(lang, x))}</a>`).join("")}</p></section>`;
  page({ lang, path: p, alt: alt.es ? alt : { en: alt.en }, title: clip(h1, 70), description: meta, body, ld: [itemListLd(lang, list), bc.ld, faqLd(c.faqs?.[lang])], ogImage: list.find((t) => t.images.length)?.images[0].src });
}

function resortPage(lang, r) {
  const L = T[lang];
  const alt = altOf("resort", r.slug);
  const bc = breadcrumbs(lang, [[L.nav.resorts, url(lang, "offices")], [r.name, alt[lang]]]);
  const picks = r.picks.map((s) => tourBy[s]).filter(Boolean);
  const fromHere = toursIn((t) => t.resorts.includes(r.slug) && !picks.includes(t));
  const local = offices.filter((o) => o.resort === r.slug);
  const body = `<div class="wrap">${bc.html}</div>
<section class="wrap section page-head"><p class="eyebrow">${icon("pin")}${esc(r.name)}, Lanzarote</p><h1>${esc(r.h1[lang])}</h1><p class="lead">${esc(r.intro[lang])}</p></section>
<section class="wrap split">
  <div><h2>${lang === "en" ? `Our top picks from ${r.name}` : `Nuestras recomendaciones desde ${r.name}`}</h2>${cardGrid(lang, picks)}</div>
  <aside class="side"><h2>${L.distances}</h2><table class="dist"><tbody>${r.distances[lang].map(([a, b]) => `<tr><th scope="row">${esc(a)}</th><td>${esc(b)}</td></tr>`).join("")}</tbody></table>
  <h2>${L.officeHere}</h2>${officeList(lang, local)}</aside>
</section>
${combos.some((x) => x.r === r) ? `<section class="wrap section"><h2>${L.byActivity}</h2><p class="pills">${combos.filter((x) => x.r === r).map((x) => `<a href="${comboUrl(lang, r, x.c)}">${esc(catName(lang, x.c))} (${x.list.length})</a>`).join("")}</p></section>` : ""}
<section class="wrap section"><h2>${lang === "en" ? `All ${fromHere.length + picks.length} excursions with pickup in ${r.name}` : `Las ${fromHere.length + picks.length} excursiones con recogida en ${r.name}`}</h2>${cardGrid(lang, fromHere)}</section>
${C.pickupPoints.some((p) => p.resort === r.slug) ? `<section class="wrap section"><h2>${esc(L.collectionIn(r.name))}</h2>${pointsTable(lang, C.pickupPoints.filter((p) => p.resort === r.slug))}</section>` : ""}
<section class="wrap section">${faqBlock(lang, r.faqs[lang])}</section>`;
  page({ lang, path: alt[lang], alt, title: clip(r.h1[lang], 70), description: r.meta[lang], body, ld: [itemListLd(lang, [...picks, ...fromHere]), bc.ld, faqLd(r.faqs[lang]), ...local.filter((o) => o.streetAddress).map((o) => ({ "@context": "https://schema.org", ...officeLd(o) }))], ogImage: picks.find((t) => t.images.length)?.images[0].src });
}

function comboPage(lang, { r, c, list }) {
  const L = T[lang];
  const sorted = [...list].sort(byPopularity);
  const p = comboUrl(lang, r, c);
  const alt = { en: comboUrl("en", r, c), es: comboUrl("es", r, c) };
  const cn = catName(lang, c);
  const bc = breadcrumbs(lang, [[r.name, url(lang, "resort", r.slug)], [cn, p]]);
  const hrs = list.map((t) => t.hours).filter(Boolean);
  const durs = hrs.length ? `${dur(lang, list.find((t) => t.hours === Math.min(...hrs)))} – ${dur(lang, list.find((t) => t.hours === Math.max(...hrs)))}` : "";
  const cheapest = [...list].sort((a, b) => a.price - b.price)[0];
  const fam = list.filter((t) => t.tags.includes("family"));
  const local = offices.filter((o) => o.resort === r.slug);
  const faqs = lang === "en"
    ? [[`What is the cheapest ${cn.toLowerCase()} option from ${r.name}?`, `${cheapest.name.en}, from ${price("en", cheapest.price)}${unitLabel("en", cheapest) ? ` ${unitLabel("en", cheapest)}` : ""}.`], [`Do these tours pick up in ${r.name}?`, `Yes. All ${list.length} tours on this page offer pickup in ${r.name}; the exact point and time are on your e-ticket.`], ...(fam.length ? [[`Which are best for families?`, fam.slice(0, 3).map((t) => t.name.en).join(", ") + "."]] : [])]
    : [[`¿Cuál es la opción más barata de ${cn.toLowerCase()} desde ${r.name}?`, `${cheapest.name.es}, desde ${price("es", cheapest.price)}${unitLabel("es", cheapest) ? ` ${unitLabel("es", cheapest)}` : ""}.`], [`¿Estas excursiones recogen en ${r.name}?`, `Sí. Las ${list.length} excursiones de esta página tienen recogida en ${r.name}; el punto y la hora exactos van en tu e-ticket.`], ...(fam.length ? [[`¿Cuáles son mejores para familias?`, fam.slice(0, 3).map((t) => t.name.es).join(", ") + "."]] : [])];
  const body = `<div class="wrap">${bc.html}</div>
<section class="wrap section page-head"><p class="eyebrow">${icon(c.icon)}${esc(cn)} · ${icon("pin")}${esc(r.name)}</p><h1>${esc(L.comboH1(cn, r.name, list.length))}</h1><p class="lead">${esc(L.comboLead(cn, r.name, list.length, price(lang, cheapest.price), durs))}</p></section>
<section class="wrap">${cardGrid(lang, sorted)}</section>
<section class="wrap section split"><div>${faqBlock(lang, faqs)}</div><aside class="side"><h2>${L.officeHere}</h2>${officeList(lang, local)}</aside></section>
<section class="wrap section"><h2>${L.byActivity}</h2><p class="pills">${combos.filter((x) => x.r === r && x.c !== c).map((x) => `<a href="${comboUrl(lang, r, x.c)}">${esc(catName(lang, x.c))}</a>`).join("")}</p></section>`;
  page({ lang, path: p, alt, title: clip(L.comboH1(cn, r.name, list.length), 70), description: clip(L.comboLead(cn, r.name, list.length, price(lang, cheapest.price), durs), 158), body, ld: [itemListLd(lang, sorted), bc.ld, faqLd(faqs)], ogImage: sorted.find((t) => t.images.length)?.images[0].src });
}

function reelsPage(lang) {
  const L = T[lang];
  const alt = altOf("reels");
  const bc = breadcrumbs(lang, [[L.reelsNav, alt[lang]]]);
  const body = `<div class="wrap">${bc.html}</div>
<section class="wrap section page-head"><h1>${esc(L.reelsTitle)}</h1><p class="lead">${esc(L.reelsLead)}</p><p><a class="btn" href="${site.social.youtube}?sub_confirmation=1" target="_blank" rel="noopener">${icon("play")}${L.subscribe}</a></p><p class="pills">${Object.entries(site.social).filter(([k, v]) => v && ["instagram", "tiktok", "youtube"].includes(k)).map(([k, v]) => `<a href="${v}" target="_blank" rel="noopener">${k[0].toUpperCase() + k.slice(1)}</a>`).join("")}</p></section>
<section class="wrap"><div class="reels-grid">${reels.map((r) => reelCard(lang, r)).join("")}</div></section>`;
  page({ lang, path: alt[lang], alt, title: `${L.reelsTitle} | Tickets Direct Lanzarote`, description: L.reelsLead, body, ld: [bc.ld] });
}

function destinationPage(lang, d) {
  const L = T[lang];
  const p = destUrl(lang, d);
  const alt = d.path.es ? { en: d.path.en, es: d.path.es } : { en: d.path.en };
  const cur = d.curated;
  const list = toursIn((t) => t.destinations.includes(d.id));
  const bc = breadcrumbs(lang, [[L.nav.islands, url(lang, "destinations")], [d.name[lang], p]]);
  const h1 = cur?.h1[lang] || (lang === "en" ? `${d.name.en}, Lanzarote: Tours & Excursions 2026` : `${d.name.es}, Lanzarote: excursiones 2026`);
  const desc = d.description[lang] || d.description.en;
  const body = `<div class="wrap">${bc.html}</div>
<section class="wrap section page-head"><p class="eyebrow">${icon("pin")}${esc(d.name[lang])}</p><h1>${esc(h1)}</h1></section>
${cur ? `<section class="wrap split"><div><p class="lead">${esc(cur.intro[lang])}</p></div><aside class="side"><h2>${L.quickFacts}</h2><table class="dist"><tbody>${cur.facts[lang].map(([a, b]) => `<tr><th scope="row">${esc(a)}</th><td>${esc(b)}</td></tr>`).join("")}</tbody></table></aside></section>` : ""}
<section class="wrap section"><h2>${esc(L.toursTo(d.name[lang]))}</h2>${cardGrid(lang, list)}</section>
${desc && plain(desc).length > 120 ? `<section class="wrap section"><h2>${esc(L.aboutPlace(d.name[lang]))}</h2><div class="prose prose-wrap">${desc}</div></section>` : ""}`;
  const metaDesc = cur?.meta[lang] || clip(`${d.name[lang]}: ${list.length} ${L.results} ${lang === "en" ? "from" : "desde"} ${price(lang, Math.min(...list.map((t) => t.price)))}. ${plain(desc)}`, 158);
  page({
    lang, path: p, alt, title: clip(h1, 70), description: metaDesc, body, ogImage: list.find((t) => t.images.length)?.images[0].src,
    ld: [{ "@context": "https://schema.org", "@type": "TouristDestination", name: d.name[lang], description: clip(cur?.intro[lang] || plain(desc), 300), url: abs(p), containedInPlace: { "@type": "Place", name: "Lanzarote, Canary Islands, Spain" } }, itemListLd(lang, list), bc.ld],
  });
}

function destinationsIndex(lang) {
  const L = T[lang];
  const alt = altOf("destinations");
  const bc = breadcrumbs(lang, [[L.nav.islands, alt[lang]]]);
  const list = [...destinations].sort((a, b) => (b.curated ? 1 : 0) - (a.curated ? 1 : 0) || b.count - a.count);
  const body = `<div class="wrap">${bc.html}</div><section class="wrap section page-head"><h1>${L.destTitle}</h1><p class="lead">${L.destLead}</p></section>
<section class="wrap"><div class="grid places">${list.map((d) => destTile(lang, d)).join("")}</div></section>`;
  page({ lang, path: alt[lang], alt, title: `${L.destTitle} | Tickets Direct`, description: L.destLead, body, ld: [bc.ld] });
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
}

function guidesIndex(lang) {
  const L = T[lang];
  const alt = altOf("guide");
  const bc = breadcrumbs(lang, [[L.nav.guides, alt[lang]]]);
  const body = `<div class="wrap">${bc.html}</div><section class="wrap section page-head"><h1>${L.guidesTitle}</h1><p class="lead">${lang === "en" ? "Honest, practical advice from the people who sell Lanzarote's excursions every day." : "Consejos honestos y prácticos de quienes venden excursiones en Lanzarote cada día."}</p></section>
<section class="wrap"><div class="grid guides">${guides.map((g) => `<a class="guide" href="${url(lang, "guide", g.slug)}"><strong>${esc(g[lang].title)}</strong><span>${esc(g[lang].meta)}</span></a>`).join("")}</div></section>`;
  page({ lang, path: alt[lang], alt, title: `${L.guidesTitle} | Tickets Direct`, description: lang === "en" ? "Local guides to Lanzarote excursions: prices, cruise stops, windy days, families, winter and booking tips." : "Guías locales de excursiones en Lanzarote: precios, cruceros, días de viento, familias, invierno y consejos de reserva.", body, ld: [bc.ld] });
}

function toursIndex(lang) {
  const L = T[lang];
  const alt = altOf("tours");
  const bc = breadcrumbs(lang, [[L.allTours, alt[lang]]]);
  const sorted = [...tours].sort(byPopularity);
  const body = `<div class="wrap">${bc.html}</div>
<section class="wrap section page-head"><h1>${lang === "en" ? `All ${tours.length} Lanzarote Excursions 2026` : `Las ${tours.length} excursiones en Lanzarote 2026`}</h1><p class="lead">${lang === "en" ? `From ${price(lang, minPrice)}. Filter by activity, where you're staying, who you're travelling with or budget.` : `Desde ${price(lang, minPrice)}. Filtra por actividad, dónde te alojas, con quién viajas o presupuesto.`}</p></section>
<section class="wrap filters" id="filters" aria-label="Filters">
  <div class="chips" data-filter="tag">${Object.entries(L.filters).map(([k, v]) => `<button type="button" data-value="${k === "all" ? "" : k}"${k === "all" ? ' aria-pressed="true"' : ""}>${esc(v)}</button>`).join("")}</div>
  <div class="filter-row">
    <label><span>${L.nav.activities}</span><select data-filter="cat"><option value="">${L.catAny}</option>${mainCats.map((c) => `<option value="${c.slug}">${esc(catName(lang, c))}</option>`).join("")}</select></label>
    <label><span>${L.stay}</span><select data-filter="resort"><option value="">${L.resortAny}</option>${resorts.map((r) => `<option value="${r.slug}">${esc(r.name)}</option>`).join("")}</select></label>
    <label><span>${L.maxPrice}</span><select data-filter="max"><option value="">—</option>${[50, 70, 100, 150, 250].map((n) => `<option value="${n}">${price(lang, n)}</option>`).join("")}</select></label>
  </div>
  <p class="count" aria-live="polite"><span>${tours.length}</span> ${L.results}</p>
</section>
<section class="wrap" id="results">${cardGrid(lang, sorted)}<p class="empty" hidden>${L.noResults}</p></section>
<section class="wrap section"><h2>${lang === "en" ? "Prices at a glance" : "Precios de un vistazo"}</h2>${priceTable(lang)}</section>`;
  page({ lang, path: alt[lang], alt, title: lang === "en" ? `All ${tours.length} Lanzarote Excursions & Prices 2026 | Tickets Direct` : `Las ${tours.length} excursiones en Lanzarote y precios 2026 | Tickets Direct`, description: lang === "en" ? `Compare all ${tours.length} Lanzarote excursions: boat trips, Timanfaya, buggies, water sports, parks and island trips, with prices from ${price(lang, minPrice)}.` : `Compara las ${tours.length} excursiones en Lanzarote: barcos, Timanfaya, buggies, deportes acuáticos, parques y otras islas, desde ${price(lang, minPrice)}.`, body, ld: [itemListLd(lang, sorted), bc.ld] });
}

function officesPage(lang) {
  const L = T[lang];
  const alt = altOf("offices");
  const bc = breadcrumbs(lang, [[L.nav.offices, alt[lang]]]);
  const body = `<div class="wrap">${bc.html}</div>
<section class="wrap section page-head"><h1>${L.ourOffices}</h1><p class="lead">${esc(L.officesLead)}</p></section>
${resorts.map((r) => `<section class="wrap section"><h2><a href="${url(lang, "resort", r.slug)}">${esc(r.name)}</a></h2>${officeList(lang, offices.filter((o) => o.resort === r.slug))}</section>`).join("")}
${offices.some((o) => !resorts.find((r) => r.slug === o.resort)) ? `<section class="wrap section"><h2>${lang === "en" ? "Other offices" : "Otras oficinas"}</h2>${officeList(lang, offices.filter((o) => !resorts.find((r) => r.slug === o.resort)))}</section>` : ""}
<section class="wrap section">${trustStrip(lang)}</section>`;
  page({ lang, path: alt[lang], alt, title: `${L.ourOffices} | Costa Teguise, Puerto del Carmen, Playa Blanca`, description: L.officesLead, body, ld: [bc.ld, ...offices.filter((o) => o.streetAddress).map((o) => ({ "@context": "https://schema.org", ...officeLd(o) }))] });
}

function aboutPage(lang) {
  const L = T[lang];
  const alt = altOf("about");
  const bc = breadcrumbs(lang, [[L.nav.about, alt[lang]]]);
  const text = lang === "en"
    ? `<p>Tickets Direct Excursions Lanzarote is an excursion booking agency founded in ${site.foundingYear}. We grew out of ${site.heritage}, one of the best-known boat companies on the island, and today we sell ${tours.length} excursions: boat trips, island tours, buggies, water sports, parks and trips to La Graciosa, Lobos and Fuerteventura.</p>
<p>We only work in Lanzarote. We are the only excursion company that sells online and also has walk-in offices in all three main resorts (Costa Teguise, Puerto del Carmen and Playa Blanca), with ${site.officeCount} offices in total. You can book on the web at night and talk to us face to face the next morning.</p>
<h2>Our promises</h2>`
    : `<p>Tickets Direct Excursions Lanzarote es una agencia de excursiones fundada en ${site.foundingYear}. Nacimos de Líneas Marítimas Romero, una de las navieras más conocidas de la isla, y hoy vendemos ${tours.length} excursiones: barcos, excursiones por la isla, buggies, deportes acuáticos, parques y viajes a La Graciosa, Lobos y Fuerteventura.</p>
<p>Solo trabajamos en Lanzarote. Somos la única empresa de excursiones que vende online y además tiene oficinas en los tres grandes centros turísticos (Costa Teguise, Puerto del Carmen y Playa Blanca), con ${site.officeCount} oficinas en total. Puedes reservar en la web por la noche y hablar con nosotros en persona a la mañana siguiente.</p>
<h2>Nuestros compromisos</h2>`;
  const body = `<div class="wrap">${bc.html}</div><article class="wrap prose-wrap"><header class="page-head"><h1>${L.aboutTitle}</h1><p class="lead">${esc(L.whyLead)}</p></header><div class="prose">${text}</div>${trustStrip(lang)}<div class="prose"><h2>${L.ourOffices}</h2></div>${officeList(lang, offices)}</article>${reviewsBlock(lang)}`;
  page({ lang, path: alt[lang], alt, title: `${L.aboutTitle} | ${lang === "en" ? "Since" : "Desde"} ${site.foundingYear}`, description: clip(L.heritage, 160), body, ld: [bc.ld, { "@context": "https://schema.org", "@type": "AboutPage", url: abs(alt[lang]), about: { "@id": ORG_ID } }] });
}

function faqPage(lang) {
  const L = T[lang];
  const alt = altOf("faq");
  const bc = breadcrumbs(lang, [[L.faqTitle, alt[lang]]]);
  const all = [...categories.flatMap((c) => c.faqs?.[lang] || []), ...guides.flatMap((g) => g[lang].faqs)];
  const seen = new Set();
  const uniq = all.filter(([q]) => (seen.has(q) ? false : seen.add(q)));
  const body = `<div class="wrap">${bc.html}</div><section class="wrap section page-head"><h1>${L.faqTitle}</h1><p class="lead">${esc(L.contactLead)}</p></section><div class="wrap">${faqBlock(lang, uniq, false)}</div>`;
  page({ lang, path: alt[lang], alt, title: `${L.faqTitle} | Tickets Direct Lanzarote`, description: lang === "en" ? "Answers to the most common questions about Lanzarote excursions: boat trips, weather, cancellations, prices, kids and pickups." : "Respuestas a las preguntas más comunes sobre excursiones en Lanzarote: barcos, tiempo, cancelaciones, precios, niños y recogidas.", body, ld: [bc.ld, faqLd(uniq)] });
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
}

function appPage(lang) {
  const L = T[lang];
  const alt = altOf("app");
  const bc = breadcrumbs(lang, [[L.app.title, alt[lang]]]);
  const body = `<div class="wrap">${bc.html}</div>
<section class="wrap section page-head app-head"><img src="/assets/icons/icon-192.png" alt="" width="96" height="96"><div><h1>${esc(L.app.title)}</h1><p class="lead">${esc(L.app.lead)}</p><p><button class="btn" data-install hidden>${icon("download")}${esc(L.app.install)}</button></p></div></section>
<section class="wrap grid app-steps">
${L.app.steps.map(([h, items]) => `<article class="office"><h2>${esc(h)}</h2><ol>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ol></article>`).join("\n")}
</section>
<section class="wrap section"><h2>${esc(L.app.whyTitle)}</h2><ul class="ticks">${L.app.why.map((w) => `<li>${icon("check")}${esc(w)}</li>`).join("")}</ul></section>`;
  page({ lang, path: alt[lang], alt, title: `${L.app.title} | Tickets Direct Lanzarote`, description: L.app.lead, body, ld: [bc.ld, { "@context": "https://schema.org", "@type": "MobileApplication", name: "Tickets Direct Lanzarote", operatingSystem: "Android, iOS, Windows, macOS, ChromeOS", applicationCategory: "TravelApplication", offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" }, url: abs(alt[lang]), publisher: { "@id": ORG_ID } }] });
}

function notFound() {
  const L = T.en;
  page({ lang: "en", path: "/404.html", alt: null, noindex: true, title: `${L.notFound} | Tickets Direct`, description: L.notFoundLead, body: `<section class="wrap section page-head"><h1>${L.notFound}</h1><p class="lead">${L.notFoundLead}</p><p><a class="btn" href="${url("en", "tours")}">${L.allTours}</a> <a class="btn ghost" href="/es/">Español</a></p></section>` });
}

// ---------- installable app (PWA) ----------
function pwa() {
  for (const lang of LANGS) {
    const L = T[lang];
    write(`/manifest-${lang}.webmanifest`, JSON.stringify({
      id: "/",
      name: site.name,
      short_name: "Tickets Direct",
      description: L.app.lead,
      lang,
      dir: "ltr",
      start_url: `${url(lang, "home")}?source=app`,
      scope: "/",
      display: "standalone",
      display_override: ["window-controls-overlay", "standalone"],
      orientation: "any",
      background_color: "#f8f3ea",
      theme_color: "#0f4c5c",
      categories: ["travel", "lifestyle"],
      icons: [
        { src: "/assets/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/assets/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "/assets/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
      shortcuts: [
        { name: L.allTours, url: url(lang, "tours"), icons: [{ src: "/assets/icons/icon-192.png", sizes: "192x192" }] },
        { name: catName(lang, catBy["boat-trips"]), url: url(lang, "cat", "boat-trips"), icons: [{ src: "/assets/icons/icon-192.png", sizes: "192x192" }] },
        { name: L.nav.offices, url: url(lang, "offices"), icons: [{ src: "/assets/icons/icon-192.png", sizes: "192x192" }] },
      ],
      screenshots: [
        { src: "/assets/screens/wide.png", sizes: "1366x900", type: "image/png", form_factor: "wide" },
        { src: "/assets/screens/narrow.png", sizes: "390x844", type: "image/png", form_factor: "narrow" },
      ],
    }, null, 2));
  }
  const precache = ["/", "/es/", url("en", "app"), url("es", "app"), "/assets/styles.css", "/assets/app.js", "/assets/logo.svg", "/assets/icons/icon-192.png", "/data/tours-en.json", "/data/tours-es.json"];
  write("/sw.js", `// Generated by build.mjs. Network-first for pages (always fresh prices), cache-first for static assets.
const CACHE = "td-${BUILD_ID}";
const PRECACHE = ${JSON.stringify(precache)};
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const u = new URL(req.url);
  if (req.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api/")) return;
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then((hit) => hit || caches.match(u.pathname.startsWith("/es/") ? "/es/" : "/"))),
    );
    return;
  }
  if (u.pathname.startsWith("/assets/") || u.pathname.startsWith("/data/")) {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then((hit) => {
        const net = fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; });
        return hit || net;
      }),
    );
  }
});
`);
}

// ---------- machine-readable outputs ----------
function sitemap() {
  const seen = new Set();
  const entries = altMap.flatMap((alt) => LANGS.filter((l) => alt[l]).map((l) => [l, alt])).filter(([l, alt]) => (seen.has(alt[l]) ? false : seen.add(alt[l])));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.map(([l, alt]) => { const langs = LANGS.filter((x) => alt[x]); return `<url><loc>${abs(alt[l])}</loc><lastmod>${C.importedAt || UPDATED}</lastmod>${langs.length > 1 ? langs.map((x) => `<xhtml:link rel="alternate" hreflang="${x}" href="${abs(alt[x])}"/>`).join("") + `<xhtml:link rel="alternate" hreflang="x-default" href="${abs(alt.en)}"/>` : ""}</url>`; }).join("\n")}
</urlset>`;
  write("/sitemap.xml", xml);
}

function robots() {
  const aiBots = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot", "DuckAssistBot", "Meta-ExternalAgent"];
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
- Catalogue: ${tours.length} excursions from ${price("en", minPrice)}
- Booking: online with a deposit, balance paid on the day; free cancellation up to 24 hours before
- Support: 24h WhatsApp/phone ${site.phone}, ${site.email}; English and Spanish
- Website: ${SITE}/ (English) and ${SITE}/es/ (Spanish)`;
  const line = (t) => `- [${t.name.en}](${abs(url("en", "tour", t.slug))}): from ${price("en", t.price)}${unitLabel("en", t) ? ` ${unitLabel("en", t)}` : ""}${t.child ? ` (child ${price("en", t.child.price)})` : ""}, ${dur("en", t)}. ${summary("en", t)}`;
  write("/llms.txt", `# ${site.name}

> Local Lanzarote excursion agency since ${site.foundingYear}. The only excursion company that sells online and has walk-in offices in all three main resorts of Lanzarote. Prices below are current "from" prices in euros, imported ${C.importedAt}.

## Key facts
${facts}

## Excursions
${mainCats.map((c) => { const list = toursIn((t) => t.cat === c.slug); return list.length ? `### ${catName("en", c)}\n${list.map(line).join("\n")}` : ""; }).filter(Boolean).join("\n\n")}

## Guides
${guides.map((g) => `- [${g.en.title}](${abs(url("en", "guide", g.slug))}): ${g.en.meta}`).join("\n")}

## Resorts and destinations
${resorts.map((r) => `- [Excursions from ${r.name}](${abs(url("en", "resort", r.slug))})`).join("\n")}
${destinations.map((d) => `- [${d.name.en}](${abs(destUrl("en", d))})`).join("\n")}

## Optional
- [Full catalogue as JSON](${SITE}/data/tours-en.json)
- [Full text for LLMs](${SITE}/llms-full.txt)
- [Spanish site](${SITE}/es/)
`);
  const full = [
    `# ${site.name}: full reference\n\n${facts}\n`,
    ...[...tours].sort(byPopularity).map((t) => `## ${t.name.en}\nURL: ${abs(url("en", "tour", t.slug))}\nCategory: ${catName("en", catBy[t.cat])}\nPrice: from ${price("en", t.price)}${unitLabel("en", t) ? ` ${unitLabel("en", t)}` : ""}${t.child ? `; child (${t.child.ages}) ${price("en", t.child.price)}` : ""}\nDuration: ${dur("en", t)}\nPickup from: ${t.pickups.map((id) => C.locTerm[id]?.name.en).filter(Boolean).join(", ") || "on request"}\n\n${plain(t.overview.en)}\n${t.includes.en.length ? `\nIncluded:\n${t.includes.en.map((x) => `- ${x}`).join("\n")}\n` : ""}${t.faqs.en.length ? `\nFAQ:\n${t.faqs.en.map(([q, a]) => `Q: ${q}\nA: ${a}`).join("\n")}\n` : ""}`),
    ...guides.map((g) => `## FAQ: ${g.en.title}\n${g.en.faqs.map(([q, a]) => `Q: ${q}\nA: ${a}`).join("\n\n")}\n`),
  ].join("\n");
  write("/llms-full.txt", full);
}

function dataFiles() {
  for (const lang of LANGS) {
    const data = {
      lang,
      tours: [...tours].sort(byPopularity).map((t) => ({ slug: t.slug, url: url(lang, "tour", t.slug), name: t.name[lang], cat: t.cat, cats: t.cats, catName: catName(lang, catBy[t.cat]), price: t.price, priceLabel: price(lang, t.price), unit: unitLabel(lang, t) || null, child: t.child, hours: t.hours, duration: dur(lang, t), tags: t.tags, resorts: t.resorts, destinations: t.destinations, summary: summary(lang, t), image: t.images[0]?.thumb || null })),
      resorts: resorts.map((r) => ({ slug: r.slug, name: r.name, url: url(lang, "resort", r.slug), picks: r.picks })),
      guides: guides.map((g) => ({ slug: g.slug, title: g[lang].title, url: url(lang, "guide", g.slug) })),
    };
    write(`/data/tours-${lang}.json`, JSON.stringify(data));
  }
}

function assets() {
  fs.cpSync(path.join(here, "src/assets"), path.join(OUT, "assets"), { recursive: true });
}

// ---------- checks ----------
function checks() {
  const problems = [];
  for (const r of resorts) for (const s of r.picks) if (!tourBy[s]) problems.push(`resort ${r.slug}: unknown tour ${s}`);
  for (const g of guides) for (const lang of LANGS) for (const [, list] of g[lang].body.matchAll(/\[\[tours:([^\]]+)\]\]/g)) for (const s of list.split(",")) if (!tourBy[s.trim()]) problems.push(`guide ${g.slug}/${lang}: unknown tour ${s}`);
  for (const c of categories) if (!c.path.en && tours.some((t) => t.cats.includes(c.slug))) problems.push(`category ${c.slug}: no WordPress URL`);
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  const unverified = offices.filter((o) => !o.verified).length;
  if (unverified) console.warn(`warning: ${unverified} office(s) in src/data/offices.json are not verified yet`);
  if (offices.length < site.officeCount) console.warn(`warning: offices.json lists ${offices.length} offices but site.json says ${site.officeCount}`);
  const noEs = tours.filter((t) => !t.hasEs).length;
  if (noEs) console.warn(`warning: ${noEs} tour(s) have no Spanish version`);
}

// ---------- run ----------
checks();
fs.rmSync(OUT, { recursive: true, force: true });
assets();
for (const lang of LANGS) {
  homePage(lang);
  toursIndex(lang);
  tours.filter((t) => lang === "en" || t.hasEs).forEach((t) => tourPage(lang, t));
  categories.forEach((c) => (lang === "en" || c.path.es) && categoryPage(lang, c));
  resorts.forEach((r) => resortPage(lang, r));
  combos.forEach((x) => comboPage(lang, x));
  if (reels.length) reelsPage(lang);
  destinationsIndex(lang);
  destinations.forEach((d) => (lang === "en" || d.path.es) && destinationPage(lang, d));
  guidesIndex(lang);
  guides.forEach((g) => guidePage(lang, g));
  officesPage(lang);
  aboutPage(lang);
  faqPage(lang);
  contactPage(lang);
  appPage(lang);
}
notFound();
pwa();
sitemap();
robots();
llms();
dataFiles();
console.log(`built ${pages.length} pages (${tours.length} tours) into ${path.relative(process.cwd(), OUT) || "dist"} for ${SITE}`);
