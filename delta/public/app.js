/* DELTA — browser client. Renders the screens from a role-scoped snapshot served by
   /api/state; every change goes through POST /api/act/:name, where the server enforces
   the rules. Shared rules (charts, statuses) come from /shared/domain.js. */
'use strict';

const DAY = 864e5;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uniq = a => [...new Set(a)];
const { addMonths, positionOf, statusOf, rangeSummary, evaluate, STAGES, stageOf, stageLabel } = Domain;
let S = null, fetchedAt = 0, chatLog = [];

/* ───────────────────────── time & money ───────────────────────── */
const now = () => S.now + (Date.now() - fetchedAt);
const fmtDate = t => t ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtDT = t => t ? new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
const money = n => '£' + Number(n).toFixed(2).replace(/\.00$/, '');
const todayKey = () => new Date(now()).toISOString().slice(0, 10);

/* ───────────────────────── server ───────────────────────── */
async function load() {
  const r = await fetch('/api/state', { credentials: 'same-origin' });
  if (!r.ok) throw new Error('Could not load DELTA (' + r.status + ')');
  S = await r.json(); fetchedAt = Date.now();
}
/* Calls a server action, then refreshes the snapshot and re-renders (unless told not to). */
async function act(name, body = {}, { refresh = true } = {}) {
  let out;
  try {
    const r = await fetch('/api/act/' + encodeURIComponent(name), { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Delta': '1' }, body: JSON.stringify(body) });
    out = await r.json().catch(() => ({ error: 'Unexpected response from server' }));
    if (!r.ok) { toast(out.error || 'Something went wrong.'); return null; }
  } catch { toast('Network problem — please check your connection.'); return null; }
  if (out.redirect && !out.redirect.startsWith('#')) { location.href = out.redirect; return out; } // e.g. Stripe Checkout
  if (refresh && !out.quiet) await load();
  if (out.toast) toast(out.toast);
  if (out.download) download(out.download.name, out.download.text);
  if (out.open) window.open(out.open, '_blank', 'noopener');
  const target = out.go || (out.redirect && out.redirect.slice(1));
  if (target) go(target); else if (refresh && !out.quiet) render();
  return out;
}
const fileToB64 = f => new Promise((res, rej) => { if (!f || !f.size) return res(null); const r = new FileReader(); r.onload = () => res({ name: f.name, mime: f.type, b64: String(r.result).split(',')[1] }); r.onerror = rej; r.readAsDataURL(f); });

/* ───────────────────────── state helpers ───────────────────────── */
const user = id => S.users.find(u => u.id === id);
const me = () => S.session ? user(S.session) : null;
const members = () => S.users.filter(u => u.role === 'member');
const latestTest = u => u.tests[u.tests.length - 1] || null;
const reviewTest = u => u.tests.find(t => t.status === 'safety_review') || latestTest(u);
const publishedTests = u => u.tests.filter(t => t.status === 'published');
const memberStatus = u => Domain.memberStatus(u, now(), S.settings);
const hasAccess = u => Domain.hasAccess(u, now(), S.settings);
const STATUS_BADGE = { active: ['Active', 'b-ok'], renewal_due: ['Renewal due', 'b-warn'], expired: ['Paused — expired', 'b-bad'], none: ['Not joined', 'b-mute'] };
const badge = st => { const [t, c] = STATUS_BADGE[st] || [st, 'b-mute']; return `<span class="badge ${c}">${t}</span>`; };
function pipelineHTML(u, t) {
  const st = stageOf(u, t);
  const idx = STAGES.findIndex(s => s[0] === st);
  return `<div class="pipeline" aria-label="Progress">${STAGES.map(([k, l], i) => {
    if (k === 'validation_needed' && st !== k) return '';
    if (k === 'safety_review' && st !== k && !(t && t.wasReviewed)) return '';
    return `<span class="${i < idx ? 'done' : i === idx ? 'now' : ''}">${l}</span>`;
  }).join('')}</div>`;
}
const fileLink = (fid, label) => fid ? `<a href="/api/files/${esc(fid)}" class="sm">${esc(label)}</a>` : '';

/* ───────────────────────── charts (port of Grok/Recharts charts to SVG) ───────────────────────── */
function rangeChart(ms, title) {
  const data = ms.filter(m => m.value != null).map(m => ({ ...m, position: positionOf(m), status: statusOf(m) }));
  const pos = data.map(d => d.position);
  const lo = Math.floor(Math.min(0, ...pos) - 15), hi = Math.ceil(Math.max(100, ...pos) + 15);
  const W = 640, H = 270, L = 40, B = 26, T = 8, R = 8, ih = H - B - T, iw = W - L - R;
  const y = v => T + ih - (v - lo) / (hi - lo) * ih;
  const bw = Math.min(42, iw / data.length * .55);
  const ticks = []; const step = (hi - lo) > 160 ? 50 : 25; for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
  const bars = data.map((d, i) => {
    const cx = L + iw / data.length * (i + .5), y0 = y(0), y1 = y(d.position);
    const top = Math.min(y0, y1), h = Math.max(1, Math.abs(y1 - y0));
    const col = d.status === 'Inside range' ? 'var(--gold-soft)' : d.status === 'Below range' ? '#8fb3ff' : 'var(--bad)';
    return `<g><title>${esc(`${d.label}: result ${d.value} ${d.unit}. Laboratory band ${d.low}–${d.high} ${d.unit}. ${d.status}. Drawn at ${d.position} on a scale where 0 is the low end and 100 the high end.`)}</title>
      <rect x="${cx - bw / 2}" y="${top}" width="${bw}" height="${h}" rx="4" fill="${col}"/>
      <text x="${cx}" y="${H - 8}" text-anchor="middle" font-size="12" fill="var(--muted)">${esc(d.name)}</text>
      <text x="${cx}" y="${(d.position >= 0 ? top : top + h) + (d.position >= 0 ? -5 : 13)}" text-anchor="middle" font-size="10.5" fill="var(--fg)">${d.value}</text></g>`;
  }).join('');
  return `<figure class="card p4 chart" role="group" aria-label="${esc(title || 'Mineral range chart')}">
    <figcaption><h3 class="gold">${esc(title || 'Where each mineral sits in its lab range')}</h3><p class="sm muted mt1">${esc(rangeSummary(ms.filter(m => m.value != null)))}</p></figcaption>
    <svg viewBox="0 0 ${W} ${H}" class="mt4" role="img" aria-label="Bar chart of each mineral's position within its laboratory band">
      ${ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--border)"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--muted)">${v}</text>`).join('')}
      <rect x="${L}" y="${y(100)}" width="${iw}" height="${y(0) - y(100)}" fill="var(--gold)" fill-opacity=".14"/>
      ${bars}
    </svg>
    <div class="legend"><span><i class="sw" style="background:rgba(212,175,55,.3)"></i>Shaded band = laboratory range (0 low end, 100 high end)</span><span><i class="sw" style="background:var(--gold-soft)"></i>Inside</span><span><i class="sw" style="background:#8fb3ff"></i>Below</span><span><i class="sw" style="background:var(--bad)"></i>Above</span></div>
    <p class="xs muted mt2">Read the shaded band first. A bar inside it is within the laboratory range for that mineral. A bar under the band is lower than the range; a bar over it is higher. Minerals use different units, so the axis compares position in range, not raw milligrams. Hover or tap a bar for the actual number.</p>
  </figure>`;
}
function progressChart(snaps) {
  if (snaps.length < 2) return '';
  const names = snaps[0].minerals.map(m => m.name);
  const rows = snaps.map(s => Object.fromEntries(s.minerals.map(m => [m.name, positionOf(m)])));
  const all = rows.flatMap(r => Object.values(r));
  const lo = Math.min(0, Math.floor(Math.min(...all) / 10) * 10 - 10), hi = Math.max(140, Math.ceil(Math.max(...all) / 10) * 10 + 10);
  const W = 640, H = 270, L = 40, B = 26, T = 8, R = 16, ih = H - B - T, iw = W - L - R;
  const x = i => L + (snaps.length === 1 ? iw / 2 : iw * i / (snaps.length - 1));
  const y = v => T + ih - (v - lo) / (hi - lo) * ih;
  const cols = ['var(--gold)', 'var(--gold-soft)', 'var(--fg)', 'var(--muted)', 'var(--gold)', 'var(--fg)'];
  const ticks = []; for (let v = Math.ceil(lo / 20) * 20; v <= hi; v += 20) ticks.push(v);
  const lines = names.map((n, k) => `<g><title>${esc(snaps[0].minerals[k].label)}</title><polyline fill="none" stroke="${cols[k % 6]}" stroke-width="2" ${k >= 4 ? 'stroke-dasharray="5 4"' : ''} points="${rows.map((r, i) => `${x(i)},${y(r[n])}`).join(' ')}"/>${rows.map((r, i) => `<circle cx="${x(i)}" cy="${y(r[n])}" r="3" fill="${cols[k % 6]}"><title>${esc(`${snaps[i].label} — ${snaps[0].minerals[k].label}: ${r[n]}`)}</title></circle>`).join('')}</g>`).join('');
  return `<figure class="card p4 chart"><figcaption><h3 class="gold">Progress across tests</h3><p class="sm muted mt1">Each line is one mineral. The line rises when that mineral moves up through its laboratory range, and falls when it moves down. 0 is the low end of the range and 100 is the high end. This chart is for one client only.</p></figcaption>
    <svg viewBox="0 0 ${W} ${H}" class="mt4" role="img" aria-label="Line chart of mineral positions across tests">
      ${ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--border)"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--muted)">${v}</text>`).join('')}
      <rect x="${L}" y="${y(100)}" width="${iw}" height="${y(0) - y(100)}" fill="var(--gold)" fill-opacity=".1"/>
      ${snaps.map((s, i) => `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" font-size="12" fill="var(--muted)">${esc(s.label)}</text>`).join('')}
      ${lines}
    </svg>
    <div class="legend">${names.map((n, k) => `<span><i class="sw" style="background:${cols[k % 6]}"></i>${esc(snaps[0].minerals[k].label)}</span>`).join('')}</div>
    <p class="xs muted mt2">Left to right is time. A line that climbs toward the shaded band is moving into range from below. A line that drops into the band is coming down from above.</p></figure>`;
}
const snapsOf = u => publishedTests(u).map((t, i) => ({ label: `Test ${i + 1}`, minerals: t.minerals }));

/* ───────────────────────── layout ───────────────────────── */
const logo = (cls = '') => `<img src="brand/logo.jpg" alt="DELTA logo" width="88" height="88" class="logo ${cls}">`;
const isStaff = u => u && u.role !== 'member';
function header() {
  const u = me(); const path = location.hash.slice(1) || '/';
  const a = (to, label, cls = '') => `<a href="#${to}" class="${cls} ${path === to || (to !== '/' && path.startsWith(to + '/')) ? 'active' : ''}">${label}</a>`;
  return `<header class="site"><div class="container">
    <a class="brand" href="#/">${logo()}<div><div class="t1">DELTA</div><div class="t2">Analysis · Intelligence · Method</div></div></a>
    <button class="menu-btn" data-act="menu" aria-expanded="false" aria-controls="mainnav">Menu</button>
    <nav class="main" id="mainnav" aria-label="Main">
      ${a('/how-it-works', 'How it works')}${a('/pillars', 'Six Pillars')}${a('/awakening', 'Awakening')}${a('/podcast', 'Podcast')}${a('/mineral-man', 'Mineral Man')}${a('/partners', 'Partners')}${a('/faq', 'FAQs')}
      ${u ? (isStaff(u) ? a('/admin', 'Admin', 'strong') : '') + a('/portal', 'My Portal', 'strong') : a('/login', 'Sign in') + a('/join', 'Join', 'strong')}
    </nav></div></header>`;
}
function footer() {
  return `<footer class="site"><div class="cols">
    <div><a class="brand" href="#/">${logo()}<div><div class="t1">DELTA</div><div class="t2">Awakening Human Potential</div></div></a></div>
    <div><b class="gold sm">Explore</b><a href="#/how-it-works">How DELTA works</a><a href="#/analysis">Analysis</a><a href="#/intelligence">Intelligence</a><a href="#/pillars">Method — six pillars</a><a href="#/awakening">Awakening</a></div>
    <div><b class="gold sm">Listen & watch</b><a href="#/podcast">The DELTA Podcast</a><a href="#/mineral-man">Meet Mineral Man</a><a href="#/partners">Partner Collective</a></div>
    <div><b class="gold sm">Help</b><a href="#/about">About & contact</a><a href="#/faq">FAQs</a><a href="#/legal">Privacy, terms & disclaimers</a><a href="#/legal">Cookie choices</a></div>
  </div><div class="base">DELTA · Analysis · Intelligence · Method · Awakening Human Potential<br>DELTA is an educational wellbeing service. Hair Tissue Mineral Analysis is not a standalone diagnostic tool, and nothing here is medical advice, diagnosis or treatment.</div></footer>`;
}
function demobar() {
  if (!S.demo) return '';
  const u = me();
  return `<div class="demobar"><div class="container">
    <span><b>Demo mode</b> · payments: ${S.payments === 'stripe' ? 'Stripe' : 'test'} · email: ${S.mail === 'smtp' ? 'SMTP' : 'logged'}</span>
    <span>Signed in: <b>${u ? esc(u.name) + ' (' + u.role + ')' : 'visitor'}</b></span>
    <span>Demo date: <b>${fmtDate(now())}</b>${S.clockDays ? ` (+${S.clockDays}d)` : ''}</span>
    <button data-act="clock" data-days="30">+30 days</button><button data-act="clock" data-days="90">+90 days</button>${S.clockDays ? '<button data-act="clock" data-days="0">Back to today</button>' : ''}
    <span class="sp"></span><a href="/dev/mailbox" target="_blank" rel="noopener" style="color:var(--gold)">Dev mailbox</a><a href="#/login" style="color:var(--gold)">Switch user</a><button data-act="reset">Reset demo</button></div></div>`;
}
function subnav(items, counts = {}) {
  const path = location.hash.slice(1);
  return `<nav class="subnav" aria-label="Section"><div class="container">${items.map(([to, l]) => `<a href="#${to}" class="${path === to ? 'active' : ''}">${l}${counts[to] ? `<span class="count">${counts[to]}</span>` : ''}</a>`).join('')}</div></nav>`;
}
const portalNav = () => subnav([['/portal', 'Overview'], ['/report', 'My report'], ['/learn', 'Six pillars'], ['/awakening', 'Awakening'], ['/podcast', 'Podcast'], ['/mineral-man', 'Mineral Man'], ['/laughology', 'LAUGHOLOGY'], ['/community', 'Community'], ['/partners', 'Partners'], ['/account', 'Account']], { '/account': me()?.inbox.filter(n => !n.read).length });
function adminNav() {
  const tests = members().flatMap(u => u.tests.map(t => ({ u, t })));
  const c = {
    '/admin/exceptions': tests.filter(x => x.t.status === 'validation_needed').length,
    '/admin/safety': tests.filter(x => x.t.status === 'safety_review').length,
    '/admin/reports': tests.filter(x => x.t.status === 'ready_to_publish').length,
    '/admin/voice': S.voiceNotes.filter(v => v.status === 'requested').length,
    '/admin/moderation': S.laughs.filter(l => l.status === 'pending').length + S.posts.filter(p => p.reported).length,
  };
  return subnav([['/admin', 'Dashboard'], ['/admin/members', 'Members'], ['/admin/upload', 'Lab upload'], ['/admin/exceptions', 'Exceptions'], ['/admin/safety', 'Safety'], ['/admin/reports', 'Reports'], ['/admin/analyses', 'Client charts'], ['/admin/voice', 'Voice notes'], ['/admin/lessons', 'Lessons'], ['/admin/content', 'Content'], ['/admin/moderation', 'Moderation'], ['/admin/partners', 'Partners'], ['/admin/rules', 'Rules'], ['/admin/settings', 'Settings'], ['/admin/audit', 'Audit log'], ['/admin/assistant', 'AI Assistant'], ['/portal', 'Member Portal']].filter(([to]) => to === '/portal' || canArea(to)), c);
}
const page = (inner, cls = 'wide') => `<main id="main" tabindex="-1" class="page"><div class="${cls}">${inner}</div></main>`;
const back = (to, l) => `<a href="#${to}" class="sm muted" style="text-decoration:none">← ${l}</a>`;
const lockNote = () => `<span class="xs muted">🔒 Members</span>`;

/* ───────────────────────── public pages ───────────────────────── */
const CARDS = [
  { title: 'Analysis', body: 'A qualifying mineral test, clear sample steps, and your results in one place.', image: 'brand/nourish.jpg', alt: 'A plate of vegetables and protein', to: '/analysis' },
  { title: 'Intelligence', body: 'A plain-language chart that shows where each mineral sits in its laboratory range.', image: 'brand/ground.jpg', alt: 'Feet standing on morning grass', to: '/intelligence' },
  { title: 'Method', body: 'Six pillars for food, space, nature, movement, release and rest.', image: 'brand/move.jpg', alt: 'A person walking a tree-lined path', to: '/pillars' },
];
const R = {};
R['/'] = () => `<main id="main">
  <section class="hero"><img src="brand/space.jpg" alt=""><div class="shade"></div><div class="container">
    <div class="rise">${logo('')}</div>
    <div class="rise d1 kicker">Awakening Human Potential</div>
    <h1 class="rise d2">From Analysis to Awakening</h1>
    <p class="rise d3 lead">One purchase. Your mineral test, a chart you can read, and six months inside a calmer way of living.</p>
    <div class="rise d4 cta"><a href="#/join" class="btn lg">Join the DELTA Experience</a><a href="#/how-it-works" class="plain">How it works</a></div>
  </div></section>
  <section class="band"><div class="container grid md3">${CARDS.map((c, i) => `<a href="#${c.to}" class="card flush rise d${i + 1}"><div class="photo" style="height:12rem;border-radius:0"><img src="${c.image}" alt="${esc(c.alt)}" loading="lazy"></div><div class="body"><h3 class="gold" style="font-size:1.25rem;font-weight:300">${c.title}</h3><p class="muted mt2">${c.body}</p></div></a>`).join('')}</div></section>
  <section class="container grid md2" style="align-items:center;padding-bottom:4rem">
    <div class="photo rise" style="height:20rem"><img src="brand/rest.jpg" alt="A quiet bedroom prepared for rest" loading="lazy"></div>
    <div class="rise d2"><h2 style="font-size:1.9rem;font-weight:300">A gentler daily rhythm</h2><p class="lg muted mt4">Food, a clearer room, time outside, a walk, a laugh, and a real evening. The pillars are practices, not a medical plan.</p><a href="#/pillars" class="mt6" style="display:inline-block;font-weight:600;text-decoration:none">See the six pillars</a></div>
  </section>
  <section class="band"><div class="container grid md2" style="align-items:start">
    <div><div class="kicker">One DELTA Experience</div><h2 class="mt3" style="font-size:1.9rem;font-weight:300">Everything is included</h2>
      <p class="muted mt4">There is one package — not a test plus a subscription plus add-ons. A qualifying mineral test gives you six months of full access. Order a repeat test before then and six more months are added on to your current end date, so early renewals never lose time.</p>
      <a href="#/join" class="btn mt6">Join for ${money(S.settings.price)}</a> <span class="xs muted">Placeholder price — set by the founder in admin.</span></div>
    <div class="card hl"><ul class="sm" style="margin:0;padding-left:1.1rem;line-height:2">
      <li>Hair mineral test kit and laboratory analysis</li><li>Your Mineral Intelligence chart and plain-English summary</li><li>A safety-screened proposed programme</li><li>Six months of the six pillars, Awakening, the DELTA Podcast and Meet Mineral Man</li><li>LAUGHOLOGY, community groups and the Partner Collective</li><li class="muted">Optional: a personal practitioner voice note (${money(S.settings.voicePrice)})</li></ul></div>
  </div></section>
  <section class="band"><div class="container"><div class="flex between"><h2 style="font-size:1.6rem;font-weight:300">Latest from the DELTA Podcast</h2><a href="#/podcast">All episodes</a></div>
    <div class="grid md3 mt6">${S.episodes.filter(e => !e.archived).slice(0, 3).map(episodeCard).join('')}</div></div></section>
</main>`;

R['/how-it-works'] = () => page(`${back('/', 'Home')}
  <img src="brand/move.jpg" alt="A morning walk" class="rise mt6" style="height:14rem;width:100%;object-fit:cover;border-radius:1rem">
  <h1 class="mt4">How DELTA Works</h1>
  <ol class="steps">${['Purchase the DELTA Experience', 'Complete your intake and safety questions', 'Receive sample preparation instructions', 'Send your hair sample to our laboratory', 'Results are checked, processed and published to your portal', 'Read your Mineral Intelligence summary and proposed programme', 'Explore the six pillars, Awakening content and optional upgrades', 'Retest within six months to renew — early renewals keep every remaining day']
    .map((s, i) => `<li><span class="n">${i + 1}</span><span class="t">${s}</span></li>`).join('')}</ol>
  <div class="card hl mt6 sm"><b>Optional:</b> a practitioner voice note explaining your report or answering a few questions — bought only if you want it. It isn't needed for your standard package.</div>
  <a href="#/join" class="btn mt6">Join the DELTA Experience</a>`, 'narrow');

R['/analysis'] = () => page(`${back('/', 'Home')}<h1 class="mt4">Analysis</h1>
  <p class="lg muted mt4">Hair Tissue Mineral Analysis (HTMA) measures mineral levels in a small sample of hair, taken from close to the scalp.</p>
  <div class="grid md2 mt8"><div class="card"><h2 class="gold">What it measures</h2><p class="sm muted mt2">Nutrient minerals such as calcium, magnesium, sodium, potassium, zinc and copper, some key ratios between them, and selected toxic elements.</p></div>
  <div class="card"><h2 class="gold">Its limits</h2><p class="sm muted mt2">HTMA is not a standalone diagnostic tool. Results can be affected by hair treatments and sampling. We use it for education and as a starting point — not to diagnose or treat any condition.</p></div></div>
  <h2 class="mt8">Taking your sample</h2>
  <ol class="steps">${['Wash hair with a plain shampoo 24 hours before sampling (no conditioner).', 'Cut a small sample from the nape of the neck, close to the scalp.', 'Place it in the provided envelope and post it to our laboratory.', 'We update your portal once the sample is received and results are ready.'].map((s, i) => `<li><span class="n">${i + 1}</span><span class="t">${s}</span></li>`).join('')}</ol>
  <a href="#/intelligence" class="btn ghost mt4">See an example report</a>`, 'mid');

R['/intelligence'] = () => {
  const ex = MINERALS.map(m => ({ ...m, value: DEMO_RESULT[m.name] }));
  return page(`${back('/', 'Home')}<h1 class="mt4">Intelligence</h1>
  <p class="lg muted mt4">Your results become a chart you can read and a plain-English summary — prepared automatically using DELTA's approved, version-controlled rules, and checked for safety before any personal supplement guidance is shown.</p>
  <div class="mt8">${rangeChart(ex, 'Example — where each mineral sits in its lab range')}</div>
  <div class="card mt6"><h2 class="gold">Example dashboard</h2><div class="grid md2 mt4">
    <div class="inner"><div class="label">Patterns</div><p class="sm muted mt1">${esc(rangeSummary(ex))}</p></div>
    <div class="inner"><div class="label">Next step</div><p class="sm muted mt1">Start with REST — Restore & Renew, then BODY lessons on mineral-rich food.</p></div></div>
    <p class="xs muted mt4">Example data only. Reference bands shown are placeholders pending the chosen laboratory's intervals.</p></div>`, 'mid');
};

