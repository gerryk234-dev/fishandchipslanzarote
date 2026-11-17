/* Every change the browser can ask for. Each action declares who may call it; the server
   re-checks everything (role, ownership, membership) — the browser is never trusted. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const D = require('../shared/data.js');
const { NATIONALITIES } = require('../shared/countries.js');
const Dom = require('../shared/domain.js');
const { can } = require('./state.js');

const fail = (msg, status = 400) => { throw Object.assign(new Error(msg), { status }); };
const need = (cond, msg, status) => { if (!cond) fail(msg, status); };
const str = (v, max = 500) => String(v ?? '').trim().slice(0, max);
const GROUPS = [...D.PILLARS.map(p => p.id), 'awakening', 'general'];

function createActions(store, L, auth, payments, mailer, config, oauth) {
  /* Registration details: phone, nationality, date of birth (with the minimum age from settings). */
  const readProfile = body => {
    const phone = Dom.normalizePhone(body.phone);
    need(phone, 'Please enter a valid phone number, including the country code (for example +44 7700 900123).');
    need(NATIONALITIES.includes(body.nationality), 'Please choose your nationality.');
    const dob = String(body.dob || '');
    const age = Dom.ageOn(dob, L.now());
    need(age != null && age >= 0 && age < 120 && Date.parse(dob) < L.now(), 'Please enter a valid date of birth.');
    need(age >= L.settings().minAge, `Sorry — DELTA is for adults aged ${L.settings().minAge} and over.`);
    return { phone, nationality: body.nationality, dob };
  };
  const registerNew = (body, res) => {
    const email = str(body.email, 200).toLowerCase(), name = str(body.name, 80);
    need(name, 'Please enter your name.');
    need(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Please enter a valid email address.');
    need(!store.byEmail(email), 'There is already a DELTA account with that email — please sign in instead.', 409);
    const profile = readProfile(body);
    const u = L.createUser({ name, email, marketing: !!body.marketing, ...profile });
    auth.startSession(res, u.id);
    auth.sendVerification(u);
    return u;
  };
  const saveFile = (ownerId, kind, f, allowed) => {
    if (!f || !f.b64) return null;
    const buf = Buffer.from(String(f.b64), 'base64');
    need(buf.length > 0 && buf.length <= config.maxUploadMb * 1048576, `Files must be under ${config.maxUploadMb} MB.`);
    need(allowed(f.mime || '', buf), 'That file type is not allowed here.');
    const fid = L.id('f'), dir = path.join(config.dataDir, 'uploads');
    fs.mkdirSync(dir, { recursive: true });
    const p = path.join(dir, fid);
    fs.writeFileSync(p, buf);
    store.addFile({ id: fid, user_id: ownerId, kind, name: str(f.name, 120) || kind, mime: f.mime, size: buf.length, path: p, at: L.now() });
    return fid;
  };
  const isPdf = (mime, buf) => mime === 'application/pdf' && buf.subarray(0, 5).toString() === '%PDF-';
  const isAudio = mime => /^audio\/(mpeg|mp4|x-m4a|aac|wav|x-wav|webm|ogg)$/.test(mime);
  const member = uid => { const u = L.user(uid); need(u && u.role === 'member', 'Member not found', 404); return u; };
  const test = (u, tid) => { const t = tid ? store.get('tests', tid) : L.latestTest(u.id); need(t && t.userId === u.id, 'Test not found', 404); return t; };
  const content = (kind, cid) => { const c = store.get('content', cid); need(c && c.kind === kind, 'Not found', 404); return c; };

  /* perm: 'public' | 'auth' | 'member' (signed in with active access) | an admin area path. demo: only in demo mode. */
  const A = {
    /* ── public ── */
    'login-request': { perm: 'public', fn: ({ body, ip }) => { auth.requestLink(body.email, ip); return { toast: 'If that email has a DELTA account, a sign-in link is on its way. It expires in 20 minutes.', sent: true }; } },
    'dev-login': { perm: 'public', demo: true, fn: ({ body, res }) => { const u = L.user(body.id); need(u && u.demo, 'Unknown persona'); auth.startSession(res, u.id); L.audit(u.name, 'Signed in', 'demo persona'); return { go: u.role === 'member' ? '/portal' : '/admin' }; } },
    logout: { perm: 'public', fn: ({ req, res }) => { auth.endSession(req, res); return { go: '/' }; } },
    checkout: { perm: 'public', fn: async ({ user, body, res }) => {
      need(body.terms, 'Please accept the terms to continue.');
      const u = user || registerNew(body, res);
      need(u.role === 'member', 'Staff accounts cannot buy the DELTA Experience.');
      const o = L.createOrder(u, 'experience', { withVoice: !!body.voice });
      return payments.checkout(o, u);
    } },
    register: { perm: 'public', fn: ({ user, body, res }) => {
      need(!user, 'You are already signed in.');
      need(body.terms, 'Please accept the terms and privacy notice to continue.');
      const u = registerNew(body, res);
      return { toast: `Welcome, ${u.name.split(' ')[0]}! We've emailed you a link to confirm your address.`, go: '/join' };
    } },
    profile: { perm: 'auth', fn: ({ user, body }) => {
      const name = str(body.name, 80); need(name, 'Please enter your name.');
      Object.assign(user, { name }, readProfile(body)); L.saveUser(user);
      L.audit(user.name, 'Profile updated', ''); return { toast: 'Your details are saved.' };
    } },
    'resend-verification': { perm: 'auth', fn: ({ user }) => { need(!user.emailVerified, 'Your email is already confirmed.'); auth.sendVerification(user); return { toast: 'Confirmation link sent — check your inbox.' }; } },
    'pay-test': { perm: 'auth', fn: ({ user, body }) => {
      need(payments.mode === 'test', 'Test payments are disabled.');
      const o = store.get('orders', body.orderId); need(o && o.userId === user.id, 'Order not found', 404);
      L.fulfil(o.id, 'test-' + crypto.randomBytes(4).toString('hex'), 'Test payment');
      return { toast: 'Test payment complete. Receipt sent.', go: o.type === 'voice' ? '/account' : (L.user(user.id).intake?.complete ? '/portal' : '/intake') };
    } },
    'confirm-stripe': { perm: 'auth', fn: async ({ user, body }) => { const o = await payments.confirm(body.sessionId); need(o && o.userId === user.id, 'Payment not confirmed yet — please refresh in a moment.'); return { toast: 'Payment received. Thank you!', go: o.type === 'voice' ? '/account' : (L.user(user.id).intake?.complete ? '/portal' : '/intake') }; } },
    contact: { perm: 'public', fn: ({ body, ip }) => { need(!auth.limited('contact:' + ip, 5, 3600e3), 'Too many messages — please try later.', 429); need(str(body.msg), 'Please write a message.'); mailer.task({ toName: 'DELTA team', subject: `Contact form: ${str(body.name, 80)} <${str(body.email, 120)}>`, text: str(body.msg, 4000) }); L.audit(str(body.name, 80) || 'Visitor', 'Contact message', str(body.email, 120)); return { toast: 'Thanks — we\'ll reply by email.' }; } },
    'partner-click': { perm: 'public', fn: ({ user, body }) => { const p = content('partner', body.id); p.clicks = (p.clicks || 0) + 1; store.put('content', p); L.audit(L.actorName(user), 'Partner click', p.name); return { open: p.url || null, toast: p.url ? null : `Outbound click to ${p.name} tracked (no partner URL set yet).` }; } },

    /* ── any signed-in person ── */
    intake: { perm: 'auth', fn: ({ user, body }) => {
      need(body.edu && body.consent, 'Please confirm both statements to continue.');
      if (!Dom.profileComplete(user)) Object.assign(user, readProfile(body)); // e.g. joined with Google/Apple
      const age = Dom.ageOn(user.dob, L.now());
      if (age != null) body.under18 = age < 18 ? 'yes' : 'no'; // date of birth is authoritative
      const pick = (v, ok) => ok.includes(v) ? v : ok[0];
      const i = { complete: true, pregnant: pick(body.pregnant, ['no', 'yes', 'unspecified']), under18: pick(body.under18, ['no', 'yes']), medications: str(body.medications, 1000), conditions: str(body.conditions, 1000), at: L.now(), consent: true };
      const wasCleared = user.intake?.review_status === 'cleared' && user.intake.medications === i.medications && user.intake.conditions === i.conditions && user.intake.pregnant === i.pregnant && user.intake.under18 === i.under18;
      i.review_status = Dom.intakeNeedsReview(i) && !wasCleared ? 'needs_review' : 'cleared';
      user.intake = i; L.saveUser(user);
      L.audit(user.name, 'Intake completed', i.review_status.replace('_', ' '));
      if (i.review_status === 'needs_review') mailer.task({ toName: 'Practitioner team', subject: `Safety review needed: ${user.name}` });
      L.notify(user, 'Sample instructions', 'Wash with plain shampoo 24 hours before, cut a small sample from the nape of the neck close to the scalp, and post it back in the envelope provided.');
      return { go: '/portal' };
    } },
    'mark-read': { perm: 'auth', fn: ({ user }) => { for (const n of store.find('notifications', { user_id: user.id })) if (!n.read) store.put('notifications', { ...n, read: true }); return {}; } },
    consent: { perm: 'auth', fn: ({ user, body }) => { need(['marketing', 'sms'].includes(body.k), 'Unknown setting'); user.consent[body.k] = !!body.v; L.saveUser(user); L.audit(user.name, 'Consent updated', `${body.k}=${!!body.v}`); return {}; } },
    export: { perm: 'auth', fn: ({ user }) => {
      L.audit(user.name, 'Data export', '');
      const data = { exportedAt: new Date(L.now()).toISOString(), profile: { name: user.name, email: user.email, createdAt: user.createdAt }, membership: { expiresAt: user.expiresAt ? new Date(user.expiresAt).toISOString() : null, status: L.memberStatus(user) }, intake: user.intake, consent: user.consent,
        orders: store.find('orders', { user_id: user.id }), tests: store.find('tests', { user_id: user.id }), lessonsDone: user.lessonsDone, messages: store.find('notifications', { user_id: user.id }), voiceNotes: store.find('voice_notes', { user_id: user.id }), files: store.filesFor(user.id) };
      return { download: { name: `delta-data-${user.id}.json`, text: JSON.stringify(data, null, 2) } };
    } },
    'delete-request': { perm: 'auth', fn: ({ user }) => { L.audit(user.name, 'Deletion requested', user.email); mailer.task({ toName: 'Data protection', subject: `Deletion request: ${user.name}` }); L.notify(user, 'Deletion request received', 'We will respond within one month, as required by UK GDPR.'); return { toast: 'Deletion request sent.' }; } },
    'voice-checkout': { perm: 'auth', fn: ({ user, body }) => {
      need(store.find('tests', { user_id: user.id, status: 'published' }).length, 'Voice notes are available once your report is published.');
      const o = L.createOrder(user, 'voice', { questions: Array.isArray(body.questions) ? body.questions.map(q => str(q, 200)) : [] });
      return payments.checkout(o, user);
    } },
    'sample-sent': { perm: 'auth', fn: ({ user }) => { L.audit(user.name, 'Client posted sample', ''); return { toast: 'Thanks — we\'ll let you know when the lab receives it.' }; } },
    simulate: { perm: 'auth', demo: true, fn: ({ user }) => { const t = L.latestTest(user.id); need(t && user.intake?.complete && ['sample_pending', 'lab_processing'].includes(t.status), 'Nothing to simulate.'); t.status = 'lab_processing'; L.ingest(user, t, Dom.demoLab(), user.name, 'Demo'); return { toast: `Results received — now: ${Dom.stageLabel(store.get('tests', t.id).status)}.` }; } },

    /* ── active members ── */
    'lesson-done': { perm: 'member', fn: ({ user, body }) => { const [p, i] = String(body.key).split(':'); const pil = D.PILLARS.find(x => x.id === p); need(pil && pil.lessons[+i], 'Unknown lesson'); if (!user.lessonsDone.includes(body.key)) user.lessonsDone.push(body.key); L.saveUser(user); L.audit(user.name, 'Lesson completed', body.key); return {}; } },
    practice: { perm: 'member', fn: ({ user, body }) => { const k = new Date(L.now()).toISOString().slice(0, 10), i = +body.i; need(i >= 0 && i < 4, 'Unknown item'); const a = new Set(user.practice[k] || []); body.on ? a.add(i) : a.delete(i); user.practice = { [k]: [...a] }; L.saveUser(user); return { quiet: true }; } },
    laugh: { perm: 'member', fn: ({ user, body }) => {
      const url = str(body.url, 300); need(str(body.text), 'Please add some text.');
      need(!url || /^https?:\/\//i.test(url), 'Links must start with https://');
      const flag = url ? (/bit\.ly|tinyurl|t\.co\//i.test(url) ? 'Shortened link — check destination' : !/^https:\/\//i.test(url) ? 'Not HTTPS' : '') : '';
      store.put('laughs', { id: L.id('l'), userId: user.id, type: ['joke', 'video', 'story'].includes(body.type) ? body.type : 'joke', text: str(body.text, 500), url, by: body.anon ? 'Anonymous' : (str(body.by, 40) || user.name), at: L.now(), status: 'pending', loves: 0, lovedBy: [], flag });
      L.audit(user.name, 'LAUGHOLOGY submission', ''); return { toast: 'Thanks! A moderator will review it before it appears.' };
    } },
    love: { perm: 'member', fn: ({ user, body }) => { const l = store.get('laughs', body.id); need(l && l.status === 'approved', 'Not found', 404); l.lovedBy = l.lovedBy || []; if (!l.lovedBy.includes(user.id)) { l.lovedBy.push(user.id); l.loves++; store.put('laughs', l); } return { quiet: true }; } },
    'report-laugh': { perm: 'member', fn: ({ user, body }) => { const l = store.get('laughs', body.id); need(l, 'Not found', 404); l.status = 'pending'; l.flag = 'Reported by a member'; store.put('laughs', l); L.audit(user.name, 'Submission reported', l.text.slice(0, 40)); return { toast: 'Thanks — a moderator will review it.' }; } },
    post: { perm: 'member', fn: ({ user, body }) => { need(GROUPS.includes(body.group), 'Unknown group'); need(str(body.text), 'Please write something.'); store.put('posts', { id: L.id('p'), userId: user.id, kind: body.group, group: body.group, by: body.anon ? 'Anonymous member' : user.name, at: L.now(), text: str(body.text, 1000), loves: 0, lovedBy: [], replies: [], reported: false }); return {}; } },
    reply: { perm: 'member', fn: ({ user, body }) => { const p = store.get('posts', body.id); need(p && !p.removed, 'Not found', 404); need(str(body.text), 'Please write a reply.'); p.replies.push({ by: user.name, at: L.now(), text: str(body.text, 1000) }); store.put('posts', p); return {}; } },
    'post-love': { perm: 'member', fn: ({ user, body }) => { const p = store.get('posts', body.id); need(p, 'Not found', 404); p.lovedBy = p.lovedBy || []; if (!p.lovedBy.includes(user.id)) { p.lovedBy.push(user.id); p.loves++; store.put('posts', p); } return { quiet: true }; } },
    'post-report': { perm: 'member', fn: ({ user, body }) => { const p = store.get('posts', body.id); need(p, 'Not found', 404); p.reported = true; p.reportReason = str(body.reason, 300) || 'No reason given'; store.put('posts', p); L.audit(user.name, 'Post reported', p.text.slice(0, 40)); return { toast: 'Reported to moderators.' }; } },

    /* ── staff ── */
    'set-role': { perm: '/admin/members', fn: ({ user, body }) => {
      need(user.role === 'admin', 'Only an admin can change roles.', 403);
      const u = L.user(body.id); need(u, 'Not found', 404); need(['member', 'practitioner', 'moderator', 'support', 'admin'].includes(body.role), 'Unknown role');
      if (u.role === 'admin' && body.role !== 'admin') need(store.find('users', { }).filter(x => x.role === 'admin').length > 1, 'There must always be at least one admin.');
      L.audit(L.actorName(user), 'Role changed', `${u.name}: ${u.role} → ${body.role}`); u.role = body.role; L.saveUser(u); return {};
    } },
    'set-stage': { perm: '/admin/members', fn: ({ user, body }) => { need(user.role !== 'support', 'Support cannot change workflow.', 403); const u = member(body.id), t = test(u); need(Dom.TEST_STATUSES.includes(body.stage), 'Unknown stage'); need(body.stage !== 'published' || t.generatedAt, 'A report must be generated before it can be published.'); L.audit(L.actorName(user), 'Workflow corrected manually', `${u.name}: ${t.status} → ${body.stage}`); t.status = body.stage; if (body.stage === 'published') t.publishedAt = t.publishedAt || L.now(); store.put('tests', t); return {}; } },
    'set-expiry': { perm: '/admin/members', fn: ({ user, body }) => { need(['admin', 'support'].includes(user.role), 'Not allowed', 403); const u = member(body.id); const t = Date.parse(body.date + 'T23:59:00Z'); need(Number.isFinite(t) && str(body.reason), 'A valid date and a reason are required.'); const old = u.expiresAt; u.expiresAt = t; u.reminders = {}; L.saveUser(u); L.audit(L.actorName(user), 'Expiry overridden', `${u.name}: ${L.fmtDate(old)} → ${L.fmtDate(t)} — ${str(body.reason, 200)}`); return {}; } },
    'sample-received': { perm: '/admin/members', fn: ({ user, body }) => { const u = member(body.id), t = test(u); need(t.status === 'sample_pending', 'This test is not awaiting a sample.'); t.status = 'lab_processing'; store.put('tests', t); L.notify(u, 'Sample received', 'Your sample has arrived at the laboratory.'); L.audit(L.actorName(user), 'Sample received', u.name); return {}; } },
    upload: { perm: '/admin/upload', fn: ({ user, body }) => {
      const u = member(body.userId), t = test(u);
      need(['lab_processing', 'sample_pending'].includes(t.status), 'This client is not waiting for results.');
      need(u.intake?.complete, 'The client has not completed intake yet.');
      const fid = saveFile(u.id, 'lab-report', body.pdf, isPdf); if (fid) t.pdfFile = fid;
      const ok = L.ingest(u, t, str(body.data, 20000), str(body.name, 120), L.actorName(user));
      const after = store.get('tests', t.id);
      return { toast: ok ? `${u.name}: validated — ${Dom.stageLabel(after.status)}.` : `${u.name}: ${after.issues.length} issue(s) — sent to the exception queue.`, go: ok ? (after.status === 'safety_review' ? '/admin/safety' : '/admin/reports') : '/admin/exceptions' };
    } },
    fix: { perm: '/admin/exceptions', fn: ({ user, body }) => {
      const u = member(body.userId), t = test(u); need(t.status === 'validation_needed', 'Not in the exception queue.'); need(str(body.note), 'A correction note is required.');
      const vals = body.values || {};
      const text = [...D.MINERALS, ...D.TOXIC].filter(m => vals[m.name] !== '' && vals[m.name] != null).map(m => `${m.name}, ${vals[m.name]}, ${m.unit}`).join('\n');
      L.audit(L.actorName(user), 'Exception corrected', `${u.name} — ${str(body.note, 300)}`);
      t.originalRaw = t.originalRaw || t.raw;
      const ok = L.ingest(u, t, text, null, L.actorName(user));
      return { toast: ok ? `${u.name} validated — ${Dom.stageLabel(store.get('tests', t.id).status)}.` : 'Still has issues — see the list.' };
    } },
    'reject-lab': { perm: '/admin/exceptions', fn: ({ user, body }) => { const u = member(body.id), t = test(u); t.status = 'sample_pending'; t.issues = []; t.rejectedAt = L.now(); store.put('tests', t); L.notify(u, 'We need a new sample', 'The laboratory could not complete your analysis. A replacement kit is on its way at no extra cost.'); L.audit(L.actorName(user), 'Lab result rejected — resample', u.name); return {}; } },
    safety: { perm: '/admin/safety', fn: ({ user, body }) => {
      need(['admin', 'practitioner'].includes(user.role), 'Only a practitioner can clear safety reviews.', 403);
      const u = member(body.userId), t = L.reviewTest(u.id), note = str(body.note, 500);
      need(note, 'A review note is required.'); need(u.intake, 'No intake on file.');
      u.intake.review_note = note;
      if (body.decision === 'escalate') { L.saveUser(u); L.audit(L.actorName(user), 'Escalated to clinician', `${u.name} — ${note}`); mailer.task({ toName: 'Responsible clinician', subject: `Escalation: ${u.name}`, text: note }); return { toast: 'Escalated. The file stays held.' }; }
      u.intake.review_status = 'cleared'; u.intake.reviewedBy = user.name; u.intake.reviewedAt = L.now(); L.saveUser(u);
      if (body.decision === 'general' && t?.findings) {
        t.programme = t.programme.filter((_, i) => !(t.findings[i]?.supplement));
        t.findings = t.findings.map(x => ({ ...x, supplement: false }));
        t.sections.guide = 'Your chart and general lessons are available. Personal supplement guidance was not included after review — please discuss supplements with your GP or pharmacist.';
        store.put('tests', t);
      }
      L.audit(L.actorName(user), 'Safety review cleared', `${u.name} — ${body.decision === 'general' ? 'supplements withheld' : 'cleared'} — ${note}`);
      if (t && t.status === 'safety_review') { if (L.settings().autoPublish) L.publish(u, t, L.actorName(user)); else { t.status = 'ready_to_publish'; store.put('tests', t); } }
      return { toast: `${u.name} cleared.` };
    } },
    publish: { perm: '/admin/reports', fn: ({ user, body }) => { const u = member(body.userId), t = test(u, body.testId); need(t.status === 'ready_to_publish', 'Only reports that are ready can be published here.'); L.publish(u, t, L.actorName(user)); return { toast: `Published ${u.name}'s report.` }; } },
    'report-edit': { perm: '/admin/reports', fn: ({ user, body }) => {
      const u = member(body.userId), t = test(u, body.testId); need(t.generatedAt, 'No report to edit.');
      for (const k of ['patterns', 'ratios', 'notes', 'guide', 'nextStep']) t.sections[k] = str(body[k], 3000);
      t.programme = String(body.programme || '').split('\n').map(s => s.trim()).filter(Boolean).slice(0, 30);
      t.edited = true; t.editedBy = user.name; store.put('tests', t);
      L.audit(L.actorName(user), 'Report edited', `${u.name} (${t.id})`);
      if (body.status === 'published' && t.status === 'ready_to_publish') L.publish(u, t, L.actorName(user));
      return { toast: 'Report updated.', go: '/admin/reports' };
    } },
    chart: { perm: '/admin/analyses', fn: ({ user, body }) => {
      const u = member(body.userId), t = test(u, body.testId);
      need(Array.isArray(body.minerals) && body.minerals.length === t.minerals.length, 'Invalid values');
      const ms = t.minerals.map((m, i) => { const x = body.minerals[i]; const v = +x.value, lo = +x.low, hi = +x.high; need([v, lo, hi].every(Number.isFinite) && lo < hi, `${m.label}: check the numbers`); return { ...m, value: v, low: lo, high: hi }; });
      const secs = Object.fromEntries(['patterns', 'ratios', 'guide', 'nextStep'].map(k => [k, str(body.sections?.[k], 3000)]));
      if (body.mode === 'next') {
        const nt = { id: L.id('t'), userId: u.id, at: L.now(), created: L.now(), status: 'published', minerals: ms, toxic: {}, issues: [], manual: true, receivedAt: L.now(), enteredBy: user.name };
        Object.assign(nt, Dom.buildReport(ms, {}, L.settings().ruleset), { generatedAt: L.now(), publishedAt: L.now() }); Object.assign(nt.sections, secs);
        store.put('tests', nt); L.audit(L.actorName(user), 'Manual test added (client charts)', u.name);
        return { toast: 'Saved as the next test — the progress chart now includes it.' };
      }
      t.minerals = ms; Object.assign(t.sections || (t.sections = {}), secs); t.edited = true; store.put('tests', t);
      L.audit(L.actorName(user), 'Client chart edited', `${u.name} (${t.id})`); return { toast: 'Section saved.' };
    } },
    'voice-deliver': { perm: '/admin/voice', fn: ({ user, body }) => {
      need(['admin', 'practitioner'].includes(user.role), 'Only a practitioner can deliver voice notes.', 403);
      const v = store.get('voice_notes', body.id); need(v && v.status === 'requested', 'Not found', 404);
      const u = L.user(v.userId);
      const fid = saveFile(u.id, 'voice-note', body.audio, isAudio);
      need(fid || str(body.transcript), 'Upload an audio file or write the transcript.');
      Object.assign(v, { status: 'delivered', deliveredAt: L.now(), audioFile: fid, audioName: body.audio?.name ? str(body.audio.name, 120) : '', transcript: str(body.transcript, 5000) + (body.refer ? '\n\nSome of your questions are best answered by your GP or another qualified professional.' : ''), by: user.name });
      store.put('voice_notes', v); L.notify(u, 'Your practitioner voice note is ready', 'Listen privately in your account.'); L.audit(L.actorName(user), 'Voice note delivered', u.name); return {};
    } },
    lesson: { perm: '/admin/lessons', fn: ({ user, body }) => { const l = content('lesson', 'lesson_' + body.id); l.title = str(body.title, 200); l.body = str(body.body, 5000); l.release = str(body.release, 10); store.put('content', l); L.audit(L.actorName(user), 'Lesson edited', l.pillar); return { toast: 'Saved ' + l.pillar }; } },
    story: { perm: '/admin/content', fn: ({ user, body }) => { store.kvSet('founderStory', str(body.story, 10000)); L.audit(L.actorName(user), 'Founder story edited', ''); return { toast: 'Story saved.' }; } },
    episode: { perm: '/admin/content', fn: ({ user, body }) => {
      need(str(body.title) && /^\d{4}-\d{2}-\d{2}$/.test(body.date), 'Title and date are required.');
      const eps = store.all('content').filter(c => c.kind === 'episode');
      const e = { id: L.id('e'), kind: 'episode', n: Math.max(0, ...eps.map(x => x.n)) + 1, title: str(body.title, 200), date: body.date, topics: str(body.topics, 200).split(',').map(s => s.trim()).filter(Boolean), host: 'Founder', guest: str(body.guest, 100), mins: 30, access: body.access === 'members' ? 'members' : 'public', desc: str(body.desc, 2000), at: L.now() };
      store.put('content', e);
      for (const u of store.find('users', { role: 'member' })) if (L.hasAccess(u)) L.notify(u, 'New podcast episode', e.title, { marketing: true });
      L.audit(L.actorName(user), 'Episode added', e.title); return {};
    } },
    'ep-access': { perm: '/admin/content', fn: ({ user, body }) => { const e = content('episode', body.id); e.access = e.access === 'public' ? 'members' : 'public'; store.put('content', e); L.audit(L.actorName(user), 'Episode access', `${e.title}: ${e.access}`); return {}; } },
    'ep-feature': { perm: '/admin/content', fn: ({ user, body }) => { content('episode', body.id); for (const e of store.all('content').filter(c => c.kind === 'episode')) { e.featured = e.id === body.id; store.put('content', e); } L.audit(L.actorName(user), 'Episode featured', body.id); return {}; } },
    'ep-archive': { perm: '/admin/content', fn: ({ user, body }) => { const e = content('episode', body.id); e.archived = !e.archived; store.put('content', e); L.audit(L.actorName(user), e.archived ? 'Episode archived' : 'Episode restored', e.title); return {}; } },
    video: { perm: '/admin/content', fn: ({ user, body }) => { need(str(body.title), 'Title is required.'); const v = { id: L.id('v'), kind: 'video', title: str(body.title, 200), cat: str(body.cat, 60) || 'Minerals', pillar: D.PILLARS.some(p => p.id === body.pillar) ? body.pillar : '', access: body.access === 'public' ? 'public' : 'members', mins: 5, at: L.now() }; store.put('content', v); L.audit(L.actorName(user), 'Video added', v.title); return {}; } },
    'vid-publish': { perm: '/admin/content', fn: ({ user, body }) => { const v = content('video', body.id); v.status = 'published'; v.reviewedBy = user.name; v.reviewedAt = L.now(); store.put('content', v); L.audit(L.actorName(user), 'Video approved for the website', v.title); return { toast: 'Published on the website.' }; } },
    'vid-hold': { perm: '/admin/content', fn: ({ user, body }) => { const v = content('video', body.id); v.status = 'review'; v.reviewNote = v.reviewNote || 'Held by ' + user.name; store.put('content', v); L.audit(L.actorName(user), 'Video held for review', v.title); return {}; } },
    'video-youtube': { perm: '/admin/content', fn: async ({ user, body }) => {
      const m = String(body.url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([\w-]{11})/);
      need(m, 'Paste a YouTube video link, e.g. https://www.youtube.com/watch?v=…');
      const yid = m[1]; need(!store.get('content', 'yt_' + yid), 'That video is already in the library.');
      let title = str(body.title, 200);
      if (!title) {
        try { const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=' + yid)}`); if (r.ok) title = str((await r.json()).title, 200); } catch { /* offline: ask for a title */ }
        need(title, 'Could not look up the title — please type it in.');
      }
      const vids = store.all('content').filter(c => c.kind === 'video');
      const cat = str(body.cat, 60) || 'Awakening & consciousness';
      const v = { id: 'yt_' + yid, kind: 'video', youtubeId: yid, title, cat, pillar: D.PILLARS.some(p => p.id === body.pillar) ? body.pillar : '', awakening: !body.pillar, mins: 0, length: '', year: String(new Date(L.now()).getUTCFullYear()), published: '', order: Math.max(0, ...vids.map(x => x.order || 0)) + 1, access: 'public', status: 'published', at: L.now() };
      store.tx(() => { store.put('content', v); L.audit(L.actorName(user), 'Video added from YouTube', title); });
      return { toast: `Added "${title}".` };
    } },
    'vid-access': { perm: '/admin/content', fn: ({ user, body }) => { const v = content('video', body.id); v.access = v.access === 'public' ? 'members' : 'public'; store.put('content', v); L.audit(L.actorName(user), 'Video access', `${v.title}: ${v.access}`); return {}; } },
    'vid-archive': { perm: '/admin/content', fn: ({ user, body }) => { const v = content('video', body.id); v.archived = !v.archived; store.put('content', v); L.audit(L.actorName(user), v.archived ? 'Video archived' : 'Video restored', v.title); return {}; } },
    'mod-laugh': { perm: '/admin/moderation', fn: ({ user, body }) => { const l = store.get('laughs', body.id); need(l, 'Not found', 404); need(['approved', 'rejected'].includes(body.v), 'Unknown decision'); l.status = body.v; l.flag = ''; store.put('laughs', l); L.audit(L.actorName(user), `Submission ${body.v}`, l.text.slice(0, 50)); return {}; } },
    'mod-post': { perm: '/admin/moderation', fn: ({ user, body }) => {
      const p = store.get('posts', body.id); need(p, 'Not found', 404);
      if (body.v === 'remove') p.removed = true;
      if (body.v === 'signpost') p.replies.push({ by: 'DELTA Moderator', at: L.now(), text: 'Thanks for sharing. Please don\'t change or stop any medication without speaking to your GP or pharmacist first. DELTA reports are educational and can\'t replace medical advice.' });
      p.reported = false; store.put('posts', p); L.audit(L.actorName(user), `Reported post: ${body.v}`, p.text.slice(0, 50)); return {};
    } },
    partner: { perm: '/admin/partners', fn: ({ user, body }) => { need(str(body.name) && str(body.desc), 'Name and description are required.'); const url = str(body.url, 300); need(!url || /^https:\/\//i.test(url), 'Partner links must start with https://'); const p = { id: L.id('pt'), kind: 'partner', name: str(body.name, 100), cat: D.PARTNERS.some(x => x.cat === body.cat) ? body.cat : D.PARTNERS[0].cat, desc: str(body.desc, 500), code: str(body.code, 40), url, paid: !!body.paid, affiliate: !!body.affiliate, active: true, clicks: 0, at: L.now() }; store.put('content', p); L.audit(L.actorName(user), 'Partner added', p.name); return {}; } },
    'partner-toggle': { perm: '/admin/partners', fn: ({ user, body }) => { const p = content('partner', body.id); p.active = !p.active; store.put('content', p); L.audit(L.actorName(user), p.active ? 'Partner activated' : 'Partner paused', p.name); return {}; } },
    settings: { perm: '/admin/settings', fn: ({ user, body }) => {
      const num = (v, min, max) => { const n = +v; need(Number.isFinite(n) && n >= min && n <= max, 'Check the numbers.'); return n; };
      const days = String(body.reminderDays || '').split(',').map(x => parseInt(x, 10)).filter(x => x > 0 && x < 180).sort((a, b) => b - a);
      const s = { ...L.settings(), price: num(body.price, 1, 10000), voicePrice: num(body.voicePrice, 1, 1000), voiceQuestions: Math.round(num(body.voiceQuestions, 1, 10)), voiceTurnaround: str(body.voiceTurnaround, 60) || '5 working days', reminderDays: days.length ? days : [30], autoPublish: !!body.autoPublish };
      store.kvSet('settings', s); L.audit(L.actorName(user), 'Settings changed', JSON.stringify(s)); return { toast: 'Settings saved.' };
    } },
    'run-tests': { perm: '/admin/rules', fn: ({ user }) => { const r = Dom.runRuleTests(L.settings().ruleset); L.audit(L.actorName(user), 'Rule regression tests run', `${r.filter(x => x.pass).length}/${r.length} passed`); return { results: r }; } },
    assistant: { perm: '/admin/assistant', fn: ({ user, body }) => { const q = str(body.q, 500); need(q, 'Ask something.'); L.audit(L.actorName(user), 'Assistant request', q); return { reply: assistantReply(user, q) }; } },

    /* ── demo-only tools ── */
    clock: { perm: '/admin', demo: true, anyone: true, fn: ({ user, body }) => { const d = +body.days; store.kvSet('clockDays', d === 0 ? 0 : store.kvGet('clockDays', 0) + d); L.audit(L.actorName(user), 'Demo clock moved', `+${store.kvGet('clockDays', 0)} days`); L.runReminders(); return { toast: `Demo date is now ${L.fmtDate(L.now())}. Reminders and expiries processed.` }; } },
    reset: { perm: '/admin', demo: true, anyone: true, fn: ({ req, res }) => { store.wipe(); L.seedContent(); L.importYouTube(); L.seedDemo(); L.runReminders(); auth.endSession(req, res); return { toast: 'Demo reset.', go: '/' }; } },
    impersonate: { perm: '/admin/members', demo: true, fn: ({ user, body, res }) => { need(user.role === 'admin', 'Admins only', 403); const u = member(body.id); auth.startSession(res, u.id); L.audit(L.actorName(user), 'Viewed as member', u.name); return { go: '/portal' }; } },
  };

  function assistantReply(user, q) {
    const s = q.toLowerCase(), tests = store.all('tests'), name = uid => L.user(uid)?.name;
    const by = st => tests.filter(t => t.status === st).map(t => name(t.userId));
    if (/clear|approve.*safety|diagnos|dose|prescri/.test(s)) return 'I can\'t do that. Safety reviews, doses and clinical judgements must be made by an authorised person on the Safety page.';
    if (/publish/.test(s)) {
      if (!can(user, '/admin/reports')) return 'Your role can\'t publish reports.';
      const ready = tests.filter(t => t.status === 'ready_to_publish');
      ready.forEach(t => L.publish(L.user(t.userId), t, 'AI Assistant (for ' + user.name + ')'));
      return ready.length ? `Published ${ready.length} report(s) that had already passed validation and safety: ${ready.map(t => name(t.userId)).join(', ')}.` : 'There are no reports in "Ready to publish". Items in safety review or the exception queue need a person.';
    }
    const members = store.find('users', { role: 'member' });
    if (/renew|expir/.test(s)) return `Renewal due: ${members.filter(u => L.memberStatus(u) === 'renewal_due').map(u => `${u.name} (${L.fmtDate(u.expiresAt)})`).join(', ') || 'none'}.\nExpired: ${members.filter(u => L.memberStatus(u) === 'expired').map(u => u.name).join(', ') || 'none'}.\nReminders go out automatically at ${L.settings().reminderDays.join(' and ')} days.`;
    if (/wait|queue|today|todo|to do/.test(s)) return `Exceptions: ${by('validation_needed').join(', ') || 'none'}\nSafety review: ${by('safety_review').join(', ') || 'none'}\nReady to publish: ${by('ready_to_publish').join(', ') || 'none'}\nLab processing (upload needed): ${by('lab_processing').join(', ') || 'none'}\nVoice notes: ${store.find('voice_notes', { status: 'requested' }).length} requested\nModeration: ${store.find('laughs', { status: 'pending' }).length} submissions, ${store.all('posts').filter(p => p.reported && !p.removed).length} reports`;
    if (/summar|activity|happen/.test(s)) return 'Latest activity:\n' + store.recentAudit(8).map(a => `• ${a.action} — ${a.details}`).join('\n');
    return 'I can: list what\'s waiting, publish ready reports, summarise recent activity, or show renewals and expiries.';
  }

  return async function run(name, ctx) {
    const a = Object.prototype.hasOwnProperty.call(A, name) && A[name];
    if (!a) fail('Unknown action', 404);
    if (a.demo && !config.demo) fail('Not available', 404);
    const u = ctx.user;
    if (a.perm === 'auth') need(u, 'Please sign in.', 401);
    else if (a.perm === 'member') { need(u, 'Please sign in.', 401); need(L.hasAccess(u), 'Your membership has paused — renew to use this.', 403); }
    else if (a.perm.startsWith('/admin') && !(a.anyone && config.demo)) { need(u, 'Please sign in.', 401); need(can(u, a.perm), 'Your role does not have access to this.', 403); }
    if (a.fn.constructor.name === 'AsyncFunction') return await a.fn(ctx); // network calls (Stripe) stay outside a DB transaction
    return store.tx(() => a.fn(ctx));
  };
}
module.exports = { createActions };
