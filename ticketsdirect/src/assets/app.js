(() => {
  const TD = window.TD || { lang: "en" };
  const ES = TD.lang === "es";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // ---- installable app ----
  if ("serviceWorker" in navigator) {
    addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }
  let installEvent = null;
  const installBtns = () => $$("[data-install]");
  addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installEvent = e;
    installBtns().forEach((b) => (b.hidden = false));
  });
  addEventListener("appinstalled", () => installBtns().forEach((b) => (b.hidden = true)));
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-install]");
    if (!b || !installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice;
    installEvent = null;
    installBtns().forEach((x) => (x.hidden = true));
  });

  // ---- motion: reveal on scroll, counters, header shadow ----
  document.documentElement.classList.add("js");
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const io = "IntersectionObserver" in window && !calm
    ? new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))), { rootMargin: "0px 0px -8% 0px" })
    : null;
  $$(".rv").forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 70}ms`;
    io ? io.observe(el) : el.classList.add("in");
  });
  const countUp = (el) => {
    const to = Number(el.dataset.count);
    const from = Number(el.dataset.from || 0);
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 1400);
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (!calm && "IntersectionObserver" in window) {
    const co = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && (countUp(e.target), co.unobserve(e.target))));
    $$("[data-count]").forEach((el) => co.observe(el));
  }
  const head = $(".site-head");
  addEventListener("scroll", () => head?.classList.toggle("scrolled", scrollY > 10), { passive: true });

  // ---- swipe rails ----
  $$("[data-rail]").forEach((r) => {
    const track = $(".rail-track", r);
    const prev = $(".rail-btn.prev", r);
    const next = $(".rail-btn.next", r);
    const sync = () => {
      prev.disabled = track.scrollLeft < 8;
      next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 8;
    };
    const by = (d) => track.scrollBy({ left: d * track.clientWidth * 0.85, behavior: calm ? "auto" : "smooth" });
    prev.addEventListener("click", () => by(-1));
    next.addEventListener("click", () => by(1));
    track.addEventListener("scroll", sync, { passive: true });
    sync();
  });

  // ---- reels: play YouTube in a lightbox; other platforms open in a new tab ----
  const dlg = $("#reel-dialog");
  if (dlg && dlg.showModal) {
    const frame = $(".reel-frame", dlg);
    const close = () => {
      frame.innerHTML = "";
      dlg.close();
    };
    document.addEventListener("click", (e) => {
      const a = e.target.closest(".reel[data-yt]");
      if (!a) return;
      e.preventDefault();
      const f = document.createElement("iframe");
      f.src = `https://www.youtube-nocookie.com/embed/${a.dataset.yt}?autoplay=1&rel=0&playsinline=1`;
      f.title = a.dataset.title || "Video";
      f.allow = "autoplay; encrypted-media; picture-in-picture";
      f.allowFullscreen = true;
      frame.replaceChildren(f);
      $("[data-out]", dlg).href = a.href;
      const book = $("[data-book]", dlg);
      book.hidden = !a.dataset.book;
      if (a.dataset.book) book.href = a.dataset.book;
      dlg.showModal();
    });
    $("[data-close]", dlg).addEventListener("click", close);
    dlg.addEventListener("click", (e) => e.target === dlg && close());
    dlg.addEventListener("cancel", () => (frame.innerHTML = ""));
  }

  // ---- navigation ----
  const menuBtn = $(".menu-btn");
  const nav = $("#nav");
  menuBtn?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open);
  });
  $$(".dd > button").forEach((b) =>
    b.addEventListener("click", () => {
      const dd = b.parentElement;
      const open = dd.classList.toggle("open");
      b.setAttribute("aria-expanded", open);
    }),
  );

  // ---- tour filters (/tours/) ----
  const filters = $("#filters");
  if (filters) {
    const cards = $$("#results .card");
    const grid = $("#results .cards");
    const state = { tag: "", cat: "", resort: "", max: "" };
    const params = new URLSearchParams(location.search);
    for (const k of Object.keys(state)) if (params.get(k)) state[k] = params.get(k);
    let picks = [];
    const loadPicks = async () => {
      if (!state.resort) return (picks = []);
      try {
        const data = await (await fetch(TD.data)).json();
        picks = data.resorts.find((r) => r.slug === state.resort)?.picks || [];
      } catch {
        picks = [];
      }
    };
    const has = (list, v) => list.split(" ").includes(v);
    const apply = () => {
      let n = 0;
      for (const c of cards) {
        const ok =
          (!state.tag || has(c.dataset.tags, state.tag)) &&
          (!state.cat || has(c.dataset.cat, state.cat)) &&
          (!state.resort || has(c.dataset.resorts, state.resort)) &&
          (!state.max || Number(c.dataset.price) <= Number(state.max));
        c.hidden = !ok;
        if (ok) n++;
      }
      // Our recommended picks for the chosen resort float to the top.
      [...cards].sort((a, b) => (picks.includes(b.dataset.slug) ? 1 : 0) - (picks.includes(a.dataset.slug) ? 1 : 0)).forEach((c) => grid.appendChild(c));
      $(".count span", filters).textContent = n;
      $(".empty").hidden = n > 0;
      const q = new URLSearchParams(Object.entries(state).filter(([, v]) => v));
      history.replaceState(null, "", q.toString() ? `?${q}` : location.pathname);
    };
    $$(".chips button", filters).forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.value === state.tag));
      b.addEventListener("click", () => {
        state.tag = b.dataset.value;
        $$(".chips button", filters).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        apply();
      });
    });
    $$("select[data-filter]", filters).forEach((s) => {
      s.value = state[s.dataset.filter];
      s.addEventListener("change", async () => {
        state[s.dataset.filter] = s.value;
        if (s.dataset.filter === "resort") await loadPicks();
        apply();
      });
    });
    loadPicks().then(apply);
  }

  // ---- booking panel: live dates, travellers, total and deposit ----
  const bk = $(".bk");
  if (bk) {
    const t = JSON.parse(bk.dataset.i18n);
    const pkgSel = $('select[name="pkg"]', bk);
    const dateSel = $('select[name="date"]', bk);
    const total = $(".bk-total", bk);
    const wa = $("[data-wa]", bk);
    const deposit = Number(bk.dataset.deposit) || 0;
    const locale = ES ? "es-ES" : "en-GB";
    const money = (n) => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", minimumFractionDigits: n % 1 ? 2 : 0 }).format(n);
    const pkgIndex = () => (pkgSel ? Number(pkgSel.value) : 0);
    const paxBox = () => $(`.bk-pax[data-pkg="${pkgIndex()}"]`, bk);
    let avail = null;
    bk.classList.add("ready");

    const fillDates = () => {
      if (!avail) return;
      const pkgId = pkgSel ? pkgSel.selectedOptions[0].dataset.id : null;
      const p = avail.packages.find((x) => String(x.id) === String(pkgId)) || avail.packages[0];
      const dates = p ? p.dates : [];
      dateSel.innerHTML = "";
      const add = (value, text) => dateSel.add(new Option(text, value));
      if (!dates.length) {
        add("", t.noDates);
        dateSel.disabled = true;
        return;
      }
      dateSel.disabled = false;
      add("", t.pickDate);
      for (const d of dates) {
        const label = new Date(`${d.date}T12:00:00`).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
        add(d.date, d.times.length ? `${label} · ${d.times.join(", ")}` : label);
      }
    };

    // Prices can vary by date: when one is chosen, use that date's prices for each traveller type.
    const applyDatePrices = () => {
      if (!avail || !dateSel.value) return;
      const pkgId = pkgSel ? pkgSel.selectedOptions[0].dataset.id : null;
      const p = avail.packages.find((x) => String(x.id) === String(pkgId)) || avail.packages[0];
      const d = p?.dates.find((x) => x.date === dateSel.value);
      if (!d) return;
      $$(".bk-row", paxBox()).forEach((r) => {
        const hit = d.prices.find((x) => x.label === r.dataset.label);
        if (hit && hit.price > 0) {
          r.dataset.price = hit.price;
          $("b", r).textContent = money(hit.price);
        }
      });
    };

    const update = () => {
      $$(".bk-pax", bk).forEach((b, i) => (b.hidden = i !== pkgIndex()));
      applyDatePrices();
      let sum = 0;
      const parts = [];
      $$(".bk-row", paxBox()).forEach((r) => {
        const n = Number($("output", r).textContent) || 0;
        sum += n * Number(r.dataset.price);
        if (n) parts.push(`${n} × ${r.dataset.label}`);
      });
      total.textContent = sum ? `${t.total}: ${money(sum)}${deposit ? ` · ${t.depositToday}: ${money(Math.round(sum * deposit) / 100)} (${t.onDay})` : ""}` : "";
      const date = dateSel.value ? dateSel.selectedOptions[0].textContent : "";
      const opt = pkgSel ? pkgSel.selectedOptions[0].textContent : "";
      const name = bk.dataset.name;
      const msg = ES
        ? `¡Hola! Quiero reservar "${name}"${date ? ` el ${date}` : ""}${opt ? ` (${opt})` : ""}: ${parts.join(", ")}. Total ${money(sum)}.`
        : `Hi! I'd like to book "${name}"${date ? ` on ${date}` : ""}${opt ? ` (${opt})` : ""}: ${parts.join(", ")}. Total ${money(sum)}.`;
      wa.href = `https://wa.me/${TD.wa}?text=${encodeURIComponent(msg)}`;
    };

    bk.addEventListener("click", (e) => {
      const b = e.target.closest(".bk-step button");
      if (!b) return;
      const out = $("output", b.parentElement);
      out.textContent = Math.max(0, Math.min(30, (Number(out.textContent) || 0) + Number(b.dataset.d)));
      update();
    });
    pkgSel?.addEventListener("change", () => {
      fillDates();
      update();
    });
    dateSel.addEventListener("change", update);
    fetch(`/api/availability?id=${bk.dataset.trip}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        avail = d;
        fillDates();
        update();
      })
      // Static preview or WordPress unreachable: the calculator still works, just without dates.
      .catch(() => (dateSel.closest("label").hidden = true));
    update();
  }

  // ---- video: load YouTube only when asked (keeps pages fast) ----
  $$(".yt").forEach((b) =>
    b.addEventListener("click", () => {
      const f = document.createElement("iframe");
      f.src = `https://www.youtube-nocookie.com/embed/${b.dataset.yt}?autoplay=1&rel=0`;
      f.title = b.getAttribute("aria-label") || "Video";
      f.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
      f.allowFullscreen = true;
      f.className = "yt-frame";
      b.replaceWith(f);
    }),
  );

  // ---- assistant ----
  const chat = $("#td-chat");
  const fab = $("#td-chat-open");
  if (!chat || !fab) return;
  const log = $(".chat-log", chat);
  const form = $(".chat-form", chat);
  const input = $("input", form);
  const convo = [];
  let catalog = null;
  let aiAvailable = true;

  const store = {
    get() {
      try { return JSON.parse(sessionStorage.getItem("td_chat") || "[]"); } catch { return []; }
    },
    set(v) {
      try { sessionStorage.setItem("td_chat", JSON.stringify(v.slice(-20))); } catch {}
    },
  };

  const openChat = () => {
    chat.hidden = false;
    fab.hidden = true;
    input.focus();
    if (!catalog) fetch(TD.data).then((r) => r.json()).then((d) => (catalog = d)).catch(() => {});
  };
  fab.addEventListener("click", openChat);
  $(".chat-x", chat).addEventListener("click", () => {
    chat.hidden = true;
    fab.hidden = false;
  });

  const addMsg = (who, text) => {
    const div = document.createElement("div");
    div.className = `msg ${who}`;
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  };
  const addCards = (slugs) => {
    if (!catalog || !slugs?.length) return;
    const box = document.createElement("div");
    box.className = "msg-cards";
    for (const s of slugs) {
      const t = catalog.tours.find((x) => x.slug === s);
      if (!t) continue;
      const a = document.createElement("a");
      a.className = "mini";
      a.href = t.url;
      a.innerHTML = `<span></span><strong></strong>`;
      a.querySelector("span").textContent = t.name;
      const small = document.createElement("small");
      small.textContent = `${t.duration} · ${t.catName}`;
      a.querySelector("span").appendChild(small);
      a.querySelector("strong").textContent = `${ES ? "Desde" : "From"} ${t.priceLabel}`;
      box.appendChild(a);
    }
    log.appendChild(box);
    log.scrollTop = log.scrollHeight;
  };

  // Restore the conversation within this browser tab.
  for (const m of store.get()) {
    convo.push(m);
    addMsg(m.role === "user" ? "user" : "bot", m.content);
  }

  async function askAI() {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    try {
      const r = await fetch(TD.api, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lang: TD.lang, messages: convo.slice(-12) }),
        signal: ctrl.signal,
      });
      if (!r.ok) throw new Error(String(r.status));
      return await r.json();
    } finally {
      clearTimeout(timer);
    }
  }

  // Instant local recommender: works offline and when the AI endpoint isn't deployed.
  function localAnswer(text) {
    const q = text.toLowerCase();
    const rules = [
      [/barco|boat|catamar|crucero(?! ?ist)|cruise(?! ?(ship|passenger))|sail|velero|dolphin|delf/, { cat: "boat-trips" }],
      [/buggy|off.?road|todoterreno|polaris|can.?am/, { cat: "buggy-tours" }],
      [/bus|autob|coach|volcan|timanfaya|cave|cueva|jameos|grand tour|highlight/, { cat: "bus-tours" }],
      [/jet ?ski|moto de agua|parasail|parascend|water ?sport|acu[aá]tic|banana|donut/, { cat: "water-sports" }],
      [/submarin|dive|buceo|bautismo|snorkel/, { cat: "underwater" }],
      [/rancho|texas|water ?park|aqualava|aquapark|parque acu|sea ?lion|le[oó]n marino/, { cat: "parks" }],
      [/night|show|dinner|cena|noche|espect[aá]culo|drag|western/, { cat: "nightlife" }],
      [/private|privad|charter|alquiler de barco|boat hire/, { cat: "private" }],
      [/whale|ballena/, { cat: "boat-trips" }],
      [/fuerteventura|corralejo|ferry/, { cat: "ferries-islands" }],
      [/pack|deal|discount|descuento|oferta|ahorr|save/, { tag: "pack" }],
      [/kid|child|family|famil|niñ|bebe|beb[eé]|toddler/, { tag: "family" }],
      [/couple|romantic|pareja|rom[aá]ntic|honeymoon|luna de miel/, { tag: "couples" }],
      [/wind|rain|viento|lluvia|cancel/, { tag: "rainy-day" }],
      [/adrenal|adventure|aventura|extreme/, { tag: "adventure" }],
      [/graciosa/, { place: 296 }],
      [/lobos/, { place: 321 }],
      [/market|mercadillo|teguise market/, { place: 317 }],
      [/timanfaya|volcan/, { place: 319 }],
      [/papagayo/, { place: 314 }],
    ];
    const want = { cats: new Set(), tags: new Set(), places: new Set() };
    for (const [re, v] of rules) if (re.test(q)) {
      if (v.cat) want.cats.add(v.cat);
      if (v.tag) want.tags.add(v.tag);
      if (v.place) want.places.add(v.place);
    }
    const m = q.match(/(?:under|below|less than|max|menos de|hasta|por debajo de)?\s*€?\s*(\d{2,3})\s*(?:€|eur|euros?)?/);
    const max = m && /under|below|less|max|menos|hasta|debajo|€|eur/.test(q) ? Number(m[1]) : null;
    const resort = catalog?.resorts.find((r) => q.includes(r.name.toLowerCase()));
    const cruise = /cruise (ship|passenger)|crucerist|vengo en crucero|on a cruise|cruise port|en crucero/.test(q);

    const tours = catalog?.tours || [];
    const scored = tours
      .filter((t) => !max || t.price <= max)
      .map((t) => {
        let s = 0;
        if (t.cats.some((c) => want.cats.has(c))) s += 3;
        for (const tag of want.tags) if (t.tags.includes(tag)) s += 2;
        for (const p of want.places) if (t.destinations.includes(p)) s += 4;
        if (resort?.picks.includes(t.slug)) s += 1.5;
        if (resort && !t.resorts.includes(resort.slug)) s -= 2;
        if (cruise && t.hours && t.hours <= 5 && t.cat === "bus-tours") s += 4;
        return [s, t];
      })
      .sort((a, b) => b[0] - a[0] || a[1].price - b[1].price);
    const anyMatch = scored.length && scored[0][0] > 0;
    const top = (anyMatch ? scored.filter(([s]) => s > 0) : scored.filter(([, t]) => tours.indexOf(t) < 3)).slice(0, 3).map(([, t]) => t.slug);

    let reply;
    if (!tours.length) reply = ES ? "Ahora mismo no puedo cargar el catálogo. Escríbenos por WhatsApp y te ayudamos al momento." : "I can't load the catalogue right now. Message us on WhatsApp and we'll help you straight away.";
    else if (cruise) reply = ES ? "Para una escala de crucero recomendamos excursiones de medio día (unas 5 horas). Dinos tu hora de embarque por WhatsApp y confirmamos que encaja:" : "For a cruise stop we recommend half-day tours (about 5 hours). Send us your all-aboard time on WhatsApp and we'll confirm it fits:";
    else if (anyMatch) reply = ES ? `Estas son mis recomendaciones${max ? ` por menos de ${max} €` : ""}${resort ? ` si te alojas en ${resort.name}` : ""}:` : `Here are my top picks${max ? ` under €${max}` : ""}${resort ? ` for guests staying in ${resort.name}` : ""}:`;
    else reply = ES ? "Estas son las tres excursiones más populares. Cuéntame con quién viajas o qué te apetece y afino la recomendación:" : "These are our three most popular excursions. Tell me who you're travelling with or what you fancy and I'll narrow it down:";
    if (resort) reply += ES ? `\n\nTenemos oficina en ${resort.name} por si prefieres reservar en persona.` : `\n\nWe also have an office in ${resort.name} if you'd rather book in person.`;
    return { reply, tours: top };
  }

  async function send(text) {
    text = text.trim();
    if (!text) return;
    addMsg("user", text);
    convo.push({ role: "user", content: text });
    input.value = "";
    const typing = addMsg("bot typing", ES ? "Escribiendo…" : "Typing…");
    if (!catalog) {
      try { catalog = await (await fetch(TD.data)).json(); } catch {}
    }
    let res = null;
    if (aiAvailable) {
      try {
        res = await askAI();
      } catch {
        aiAvailable = false; // endpoint missing or failing: use the local recommender for the rest of the visit
      }
    }
    if (!res?.reply) res = localAnswer(text);
    typing.remove();
    addMsg("bot", res.reply);
    addCards(res.tours);
    if (res.handoff) {
      const a = document.createElement("a");
      a.className = "btn wa small";
      a.href = `https://wa.me/${TD.wa}`;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = ES ? "Continuar por WhatsApp" : "Continue on WhatsApp";
      log.appendChild(a);
    }
    convo.push({ role: "assistant", content: res.reply });
    store.set(convo);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    send(input.value);
  });
  $$(".chat-chips button", chat).forEach((b) => b.addEventListener("click", () => send(b.textContent)));
})();