R['/pillars'] = () => page(`${back('/', 'Home')}
  <h1 class="rise mt6" style="font-size:2.25rem">The Six DELTA Pillars</h1>
  <p class="lg muted mt2">Included with every membership. Educational practices, not a treatment plan.</p>
  <div class="grid md2 mt10">${PILLARS.map((p, i) => `<a href="#/pillars/${p.id}" class="card flush rise d${i % 5 + 1}"><div class="photo" style="height:11rem;border-radius:0"><img src="${p.image}" alt="${esc(p.alt)}" loading="lazy"></div><div class="body"><div class="sm gold" style="font-weight:600">Pillar ${p.n}</div><h2 class="mt1" style="font-size:1.5rem;font-weight:300">${p.name[0] + p.name.slice(1).toLowerCase()}</h2><p class="muted mt2">${p.short}</p></div></a>`).join('')}</div>
  <div class="card hl mt8 center"><p>Plus <a href="#/awakening">Awakening</a> — a dedicated space for consciousness, presence and meaning that runs through all six pillars.</p></div>`);

function pillarPage(id) {
  const p = PILLARS.find(x => x.id === id); if (!p) return notFound();
  const u = me(), access = hasAccess(u) && u;
  const featured = S.lessons.find(l => l.id === id);
  const vids = S.videos.filter(v => v.pillar === id && !v.archived);
  const eps = S.episodes.filter(e => e.topics.some(t => t.toLowerCase() === id) && !e.archived);
  const partners = S.partners.filter(pt => pt.active && ((id === 'body' && pt.cat.startsWith('Supplements')) || (id === 'ground' && pt.cat.startsWith('Grounding')) || (['move', 'rest'].includes(id) && pt.cat.startsWith('Movement')) || (id === 'environment' && pt.cat.startsWith('Grounding'))));
  return page(`${back('/pillars', 'Six Pillars')}
  <div class="photo mt6" style="height:15rem"><img src="${p.image}" alt="${esc(p.alt)}"></div>
  <div class="sm gold mt6" style="font-weight:600">Pillar ${p.n}</div><h1>${p.name} <span class="muted" style="font-size:1.2rem">— ${p.tag}</span></h1>
  <p class="lg muted mt4">${esc(p.summary)}</p>${p.note ? `<p class="sm mt2 gold">${esc(p.note)}</p>` : ''}
  ${featured ? `<div class="card hl mt6"><div class="label">Featured lesson</div><h2 class="mt1">${esc(featured.title)}</h2><p class="sm muted mt2">${esc(featured.body)}</p></div>` : ''}
  <h2 class="mt8">Lessons</h2>
  <div class="stack mt4">${p.lessons.map((l, i) => {
    const done = access && u.lessonsDone.includes(`${id}:${i}`);
    return `<div class="card p4 flex between"><div><div class="xs muted">Lesson ${i + 1} · video · audio guide · notes</div><div>${esc(l)}</div></div>${access ? (done ? '<span class="xs gold">Marked done</span>' : `<button class="btn ghost xs" data-act="lesson-done" data-key="${id}:${i}">Mark done</button>`) : lockNote()}</div>`;
  }).join('')}</div>
  ${id === 'release' ? `<div class="card hl mt6 flex between"><div><h2>LAUGHOLOGY</h2><p class="sm muted mt1">Humour as a way in to RELEASE — jokes, funny videos and stories from members.</p></div><a href="#/laughology" class="btn">Open LAUGHOLOGY</a></div>` : ''}
  ${vids.length ? `<h2 class="mt8">Meet Mineral Man videos</h2><div class="grid md3 mt4">${vids.map(videoCard).join('')}</div>` : ''}
  ${eps.length ? `<h2 class="mt8">Related podcast episodes</h2><div class="grid md2 mt4">${eps.map(episodeCard).join('')}</div>` : ''}
  ${partners.length ? `<h2 class="mt8">From the Partner Collective</h2><p class="xs muted mt1">Commercial partners are shown separately from DELTA's teaching and from your personal recommendations.</p><div class="grid md3 mt4">${partners.map(partnerCard).join('')}</div>` : ''}
  <p class="xs muted mt8">Educational material only. It does not treat trauma or any medical condition. Choose the variation that suits you and stop if anything feels wrong.</p>
  ${access ? '' : '<a href="#/join" class="btn mt4">Join to unlock every lesson</a>'}`, 'mid');
}

R['/awakening'] = () => {
  const u = me(), access = hasAccess(u) && u;
  const conv = S.episodes.filter(e => e.topics.includes('Awakening') && !e.archived);
  return `${u ? portalNav() : ''}` + page(`<div class="center"><div class="kicker">Awakening</div><h1 class="mt3">Explore consciousness, presence and meaning</h1>
  <p class="lg muted mt4">Awakening runs through every part of DELTA — it isn't a seventh pillar. It reflects the founder's own journey and invites you to explore at your own pace. It is inclusive and non-denominational, and it doesn't ask you to adopt any belief.</p></div>
  <div class="grid md2 mt10" style="align-items:center"><div class="photo" style="height:16rem"><img src="brand/space.jpg" alt="Light through an open window" loading="lazy"></div>
    <div><h2 style="font-size:1.5rem;font-weight:300">The Founder's Awakening Story</h2><p class="muted mt4" style="white-space:pre-wrap">${esc(S.founderStory)}</p><div class="video mt4" style="max-width:22rem">▶</div><p class="xs muted mt1">Filmed version — placeholder</p></div></div>
  <div class="grid md3 mt10">
    <div class="card"><h2 class="gold">Consciousness & Awareness</h2><p class="sm muted mt2">Short lessons, open questions and differing perspectives.</p>${access ? '<ul class="sm mt3"><li>What is awareness?</li><li>Noticing the observer</li><li>Many traditions, one question</li></ul>' : `<p class="mt3">${lockNote()}</p>`}</div>
    <div class="card"><h2 class="gold">Guided Experiences</h2><p class="sm muted mt2">Reflection, meditation, visualisation, stillness and journalling.</p>${access ? '<ul class="sm mt3"><li>10-minute stillness</li><li>Golden-light visualisation</li><li>Evening reflection journal</li></ul>' : `<p class="mt3">${lockNote()}</p>`}</div>
    <div class="card"><h2 class="gold">Awakening Conversations</h2><p class="sm muted mt2">Podcast episodes, interviews and Meet Mineral Man videos.</p><ul class="sm mt3">${conv.map(e => `<li><a href="#/podcast">${esc(e.title)}</a></li>`).join('')}</ul></div>
  </div>
  <div class="card hl mt6 flex between"><div><h2>Awakening discussion group</h2><p class="sm muted mt1">A moderated, respectful space. Please don't make health claims or share sensitive personal details.</p></div>${access ? '<a class="btn" href="#/community/awakening">Join the discussion</a>' : lockNote()}</div>`);
};

function episodeCard(e) {
  const u = me(), locked = e.access === 'members' && !hasAccess(u);
  return `<article class="card p5"><div class="flex between"><span class="xs muted">Episode ${e.n} · ${fmtDate(new Date(e.date).getTime())} · ${e.mins} min</span>${e.access === 'members' ? '<span class="badge b-gold">Members</span>' : ''}</div>
    <h3 class="mt2">${esc(e.title)}</h3><p class="sm muted mt2">${esc(e.desc)}</p>
    <p class="xs muted mt2">Host: ${esc(e.host)}${e.guest ? ' · Guest: ' + esc(e.guest) : ''} · ${e.topics.map(esc).join(', ')}</p>
    ${locked ? `<p class="mt3">${lockNote()} <a href="#/join" class="xs">Join to listen</a></p>` : `<div class="player"><button data-act="play" aria-label="Play ${esc(e.title)}">▶</button><div class="track"><div></div></div><span class="xs muted">${e.mins}:00</span></div><details class="mt2" style="padding:.4rem .7rem"><summary class="xs">Transcript</summary><p class="xs">Transcript placeholder — supplied by the podcast host's RSS/transcript feed.</p></details>`}</article>`;
}
R['/podcast'] = (q = {}) => {
  const topics = uniq(S.episodes.flatMap(e => e.topics));
  const t = q.topic || '', s = (q.q || '').toLowerCase();
  const list = S.episodes.filter(e => !e.archived && (!t || e.topics.includes(t)) && (!s || (e.title + e.desc + e.guest).toLowerCase().includes(s)));
  const feat = S.episodes.find(e => e.featured && !e.archived) || S.episodes[0];
  return `${me() ? portalNav() : ''}` + page(`<div class="kicker">The DELTA Podcast</div><h1 class="mt3">Conversations from analysis to awakening</h1>
  <p class="lg muted mt4">Mineral education, the six pillars, founder reflections, spiritual awakening, consciousness, humour and real experiences.</p>
  <p class="sm mt4">Listen on: <a href="#/podcast">Apple Podcasts</a> · <a href="#/podcast">Spotify</a> · <a href="#/podcast">RSS</a> <span class="xs muted">(links set in admin)</span></p>
  <div class="card hl mt6"><div class="label">Featured</div>${episodeCard(feat).replace('class="card p5"', 'style="margin-top:.5rem"')}</div>
  <form class="flex mt8" data-form="podcast-search" role="search"><input type="search" name="q" value="${esc(q.q || '')}" placeholder="Search episodes" aria-label="Search episodes" style="max-width:20rem;margin:0"><button class="btn ghost xs">Search</button></form>
  <div class="chips mt4"><button class="chip ${!t ? 'on' : ''}" data-act="nav" data-to="/podcast">All</button>${topics.map(x => `<button class="chip ${t === x ? 'on' : ''}" data-act="nav" data-to="/podcast?topic=${encodeURIComponent(x)}">${esc(x)}</button>`).join('')}</div>
  <div class="grid md2 mt6">${list.map(episodeCard).join('') || '<p class="muted">No episodes match.</p>'}</div>`);
};

function videoCard(v) {
  const locked = v.access === 'members' && !hasAccess(me());
  return `<article class="card p4"><div class="video" aria-hidden="true">${locked ? '🔒' : '▶'}</div><div class="xs muted mt2">${esc(v.cat)} · ${v.mins} min · captions</div><h3 class="mt1 sm">${esc(v.title)}</h3>${locked ? `<p class="mt2">${lockNote()}</p>` : ''}</article>`;
}
R['/mineral-man'] = (q = {}) => {
  const cats = uniq(S.videos.map(v => v.cat)), c = q.cat || '';
  const list = S.videos.filter(v => !v.archived && (!c || v.cat === c));
  return `${me() ? portalNav() : ''}` + page(`<div class="kicker">Meet Mineral Man</div><h1 class="mt3">Short videos that answer the common questions</h1>
  <p class="lg muted mt4">A founder-led educational series. Every video has captions and a transcript, and links to the pillar it supports.</p>
  <div class="chips mt8"><button class="chip ${!c ? 'on' : ''}" data-act="nav" data-to="/mineral-man">All</button>${cats.map(x => `<button class="chip ${c === x ? 'on' : ''}" data-act="nav" data-to="/mineral-man?cat=${encodeURIComponent(x)}">${esc(x)}</button>`).join('')}</div>
  <div class="grid md3 mt6">${list.map(videoCard).join('')}</div>`);
};

function partnerCard(p) {
  return `<article class="card p5"><div class="flex between"><span class="xs muted">${esc(p.cat)}</span><span>${p.paid ? '<span class="badge b-warn">Paid placement</span> ' : ''}${p.affiliate ? '<span class="badge b-mute">Affiliate</span>' : ''}</span></div>
  <h3 class="mt2 gold">${esc(p.name)}</h3><p class="sm muted mt2">${esc(p.desc)}</p>
  ${p.code ? `<p class="sm mt2">Code: <b class="gold">${esc(p.code)}</b></p>` : ''}
  <button class="btn ghost xs mt3" data-act="partner-click" data-id="${p.id}">Visit ${esc(p.name)} ↗</button></article>`;
}
R['/partners'] = (q = {}) => {
  const cats = uniq(PARTNERS.map(p => p.cat)), c = q.cat || '';
  const list = S.partners.filter(p => p.active && (!c || p.cat === c));
  return `${me() ? portalNav() : ''}` + page(`<div class="kicker">The Partner Collective</div><h1 class="mt3">Curated brands and resources</h1>
  <p class="lg muted mt4">Third-party companies we think are worth knowing about. Partners handle their own stock, delivery and returns.</p>
  <div class="card hl mt6 sm"><b>Disclosure:</b> some listings are paid placements and some links are affiliate links that may earn DELTA a commission. These never affect your personal Mineral Intelligence recommendations, which are kept entirely separate. No partner product is claimed to treat any disease.</div>
  <div class="chips mt8"><button class="chip ${!c ? 'on' : ''}" data-act="nav" data-to="/partners">All</button>${cats.map(x => `<button class="chip ${c === x ? 'on' : ''}" data-act="nav" data-to="/partners?cat=${encodeURIComponent(x)}">${esc(x)}</button>`).join('')}</div>
  <div class="grid md3 mt6">${list.map(partnerCard).join('')}</div>`);
};

R['/faq'] = () => page(`<h1>FAQs</h1><p class="muted mt2">Practical help. Still stuck? <a href="#/about">Contact us</a>.</p><div class="mt8">${FAQS.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>`, 'mid');
R['/about'] = () => page(`<h1>About DELTA</h1><p class="lg muted mt4">DELTA — Analysis · Intelligence · Method — is a primarily self-service wellbeing education experience built around a hair mineral test and six practical pillars.</p>
  <div class="card mt8"><h2 class="gold">The founder</h2><p class="muted mt2">Founder credentials and biography — placeholder for founder-edited copy.</p><p class="muted mt2" style="white-space:pre-wrap">${esc(S.founderStory)}</p></div>
  <form class="card mt6 stack" data-form="contact"><h2 class="gold">Contact</h2><label class="f"><span>Name</span><input type="text" name="name" required></label><label class="f"><span>Email</span><input type="email" name="email" required></label><label class="f"><span>Message</span><textarea name="msg" rows="4" required></textarea></label><p class="xs muted">Please don't send medical details here. For urgent health concerns contact your GP or NHS 111.</p><button class="btn">Send message</button></form>`, 'mid');
R['/legal'] = () => page(`<h1>Privacy, terms & disclaimers</h1><p class="muted mt2">Draft placeholders — final legal wording is an open decision (brief §19) and needs professional legal advice.</p>
  ${[['Health & claims disclaimer', 'DELTA is educational. Hair Tissue Mineral Analysis is not a standalone diagnostic tool. We do not diagnose, treat, cure or prevent any disease, and nothing on this site replaces advice from a qualified clinician. Content about emotional release, trauma, awakening and grounding is non-coercive and makes no cure or safety claims.'],
    ['Privacy notice (UK GDPR & DPA 2018)', 'Health information is special-category data. We will set out our lawful bases, explicit consent where applicable, processors, international transfers, retention periods and your rights to access, export and delete your data. Identifiable health records are never used to train third-party AI systems.'],
    ['Cookie choices', 'Only essential cookies are used without consent. Analytics and marketing cookies are optional and off by default.'],
    ['Terms of service', 'One purchase includes a qualifying test and six months of access. A qualifying repeat test extends access by six months from the later of your current expiry or your purchase date. Refund policy to be agreed.'],
    ['Affiliate & sponsorship disclosure', 'Partner Collective listings may include paid placements and affiliate links. They are clearly labelled and kept separate from personalised recommendations.'],
    ['Accessibility statement', 'We aim for WCAG 2.2 AA: captions, keyboard navigation, readable contrast and mobile-friendly playback. Tell us about any barrier you meet.']]
    .map(([h, b]) => `<div class="card mt6"><h2 class="gold">${h}</h2><p class="sm muted mt2">${b}</p></div>`).join('')}`, 'mid');

/* ───────────────────────── join / login / intake ───────────────────────── */
R['/join'] = () => {
  const u = me();
  const renew = u && u.purchases.some(p => p.type !== 'voice');
  const st = u && memberStatus(u);
  const newExp = u ? addMonths(Math.max(u.expiresAt || 0, now()), S.settings.accessMonths) : addMonths(now(), S.settings.accessMonths);
  return page(`<div class="center"><h1>${renew ? 'Retest & renew' : 'Join the DELTA Experience'}</h1>
  <p class="muted mt4">One purchase includes your qualifying mineral test and six months of full platform access. After payment you will receive clear instructions to prepare and send your hair sample to our laboratory.</p></div>
  <form class="card mt8 stack" data-form="join">
    <div class="flex between"><span>${renew ? 'Repeat qualifying test' : 'The DELTA Experience'}</span><b style="font-size:1.5rem;font-weight:300">${money(S.settings.price)}</b></div>
    ${u ? `<p class="sm muted">${renew ? `Current access ${st === 'expired' ? 'ended' : 'ends'} ${fmtDate(u.expiresAt)}. ` : ''}Access after this purchase: <b class="gold">until ${fmtDate(newExp)}</b>${renew && st !== 'expired' ? ' — six months added on to your current end date, so you lose no time.' : '.'}</p>`
      : `<label class="f"><span>Full name</span><input type="text" name="name" required autocomplete="name"></label><label class="f"><span>Email</span><input type="email" name="email" required autocomplete="email"></label>`}
    <label class="chk"><input type="checkbox" name="voice"> Add a practitioner voice note (+${money(S.settings.voicePrice)}) — optional, not required for your package.</label>
    <label class="chk"><input type="checkbox" name="terms" required> I accept the <a href="#/legal">terms</a> and understand DELTA is educational and does not diagnose or treat.</label>
    <label class="chk"><input type="checkbox" name="marketing"> Send me occasional DELTA news (optional).</label>
    <button class="btn block">Complete purchase & continue</button>
    <p class="xs muted center">${S.payments === 'stripe' ? 'You\'ll pay securely on Stripe. DELTA never sees your card details.' : 'TEST MODE — no real payment is taken.'}</p>
    ${u ? '' : '<p class="xs muted center">Already a member? <a href="#/login">Sign in</a> first to renew.</p>'}
  </form><p class="center mt6"><a href="#/" class="sm muted">Back</a></p>`, 'narrow');
};
R['/login'] = (q = {}) => {
  const u = me();
  return `<main id="main" class="page" style="display:grid;place-items:center"><div class="card" style="width:100%;max-width:30rem;padding:2rem">
    <div class="center">${logo('').replace('class="logo ', 'style="width:5rem;height:5rem;margin:0 auto 1rem" class="logo ')}<h1 style="font-size:1.5rem;font-weight:600">Sign in to DELTA</h1><p class="sm muted mt2">Access your Mineral Intelligence and the six pillars.</p></div>
    ${q.expired ? '<p class="sm b-warn mt4 center">That sign-in link has expired or was already used. Request a new one below.</p>' : ''}
    ${u ? `<p class="sm mt6 center">Signed in as <b>${esc(u.name)}</b>. <a href="#${isStaff(u) ? '/admin' : '/portal'}">Continue</a> · <button class="linkbtn" data-act="logout">Sign out</button></p>` : ''}
    ${loginSent ? `<div class="card hl mt6 sm"><b>Check your email.</b> If <b>${esc(loginSent)}</b> has a DELTA account, a sign-in link is on its way. It works once and expires in 20 minutes.${S.demo ? ' <a href="/dev/mailbox" target="_blank" rel="noopener">Open the dev mailbox</a>.' : ''}</div>`
      : `<form class="stack mt6" data-form="login-email"><label class="f"><span>Email address</span><input type="email" name="email" required autocomplete="email"></label><button class="btn block">Email me a sign-in link</button><p class="xs muted center">No password needed. New here? <a href="#/join">Join the DELTA Experience</a>.</p></form>`}
    ${S.demo && S.personas.length ? `<hr class="sep"><p class="xs muted">Demo mode: sign in instantly as a persona to see each stage of the journey.</p>
    <div class="stack mt3">${S.personas.map(p => `<button class="inner flex between" style="width:100%;background:none;color:var(--fg);cursor:pointer;font:inherit;text-align:left" data-act="login" data-id="${p.id}"><span>${esc(p.name)}</span><span class="xs muted">${esc(p.desc.replace('_', ' '))}</span></button>`).join('')}</div>` : ''}</div></main>`;
};
function payPage(orderId) {
  const u = me(); if (!u) return needLogin();
  return page(`<div class="card center" style="padding:2rem"><span class="badge b-warn">Test mode</span><h1 class="mt4">Test payment</h1>
    <p class="muted mt4">Stripe isn't connected yet, so this page stands in for the secure checkout. No card is charged. When Stripe keys are added, buyers go to Stripe's own payment page instead.</p>
    <button class="btn lg mt6" data-act="pay-test" data-id="${esc(orderId)}">Pay (test)</button><p class="mt4"><a href="#/join" class="sm muted">Cancel</a></p></div>`, 'narrow');
}
R['/paid'] = () => page(`<div class="card center"><h1>Confirming your payment…</h1><p class="muted mt4">This takes a moment. You'll be taken to your portal automatically.</p></div>`, 'narrow');
R['/intake'] = () => {
  const u = me(); if (!u) return needLogin();
  const i = u.intake || { pregnant: 'no', medications: '', conditions: '', under18: 'no' };
  return page(`${back('/portal', 'Portal')}<h1 class="mt4">Before your sample</h1>
  <p class="sm muted mt3">These questions are a safety screen, not a diagnosis. If you are pregnant, taking medicines, or note a condition, a guide reviews your file before any personal programme is released. General lessons stay available.</p>
  <form class="mt8 stack" data-form="intake">
    <label class="f"><span>Pregnant, or trying to be</span><select name="pregnant">${[['no', 'No'], ['yes', 'Yes'], ['unspecified', 'Prefer not to say']].map(([v, l]) => `<option value="${v}" ${i.pregnant === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="f"><span>Are you under 18?</span><select name="under18">${[['no', 'No'], ['yes', 'Yes']].map(([v, l]) => `<option value="${v}" ${i.under18 === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="f"><span>Medicines and supplements you already take</span><textarea name="medications" rows="3" placeholder="Leave blank if none">${esc(i.medications)}</textarea></label>
    <label class="f"><span>Anything a guide should know before commenting on your results</span><textarea name="conditions" rows="3">${esc(i.conditions)}</textarea></label>
    <label class="chk"><input type="checkbox" name="edu" required> I understand DELTA is educational. It does not diagnose, prescribe, or replace a clinician.</label>
    <label class="chk"><input type="checkbox" name="consent" required> I give explicit consent for DELTA to process my health information to prepare my report, as set out in the <a href="#/legal">privacy notice</a>.</label>
    <button class="btn block">Save and continue</button></form>`, 'narrow');
};

/* ───────────────────────── member portal ───────────────────────── */
function needLogin() { return page(`<div class="card center"><p class="muted">Please sign in to continue.</p><a href="#/login" class="btn mt4">Sign in</a></div>`, 'narrow'); }
function expiredBanner(u) {
  return `<div class="card hl"><h2>Your access is paused</h2><p class="sm muted mt2">Your six months ended on ${fmtDate(u.expiresAt)}. Member learning, groups and LAUGHOLOGY are paused, but your account and every report are kept under our retention policy. You can still read and export your records.</p><div class="flex mt4"><a href="#/join" class="btn">Renew the DELTA Experience</a><a href="#/report" class="btn ghost">View my reports</a><button class="btn ghost" data-act="export">Export my data</button></div></div>`;
}
const gated = (u, html) => hasAccess(u) ? html : `${expiredBanner(u)}`;
const sect = (title, body) => body ? `<div class="inner"><div class="label">${title}</div><p class="sm muted mt1">${esc(body)}</p></div>` : '';

R['/portal'] = () => {
  const u = me(); if (!u) return needLogin();
  if (isStaff(u) && !u.purchases.length) return portalNav() + page(`<h1>Member Portal</h1><div class="card mt8"><p class="muted">You're signed in as <b>${esc(u.name)}</b> (${u.role}). Staff accounts don't have a membership. <a href="#/login">Switch to a member persona</a> to see the client view, or open the <a href="#/admin">admin area</a>.</p></div>`);
  const st = memberStatus(u), t = latestTest(u), pub = publishedTests(u), rep = pub[pub.length - 1];
  if (!u.purchases.length) return portalNav() + page(`<h1>Your DELTA Experience</h1><div class="card mt8 center" style="padding:2rem"><p class="muted">You have not joined yet.</p><a href="#/join" class="btn mt4">Join now</a></div>`);
  const stage = stageOf(u, t);
  const lessonsAll = PILLARS.flatMap(p => p.lessons.map((_, i) => `${p.id}:${i}`));
  const next = lessonsAll.find(k => !u.lessonsDone.includes(k));
  const nextP = next && PILLARS.find(p => p.id === next.split(':')[0]);
  const dp = u.practice[todayKey()] || [];
  const unread = u.inbox.filter(n => !n.read).length;
  const held = rep && u.intake?.review_status === 'needs_review';
  return portalNav() + page(`<div class="flex between"><h1>Your DELTA Experience</h1>${badge(st)}</div>
  ${st === 'expired' ? `<div class="mt6">${expiredBanner(u)}</div>` : ''}
  ${st === 'renewal_due' ? `<div class="card hl mt6 flex between"><p class="sm">Your access ends <b>${fmtDate(u.expiresAt)}</b>. Order a repeat test now and six months are added on to your end date.</p><a href="#/join" class="btn xs">Retest & renew</a></div>` : ''}
  <div class="grid lg3 mt8" style="align-items:start"><div class="stack6">
    <div class="card"><h2 class="gold">Membership</h2><p class="sm muted mt2">Status: ${STATUS_BADGE[st][0]}</p><p class="sm muted">Sample: ${stageLabel(stage)}</p><p class="sm muted">Access until: ${fmtDate(u.expiresAt)}</p><div class="mt4">${pipelineHTML(u, t)}</div></div>
    ${!u.intake?.complete ? `<div class="card hl"><h2>Complete your intake</h2><p class="sm muted mt2">Safety questions come before the hair-sample instructions. Personal programme notes stay held if a review is needed.</p><a href="#/intake" class="btn mt4">Start intake</a></div>`
      : stage === 'sample_pending' ? `<div class="card hl"><h2>Send your hair sample</h2><ol class="sm muted mt3" style="padding-left:1.2rem"><li>Wash hair with a plain shampoo 24 hours before sampling (no conditioner).</li><li>Cut a small sample from the nape of the neck, close to the scalp.</li><li>Place it in the provided envelope and post it to our laboratory.</li><li>We will update your portal once the sample is received and results are ready.</li></ol><button class="btn ghost xs mt4" data-act="sample-sent">I've posted my sample</button></div>`
      : ['lab_processing', 'validation_needed', 'ready_to_publish'].includes(stage) ? `<div class="card"><h2>Your sample is with the laboratory</h2><p class="sm muted mt2">${stage === 'validation_needed' ? 'Our team is double-checking your laboratory data before your report is prepared.' : stage === 'ready_to_publish' ? 'Your report is prepared and will be released shortly.' : "We'll notify you as soon as your results are processed."}</p></div>`
      : stage === 'safety_review' ? `<div class="card hl"><h2>A guide is reviewing your file</h2><p class="sm muted mt2">Your results are in. Because of something in your intake or results, a guide reviews your file before your report and any personal programme are released. General lessons stay available.</p></div>` : ''}
    ${rep ? `${rangeChart(rep.minerals)}${pub.length > 1 ? progressChart(snapsOf(u)) : '<p class="sm muted">A second test will add a progress chart showing how each mineral moved.</p>'}
      <div class="card"><h2 class="gold">Mineral Intelligence</h2><p class="sm mt2">${esc(rep.sections.notes)}</p>
      <div class="grid md2 mt4">${sect('Patterns', rep.sections.patterns)}${sect('Ratios', rep.sections.ratios)}${sect('Guide note', rep.sections.guide)}${sect('Next step', rep.sections.nextStep)}</div>
      ${held ? '<p class="sm gold mt4">A guide is reviewing your intake. The personal programme stays hidden until that review is cleared. Charts and general lessons stay available.</p>' : `<h3 class="mt4">Proposed programme</h3><ul class="sm muted mt1">${rep.programme.map(p => `<li>${esc(p)}</li>`).join('')}</ul>`}
      <a href="#/report" class="btn ghost xs mt4">Open full report</a></div>`
      : (stage !== 'safety_review' ? `<div class="card sm muted">Your Mineral Intelligence report, including the mineral chart, will appear here once laboratory results have been processed and published.${u.intake?.complete && S.demo ? '<div class="mt4"><button class="btn ghost xs" data-act="simulate">Simulate lab results (demo)</button></div>' : ''}</div>` : '')}
    ${gated(u, `<div class="card"><h2>Next lesson</h2>${nextP ? `<p class="sm muted mt2">${nextP.name}: ${esc(nextP.lessons[+next.split(':')[1]])}</p><a href="#/pillars/${nextP.id}" class="sm mt4" style="display:inline-block">Continue in the six pillars</a>` : '<p class="sm muted mt2">Every current lesson is marked done. <a href="#/learn">Review them</a>.</p>'}
      ${rep?.lessons?.length ? `<p class="xs muted mt4">Suggested from your report: ${rep.lessons.map(id => `<a href="#/pillars/${id}">${PILLARS.find(p => p.id === id).name}</a>`).join(' · ')}</p>` : ''}</div>`)}
    <div class="card"><h2>Next steps</h2><ul class="sm muted mt3"><li>Follow the sample instructions if you have not yet sent your hair.</li><li>Explore the six pillars while you wait.</li><li>Optional: request a practitioner voice note once your report is ready.</li></ul><a href="#/pillars" class="sm mt4" style="display:inline-block">View the six pillars</a></div>
  </div>
  <div class="stack6">
    <div class="card"><h2>Upgrades</h2><div class="stack mt4">
      <div class="inner"><div>Practitioner Voice Note</div><p class="xs muted mt1">Personal audio explanation of your report. ${money(S.settings.voicePrice)} · up to ${S.settings.voiceQuestions} questions.</p><a href="#/account" class="btn ghost xs block mt3">Request</a></div>
      <div class="inner"><div>Retest & renew</div><p class="xs muted mt1">A new qualifying test extends your access by six months.</p><a href="#/join" class="btn ghost xs block mt3">Start retest</a></div></div></div>
    <div class="card"><div class="flex between"><h2>Inbox</h2>${unread ? `<span class="badge b-gold">${unread} new</span>` : ''}</div><div class="mt3">${u.inbox.slice(0, 5).map(n => `<div class="inbox-item"><div class="${n.read ? '' : 'unread'}">${esc(n.title)}</div><div class="xs muted">${fmtDT(n.at)}</div></div>`).join('') || '<p class="sm muted">No messages yet.</p>'}</div><a href="#/account" class="sm mt3" style="display:inline-block">All messages</a></div>
    ${gated(u, `<div class="card"><h2>DELTA Daily Practice</h2><p class="xs muted mt1">Optional. No streaks, no scores — tick what you did if it helps.</p><div class="stack mt3">${['Ten minutes outside', 'A brisk walk', 'Something that made me laugh', 'Evening wind-down'].map((x, i) => `<label class="chk"><input type="checkbox" data-act="practice" data-i="${i}" ${dp.includes(i) ? 'checked' : ''}> ${x}</label>`).join('')}</div></div>
    <a class="card hl" href="#/laughology"><h2>😄 LAUGHOLOGY</h2><p class="sm muted mt1">Joke of the day: ${esc(JOKES[new Date(now()).getDate() % JOKES.length])}</p></a>`)}
  </div></div>`);
};

R['/report'] = (q = {}) => {
  const u = me(); if (!u) return needLogin();
  const pub = publishedTests(u);
  if (!pub.length) return portalNav() + page(`<h1>My report</h1><div class="card mt8 muted">Your report will appear here once your results have been published. <a href="#/portal">Back to overview</a></div>`);
  const idx = q.t != null ? +q.t : pub.length - 1, t = pub[idx] || pub[pub.length - 1];
  const held = u.intake?.review_status === 'needs_review';
  const e = evaluate(t.minerals, t.toxic, t.ruleset);
  return portalNav() + page(`<div class="flex between"><h1>Mineral Intelligence report</h1><div class="chips">${pub.map((x, i) => `<button class="chip ${x === t ? 'on' : ''}" data-act="nav" data-to="/report?t=${i}">Test ${i + 1} · ${fmtDate(x.publishedAt)}</button>`).join('')}</div></div>
  <p class="xs muted mt2">Prepared ${fmtDate(t.generatedAt)} · rule set <span class="mono">${esc(t.ruleset)}</span> · published ${fmtDate(t.publishedAt)}</p>
  <div class="mt6">${rangeChart(t.minerals)}</div>
  ${pub.length > 1 ? `<div class="mt6">${progressChart(snapsOf(u))}</div>` : ''}
  <div class="card mt6"><h2 class="gold">Your values</h2><div class="tablewrap mt4"><table><thead><tr><th>Mineral</th><th>Result</th><th>Laboratory band</th><th>Reading</th></tr></thead><tbody>
    ${t.minerals.map(m => `<tr><td>${esc(m.label)} (${m.name})</td><td>${m.value} ${m.unit}</td><td>${m.low}–${m.high} ${m.unit}</td><td><span class="badge ${statusOf(m) === 'Inside range' ? 'b-ok' : 'b-warn'}">${statusOf(m)}</span></td></tr>`).join('')}
    ${RATIOS.map(x => `<tr><td>Ratio ${x.id}</td><td>${e.r[x.id] ?? '—'}</td><td>${x.low}–${x.high}</td><td>${e.r[x.id] == null ? '' : `<span class="badge ${e.r[x.id] < x.low || e.r[x.id] > x.high ? 'b-warn' : 'b-ok'}">${e.r[x.id] < x.low ? 'Below' : e.r[x.id] > x.high ? 'Above' : 'Inside'}</span>`}</td></tr>`).join('')}
    ${TOXIC.map(x => `<tr><td>${x.label} (${x.name})</td><td>${t.toxic?.[x.name] ?? '—'} ${x.unit}</td><td>below ${x.high}</td><td>${(t.toxic?.[x.name] ?? 0) > x.high ? '<span class="badge b-bad">Flagged for review</span>' : '<span class="badge b-ok">Below reference</span>'}</td></tr>`).join('')}
  </tbody></table></div><div class="flex mt4"><button class="linkbtn sm" data-act="raw" data-t="${t.id}">View original laboratory data</button>${fileLink(t.pdfFile, "Download original lab report (PDF)")}</div><pre id="raw-${t.id}" class="mono card p4 mt2" hidden>${esc(t.raw || '')}</pre></div>
  <div class="card mt6"><h2 class="gold">What this may mean</h2><div class="stack mt4">${t.findings.length ? t.findings.map(f => `<div class="inner"><div class="label">${esc(f.title)}</div><p class="sm muted mt1">${esc(f.text)}</p></div>`).join('') : '<p class="sm muted">No rules matched — your readings sit close to the bands DELTA uses.</p>'}
    ${sect('Guide note', t.sections.guide)}</div></div>
  <div class="card mt6"><h2 class="gold">Proposed programme</h2>${held ? '<p class="sm gold mt2">A guide is reviewing your intake. The personal programme stays hidden until that review is cleared.</p>' : `<ul class="sm mt3">${t.programme.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
    ${t.findings.some(f => f.supplement) ? '<div class="inner mt4 sm"><div class="label">About supplement templates</div><p class="muted mt1">Supplement templates follow DELTA\'s approved protocol and were released only after your safety screen. Doses and timings in the final service will come from the clinically signed-off protocol. Check with your GP or pharmacist before starting anything new, especially if your medicines change.</p></div>' : ''}`}</div>
  <div class="card mt6"><h2 class="gold">Suggested lessons</h2><div class="chips mt3">${(t.lessons || []).map(id => { const p = PILLARS.find(x => x.id === id); return `<a class="chip" href="#/pillars/${id}" style="text-decoration:none">${p.n}. ${p.name}</a>`; }).join('')}<a class="chip" href="#/mineral-man" style="text-decoration:none">▶ Reading your report (video)</a></div></div>
  <p class="xs muted mt6">Educational interpretation only — not a diagnosis or treatment. HTMA is not a standalone diagnostic tool. If you have health concerns, please speak to your GP.</p>`);
};

R['/learn'] = () => {
  const u = me(); if (!u) return needLogin();
  const all = PILLARS.flatMap(p => p.lessons.map((_, i) => `${p.id}:${i}`));
  const done = u.lessonsDone.filter(k => all.includes(k)).length;
  return portalNav() + page(`<h1>The six pillars</h1><p class="sm muted mt2">${done} of ${all.length} lessons marked done. Educational only — not a treatment plan.</p>
  <div class="progress mt3"><div style="width:${done / all.length * 100}%"></div></div>
  ${!hasAccess(u) ? `<div class="card hl mt6 sm">Membership is not active. <a href="#/join">Join or renew</a> to keep learning.</div>` : ''}
  <div class="stack mt8">${PILLARS.map((p, i) => { const l = S.lessons.find(x => x.id === p.id); const n = p.lessons.filter((_, k) => u.lessonsDone.includes(`${p.id}:${k}`)).length; return `<article class="card flush rise"><img src="${p.image}" alt="" style="height:10rem;width:100%;object-fit:cover"><div class="body"><div class="xs gold">Pillar ${i + 1} · ${p.name}</div><h2 class="mt1" style="font-size:1.25rem">${esc(l.title)}</h2><p class="sm muted mt2">${esc(l.body)}</p><div class="flex between mt3"><span class="xs muted">${n} of ${p.lessons.length} lessons done</span><a href="#/pillars/${p.id}" class="btn ghost xs">Open pillar</a></div></div></article>`; }).join('')}</div>`, 'mid');
};

R['/laughology'] = (q = {}) => {
  const u = me(); if (!u) return needLogin();
  if (!hasAccess(u)) return portalNav() + page(expiredBanner(u), 'mid');
  const ok = S.laughs.filter(l => l.status === 'approved'), cat = q.cat || '';
  const week = ok.filter(l => now() - l.at < 7 * DAY).sort((a, b) => b.loves - a.loves)[0];
  const vid = ok.filter(l => l.type === 'video').sort((a, b) => b.at - a.at)[0];
  const list = ok.filter(l => !cat || l.type === cat).sort((a, b) => q.sort === 'loved' ? b.loves - a.loves : b.at - a.at);
  return portalNav() + page(`<div class="kicker">RELEASE · LAUGHOLOGY</div><h1 class="mt3">Laughter is part of letting go</h1>
  <div class="grid md3 mt8"><div class="card hl"><div class="label">Joke of the Day</div><p class="mt2">${esc(JOKES[new Date(now()).getDate() % JOKES.length])}</p></div>
  <div class="card"><div class="label">Funny Video of the Day</div>${vid ? `<p class="mt2">${esc(vid.text)}</p><a href="${esc(vid.url)}" target="_blank" rel="noopener nofollow" class="sm">Watch ↗</a>` : '<p class="sm muted mt2">None yet.</p>'}</div>
  <div class="card"><div class="label">Laugh of the Week</div>${week ? `<p class="mt2">${esc(week.text)}</p><p class="xs muted mt1">♥ ${week.loves} · ${esc(week.by)}</p>` : '<p class="sm muted mt2">Share one!</p>'}</div></div>
  <div class="grid md2 mt8" style="align-items:start"><div><div class="chips"><button class="chip ${!cat && q.sort !== 'loved' ? 'on' : ''}" data-act="nav" data-to="/laughology">Latest</button><button class="chip ${q.sort === 'loved' ? 'on' : ''}" data-act="nav" data-to="/laughology?sort=loved">Most Loved</button>${['joke', 'video', 'story'].map(c => `<button class="chip ${cat === c ? 'on' : ''}" data-act="nav" data-to="/laughology?cat=${c}">${c[0].toUpperCase() + c.slice(1)}s</button>`).join('')}</div>
    <div class="stack mt4">${list.map(l => `<div class="card p4"><div class="xs muted">${l.type} · ${esc(l.by)} · ${fmtDate(l.at)}</div><p class="mt1">${esc(l.text)}</p>${l.url ? `<a href="${esc(l.url)}" target="_blank" rel="noopener nofollow" class="sm">Open link ↗</a>` : ''}<div class="flex mt2"><button class="btn ghost xs" data-act="love" data-id="${l.id}" ${l.loved ? 'aria-pressed="true" disabled' : ''}>♥ ${l.loves}</button><button class="linkbtn xs" data-act="report-laugh" data-id="${l.id}">Report</button></div></div>`).join('')}</div></div>
  <form class="card stack" data-form="laugh"><h2 class="gold">Share a Laugh</h2>
    <label class="f"><span>Type</span><select name="type"><option value="joke">Joke</option><option value="video">Funny video link</option><option value="story">Short story</option></select></label>
    <label class="f"><span>Your joke, story or video title</span><textarea name="text" rows="3" maxlength="500" required></textarea></label>
    <label class="f"><span>Link (videos only — share links to public videos, don't upload other people's content)</span><input type="url" name="url" placeholder="https://"></label>
    <label class="f"><span>Display name</span><input type="text" name="by" value="${esc(u.name.split(' ')[0])}"></label>
    <label class="chk"><input type="checkbox" name="anon"> Post anonymously</label>
    <p class="xs muted">Everything is checked by a moderator before it appears. Keep it kind — see the community rules.</p><button class="btn">Submit for review</button></form></div>`);
};

const GROUPS = [...PILLARS.map(p => ({ id: p.id, name: p.name[0] + p.name.slice(1).toLowerCase() })), { id: 'awakening', name: 'Awakening' }, { id: 'general', name: 'Shared learning & encouragement' }];
R['/community'] = (q, parts) => {
  const u = me(); if (!u) return needLogin();
  if (!hasAccess(u)) return portalNav() + page(expiredBanner(u), 'mid');
  const g = parts[1] && GROUPS.find(x => x.id === parts[1]);
  const rules = `<div class="card hl sm"><b>Community rules.</b> Be kind. Peer discussion is not clinical support — please don't give or ask for medical advice, and don't share sensitive health details publicly. If you're worried about your health or safety, contact your GP, NHS 111, or 999 in an emergency. Use <i>Report</i> on anything concerning. DELTA groups are moderated but not monitored 24/7.</div>`;
  if (!g) return portalNav() + page(`<h1>DELTA Community</h1><p class="muted mt2">Moderated groups for the six pillars, Awakening and shared encouragement.</p><div class="mt6">${rules}</div>
    <div class="grid md3 mt6">${GROUPS.map(x => `<a class="card p5" href="#/community/${x.id}"><h3 class="gold">${esc(x.name)}</h3><p class="xs muted mt1">${S.posts.filter(p => p.group === x.id && !p.removed).length} posts</p></a>`).join('')}</div>`);
  const posts = S.posts.filter(p => p.group === g.id && !p.removed && (!q.q || p.text.toLowerCase().includes(q.q.toLowerCase())));
  return portalNav() + page(`${back('/community', 'All groups')}<h1 class="mt4">${esc(g.name)}</h1><div class="mt4">${rules}</div>
  <form class="card stack mt6" data-form="post" data-group="${g.id}"><label class="f"><span>Share with the group</span><textarea name="text" rows="3" maxlength="1000" required></textarea></label><label class="chk"><input type="checkbox" name="anon"> Post as "Anonymous member"</label><button class="btn">Post</button></form>
  <form class="flex mt6" data-form="group-search" data-group="${g.id}" role="search"><input type="search" name="q" value="${esc(q.q || '')}" placeholder="Search this group" style="max-width:20rem;margin:0"><button class="btn ghost xs">Search</button></form>
  <div class="stack mt4">${posts.map(p => `<div class="card p4"><div class="xs muted">${esc(p.by)} · ${fmtDT(p.at)}</div><p class="mt1">${esc(p.text)}</p>
    <div class="flex mt2"><button class="btn ghost xs" data-act="post-love" data-id="${p.id}" ${p.loved ? 'aria-pressed="true" disabled' : ''}>♥ ${p.loves}</button><button class="linkbtn xs" data-act="post-report" data-id="${p.id}">${p.reported ? 'Reported' : 'Report'}</button></div>
    ${p.replies.map(r => `<div class="inner mt2 sm"><span class="xs muted">${esc(r.by)} · ${fmtDT(r.at)}</span><p>${esc(r.text)}</p></div>`).join('')}
    <form class="flex mt2" data-form="reply" data-id="${p.id}"><input type="text" name="text" placeholder="Reply" required style="flex:1;margin:0"><button class="btn ghost xs">Reply</button></form></div>`).join('') || '<p class="muted">No posts yet — start the conversation.</p>'}</div>`, 'mid');
};

R['/account'] = () => {
  const u = me(); if (!u) return needLogin();
  const vns = S.voiceNotes.filter(v => v.userId === u.id);
  const canVoice = publishedTests(u).length > 0;
  return portalNav() + page(`<h1>Account</h1>
  <div class="grid md2 mt8" style="align-items:start"><div class="stack6">
    <div class="card"><h2 class="gold">Membership & billing</h2><p class="sm mt2">${badge(memberStatus(u))} Access until <b>${fmtDate(u.expiresAt)}</b></p><a href="#/join" class="btn xs mt4">Retest & renew</a>
      <h3 class="mt6">Purchases & receipts</h3><div class="tablewrap mt2"><table><thead><tr><th>Date</th><th>Item</th><th>Amount</th></tr></thead><tbody>${u.purchases.slice().reverse().map(p => `<tr><td>${fmtDate(p.at)}</td><td>${esc(p.desc)}</td><td>${money(p.amount)}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">None</td></tr>'}</tbody></table></div></div>
    <div class="card"><h2 class="gold">Practitioner voice notes</h2><p class="sm muted mt2">An optional personal audio explanation of your report. Asynchronous — not a live consultation. ${money(S.settings.voicePrice)}, up to ${S.settings.voiceQuestions} questions, typical turnaround ${esc(S.settings.voiceTurnaround)}. If your questions need a different professional service (for example a doctor), we'll tell you.</p>
      ${vns.map(v => `<div class="inner mt3 sm"><div class="flex between"><span>${fmtDate(v.at)}</span><span class="badge ${v.status === 'delivered' ? 'b-ok' : 'b-gold'}">${v.status}</span></div><ul class="muted xs mt1">${v.questions.map(q => `<li>${esc(q)}</li>`).join('') || '<li>General explanation of my report</li>'}</ul>${v.status === 'delivered' ? `${v.audioFile ? `<audio controls preload="none" src="/api/files/${esc(v.audioFile)}?inline=1" style="width:100%;margin-top:.6rem"></audio>` : '<p class="xs muted mt2">Written reply — see transcript.</p>'}${v.transcript ? `<details class="mt2" style="padding:.4rem .7rem"><summary class="xs">Transcript</summary><p class="xs">${esc(v.transcript)}</p></details>` : ''}` : ''}</div>`).join('')}
      ${canVoice ? `<form class="stack mt4" data-form="voice">${Array.from({ length: S.settings.voiceQuestions }, (_, i) => `<label class="f"><span>Question ${i + 1} (optional)</span><input type="text" name="q${i}" maxlength="200"></label>`).join('')}<button class="btn ghost">Buy voice note — ${money(S.settings.voicePrice)}</button><p class="xs muted">A task is created for the practitioner only after payment succeeds.${S.payments === "test" ? " (Test mode — no real payment.)" : ""}</p></form>` : '<p class="xs muted mt3">Available once your report is published.</p>'}</div>
  </div><div class="stack6">
    <div class="card"><h2 class="gold">Messages</h2><div class="mt3">${u.inbox.map(n => `<div class="inbox-item"><b class="sm">${esc(n.title)}</b><div class="sm muted">${esc(n.body)}</div><div class="xs muted">${fmtDT(n.at)}</div></div>`).join('') || '<p class="sm muted">No messages.</p>'}</div></div>
    <div class="card"><h2 class="gold">Communication & consent</h2><div class="stack mt3">
      <label class="chk"><input type="checkbox" data-act="consent" data-k="marketing" ${u.consent.marketing ? 'checked' : ''}> DELTA news and new-episode emails</label>
      <label class="chk"><input type="checkbox" data-act="consent" data-k="sms" ${u.consent.sms ? 'checked' : ''}> SMS for report-ready and renewal reminders</label>
      <p class="xs muted">Essential service emails (receipts, report ready, access changes) are always sent.</p></div></div>
    <div class="card"><h2 class="gold">Your intake</h2><p class="sm muted mt2">${u.intake?.complete ? `Last updated ${fmtDate(u.intake.at)} · review: ${esc(u.intake.review_status.replace(/_/g, ' '))}` : 'Not completed'}</p><a href="#/intake" class="btn ghost xs mt3">Update intake</a></div>
    <div class="card"><h2 class="gold">Your data</h2><p class="sm muted mt2">Download everything we hold about you, including your original lab data and reports.</p><div class="flex mt3"><button class="btn ghost xs" data-act="export">Export my data (JSON)</button><button class="btn danger xs" data-act="delete-request">Request deletion</button></div></div>
    <button class="linkbtn sm" data-act="logout">Sign out</button>
  </div></div>`);
};

/* ───────────────────────── admin ───────────────────────── */
const canArea = area => S.role === 'admin' || (S.perms || []).includes(area);
function adminGuard(path) {
  const u = me();
  if (!u) return needLogin();
  if (!isStaff(u)) return page(`<div class="card center"><p class="muted">The admin area is for DELTA staff.${S.demo ? ' <a href="#/login">Switch to the Founder persona</a> to explore it.' : ''}</p></div>`, 'narrow');
  if (!canArea(path)) return adminNav() + page(`<div class="card"><p class="muted">Your role (<b>${u.role}</b>) does not have access to this area.</p></div>`);
  return null;
}
const allTests = () => members().flatMap(u => u.tests.map(t => ({ u, t })));

R['/admin'] = () => {
  const m = members(), tests = allTests();
  const cnt = s => tests.filter(x => x.t.status === s).length;
  const purchases = m.flatMap(u => u.purchases);
  const turn = tests.filter(x => x.t.publishedAt && x.t.receivedAt).map(x => (x.t.publishedAt - x.t.receivedAt) / DAY);
  const auto = tests.filter(x => x.t.receivedAt), autoOk = auto.filter(x => !x.t.wasReviewed && !x.t.hadIssues && x.t.status === 'published');
  return adminNav() + page(`<h1>Admin Dashboard</h1><p class="muted mt2">Manage analyses, run workflows, and review activity.</p>
  <div class="grid md4 mt8">${[['Members', m.length], ['Active', m.filter(u => hasAccess(u)).length], ['Lab reports', tests.filter(x => x.t.receivedAt).length], ['HTMA analyses', tests.filter(x => x.t.generatedAt).length],
    ['Revenue (demo)', money(purchases.reduce((a, p) => a + p.amount, 0))], ['Renewals due', m.filter(u => memberStatus(u) === 'renewal_due').length], ['Expired', m.filter(u => memberStatus(u) === 'expired').length], ['Avg turnaround', turn.length ? (turn.reduce((a, b) => a + b, 0) / turn.length).toFixed(1) + ' d' : '—'],
    ['Automation success', auto.length ? Math.round(autoOk.length / auto.length * 100) + '%' : '—'], ['Voice-note requests', S.voiceNotes.filter(v => v.status === 'requested').length], ['Partner clicks', S.partners.reduce((a, p) => a + (p.clicks || 0), 0)], ['Lessons completed', m.reduce((a, u) => a + u.lessonsDone.length, 0)]]
    .map(([k, v]) => `<div class="kpi"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('')}</div>
  <div class="grid md4 mt6">${[['Awaiting sample', cnt('sample_pending'), '/admin/members'], ['Lab processing', cnt('lab_processing'), '/admin/upload'], ['Exceptions', cnt('validation_needed'), '/admin/exceptions'], ['Safety review', cnt('safety_review'), '/admin/safety'], ['Ready to publish', cnt('ready_to_publish'), '/admin/reports'], ['Moderation', S.laughs.filter(l => l.status === 'pending').length + S.posts.filter(p => p.reported).length, '/admin/moderation']]
    .map(([k, v, to]) => `<a class="card p4" href="#${to}"><div class="sm muted">${k}</div><div style="font-size:1.6rem;font-weight:300" class="${v ? 'gold' : ''}">${v}</div></a>`).join('')}</div>
  <div class="flex mt8"><a href="#/admin/members" class="btn">Manage members</a><a href="#/admin/analyses" class="btn ghost">Edit analyses</a><a href="#/admin/assistant" class="btn ghost">Open AI Assistant</a></div>
  <div class="card mt10"><h2>Recent activity</h2>${S.audit.length ? `<ul class="sm mt4" style="list-style:none;padding:0">${S.audit.slice(0, 12).map(a => `<li class="flex between" style="border-bottom:1px solid rgba(42,54,76,.4);padding:.5rem 0"><span>${esc(a.action)} — ${esc(a.details)}</span><span class="xs muted">${esc(a.actor)} · ${fmtDT(a.at)}</span></li>`).join('')}</ul>` : '<p class="sm muted mt3">No activity yet.</p>'}<a href="#/admin/audit" class="sm mt3" style="display:inline-block">Full audit log</a></div>`);
};

R['/admin/members'] = () => adminNav() + page(`<h1>Members</h1><p class="muted mt2">Membership status, sample workflow and roles. Every manual change is written to the audit log.</p>
  <div class="tablewrap mt6"><table><thead><tr><th>Member</th><th>Status</th><th>Sample / workflow</th><th>Role</th><th>Expires</th><th>Tests</th><th>Actions</th></tr></thead><tbody>
  ${S.users.map(u => { const t = latestTest(u); return `<tr><td>${esc(u.name)}<div class="xs muted">${esc(u.email)}</div></td><td>${u.role === 'member' ? badge(memberStatus(u)) : '<span class="xs muted">staff</span>'}</td>
    <td>${t ? `<select class="mini" data-act="set-stage" data-id="${u.id}">${STAGES.slice(2).map(([k, l]) => `<option value="${k}" ${t.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select>${!u.intake?.complete ? '<div class="xs gold">intake pending</div>' : ''}` : '—'}</td>
    <td><select class="mini" data-act="set-role" data-id="${u.id}" ${S.role === 'admin' ? '' : 'disabled'}>${['member', 'practitioner', 'moderator', 'support', 'admin'].map(r => `<option ${u.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select></td>
    <td>${u.role === 'member' ? `<input type="date" class="mini" data-act="set-expiry" data-id="${u.id}" value="${u.expiresAt ? new Date(u.expiresAt).toISOString().slice(0, 10) : ''}">` : '—'}</td>
    <td class="xs">${u.tests.length}</td>
    <td>${t && t.status === 'sample_pending' && u.intake?.complete ? `<button class="btn ghost xs" data-act="sample-received" data-id="${u.id}">Sample received</button>` : ''} ${u.role === 'member' && S.demo && S.role === 'admin' ? `<button class="linkbtn xs" data-act="impersonate" data-id="${u.id}">View as</button>` : ''}</td></tr>`; }).join('')}
  </tbody></table></div>`);

R['/admin/upload'] = (q = {}) => {
  const ready = allTests().filter(x => ['lab_processing', 'sample_pending'].includes(x.t.status) && x.u.intake?.complete);
  const sel = q.u || ready[0]?.u.id || '';
  return adminNav() + page(`<h1>Lab upload</h1><p class="muted mt2">Upload or import a laboratory result. Values, units, identity and missing fields are checked; anything uncertain goes to the exception queue instead of being guessed. Clean results are interpreted automatically.</p>
  ${ready.length ? `<form class="card stack mt8" data-form="upload">
    <label class="f"><span>Client</span><select name="u">${ready.map(x => `<option value="${x.u.id}" ${x.u.id === sel ? 'selected' : ''}>${esc(x.u.name)} — ${stageLabel(x.t.status)} (ordered ${fmtDate(x.t.created)})</option>`).join('')}</select></label>
    <label class="f"><span>Name as printed on the lab report</span><input type="text" name="name" value="${esc(user(sel)?.name || '')}" required></label>
    <label class="f"><span>Lab report PDF (stored with the record; text extraction would populate the box below)</span><input type="file" name="pdf" accept="application/pdf"></label>
    <label class="f"><span>Extracted / imported values — one per line: <span class="mono">Symbol, value, unit</span></span><textarea class="code" name="data" rows="10" required>${esc(Domain.demoLab())}</textarea></label>
    <div class="flex"><button type="button" class="btn ghost xs" data-act="fill-lab" data-k="clean">Load clean sample</button><button type="button" class="btn ghost xs" data-act="fill-lab" data-k="issues">Load sample with problems</button><button type="button" class="btn ghost xs" data-act="fill-lab" data-k="toxic">Load sample with toxic flag</button></div>
    <button class="btn">Validate & process</button></form>` : '<div class="card mt8 muted">No clients are waiting for results. Mark a sample as received on the <a href="#/admin/members">Members</a> page.</div>'}`, 'mid');
};

R['/admin/exceptions'] = () => {
  const list = allTests().filter(x => x.t.status === 'validation_needed');
  return adminNav() + page(`<h1>Exception queue</h1><p class="muted mt2">Results the system would not process automatically. Correct each value against the original laboratory report, then re-validate. Nothing is inferred.</p>
  <div class="stack6 mt8">${list.map(({ u, t }) => `<form class="card" data-form="fix" data-u="${u.id}"><div class="flex between"><h2>${esc(u.name)}</h2><span class="xs muted">received ${fmtDT(t.receivedAt)}</span></div>
    <ul class="sm mt3">${t.issues.map(i => `<li class="${i.level === 'error' ? 'b-bad' : 'b-warn'}">${i.level === 'error' ? '✕' : '!'} ${esc(i.msg)}</li>`).join('')}</ul>
    <details class="mt3"><summary class="sm">Original data</summary><pre class="mono">${esc(t.raw)}</pre></details>
    <div class="grid md3 mt3">${MINERALS.map(m => { const v = t.minerals.find(x => x.name === m.name)?.value; return `<label class="f"><span>${m.label} (${m.unit})</span><input type="number" step="any" name="${m.name}" value="${v ?? ''}" placeholder="missing"></label>`; }).join('')}
    ${TOXIC.map(m => `<label class="f"><span>${m.label} (${m.unit})</span><input type="number" step="any" name="${m.name}" value="${t.toxic?.[m.name] ?? ''}" placeholder="not reported"></label>`).join('')}</div>
    <label class="f mt3"><span>Correction note (required, audited)</span><input type="text" name="note" required placeholder="e.g. Na re-keyed from page 2 of lab PDF; unit confirmed mg%"></label>
    <div class="flex mt4"><button class="btn">Re-validate & process</button><button type="button" class="btn danger xs" data-act="reject-lab" data-id="${u.id}">Reject — request new sample</button></div></form>`).join('') || '<div class="card muted">The exception queue is empty.</div>'}</div>`, 'mid');
};

R['/admin/safety'] = () => {
  const intakes = members().filter(u => u.intake?.complete);
  const waiting = intakes.filter(u => u.intake.review_status === 'needs_review');
  const tox = allTests().filter(x => x.t.status === 'safety_review' && x.t.toxicFlags?.length);
  return adminNav() + page(`<h1>Safety review</h1><p class="muted mt2">${waiting.length === 0 ? 'Nothing is waiting.' : `${waiting.length} intake${waiting.length === 1 ? '' : 's'} waiting.`} Personal programme text stays held until you clear the file. This is not a clinical sign-off — escalate to the responsible clinician where criteria are met.</p>
  ${tox.length ? `<div class="card hl mt6"><h2>Toxic-element flags</h2>${tox.map(({ u, t }) => `<p class="sm mt2">${esc(u.name)}: ${t.toxicFlags.join(', ')} above reference.</p>`).join('')}</div>` : ''}
  <div class="stack mt6">${intakes.sort((a, b) => (b.intake.review_status === 'needs_review') - (a.intake.review_status === 'needs_review')).map(u => { const t = reviewTest(u); return `<article class="card p4 sm"><div class="flex between"><span>${esc(u.name)} <span class="mono muted">${u.id}</span></span><span class="xs gold">${u.intake.review_status.replace(/_/g, ' ')}${t ? ' · ' + stageLabel(t.status) : ''}</span></div>
    <p class="muted mt2">Pregnant: ${esc(u.intake.pregnant)} · Under 18: ${esc(u.intake.under18)}</p>${u.intake.medications ? `<p class="mt1">Medicines: ${esc(u.intake.medications)}</p>` : ''}${u.intake.conditions ? `<p class="mt1">Notes: ${esc(u.intake.conditions)}</p>` : ''}
    ${t?.toxicFlags?.length ? `<p class="mt1 b-bad">Toxic flags: ${t.toxicFlags.join(', ')}</p>` : ''}
    ${u.intake.review_status === 'needs_review' || t?.status === 'safety_review' ? `<form class="stack mt3" data-form="safety" data-u="${u.id}"><label class="f"><span>Review note (audited)</span><input type="text" name="note" required placeholder="e.g. Checked interactions for levothyroxine; MG-A template acceptable"></label>
      <div class="flex"><button class="btn xs" name="decision" value="clear">Clear for publishing</button><button class="btn ghost xs" name="decision" value="general">Publish chart, withhold supplements</button><button class="btn danger xs" name="decision" value="escalate">Escalate to clinician</button></div></form>` : `${u.intake.review_note ? `<p class="xs muted mt2">Note: ${esc(u.intake.review_note)}</p>` : ''}`}</article>`; }).join('') || '<p class="sm muted">No intakes yet.</p>'}</div>`, 'mid');
};

R['/admin/reports'] = (q = {}) => {
  const list = allTests().filter(x => x.t.generatedAt).sort((a, b) => (b.t.status === 'ready_to_publish') - (a.t.status === 'ready_to_publish') || b.t.generatedAt - a.t.generatedAt);
  return adminNav() + page(`<h1>Lab Reports</h1><p class="muted mt2">View and edit every Mineral Intelligence report. Generated text records the rule-set version; edits are audited.</p>
  <div class="stack mt6">${list.map(({ u, t }) => `<div class="card p4"><div class="flex between sm"><span>${esc(u.name)} <span class="mono muted">${t.id}</span></span><span class="xs ${t.status === 'published' ? 'b-ok' : 'gold'}">${stageLabel(t.status)} · <span class="mono">${esc(t.ruleset)}</span></span></div>
    <div class="mt3">${rangeChart(t.minerals, "This client's result")}</div>
    ${q.edit === t.id ? `<form class="stack mt3" data-form="report-edit" data-u="${u.id}" data-t="${t.id}">${['patterns', 'ratios', 'notes', 'guide', 'nextStep'].map(k => `<label class="f"><span>${{ patterns: 'Patterns', ratios: 'Ratios', notes: 'Mineral Intelligence', guide: 'Guide note', nextStep: 'Next step' }[k]}</span><textarea name="${k}" rows="3">${esc(t.sections[k] || '')}</textarea></label>`).join('')}
      <label class="f"><span>Proposed programme (one item per line)</span><textarea name="programme" rows="4">${esc(t.programme.join('\n'))}</textarea></label>
      <label class="f"><span>Status</span><select name="status">${['ready_to_publish', 'published'].map(s => `<option value="${s}" ${t.status === s ? 'selected' : ''}>${stageLabel(s)}</option>`).join('')}${!['ready_to_publish', 'published'].includes(t.status) ? `<option value="${t.status}" selected>${stageLabel(t.status)}</option>` : ''}</select></label>
      <div class="flex"><button class="btn xs">Save</button><a href="#/admin/reports" class="xs muted">Cancel</a></div></form>`
      : `<p class="sm mt2" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(t.sections.notes)}</p><div class="flex mt2"><a class="xs" href="#/admin/reports?edit=${t.id}">Edit</a>${t.status === 'ready_to_publish' ? `<button class="btn xs" data-act="publish" data-u="${u.id}" data-t="${t.id}">Publish</button>` : ''}</div>`}</div>`).join('') || '<p class="sm muted">No reports yet.</p>'}</div>`, 'mid');
};

R['/admin/analyses'] = (q = {}) => {
  const clients = members().filter(u => publishedTests(u).length || u.tests.some(t => t.minerals?.length && t.minerals.every(m => m.value != null)));
  const cu = user(q.u) || clients[0];
  if (!cu) return adminNav() + page('<h1>Client charts</h1><p class="muted mt4">No clients yet.</p>');
  const tests = cu.tests.filter(t => t.minerals.length && t.minerals.every(m => m.value != null));
  const t = tests[tests.length - 1];
  if (!t) return adminNav() + page('<h1>Client charts</h1><p class="muted mt4">This client has no complete results yet.</p>');
  const draft = chartDraft && chartDraft.u === cu.id ? chartDraft.minerals : t.minerals;
  return adminNav() + page(`<h1>Client charts</h1><p class="muted mt2">One client at a time. The charts explain the range and the change between tests. Each section below is what the guide edits.</p>
  <label class="f mt6" style="max-width:28rem"><span class="xs">Client</span><select data-act="pick-client">${clients.map(u => `<option value="${u.id}" ${u === cu ? 'selected' : ''}>${esc(u.name)} (${u.id})</option>`).join('')}</select></label>
  <div class="stack6 mt6"><div id="live-chart">${rangeChart(draft, `Latest reading for ${cu.name}`)}</div>
  ${tests.length > 1 ? progressChart(tests.map((x, i) => ({ label: `Test ${i + 1}`, minerals: x.minerals }))) : '<p class="sm muted">This client has one test. Save as next test after you change the numbers, and the progress chart will appear for them only.</p>'}
  <form data-form="chart" data-u="${cu.id}" data-t="${t.id}" class="stack6">
  <section class="card p4"><h2 class="sm gold">Mineral values</h2><p class="xs muted mt1">The chart above follows these numbers immediately. Low and high are the laboratory band for that mineral.</p>
    <div class="grid mt3 muted" style="grid-template-columns:repeat(4,1fr);gap:.5rem;font-size:11px"><span>Mineral</span><span>Result</span><span>Range low</span><span>Range high</span></div>
    <div class="stack mt2">${draft.map((m, i) => `<div class="grid" style="grid-template-columns:repeat(4,1fr);gap:.5rem;align-items:center"><span class="sm">${esc(m.label)}</span>${['value', 'low', 'high'].map(k => `<input aria-label="${esc(m.label)} ${k}" type="number" step="0.1" name="${i}.${k}" value="${m[k]}" data-act="chart-input" style="margin:0">`).join('')}</div>`).join('')}</div></section>
  ${['patterns', 'ratios', 'guide', 'nextStep'].map(k => `<section class="card p4"><label class="sm gold">${{ patterns: 'Patterns', ratios: 'Ratios', guide: 'Guide note', nextStep: 'Next step' }[k]}<textarea name="${k}" rows="3">${esc(t.sections?.[k] || '')}</textarea></label></section>`).join('')}
  <div class="flex"><button class="btn" name="mode" value="this">Save this test</button><button class="btn ghost" name="mode" value="next">Save as next test</button></div></form></div>`, 'mid');
};

R['/admin/voice'] = () => adminNav() + page(`<h1>Voice notes</h1><p class="muted mt2">Paid requests only. Record on phone or computer and upload; the client is notified privately.</p>
  <div class="stack mt6">${S.voiceNotes.map(v => { const u = user(v.userId); const rep = publishedTests(u).slice(-1)[0]; return `<div class="card p4"><div class="flex between"><b>${esc(u.name)}</b><span class="badge ${v.status === 'delivered' ? 'b-ok' : 'b-gold'}">${v.status}</span></div><p class="xs muted">Requested ${fmtDT(v.at)} · due ${fmtDate(v.at + 7 * DAY)}</p>
    <ul class="sm mt2">${v.questions.map(q => `<li>${esc(q)}</li>`).join('') || '<li class="muted">General explanation of report</li>'}</ul>${rep ? `<a class="xs" href="#/admin/reports?edit=${rep.id}">Open client report</a>` : ''}
    ${v.status === 'requested' ? `<form class="stack mt3" data-form="voice-deliver" data-id="${v.id}"><label class="f"><span>Audio file</span><input type="file" name="audio" accept="audio/*" capture></label><label class="f"><span>Transcript / summary (for accessibility)</span><textarea name="transcript" rows="3"></textarea></label><label class="chk"><input type="checkbox" name="refer"> Questions need a different professional service — include signposting</label><button class="btn xs">Upload & notify client</button></form>` : `<p class="xs muted mt2">Delivered ${fmtDT(v.deliveredAt)} ${fileLink(v.audioFile, '· audio file')}</p>`}</div>`; }).join('') || '<p class="muted">No requests.</p>'}</div>`, 'mid');

R['/admin/lessons'] = () => adminNav() + page(`<h1>Lessons</h1><p class="muted mt2">Edit the six pillar lessons. Members see the saved text on their learning page.</p>
  <div class="stack mt6">${S.lessons.map(l => `<form class="card p4" data-form="lesson" data-id="${l.id}"><div class="xs gold">${esc(l.pillar)}</div><input type="text" name="title" value="${esc(l.title)}"><textarea name="body" rows="4">${esc(l.body)}</textarea><div class="flex mt3"><button class="btn xs">Save lesson</button><label class="f xs" style="display:flex;gap:.4rem;align-items:center"><span>Release on</span><input type="date" name="release" class="mini" value="${l.release || ''}"></label></div></form>`).join('')}</div>`, 'mid');

R['/admin/content'] = () => adminNav() + page(`<h1>Content</h1><p class="muted mt2">Podcast episodes, Meet Mineral Man videos and the Awakening story — no developer needed.</p>
  <form class="card stack mt6" data-form="story"><h2 class="gold">Founder's Awakening Story</h2><textarea name="story" rows="6">${esc(S.founderStory)}</textarea><button class="btn xs">Save story</button></form>
  <div class="card mt6"><h2 class="gold">Podcast episodes</h2><p class="xs muted mt1">Audio is hosted by your podcast provider; paste its episode/RSS details here.</p><div class="tablewrap mt3"><table><thead><tr><th>#</th><th>Title</th><th>Date</th><th>Access</th><th></th></tr></thead><tbody>${S.episodes.map(e => `<tr style="${e.archived ? 'opacity:.45' : ''}"><td>${e.n}</td><td>${esc(e.title)}${e.featured ? ' <span class="badge b-gold">Featured</span>' : ''}</td><td class="xs">${e.date}</td><td><button class="linkbtn xs" data-act="ep-access" data-id="${e.id}">${e.access}</button></td><td class="xs"><button class="linkbtn xs" data-act="ep-feature" data-id="${e.id}">Feature</button> · <button class="linkbtn xs" data-act="ep-archive" data-id="${e.id}">${e.archived ? 'Restore' : 'Archive'}</button></td></tr>`).join('')}</tbody></table></div>
    <form class="grid md2 mt4" data-form="episode"><label class="f"><span>Title</span><input type="text" name="title" required></label><label class="f"><span>Publish date</span><input type="date" name="date" required></label><label class="f"><span>Topics (comma separated)</span><input type="text" name="topics" placeholder="Minerals, REST"></label><label class="f"><span>Guest</span><input type="text" name="guest"></label><label class="f" style="grid-column:1/-1"><span>Description</span><textarea name="desc" rows="2"></textarea></label><label class="f"><span>Access</span><select name="access"><option value="public">public</option><option value="members">members</option></select></label><div style="align-self:end"><button class="btn xs">Add episode</button></div></form></div>
  <div class="card mt6"><h2 class="gold">Meet Mineral Man videos</h2><div class="tablewrap mt3"><table><thead><tr><th>Title</th><th>Category</th><th>Pillar</th><th>Access</th><th></th></tr></thead><tbody>${S.videos.map(v => `<tr style="${v.archived ? 'opacity:.45' : ''}"><td>${esc(v.title)}</td><td class="xs">${esc(v.cat)}</td><td class="xs">${v.pillar || '—'}</td><td><button class="linkbtn xs" data-act="vid-access" data-id="${v.id}">${v.access}</button></td><td><button class="linkbtn xs" data-act="vid-archive" data-id="${v.id}">${v.archived ? 'Restore' : 'Archive'}</button></td></tr>`).join('')}</tbody></table></div>
    <form class="grid md2 mt4" data-form="video"><label class="f"><span>Title</span><input type="text" name="title" required></label><label class="f"><span>Category</span><input type="text" name="cat" required value="Minerals"></label><label class="f"><span>Pillar</span><select name="pillar"><option value="">—</option>${PILLARS.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}</select></label><label class="f"><span>Access</span><select name="access"><option>members</option><option>public</option></select></label><div><button class="btn xs">Add video</button></div></form></div>`);

R['/admin/moderation'] = () => {
  const pend = S.laughs.filter(l => l.status === 'pending'), rep = S.posts.filter(p => p.reported && !p.removed);
  return adminNav() + page(`<h1>Moderation</h1><p class="muted mt2">Nothing from members is published without review. Check links before approving.</p>
  <h2 class="mt8">LAUGHOLOGY submissions (${pend.length})</h2><div class="stack mt3">${pend.map(l => `<div class="card p4"><div class="xs muted">${l.type} · ${esc(l.by)} · ${fmtDT(l.at)}</div><p class="mt1">${esc(l.text)}</p>${l.url ? `<p class="mono mt1">${esc(l.url)}</p>` : ''}${l.flag ? `<p class="xs b-warn mt1">⚠ ${esc(l.flag)}</p>` : ''}<div class="flex mt3"><button class="btn xs" data-act="mod-laugh" data-id="${l.id}" data-v="approved">Approve</button><button class="btn danger xs" data-act="mod-laugh" data-id="${l.id}" data-v="rejected">Reject</button></div></div>`).join('') || '<p class="sm muted">Queue empty.</p>'}</div>
  <h2 class="mt8">Reported community posts (${rep.length})</h2><div class="stack mt3">${rep.map(p => `<div class="card p4"><div class="xs muted">${esc(p.group)} · ${esc(p.by)} · ${fmtDT(p.at)}</div><p class="mt1">${esc(p.text)}</p>${p.reportReason ? `<p class="xs b-warn mt1">Reason: ${esc(p.reportReason)}</p>` : ''}<div class="flex mt3"><button class="btn ghost xs" data-act="mod-post" data-id="${p.id}" data-v="keep">Keep & dismiss report</button><button class="btn ghost xs" data-act="mod-post" data-id="${p.id}" data-v="signpost">Reply with signposting</button><button class="btn danger xs" data-act="mod-post" data-id="${p.id}" data-v="remove">Remove</button></div></div>`).join('') || '<p class="sm muted">No reports.</p>'}</div>`, 'mid');
};

R['/admin/partners'] = () => adminNav() + page(`<h1>Partner Collective</h1><p class="muted mt2">Add, feature, pause and remove partners. Paid and affiliate relationships are always disclosed publicly.</p>
  <div class="tablewrap mt6"><table><thead><tr><th>Partner</th><th>Category</th><th>Disclosure</th><th>Code</th><th>Clicks</th><th>Status</th></tr></thead><tbody>${S.partners.map(p => `<tr><td>${esc(p.name)}</td><td class="xs">${esc(p.cat)}</td><td class="xs">${p.paid ? 'Paid ' : ''}${p.affiliate ? 'Affiliate' : ''}${!p.paid && !p.affiliate ? '—' : ''}</td><td class="mono">${esc(p.code || '—')}</td><td>${p.clicks}</td><td><button class="btn ghost xs" data-act="partner-toggle" data-id="${p.id}">${p.active ? 'Pause' : 'Activate'}</button></td></tr>`).join('')}</tbody></table></div>
  <form class="card grid md2 mt6" data-form="partner"><h2 class="gold" style="grid-column:1/-1">Add partner</h2><label class="f"><span>Name</span><input type="text" name="name" required></label><label class="f"><span>Category</span><select name="cat">${uniq(PARTNERS.map(p => p.cat)).map(c => `<option>${esc(c)}</option>`).join('')}</select></label><label class="f" style="grid-column:1/-1"><span>Description</span><input type="text" name="desc" required></label><label class="f"><span>Discount code</span><input type="text" name="code"></label><div class="stack"><label class="chk"><input type="checkbox" name="paid"> Paid placement</label><label class="chk"><input type="checkbox" name="affiliate"> Affiliate link</label></div><div><button class="btn xs">Add partner</button></div></form>`);

R['/admin/rules'] = () => {
  const rs = RULESETS[S.settings.ruleset];
  return adminNav() + page(`<h1>Interpretation rules</h1><p class="muted mt2">Approved, version-controlled rules turn validated results into explanations, lesson links and programme templates. Every report stores the exact version used.</p>
  <div class="card mt6"><div class="flex between"><h2>Rule set <span class="mono gold">${esc(S.settings.ruleset)}</span></h2><span class="xs muted">Approved by ${esc(rs.approvedBy)} · ${rs.date}</span></div>
  <div class="tablewrap mt4"><table><thead><tr><th>ID</th><th>Rule</th><th>Lessons</th><th>Programme template</th><th>Flags</th></tr></thead><tbody>${rs.rules.map(r => `<tr><td class="mono">${r.id}</td><td>${esc(r.title)}<div class="xs muted mono">${esc(r.when.toString())}</div></td><td class="xs">${r.lessons.join(', ')}</td><td class="xs">${esc(r.prog)}</td><td>${r.supplement ? '<span class="badge b-warn">supplement</span> ' : ''}${r.review ? '<span class="badge b-bad">review</span>' : ''}</td></tr>`).join('')}</tbody></table></div></div>
  <div class="card mt6"><h2>Regression tests</h2><p class="sm muted mt1">Fixed test cases run against the rule set before any new version is approved.</p><button class="btn ghost xs mt3" data-act="run-tests">Run test cases</button><div id="test-out" class="mt3"></div></div>
  <div class="card hl mt6 sm">Thresholds and supplement templates are <b>placeholders</b>. The final protocol, decision rules, professional oversight and escalation criteria are open decisions (brief §19) and need clinical sign-off before launch.</div>`, 'mid');
};

R['/admin/settings'] = () => adminNav() + page(`<h1>Settings</h1><p class="muted mt2">Prices, reminders and automation — editable without a developer.</p>
  <form class="card stack mt6" data-form="settings">
    <div class="grid md2"><label class="f"><span>DELTA Experience price (£)</span><input type="number" step="0.01" name="price" value="${S.settings.price}"></label><label class="f"><span>Voice note price (£)</span><input type="number" step="0.01" name="voicePrice" value="${S.settings.voicePrice}"></label>
    <label class="f"><span>Voice note question limit</span><input type="number" name="voiceQuestions" min="1" max="10" value="${S.settings.voiceQuestions}"></label><label class="f"><span>Voice note turnaround (shown to clients)</span><input type="text" name="voiceTurnaround" value="${esc(S.settings.voiceTurnaround)}"></label>
    <label class="f"><span>Renewal reminders — days before expiry (comma separated)</span><input type="text" name="reminderDays" value="${S.settings.reminderDays.join(', ')}"></label><label class="f"><span>Access per qualifying test</span><input type="text" value="${S.settings.accessMonths} months" disabled></label></div>
    <label class="chk"><input type="checkbox" name="autoPublish" ${S.settings.autoPublish ? 'checked' : ''}> Auto-publish reports that pass validation and need no safety review</label>
    <button class="btn">Save settings</button></form>`, 'mid');

R['/admin/audit'] = () => adminNav() + page(`<div class="flex between"><h1>Audit log</h1><button class="btn ghost xs" data-act="export-audit">Export CSV</button></div>
  <div class="tablewrap mt6"><table><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Details</th></tr></thead><tbody>${S.audit.map(a => `<tr><td class="xs">${fmtDT(a.at)}</td><td class="xs">${esc(a.actor)}</td><td>${esc(a.action)}</td><td class="sm muted">${esc(a.details)}</td></tr>`).join('')}</tbody></table></div>
  <h2 class="mt8">Communications sent</h2><div class="tablewrap mt3"><table><thead><tr><th>When</th><th>To</th><th>Channel</th><th>Message</th><th>Status</th></tr></thead><tbody>${S.outbox.slice(0, 60).map(o => `<tr><td class="xs">${fmtDT(o.at)}</td><td>${esc(o.to)}</td><td class="xs">${o.channel}</td><td class="sm">${esc(o.title)}</td><td class="xs">${esc(o.status || '')}</td></tr>`).join('')}</tbody></table></div>`);

R['/admin/assistant'] = () => adminNav() + page(`<h1>AI Assistant</h1><p class="muted mt2">A workflow helper grounded only in DELTA's own records. It can summarise activity and run routine, already-approved workflow steps. It cannot clear safety reviews, change interpretations or make clinical decisions, and no identifiable health data is sent to a third-party AI provider in this prototype.</p>
  <div class="card flush chat mt6"><div class="log" id="chatlog">${chatLog.map(m => `<div class="msg ${m.role === 'user' ? 'user' : 'bot'}">${esc(m.text)}</div>`).join('') || '<p class="sm muted">Ask me to publish ready results, summarise activity, list what\'s waiting, or show who is due to renew. Every request is logged.</p>'}</div>
  <form data-form="assistant"><input type="text" name="q" placeholder="e.g. What is waiting for me today?" autocomplete="off"><button class="btn">Send</button></form></div>`, 'mid');

function assistantReply(q) {
  const s = q.toLowerCase(), tests = allTests();
  const by = st => tests.filter(x => x.t.status === st).map(x => x.u.name);
  if (/clear|approve.*safety|diagnos|dose|prescri/.test(s)) return 'I can\'t do that. Safety reviews, doses and clinical judgements must be made by an authorised person on the Safety page.';
  if (/publish/.test(s)) {
    const ready = tests.filter(x => x.t.status === 'ready_to_publish');
    ready.forEach(x => publish(x.u, x.t, 'AI Assistant'));
    return ready.length ? `Published ${ready.length} report(s) that had already passed validation and safety: ${ready.map(x => x.u.name).join(', ')}.` : 'There are no reports in "Ready to publish". Items in safety review or the exception queue need a person.';
  }
  if (/renew|expir/.test(s)) {
    const due = members().filter(u => memberStatus(u) === 'renewal_due'), exp = members().filter(u => memberStatus(u) === 'expired');
    return `Renewal due: ${due.map(u => `${u.name} (${fmtDate(u.expiresAt)})`).join(', ') || 'none'}.\nExpired: ${exp.map(u => u.name).join(', ') || 'none'}.\nReminders are sent automatically at ${S.settings.reminderDays.join(' and ')} days.`;
  }
  if (/wait|queue|today|todo|to do/.test(s)) return `Exceptions: ${by('validation_needed').join(', ') || 'none'}\nSafety review: ${by('safety_review').join(', ') || 'none'}\nReady to publish: ${by('ready_to_publish').join(', ') || 'none'}\nLab processing (upload needed): ${by('lab_processing').join(', ') || 'none'}\nVoice notes: ${S.voiceNotes.filter(v => v.status === 'requested').length} requested\nModeration: ${S.laughs.filter(l => l.status === 'pending').length} submissions, ${S.posts.filter(p => p.reported && !p.removed).length} reports`;
  if (/summar|activity|happen/.test(s)) return 'Latest activity:\n' + S.audit.slice(0, 8).map(a => `• ${a.action} — ${a.details}`).join('\n');
  return 'I can: list what\'s waiting, publish ready reports, summarise recent activity, or show renewals and expiries.';
}

function notFound() { return page(`<h1>Page not found</h1><p class="mt4"><a href="#/">Go home</a></p>`, 'narrow'); }

/* ───────────────────────── router ───────────────────────── */
function render() {
  const [path, qs] = (location.hash.slice(1) || '/').split('?');
  const q = Object.fromEntries(new URLSearchParams(qs || ''));
  const parts = path.split('/').filter(Boolean);
  let html;
  if (path.startsWith('/admin')) html = adminGuard(path) ?? (R[path] ? R[path](q) : notFound());
  else if (parts[0] === 'pillars' && parts[1]) html = pillarPage(parts[1]);
  else if (parts[0] === 'community') html = R['/community'](q, parts);
  else if (parts[0] === 'pay') html = payPage(parts[1]);
  else html = R[path] ? R[path](q, parts) : notFound();
  document.getElementById('app').innerHTML = `<a class="skip" href="#main" data-act="skip">Skip to content</a>${demobar()}${header()}${html}${footer()}`;
  document.title = 'DELTA — Awakening Human Potential';
  const log = document.getElementById('chatlog'); if (log) log.scrollTop = log.scrollHeight;
  onRoute(path, q);
}
/* Side effects that belong to arriving on a page. */
let lastRoute = '';
function onRoute(path, q) {
  const key = path + JSON.stringify(q); if (key === lastRoute) return; lastRoute = key;
  if (path === '/account' && me()?.inbox.some(n => !n.read)) act('mark-read', {}, { refresh: false }).then(() => me()?.inbox.forEach(n => n.read = true));
  if (path === '/paid' && q.session_id) act('confirm-stripe', { sessionId: q.session_id });
}
function go(to) { if (location.hash === '#' + to) render(); else location.hash = to; window.scrollTo(0, 0); }
function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 4200); }
/* In-page dialog (native confirm/prompt and downloads are blocked in sandboxed hosts). */
function dialog({ title, body = '', input = null, value = '', ok = 'OK', onOk, wide = false }) {
  document.querySelectorAll('[data-dialog]').forEach(x => x.remove());
  const d = document.createElement('div');
  d.dataset.dialog = '1';
  d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);display:grid;place-items:center;z-index:300;padding:1rem';
  d.innerHTML = `<form class="card stack" style="width:100%;max-width:${wide ? '44rem' : '28rem'}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><h2 class="gold">${esc(title)}</h2>${body ? `<p class="sm muted">${esc(body)}</p>` : ''}
    ${input === 'textarea' ? `<textarea class="code" rows="14" readonly>${esc(value)}</textarea>` : input ? `<input type="text" required value="${esc(value)}" aria-label="${esc(title)}">` : ''}
    <div class="flex">${onOk ? `<button class="btn">${esc(ok)}</button>` : ''}${input === 'textarea' ? '<button type="button" class="btn ghost" data-copy>Copy</button><button type="button" class="btn ghost" data-dl>Download</button>' : ''}<button type="button" class="btn ghost" data-close>${onOk ? 'Cancel' : 'Close'}</button></div></form>`;
  const close = () => d.remove();
  d.querySelector('[data-close]').onclick = close;
  d.addEventListener('click', e => { if (e.target === d) close(); });
  d.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  const f = d.querySelector('form');
  f.addEventListener('submit', e => { e.preventDefault(); e.stopPropagation(); const i = f.querySelector('input'); close(); onOk && onOk(i ? i.value.trim() : true); });
  document.body.appendChild(d);
  (f.querySelector('input,textarea,button') || f).focus();
  return d;
}
function download(name, text, type = 'application/json') {
  const d = dialog({ title: name, body: 'Copy the data below, or download it as a file where your browser allows.', input: 'textarea', value: text, wide: true });
  d.querySelector('[data-copy]').onclick = async () => { try { await navigator.clipboard.writeText(text); toast('Copied.'); } catch { d.querySelector('textarea').select(); toast('Select all and copy.'); } };
  d.querySelector('[data-dl]').onclick = () => { try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); } catch { toast('Downloads are blocked here — use Copy.'); } };
}

/* ───────────────────────── actions (buttons) ───────────────────────── */
const ds = el => el.dataset;
const A = {
  menu(el) { const n = document.getElementById('mainnav'); n.classList.toggle('open'); el.setAttribute('aria-expanded', n.classList.contains('open')); },
  skip(el, ev) { ev.preventDefault(); const m = document.getElementById('main'); m?.focus(); m?.scrollIntoView(); },
  nav(el) { go(el.dataset.to); },
  clock(el) { act('clock', { days: +el.dataset.days }); },
  reset() { dialog({ title: 'Reset demo?', body: 'All demo data on this server goes back to the starting state, and you are signed out.', ok: 'Reset', onOk: () => act('reset') }); },
  login(el) { act('dev-login', { id: el.dataset.id }); },
  impersonate(el) { act('impersonate', { id: el.dataset.id }); },
  logout() { act('logout'); },
  'lesson-done'(el) { act('lesson-done', { key: el.dataset.key }); },
  practice(el) { act('practice', { i: +el.dataset.i, on: el.checked }); },
  'sample-sent'() { act('sample-sent'); },
  simulate() { act('simulate'); },
  play(el) { const bar = el.parentElement.querySelector('.track div'); const on = el.textContent === '▶'; el.textContent = on ? '❚❚' : '▶'; bar.style.transition = on ? 'width 30s linear' : 'none'; bar.style.width = on ? '100%' : getComputedStyle(bar).width; },
  raw(el) { const p = document.getElementById('raw-' + el.dataset.t); p.hidden = !p.hidden; },
  'partner-click'(el) { act('partner-click', { id: el.dataset.id }); },
  love(el) { act('love', { id: el.dataset.id }).then(r => r && load().then(render)); },
  'report-laugh'(el) { act('report-laugh', { id: el.dataset.id }); },
  'post-love'(el) { act('post-love', { id: el.dataset.id }).then(r => r && load().then(render)); },
  'post-report'(el) { dialog({ title: 'Report this post', body: 'Tell the moderators what concerns you.', input: 'text', ok: 'Report', onOk: reason => act('post-report', { id: el.dataset.id, reason }) }); },
  consent(el) { act('consent', { k: el.dataset.k, v: el.checked }); },
  export() { act('export', {}, { refresh: false }); },
  'delete-request'() { dialog({ title: 'Request deletion?', body: 'Our team will confirm what can be deleted under the retention policy.', ok: 'Send request', onOk: () => act('delete-request') }); },
  'set-role'(el) { act('set-role', { id: el.dataset.id, role: el.value }); },
  'set-stage'(el) { act('set-stage', { id: el.dataset.id, stage: el.value }); },
  'set-expiry'(el) { const u = user(el.dataset.id), date = el.value; if (!date) return; dialog({ title: `Change ${u.name}'s expiry`, body: 'Give a reason — it is written to the audit log.', input: 'text', ok: 'Save', onOk: reason => act('set-expiry', { id: u.id, date, reason }) }); el.value = u.expiresAt ? new Date(u.expiresAt).toISOString().slice(0, 10) : ''; },
  'sample-received'(el) { act('sample-received', { id: el.dataset.id }); },
  'fill-lab'(el) { const ta = document.querySelector('textarea[name=data]'); ta.value = el.dataset.k === 'clean' ? Domain.demoLab() : el.dataset.k === 'toxic' ? Domain.demoLab({ Ca: 50, Mg: 5, Na: 25, K: 8, Zn: 15, Cu: 2 }).replace('Pb, 0.02', 'Pb, 0.31') : 'Ca, 62, mg%\nMg, 3.2, mg%\nNa, 180, ppm\nK, 8, mg%\nZn, sixteen, mg%\nPb, 0.02, mg%'; },
  'reject-lab'(el) { dialog({ title: 'Reject and request a new sample?', body: 'The client is told a replacement kit is on its way.', ok: 'Reject', onOk: () => act('reject-lab', { id: el.dataset.id }) }); },
  publish(el) { act('publish', { userId: el.dataset.u, testId: el.dataset.t }); },
  'pick-client'(el) { chartDraft = null; go('/admin/analyses?u=' + el.value); },
  'chart-input'(el) {
    const f = el.form, u = user(f.dataset.u), t = u.tests.find(x => x.id === f.dataset.t);
    const ms = t.minerals.map((m, i) => ({ ...m, value: +f[`${i}.value`].value, low: +f[`${i}.low`].value, high: +f[`${i}.high`].value }));
    chartDraft = { u: u.id, minerals: ms };
    document.getElementById('live-chart').innerHTML = rangeChart(ms, `Latest reading for ${u.name}`);
  },
  'ep-access'(el) { act('ep-access', { id: el.dataset.id }); },
  'ep-feature'(el) { act('ep-feature', { id: el.dataset.id }); },
  'ep-archive'(el) { act('ep-archive', { id: el.dataset.id }); },
  'vid-access'(el) { act('vid-access', { id: el.dataset.id }); },
  'vid-archive'(el) { act('vid-archive', { id: el.dataset.id }); },
  'mod-laugh'(el) { act('mod-laugh', { id: el.dataset.id, v: el.dataset.v }); },
  'mod-post'(el) { act('mod-post', { id: el.dataset.id, v: el.dataset.v }); },
  'partner-toggle'(el) { act('partner-toggle', { id: el.dataset.id }); },
  async 'run-tests'() {
    const r = await act('run-tests', {}, { refresh: false }); if (!r) return;
    document.getElementById('test-out').innerHTML = r.results.map(c => `<div class="sm ${c.pass ? 'b-ok' : 'b-bad'}">${c.pass ? '✓' : '✕'} ${esc(c.name)} — expected [${c.expect.join(', ')}], got [${c.got.join(', ')}]</div>`).join('');
  },
  'pay-test'(el) { el.disabled = true; act('pay-test', { orderId: el.dataset.id }).finally(() => { el.disabled = false; }); },
};

/* ───────────────────────── forms ───────────────────────── */
const obj = d => Object.fromEntries(d.entries());
const F = {
  join(f, d) { const b = obj(d); return act('checkout', { ...b, voice: !!b.voice, terms: !!b.terms, marketing: !!b.marketing }); },
  'login-email'(f, d) { return act('login-request', { email: d.get('email') }, { refresh: false }).then(r => { if (r) { loginSent = d.get('email'); render(); } }); },
  intake(f, d) { const b = obj(d); return act('intake', { ...b, edu: !!b.edu, consent: !!b.consent }); },
  laugh(f, d) { const b = obj(d); return act('laugh', { ...b, anon: !!b.anon }); },
  post(f, d) { return act('post', { group: f.dataset.group, text: d.get('text'), anon: !!d.get('anon') }); },
  reply(f, d) { return act('reply', { id: f.dataset.id, text: d.get('text') }); },
  'group-search'(f, d) { go(`/community/${f.dataset.group}?q=${encodeURIComponent(d.get('q'))}`); },
  'podcast-search'(f, d) { go(`/podcast?q=${encodeURIComponent(d.get('q'))}`); },
  contact(f, d) { return act('contact', obj(d), { refresh: false }).then(r => r && f.reset()); },
  voice(f, d) { return act('voice-checkout', { questions: Array.from({ length: S.settings.voiceQuestions }, (_, i) => d.get('q' + i) || '') }); },
  async upload(f, d) { const pdf = await fileToB64(d.get('pdf')); return act('upload', { userId: d.get('u'), name: d.get('name'), data: d.get('data'), pdf }); },
  fix(f, d) { const values = {}; [...MINERALS, ...TOXIC].forEach(m => values[m.name] = d.get(m.name)); return act('fix', { userId: f.dataset.u, values, note: d.get('note') }); },
  safety(f, d, sub) { return act('safety', { userId: f.dataset.u, decision: sub?.value || 'clear', note: d.get('note') }); },
  'report-edit'(f, d) { return act('report-edit', { userId: f.dataset.u, testId: f.dataset.t, ...obj(d) }); },
  chart(f, d, sub) {
    const u = user(f.dataset.u), t = u.tests.find(x => x.id === f.dataset.t);
    const minerals = t.minerals.map((_, i) => ({ value: d.get(`${i}.value`), low: d.get(`${i}.low`), high: d.get(`${i}.high`) }));
    const sections = Object.fromEntries(['patterns', 'ratios', 'guide', 'nextStep'].map(k => [k, d.get(k)]));
    chartDraft = null;
    return act('chart', { userId: u.id, testId: t.id, minerals, sections, mode: sub?.value });
  },
  async 'voice-deliver'(f, d) { const audio = await fileToB64(d.get('audio')); return act('voice-deliver', { id: f.dataset.id, transcript: d.get('transcript'), refer: !!d.get('refer'), audio }); },
  lesson(f, d) { return act('lesson', { id: f.dataset.id, ...obj(d) }); },
  story(f, d) { return act('story', obj(d)); },
  episode(f, d) { return act('episode', obj(d)); },
  video(f, d) { return act('video', obj(d)); },
  partner(f, d) { const b = obj(d); return act('partner', { ...b, paid: !!b.paid, affiliate: !!b.affiliate }); },
  settings(f, d) { const b = obj(d); return act('settings', { ...b, autoPublish: !!b.autoPublish }); },
  async assistant(f, d) {
    const q = (d.get('q') || '').trim(); if (!q) return;
    chatLog.push({ role: 'user', text: q });
    const r = await act('assistant', { q }, { refresh: false });
    chatLog.push({ role: 'bot', text: r ? r.reply : 'Sorry — that request failed.' });
    await load(); render();
  },
};

/* ───────────────────────── wiring ───────────────────────── */
let chartDraft = null, loginSent = '';
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.tagName === 'SELECT' || el.tagName === 'INPUT') return;
  const fn = A[el.dataset.act]; if (fn) { if (el.tagName === 'A') ev.preventDefault(); fn(el, ev); }
});
document.addEventListener('change', ev => {
  const el = ev.target.closest('[data-act]'); if (!el) return;
  if (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'date') { const fn = A[el.dataset.act]; if (fn) fn(el, ev); }
});
document.addEventListener('input', ev => { const el = ev.target; if (el.dataset?.act === 'chart-input') A['chart-input'](el); });
document.addEventListener('submit', async ev => {
  const f = ev.target.closest('form[data-form]'); if (!f) return;
  ev.preventDefault();
  const fn = F[f.dataset.form]; if (!fn) return;
  const btns = f.querySelectorAll('button'); btns.forEach(b => b.disabled = true);
  try { await fn(f, new FormData(f), ev.submitter); } finally { btns.forEach(b => b.disabled = false); }
});
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
load().then(render).catch(e => { document.getElementById('app').innerHTML = `<main class="page"><div class="narrow card"><h1>DELTA is unavailable</h1><p class="muted mt2">${esc(e.message)}. Please try again shortly.</p></div></main>`; });
