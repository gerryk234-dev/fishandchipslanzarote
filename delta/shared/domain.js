/* DELTA domain rules — pure functions shared by server (authoritative) and browser (display).
   No storage, no clock: callers pass `now` and settings in. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./data.js'));
  else root.Domain = factory(root.DeltaData);
})(typeof self !== 'undefined' ? self : this, function (D) {
  'use strict';
  const { MINERALS, TOXIC, RATIOS, RULESETS, CURRENT_RULESET, PILLARS } = D;
  const DAY = 864e5;
  const uniq = a => [...new Set(a)];

  function addMonths(t, n) { const d = new Date(t), day = d.getDate(); d.setMonth(d.getMonth() + n); if (d.getDate() < day) d.setDate(0); return d.getTime(); }

  /* Brief §02: a qualifying test adds N months from the LATER of current expiry or purchase date. */
  function renewedExpiry(currentExpiry, purchaseAt, months) { return addMonths(Math.max(currentExpiry || 0, purchaseAt), months); }

  function memberStatus(u, now, settings) {
    if (!u || !u.expiresAt) return 'none';
    const left = u.expiresAt - now;
    if (left <= 0) return 'expired';
    if (left <= settings.reminderDays[0] * DAY) return 'renewal_due';
    return 'active';
  }
  const hasAccess = (u, now, settings) => !!u && (u.role !== 'member' || ['active', 'renewal_due'].includes(memberStatus(u, now, settings)));

  const STAGES = [
    ['purchased', 'Purchased'], ['intake_pending', 'Intake'], ['sample_pending', 'Sample'], ['lab_processing', 'Lab processing'],
    ['validation_needed', 'Validation'], ['safety_review', 'Safety review'], ['ready_to_publish', 'Ready'], ['published', 'Published'],
  ];
  const TEST_STATUSES = STAGES.slice(2).map(s => s[0]);
  const stageOf = (u, t) => !t ? 'none' : !u.intake?.complete ? 'intake_pending' : t.status;
  const stageLabel = st => (STAGES.find(s => s[0] === st) || [st, String(st).replace(/_/g, ' ')])[1];

  function intakeNeedsReview(i) {
    return i.pregnant !== 'no' || !!String(i.medications || '').trim() || !!String(i.conditions || '').trim() || i.under18 === 'yes';
  }

  /* Lab data parsing — never infers missing values, never silently accepts unparseable text. */
  function parseLab(text) {
    const issues = [], seen = {}, toxic = {};
    const lines = String(text || '').split(/\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    for (const line of lines) {
      const m = line.match(/^([A-Za-z]+)\s*[,;:\t ]\s*([^\s,;]+)\s*[,;\t ]?\s*([A-Za-z%µ/]+)?$/);
      if (!m) { issues.push({ level: 'error', msg: `Could not read line: "${line.slice(0, 80)}"` }); continue; }
      const [, key, raw, unit] = m;
      const k = key.toLowerCase();
      const def = MINERALS.find(x => x.name.toLowerCase() === k || x.label.toLowerCase() === k);
      const tdef = TOXIC.find(x => x.name.toLowerCase() === k || x.label.toLowerCase() === k);
      const d = def || tdef;
      if (!d) { issues.push({ level: 'error', msg: `Unknown element "${key}"` }); continue; }
      const val = Number(raw);
      if (!Number.isFinite(val)) { issues.push({ level: 'error', msg: `${d.label}: value "${raw}" is not a number` }); continue; }
      if (val < 0) { issues.push({ level: 'error', msg: `${d.label}: negative value` }); continue; }
      if (unit && unit !== d.unit) issues.push({ level: 'error', msg: `${d.label}: unit "${unit}" does not match expected ${d.unit} — not converted automatically` });
      if (d.name in seen) { issues.push({ level: 'error', msg: `${d.label} appears twice` }); continue; }
      seen[d.name] = val;
      if (tdef) toxic[d.name] = val;
      else if (val > d.high * 4 || val < d.low / 4) issues.push({ level: 'warn', msg: `${d.label} = ${val} is far outside the band — confirm against the original report` });
    }
    for (const d of MINERALS) if (!(d.name in seen)) issues.push({ level: 'error', msg: `Missing ${d.label} — missing values are never inferred` });
    const minerals = MINERALS.map(d => ({ ...d, value: seen[d.name] ?? null }));
    return { minerals, toxic, issues };
  }

  function positionOf(m) { const span = (m.high - m.low) || 1; return Math.round((m.value - m.low) / span * 1000) / 10; }
  function statusOf(m) { return m.value < m.low ? 'Below range' : m.value > m.high ? 'Above range' : 'Inside range'; }
  function rangeSummary(ms) {
    const g = s => ms.filter(m => statusOf(m) === s).map(m => m.label);
    const ins = g('Inside range'), lo = g('Below range'), hi = g('Above range'), out = [];
    if (ins.length) out.push(`${ins.join(', ')} sit inside the laboratory band`);
    if (lo.length) out.push(`${lo.join(', ')} sit below it`);
    if (hi.length) out.push(`${hi.join(', ')} sit above it`);
    return out.length ? out.join('. ') + '. This is an educational reading of the chart, not a diagnosis.' : 'No mineral values yet.';
  }
  function evaluate(minerals, toxicVals, version) {
    version = version || CURRENT_RULESET;
    const v = Object.fromEntries(minerals.map(m => [m.name, m.value]));
    const r = {}; RATIOS.forEach(x => r[x.id] = v[x.b] ? Math.round(v[x.a] / v[x.b] * 100) / 100 : null);
    const tox = TOXIC.filter(t => (toxicVals?.[t.name] ?? 0) > t.high).map(t => t.label);
    const rs = RULESETS[version];
    const hits = rs.rules.filter(rule => { try { return rule.when(v, r, tox); } catch { return false; } });
    return { v, r, tox, hits, rs, version };
  }
  /* Builds the report content for a validated result. */
  function buildReport(minerals, toxic, version) {
    const e = evaluate(minerals, toxic, version);
    const ratios = RATIOS.map(x => { const val = e.r[x.id]; const s = val == null ? 'n/a' : val < x.low ? 'below' : val > x.high ? 'above' : 'inside'; return `${x.id} ${val ?? '—'} (${s} the ${x.low}–${x.high} band)`; }).join('; ') + '.';
    const lessons = uniq([...e.hits.flatMap(h => h.lessons), ...e.rs.baseline.lessons]);
    const first = PILLARS.find(p => p.id === lessons[0]);
    return {
      ruleset: e.version,
      findings: e.hits.map(h => ({ id: h.id, title: h.title, text: h.text, supplement: !!h.supplement, review: !!h.review })),
      toxicFlags: e.tox,
      lessons,
      programme: [...e.hits.map(h => h.prog), e.rs.baseline.prog],
      sections: {
        patterns: rangeSummary(minerals),
        ratios,
        notes: e.hits.length ? e.hits.map(h => h.text).join(' ') : 'Your readings sit close to the laboratory bands DELTA uses. Your learning path focuses on maintaining a steady daily rhythm.',
        nextStep: `Start with ${first ? first.name + ' — ' + first.tag : 'the six pillars'}, then follow the lessons suggested below.`,
      },
    };
  }
  /* Regression fixtures — run before approving a new rule-set version. */
  const RULE_TESTS = [
    { name: 'Grok demo panel', m: D.DEMO_RESULT, tox: {}, expect: ['MG-LOW', 'CAMG-HIGH', 'NA-LOW', 'CU-HIGH'] },
    { name: 'All in range', m: { Ca: 55, Mg: 6, Na: 25, K: 10, Zn: 16, Cu: 2 }, tox: {}, expect: [] },
    { name: 'Toxic lead flag', m: { Ca: 55, Mg: 6, Na: 25, K: 10, Zn: 16, Cu: 2 }, tox: { Pb: 0.3 }, expect: ['TOXIC'] },
    { name: 'Low zinc + low Na/K', m: { Ca: 55, Mg: 6, Na: 20, K: 11, Zn: 10, Cu: 2 }, tox: {}, expect: ['NAK-LOW', 'ZN-LOW'] },
  ];
  function runRuleTests(version) {
    return RULE_TESTS.map(c => {
      const got = evaluate(MINERALS.map(m => ({ ...m, value: c.m[m.name] })), c.tox, version).hits.map(h => h.id);
      return { name: c.name, expect: c.expect, got, pass: got.length === c.expect.length && c.expect.every(x => got.includes(x)) };
    });
  }
  const demoLab = (vals = D.DEMO_RESULT) => MINERALS.map(m => `${m.name}, ${vals[m.name]}, mg%`).join('\n') + '\nPb, 0.02, mg%\nHg, 0.01, mg%';

  /* ── profile ── */
  function ageOn(dob, now) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dob || '')); if (!m) return null;
    const d = new Date(now); let age = d.getUTCFullYear() - +m[1];
    if (d.getUTCMonth() + 1 < +m[2] || (d.getUTCMonth() + 1 === +m[2] && d.getUTCDate() < +m[3])) age--;
    return age;
  }
  /* Keeps a leading + and digits; returns null if it can't be a phone number (7–15 digits, E.164). */
  function normalizePhone(p) {
    const s = String(p || '').trim(); if (!s) return null;
    if (!/^\+?[\d\s().-]{7,24}$/.test(s)) return null;
    const digits = s.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) return null;
    return (s.startsWith('+') ? '+' : '') + digits;
  }
  const profileComplete = u => !!(u && u.phone && u.nationality && u.dob);

  return { ageOn, normalizePhone, profileComplete, DAY, addMonths, renewedExpiry, memberStatus, hasAccess, STAGES, TEST_STATUSES, stageOf, stageLabel, intakeNeedsReview, parseLab, positionOf, statusOf, rangeSummary, evaluate, buildReport, RULE_TESTS, runRuleTests, demoLab };
});
