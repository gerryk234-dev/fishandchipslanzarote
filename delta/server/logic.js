/* Server-side business logic — the single source of truth for membership, orders, the
   lab → report pipeline, the safety gate and notifications. Every state change is audited. */
'use strict';
const crypto = require('node:crypto');
const D = require('../shared/data.js');
const Dom = require('../shared/domain.js');
const { DAY } = Dom;

const DEFAULT_SETTINGS = { minAge: 18, price: 295, voicePrice: 45, voiceQuestions: 3, voiceTurnaround: '5 working days', reminderDays: [30, 7], accessMonths: 6, autoPublish: true, ruleset: D.CURRENT_RULESET };
const id = p => p + '_' + crypto.randomBytes(6).toString('base64url');
const money = n => '£' + Number(n).toFixed(2).replace(/\.00$/, '');
const fmtDate = t => t ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function createLogic(store, mailer, config) {
  let nowOverride = null;
  const L = {
    id, money, fmtDate,
    now() { return nowOverride ?? (Date.now() + (config.demo ? store.kvGet('clockDays', 0) * DAY : 0)); },
    withNow(t, fn) { const prev = nowOverride; nowOverride = t; try { return fn(); } finally { nowOverride = prev; } },
    settings() { return { ...DEFAULT_SETTINGS, ...store.kvGet('settings', {}) }; },

    audit(actor, action, details = '') {
      store.db.prepare('INSERT INTO audit (at, actor, action, details) VALUES (?, ?, ?, ?)').run(L.now(), actor || 'System', action, String(details));
    },
    actorName: u => u ? `${u.name} (${u.role})` : 'Visitor',

    /* ── users ── */
    user: uid => store.get('users', uid),
    createUser({ name, email, role = 'member', marketing = false, phone = null, nationality = null, dob = null }) {
      const u = { id: id('u'), name: String(name).trim().slice(0, 80), email: String(email).trim().toLowerCase(), role, phone, nationality, dob, createdAt: L.now(), at: L.now(),
        expiresAt: null, intake: null, consent: { marketing: !!marketing, sms: true }, lessonsDone: [], practice: {}, reminders: {}, emailVerified: false };
      store.put('users', u); L.audit(u.name, 'Account created', u.email);
      return u;
    },
    saveUser: u => store.put('users', u),
    latestTest: uid => store.find('tests', { user_id: uid }).pop() || null,
    reviewTest: uid => store.find('tests', { user_id: uid, status: 'safety_review' })[0] || L.latestTest(uid),
    memberStatus: u => Dom.memberStatus(u, L.now(), L.settings()),
    hasAccess: u => Dom.hasAccess(u, L.now(), L.settings()),

    /* ── messages: inbox + email/SMS, respecting consent ── */
    notify(u, title, body, { sms = false, marketing = false } = {}) {
      if (marketing && !u.consent?.marketing) return;
      store.put('notifications', { id: id('n'), userId: u.id, at: L.now(), title, body, read: false });
      mailer.email({ to: u.email, toName: u.name, subject: `DELTA — ${title}`, text: `Hello ${u.name},\n\n${body}\n\nOpen your portal: ${config.baseUrl}/#/portal\n\nDELTA is an educational wellbeing service and does not diagnose or treat.` });
      if (sms && u.consent?.sms) mailer.sms({ to: u.phone || '', toName: u.name, text: `DELTA: ${title}` });
    },

    /* ── orders & payments ── */
    createOrder(u, type, { withVoice = false, questions = [] } = {}) {
      const s = L.settings();
      const isTest = type === 'experience';
      const kind = isTest ? (store.find('orders', { user_id: u.id, status: 'paid' }).some(o => o.type !== 'voice') ? 'retest' : 'experience') : 'voice';
      const amount = isTest ? s.price + (withVoice ? s.voicePrice : 0) : s.voicePrice;
      const desc = kind === 'voice' ? 'Practitioner voice note' : (kind === 'retest' ? 'DELTA Experience — repeat test (+6 months)' : 'The DELTA Experience (test + 6 months access)') + (withVoice ? ' + voice note' : '');
      const o = { id: id('ord'), userId: u.id, at: L.now(), status: 'pending', type: kind, amount, currency: 'gbp', desc, withVoice, questions: questions.filter(Boolean).slice(0, s.voiceQuestions).map(q => String(q).slice(0, 200)) };
      store.put('orders', o); L.audit(u.name, 'Order created', `${o.id} ${desc} ${money(amount)}`);
      return o;
    },
    /* Idempotent: safe to call from webhook, redirect confirmation and test payments. */
    fulfil(orderId, providerRef, actor = 'Payments') {
      return store.tx(() => {
        const o = store.get('orders', orderId);
        if (!o) throw Object.assign(new Error('Order not found'), { status: 404 });
        if (o.status === 'paid') return o;
        o.status = 'paid'; o.paidAt = L.now(); o.providerRef = providerRef || null; store.put('orders', o);
        const u = L.user(o.userId);
        L.audit(actor, 'Payment received', `${u.name} — ${o.desc} ${money(o.amount)} (${providerRef || 'test'})`);
        if (o.type !== 'voice') {
          const s = L.settings(), t = L.now(), before = u.expiresAt;
          u.expiresAt = Dom.renewedExpiry(u.expiresAt, t, s.accessMonths); L.saveUser(u);
          store.put('tests', { id: id('t'), userId: u.id, orderId: o.id, at: t, created: t, status: 'sample_pending', minerals: [], toxic: {}, issues: [] });
          const wasExpired = before && before <= t;
          L.notify(u, 'Payment receipt', `${o.desc}: ${money(o.amount)}. Access now runs until ${fmtDate(u.expiresAt)}.`);
          L.notify(u, wasExpired ? 'Welcome back — account reactivated' : (o.type === 'retest' ? 'Retest booked' : 'Welcome to DELTA'),
            u.intake?.complete ? 'Your sample kit is on its way. Follow the sample instructions in your portal.' : 'Next step: complete your intake and safety questions in the portal.');
          L.audit('Automation', o.type === 'retest' ? 'Access extended' : 'Access granted', `${u.name}: ${before ? fmtDate(before) : 'none'} → ${fmtDate(u.expiresAt)}`);
        } else L.notify(u, 'Payment receipt', `${o.desc}: ${money(o.amount)}.`);
        if (o.type === 'voice' || o.withVoice) L.createVoiceNote(u, o);
        return o;
      });
    },
    createVoiceNote(u, o) {
      const s = L.settings();
      const vn = { id: id('vn'), userId: u.id, orderId: o.id, at: L.now(), status: 'requested', questions: o.questions || [] };
      store.put('voice_notes', vn);
      L.notify(u, 'Voice note requested', `Expected turnaround: ${s.voiceTurnaround}. You'll be notified privately when it's ready.`);
      mailer.task({ toName: 'Practitioner team', subject: `Voice note requested: ${u.name}` });
      return vn;
    },

    /* ── lab → report pipeline ── */
    ingest(u, t, text, nameOnReport, actor) {
      const res = Dom.parseLab(text);
      if (nameOnReport != null && nameOnReport.trim().toLowerCase() !== u.name.toLowerCase())
        res.issues.unshift({ level: 'error', msg: `Identity check: name on report "${nameOnReport}" does not match client "${u.name}"` });
      Object.assign(t, { raw: text, minerals: res.minerals, toxic: res.toxic, issues: res.issues, receivedAt: t.receivedAt || L.now() });
      L.audit(actor, 'Lab data received', `${u.name} — ${res.issues.length} issue(s)`);
      if (res.issues.length) {
        t.status = 'validation_needed'; t.hadIssues = true; store.put('tests', t);
        L.audit('Automation', 'Sent to exception queue', `${u.name}: ${res.issues.map(i => i.msg).join(' | ')}`);
        return false;
      }
      L.generate(u, t); L.routeAfterGenerate(u, t); return true;
    },
    generate(u, t) {
      Object.assign(t, Dom.buildReport(t.minerals, t.toxic, L.settings().ruleset), { generatedAt: L.now() });
      store.put('tests', t);
      L.audit('Automation', 'Report generated', `${u.name} — rule set ${t.ruleset}, ${t.findings.length} rule(s) matched`);
    },
    routeAfterGenerate(u, t) {
      const review = u.intake?.review_status === 'needs_review' || (t.toxicFlags || []).length > 0;
      if (review) {
        t.status = 'safety_review'; t.wasReviewed = true; store.put('tests', t);
        L.notify(u, 'Your results are in', 'A guide is reviewing your file before your report and any personal programme are released.');
        mailer.task({ toName: 'Practitioner team', subject: `Safety review needed: ${u.name}` });
        L.audit('Automation', 'Routed to safety review', `${u.name}${t.toxicFlags?.length ? ' — toxic element flag' : ''}${u.intake?.review_status === 'needs_review' ? ' — intake flag' : ''}`);
      } else if (L.settings().autoPublish) L.publish(u, t, 'Automation');
      else { t.status = 'ready_to_publish'; store.put('tests', t); L.audit('Automation', 'Ready to publish', u.name); }
    },
    publish(u, t, actor) {
      t.status = 'published'; t.publishedAt = L.now(); store.put('tests', t);
      L.notify(u, 'Your Mineral Intelligence report is ready', 'Open your portal to read your chart, summary, proposed programme and first lessons.', { sms: true });
      L.audit(actor, 'Report published', u.name);
    },

    /* ── scheduled: renewal reminders & expiry (idempotent; runs hourly and on demand) ── */
    runReminders() {
      const s = L.settings(), t = L.now();
      for (const u of store.find('users', { role: 'member' })) {
        if (!u.expiresAt) continue;
        const left = Math.ceil((u.expiresAt - t) / DAY);
        u.reminders = u.reminders || {};
        let changed = false;
        if (left <= 0) {
          const k = u.expiresAt + ':exp';
          if (!u.reminders[k]) { u.reminders[k] = 1; changed = true; L.notify(u, 'Your DELTA access has paused', 'Member learning and groups are paused. Your account and reports are kept safe — renew any time with a new test.'); L.audit('Automation', 'Access expired', u.name); }
        } else for (const d of s.reminderDays) {
          const k = u.expiresAt + ':' + d;
          if (left <= d && !u.reminders[k]) { u.reminders[k] = 1; changed = true; L.notify(u, `Your access renews in ${left} day${left === 1 ? '' : 's'}`, `Order a repeat test before ${fmtDate(u.expiresAt)} — early renewals keep every remaining day.`, { sms: true }); L.audit('Automation', 'Renewal reminder sent', `${u.name} (${left} days left)`); }
        }
        if (changed) L.saveUser(u);
      }
    },
  };

  /* ── seed: content always; personas only in demo mode ── */
  L.seedContent = () => {
    if (store.count('content')) return;
    D.PILLARS.forEach(p => store.put('content', { id: 'lesson_' + p.id, kind: 'lesson', pillarId: p.id, pillar: p.name, title: p.lessons[0], body: p.summary, at: p.n }));
    D.EPISODES.forEach((e, i) => store.put('content', { ...e, kind: 'episode', at: 1000 - i }));
    D.VIDEOS.forEach((v, i) => store.put('content', { ...v, kind: 'video', at: i }));
    D.PARTNERS.forEach((p, i) => store.put('content', { ...p, kind: 'partner', at: i }));
    store.kvSet('founderStory', 'I spent years searching for answers about my own health and energy. Testing my minerals was the first practical step — but the bigger change came from slowing down, getting outside, laughing more and paying attention to what I was feeling. DELTA is the path I wish I had found sooner: practical first, then as deep as you want to go.');
    store.kvSet('settings', DEFAULT_SETTINGS);
  };
  /* Imports the Mineral Man YouTube library once (replacing placeholder videos). Held videos stay hidden until approved. */
  L.importYouTube = () => {
    const all = store.all('content').filter(c => c.kind === 'video');
    if (all.some(v => v.youtubeId)) return 0;
    const yt = require('../shared/youtube-videos.json');
    store.tx(() => {
      all.forEach(v => store.del('content', v.id));
      for (const v of yt.videos) store.put('content', { id: 'yt_' + v.youtubeId, kind: 'video', ...v, access: 'public', status: v.review ? 'review' : 'published', reviewNote: v.review || '', at: v.order });
      L.audit('System', 'YouTube library imported', `${yt.videos.length} videos from ${yt.channel} (${yt.videos.filter(v => v.review).length} held for review)`);
    });
    return yt.videos.length;
  };
  L.seedDemo = () => {
    if (store.count('users')) return;
    const base = Date.now();
    const okIntake = { complete: true, pregnant: 'no', medications: '', conditions: '', under18: 'no', review_status: 'cleared', at: base - 30 * DAY, consent: true };
    const people = [
      { name: 'Founder', email: 'founder@delta.example', role: 'admin' },
      { name: 'Practitioner', email: 'guide@delta.example', role: 'practitioner' },
      { name: 'Moderator', email: 'mod@delta.example', role: 'moderator' },
      { name: 'Sam Taylor', email: 'sam@example.com', buy: [0] },
      { name: 'Alex Morgan', email: 'alex@example.com', buy: [-220, -40], intake: okIntake, labs: [{ Ca: 71, Mg: 2.9, Na: 16, K: 7, Zn: 11, Cu: 3.1 }, D.DEMO_RESULT] },
      { name: 'Jo Rivera', email: 'jo@example.com', buy: [-21], intake: { ...okIntake, medications: 'Levothyroxine 50mcg', review_status: 'needs_review' }, labs: [{ Ca: 55, Mg: 3.6, Na: 24, K: 9, Zn: 10.5, Cu: 2.1 }] },
      { name: 'Pat Okafor', email: 'pat@example.com', buy: [-18], intake: okIntake, rawlab: 'Ca, 48, mg%\nMg, 5.1, mg%\nNa, 210, ppm\nK, 9, mg%\nZn, 17, mg%\nPb, 0.03, mg%' },
      { name: 'Lee Chen', email: 'lee@example.com', buy: [-12], intake: okIntake, stage: 'lab_processing' },
      { name: 'Chris Byrne', email: 'chris@example.com', buy: [-200], intake: okIntake, labs: [{ Ca: 44, Mg: 5.5, Na: 26, K: 10, Zn: 15, Cu: 1.9 }] },
      { name: 'Dana Price', email: 'dana@example.com', buy: [-160], intake: okIntake, labs: [{ Ca: 52, Mg: 4.4, Na: 22, K: 6, Zn: 13, Cu: 2.4 }] },
    ];
    store.tx(() => {
      for (const p of people) {
        const u = L.withNow(base - 240 * DAY, () => L.createUser({ name: p.name, email: p.email, role: p.role || 'member' }));
        u.emailVerified = true; u.demo = true;
        if (u.role === 'member') Object.assign(u, { phone: '+44 7700 900' + String(100 + people.indexOf(p)), nationality: ['British', 'Spanish', 'Irish', 'British', 'Nigerian', 'Chinese', 'Irish', 'British'][people.indexOf(p) % 8], dob: `19${70 + people.indexOf(p) * 3}-0${1 + people.indexOf(p) % 9}-15` });
        if (p.intake) u.intake = { ...p.intake };
        L.saveUser(u);
        (p.buy || []).forEach((d, i) => L.withNow(base + d * DAY, () => {
          const o = L.createOrder(L.user(u.id), 'experience'); L.fulfil(o.id, 'demo-seed', 'Seed');
          const t = L.latestTest(u.id);
          if (p.labs?.[i]) { t.status = 'lab_processing'; L.ingest(L.user(u.id), t, Dom.demoLab(p.labs[i]), p.name, 'Seed'); }
        }));
        if (p.rawlab) L.ingest(L.user(u.id), L.latestTest(u.id), p.rawlab, p.name, 'Seed');
        if (p.stage) { const t = L.latestTest(u.id); t.status = p.stage; store.put('tests', t); }
      }
      const alex = store.byEmail('alex@example.com'); alex.lessonsDone = ['body:0', 'body:1', 'rest:0', 'ground:0']; L.saveUser(alex);
      L.withNow(base - 3 * DAY, () => { const o = L.createOrder(alex, 'voice', { questions: ['Why is my magnesium low?', 'What should I focus on first?'] }); L.fulfil(o.id, 'demo-seed', 'Seed'); });
      const by = e => store.byEmail(e).id;
      [['joke', 'I tried to write a joke about sodium. Na.', 'Alex', 5, 'approved', 14, 'alex@example.com'],
       ['story', 'Tried the evening wind-down routine. Fell asleep during the "relaxing music" setup. 10/10.', 'Anonymous', 3, 'approved', 22, 'dana@example.com'],
       ['video', 'Otters holding hands', 'Dana', 2, 'approved', 9, 'dana@example.com', 'https://www.youtube.com/results?search_query=otters+holding+hands'],
       ['joke', 'Why did the zinc refuse to argue? It was too well grounded.', 'Jo', 1, 'pending', 0, 'jo@example.com'],
       ['video', 'Best cat fails', 'Anonymous', 0.04, 'pending', 0, 'chris@example.com', 'http://bit.ly/x9', 'Shortened link — check destination']]
        .forEach(([type, text, byName, ago, status, loves, email, url, flag]) => store.put('laughs', { id: id('l'), userId: by(email), type, text, by: byName, at: base - ago * DAY, status, loves, url: url || '', flag: flag || '', lovedBy: [] }));
      [['ground', 'Dana', 'dana@example.com', 4, 'Tried the lying version of the Energy Circuit tonight — so much calmer than I expected.', 5, [{ by: 'Alex', at: base - 3 * DAY, text: 'Same! The standing one is harder for me.' }]],
       ['move', 'Alex', 'alex@example.com', 2, 'Anyone else doing the brisk-walk challenge this week? Rainy but worth it.', 3, []],
       ['general', 'Anonymous member', 'chris@example.com', 1, 'Has anyone stopped their medication because of their results?', 0, [], 'Possible medical advice — needs escalation guidance']]
        .forEach(([group, byName, email, ago, text, loves, replies, reportReason]) => store.put('posts', { id: id('p'), userId: by(email), kind: group, group, by: byName, at: base - ago * DAY, text, loves, lovedBy: [], replies, reported: !!reportReason, reportReason: reportReason || '' }));
      L.audit('System', 'Demo data created', 'Seed members, reports and queues');
    });
  };
  return L;
}
module.exports = { createLogic, DEFAULT_SETTINGS };
