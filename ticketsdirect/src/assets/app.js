(() => {
  const TD = window.TD || { lang: "en" };
  const ES = TD.lang === "es";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // ---- shared formatting + cart store (on-site booking) ----
  const locale = ES ? "es-ES" : TD.lang === "de" ? "de-DE" : "en-GB";
  const money = (n) => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", minimumFractionDigits: n % 1 ? 2 : 0 }).format(n);
  const fmtDate = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "");
  const CART_KEY = "td_cart_v1";
  const cartRead = () => { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } };
  const cartWrite = (items) => { try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch {} paintCartBadge(); };
  const cartUnits = (items = cartRead()) => items.reduce((n, it) => n + (it.pax || []).reduce((m, p) => m + p.qty, 0), 0);
  const itemTotal = (it) => (it.pax || []).reduce((s, p) => s + p.qty * p.price, 0);
  const paintCartBadge = () => {
    const n = cartUnits();
    $$("[data-cart-count]").forEach((b) => { b.textContent = n; b.hidden = !n; });
  };

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
    const addBtn = $("[data-book]", bk);
    const pkgIndex = () => (pkgSel ? Number(pkgSel.value) : 0);
    const paxBox = () => $(`.bk-pax[data-pkg="${pkgIndex()}"]`, bk);
    let avail = null;
    let capacityNow = Infinity; // seats left on the selected date
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
      capacityNow = Infinity;
      if (!avail || !dateSel.value) return;
      const pkgId = pkgSel ? pkgSel.selectedOptions[0].dataset.id : null;
      const p = avail.packages.find((x) => String(x.id) === String(pkgId)) || avail.packages[0];
      const d = p?.dates.find((x) => x.date === dateSel.value);
      if (!d) return;
      if (typeof d.capacity === "number") capacityNow = d.capacity;
      $$(".bk-row", paxBox()).forEach((r) => {
        const hit = d.prices.find((x) => x.label === r.dataset.label);
        if (hit && hit.price > 0) {
          r.dataset.price = hit.price;
          $("b", r).textContent = money(hit.price);
        }
      });
    };

    // Build a cart line from the current form state (null if nothing chosen).
    const currentItem = () => {
      const pax = $$(".bk-row", paxBox())
        .map((r) => ({ label: r.dataset.label, qty: Number($("output", r).textContent) || 0, price: Number(r.dataset.price) }))
        .filter((p) => p.qty > 0);
      if (!pax.length) return null;
      const dateOpt = dateSel.value ? dateSel.selectedOptions[0] : null;
      return {
        id: bk.dataset.trip,
        slug: bk.dataset.slug,
        name: bk.dataset.name,
        url: bk.dataset.url,
        unit: bk.dataset.unit || "",
        deposit,
        pkgId: pkgSel ? pkgSel.selectedOptions[0].dataset.id : null,
        pkgName: pkgSel ? pkgSel.selectedOptions[0].textContent : "",
        date: dateSel.value || "",
        dateLabel: dateOpt ? dateOpt.textContent : "",
        pax,
      };
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
      const units = $$(".bk-row", paxBox()).reduce((n, r) => n + (Number($("output", r).textContent) || 0), 0);
      const over = units > capacityNow;
      total.textContent = sum
        ? `${t.total}: ${money(sum)}${deposit ? ` · ${t.depositToday}: ${money(Math.round(sum * deposit) / 100)} (${t.onDay})` : ""}`
        : "";
      if (addBtn) {
        addBtn.classList.toggle("disabled", over);
        addBtn.setAttribute("aria-disabled", over ? "true" : "false");
        addBtn.title = over ? t.soldOut : "";
      }
      const date = dateSel.value ? dateSel.selectedOptions[0].textContent : "";
      const opt = pkgSel ? pkgSel.selectedOptions[0].textContent : "";
      const name = bk.dataset.name;
      const msg = ES
        ? `¡Hola! Quiero reservar "${name}"${date ? ` el ${date}` : ""}${opt ? ` (${opt})` : ""}: ${parts.join(", ")}. Total ${money(sum)}.`
        : `Hi! I'd like to book "${name}"${date ? ` on ${date}` : ""}${opt ? ` (${opt})` : ""}: ${parts.join(", ")}. Total ${money(sum)}.`;
      wa.href = `https://wa.me/${TD.wa}?text=${encodeURIComponent(msg)}`;
    };

    // Add to booking → cart (localStorage) → booking page.
    addBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      const item = currentItem();
      if (!item) return toast(t.pickFirst);
      if (!dateSel.disabled && dateSel.closest("label") && !dateSel.closest("label").hidden && !item.date) return toast(t.pickFirst);
      const units = item.pax.reduce((n, p) => n + p.qty, 0);
      if (units > capacityNow) return toast(t.soldOut);
      const cart = cartRead();
      cart.push({ ...item, addedAt: Date.now() });
      cartWrite(cart);
      toast(t.added);
      location.href = TD.book;
    });

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
    fetch(`${TD.avail || "/data/availability/"}${bk.dataset.trip}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        avail = d;
        fillDates();
        update();
      })
      // Availability file missing (old build / offline): the calculator still works, just without dates.
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

  // ---- toast ----
  let toastEl;
  const toast = (msg) => {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "td-toast";
      toastEl.setAttribute("role", "status");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove("show"), 2600);
  };

  paintCartBadge();

  // ---- booking cart + checkout (on-site, request-and-confirm) ----
  (() => {
    const mount = $("#cart-app");
    if (!mount) return;
    const C = TD.cart || {};
    const wa = mount.dataset.wa || TD.wa;
    const body = $(".co-body", mount);
    const stepsEl = $(".co-steps", mount);
    const emptyHtml = body.innerHTML; // server-rendered empty state (keeps the correct tours link)
    const e2 = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    let customer = {};
    let lastBooking = null;

    const depositOf = (it) => Math.round(itemTotal(it) * (Number(it.deposit) || 0)) / 100;
    const grand = (items) => items.reduce((s, it) => s + itemTotal(it), 0);
    const depositSum = (items) => items.reduce((s, it) => s + depositOf(it), 0);
    const setStep = (n) => { if (stepsEl) { stepsEl.hidden = false; $$("li", stepsEl).forEach((li) => li.classList.toggle("on", Number(li.dataset.step) <= n)); } };
    const makeRef = () => { const d = new Date(), p = (n) => String(n).padStart(2, "0"); return `TD-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`; };

    const bookingText = (items, ref) => {
      const head = ES ? `Reserva ${ref}` : TD.lang === "de" ? `Buchung ${ref}` : `Booking ${ref}`;
      const lines = items.map((it) => {
        const pax = it.pax.map((p) => `${p.qty}×${p.label} (${money(p.price)})`).join(", ");
        return `• ${it.name}${it.pkgName ? ` [${it.pkgName}]` : ""}\n  ${C.when}: ${it.dateLabel || "—"}\n  ${C.travellers}: ${pax}\n  ${C.total}: ${money(itemTotal(it))}`;
      }).join("\n");
      const out = [head, lines, `${C.total}: ${money(grand(items))} · ${C.depositNow}: ${money(depositSum(items))}`, `${C.lead}: ${customer.name} · ${customer.phone} · ${customer.email}`];
      if (customer.hotel) out.push(`${C.hotel}: ${customer.hotel}`);
      if (customer.pickup) out.push(`${C.pickup}: ${customer.pickup}`);
      if (customer.notes) out.push(`${C.notes} ${customer.notes}`);
      return out.join("\n");
    };

    const renderCart = () => {
      const items = cartRead();
      if (!items.length) { body.innerHTML = emptyHtml; if (stepsEl) stepsEl.hidden = true; return; }
      setStep(1);
      body.innerHTML = `<div class="co-grid">
        <ul class="co-items">${items.map((it, i) => `<li>
          <div class="ci-main"><a href="${e2(it.url)}"><strong>${e2(it.name)}</strong></a>${it.pkgName ? `<span class="ci-pkg">${e2(it.pkgName)}</span>` : ""}
            <p class="ci-meta">${e2(C.when)}: ${e2(it.dateLabel || "—")}</p>
            <ul class="ci-pax">${it.pax.map((p) => `<li>${p.qty} × ${e2(p.label)} <b>${money(p.qty * p.price)}</b></li>`).join("")}</ul></div>
          <div class="ci-side"><b>${money(itemTotal(it))}</b><button type="button" class="link" data-remove="${i}">${e2(C.remove)}</button></div></li>`).join("")}</ul>
        <aside class="co-sum"><h2>${e2(C.summary)}</h2>
          <div class="row"><span>${e2(C.total)}</span><b>${money(grand(items))}</b></div>
          <div class="row"><span>${e2(C.depositNow)}</span><b>${money(depositSum(items))}</b></div>
          <div class="row muted"><span>${e2(C.balance)}</span><span>${money(grand(items) - depositSum(items))}</span></div>
          <button type="button" class="btn block" data-go-details>${e2(C.continue)}</button>
          <p class="co-note">${e2(C.payNote)}</p></aside></div>`;
    };

    const renderDetails = () => {
      const items = cartRead();
      if (!items.length) return renderCart();
      setStep(2);
      body.innerHTML = `<form class="co-details" novalidate>
        <div class="co-grid2">
          <label><span>${e2(C.name)} *</span><input name="name" required autocomplete="name" value="${e2(customer.name || "")}"></label>
          <label><span>${e2(C.phone)} *</span><input name="phone" required autocomplete="tel" inputmode="tel" value="${e2(customer.phone || "")}"></label>
          <label><span>${e2(C.email)} *</span><input name="email" type="email" required autocomplete="email" value="${e2(customer.email || "")}"></label>
          <label><span>${e2(C.hotel)}</span><input name="hotel" placeholder="${e2(C.hotelPh)}" value="${e2(customer.hotel || "")}"></label>
          <label class="full"><span>${e2(C.pickup)}</span><input name="pickup" value="${e2(customer.pickup || "")}"></label>
          <label class="full"><span>${e2(C.notes)}</span><textarea name="notes" rows="3" placeholder="${e2(C.notesPh)}">${e2(customer.notes || "")}</textarea></label>
        </div>
        <div class="co-actions"><button type="button" class="btn ghost" data-back>${e2(C.backToCart)}</button><button type="submit" class="btn">${e2(C.place)}</button></div>
        <p class="co-note">${e2(C.payNote)}</p></form>`;
    };

    const renderDone = (ref, items) => {
      setStep(3);
      const text = bookingText(items, ref);
      const subject = ES ? `Reserva ${ref}` : TD.lang === "de" ? `Buchung ${ref}` : `Booking ${ref}`;
      const waHref = `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;
      const mailHref = `mailto:${TD.email || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
      body.innerHTML = `<div class="co-done"><div class="co-tick" aria-hidden="true">✓</div>
        <h2>${e2(C.okTitle)}</h2><p class="co-ref">${e2(C.ref)}: <b>${e2(ref)}</b></p><p class="lead">${e2(C.okLead)}</p>
        <p class="co-cta"><a class="btn wa" href="${waHref}" target="_blank" rel="noopener">${e2(C.waSend)}</a><a class="btn ghost" href="${mailHref}">${e2(C.emailSend)}</a><button type="button" class="btn ghost" data-download>${e2(C.download)}</button></p>
        <p><a class="link" data-new href="${TD.book}">${e2(C.newBooking)}</a></p></div>`;
    };

    body.addEventListener("click", (e) => {
      const rm = e.target.closest("[data-remove]");
      if (rm) { const c = cartRead(); c.splice(Number(rm.dataset.remove), 1); cartWrite(c); renderCart(); return; }
      if (e.target.closest("[data-go-details]")) return renderDetails();
      if (e.target.closest("[data-back]")) return renderCart();
      if (e.target.closest("[data-new]")) { renderCart(); return; }
      if (e.target.closest("[data-download]") && lastBooking) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([JSON.stringify(lastBooking, null, 2)], { type: "application/json" }));
        a.download = `${lastBooking.ref}.json`;
        a.click();
      }
    });

    body.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.target;
      customer = { name: f.name.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), hotel: f.hotel.value.trim(), pickup: f.pickup.value.trim(), notes: f.notes.value.trim() };
      if (!customer.name || !customer.phone || !customer.email) return toast(C.required);
      const items = cartRead();
      if (!items.length) return renderCart();
      const ref = makeRef();
      lastBooking = { ref, lang: TD.lang, createdAt: new Date().toISOString(), customer, items, total: grand(items), deposit: depositSum(items), currency: "EUR" };
      try { localStorage.setItem("td_last_booking", JSON.stringify(lastBooking)); } catch {}
      // A server endpoint can be POSTed here later; for now staff receive the booking via WhatsApp/email/copy.
      cartWrite([]);
      renderDone(ref, items);
      mount.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    renderCart();
  })();

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

// Discount banner: remember dismissal per code, so a new code shows again.
(function () {
  var bar = document.querySelector(".promo-bar");
  if (!bar) return;
  var key = "td_promo_" + (bar.getAttribute("data-promo") || "");
  try { if (localStorage.getItem(key)) bar.hidden = true; } catch (e) {}
  var x = bar.querySelector("[data-promo-x]");
  if (x) x.addEventListener("click", function () { bar.hidden = true; try { localStorage.setItem(key, "1"); } catch (e) {} });
})();
