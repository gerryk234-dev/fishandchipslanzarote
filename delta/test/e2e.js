/* End-to-end browser test against a running server in demo mode.
   Usage: BASE=http://localhost:3000 node test/e2e.js   (needs Playwright installed globally) */
'use strict';
const { chromium } = require('playwright');
const BASE = (process.env.BASE || 'http://localhost:3000').replace(/\/$/, '') + '/';
let failed = 0;
const STATIC = process.env.STATIC === '1'; // testing the instant browser build (dist/static)
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) failed++; };

(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('response', r => { if (r.status() === 404 && !r.url().includes('/api/files/')) errs.push('404 ' + r.url()); });
  const api = (name, body = {}) => p.evaluate(([n, bd]) => fetch('/api/act/' + n, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Delta': '1' }, body: JSON.stringify(bd) }).then(r => r.json()), [name, body]);
  const state = () => p.evaluate(() => fetch('/api/state').then(r => r.json()));
  const wait = () => p.waitForTimeout(250);
  const main = () => p.textContent('main');
  const as = async name => { await p.goto(BASE + '#/login'); await wait(); await p.click(`[data-act=login]:has-text("${name}")`); await wait(); };
  const visit = async h => { await p.goto(BASE + '#' + h); await wait(); return main(); };
  const fresh = async h => { await p.goto(BASE + '#' + h); await p.reload(); await wait(); };

  await p.goto(BASE); await api('reset'); await p.goto(BASE); await wait();

  // every page renders for its audience
  for (const h of ['/', '/how-it-works', '/analysis', '/intelligence', '/pillars', '/pillars/body', '/pillars/release', '/awakening', '/podcast', '/mineral-man', '/partners', '/faq', '/about', '/legal', '/join', '/login'])
    ok(!/not found/i.test(await visit(h)), 'public ' + h);
  await as('Alex Morgan');
  for (const h of ['/portal', '/report', '/learn', '/laughology', '/community', '/community/ground', '/account']) ok(!/Please sign in|not found/i.test(await visit(h)), 'member ' + h);
  ok((await visit('/admin')).includes('for DELTA staff'), 'member blocked from admin UI');
  await as('Founder');
  for (const h of ['/admin', '/admin/members', '/admin/upload', '/admin/exceptions', '/admin/safety', '/admin/reports', '/admin/analyses', '/admin/voice', '/admin/lessons', '/admin/content', '/admin/moderation', '/admin/partners', '/admin/rules', '/admin/settings', '/admin/audit', '/admin/assistant'])
    ok(!/does not have access|not found/i.test(await visit(h)), 'admin ' + h);
  await as('Moderator');
  ok((await visit('/admin/members')).includes('does not have access'), 'moderator blocked from members');
  ok(!(await visit('/admin/moderation')).includes('does not have access'), 'moderator can moderate');

  // new visitor: join → test payment → intake (meds) → simulate → safety review
  await api('logout'); await fresh('/join');
  await p.fill('input[name=name]', 'Riley Test'); await p.fill('input[name=email]', 'riley@example.com');
  await p.fill('input[name=phone]', '+44 7700 900555'); await p.selectOption('select[name=nationality]', 'British'); await p.fill('input[name=dob]', '1988-03-14');
  await p.check('input[name=terms]'); await p.click('text=Complete purchase & continue'); await wait();
  ok(p.url().includes('#/pay/'), 'checkout → test payment page');
  await p.click('text=Pay (test)'); await wait();
  ok(p.url().endsWith('#/intake'), 'paid → intake');
  let me = (await state()).users[0]; const exp1 = me.expiresAt;
  ok(Math.round((exp1 - Date.now()) / 864e5) >= 180, 'six months access granted');
  await p.fill('textarea[name=medications]', 'Warfarin'); await p.check('input[name=edu]'); await p.check('input[name=consent]'); await p.click('text=Save and continue'); await wait();
  me = (await state()).users[0]; ok(me.intake.review_status === 'needs_review', 'intake flagged for review');
  await p.click('text=Simulate lab results (demo)'); await wait();
  me = (await state()).users[0]; ok(me.tests[0].status === 'safety_review', 'results → safety review');
  ok(me.tests[0].programme.length === 0 && !me.tests[0].sections.notes, 'held report content not sent to member');
  // early renewal keeps remaining time
  await p.goto(BASE + '#/join'); await wait(); await p.check('input[name=terms]'); await p.click('text=Complete purchase & continue'); await wait(); await p.click('text=Pay (test)'); await wait();
  me = (await state()).users[0]; const d = new Date(exp1); d.setMonth(d.getMonth() + 6);
  ok(Math.abs(me.expiresAt - d.getTime()) < 864e5 * 1.1, 'early renewal adds 6 months to existing expiry');
  // duplicate account protection
  await api('logout'); const dup = await api('checkout', { name: 'X', email: 'riley@example.com', terms: true });
  ok(/already a DELTA account/.test(dup.error || ''), 'checkout refuses an existing email while signed out');

  // practitioner clears the review (withholding supplements)
  await as('Practitioner'); await visit('/admin/safety');
  const rid = (await state()).users.find(u => u.name === 'Riley Test').id;
  const f = p.locator(`form[data-u="${rid}"]`);
  await f.locator('input[name=note]').fill('Checked warfarin interactions; withhold supplements'); await f.locator('button[value=general]').click(); await wait();
  let riley = (await state()).users.find(u => u.id === rid);
  ok(riley.tests[0].status === 'published', 'cleared → published (the reviewed test, not the new retest)');
  ok(!riley.tests[0].findings.some(x => x.supplement), 'supplement guidance withheld');

  // exception queue fix (Pat) and a bad upload (Lee) with a real PDF
  await as('Founder'); await visit('/admin/exceptions');
  const pid = (await state()).users.find(u => u.name === 'Pat Okafor').id, pf = p.locator(`form[data-u="${pid}"]`);
  await pf.locator('input[name=Na]').fill('21'); await pf.locator('input[name=Cu]').fill('2.2'); await pf.locator('input[name=note]').fill('Re-keyed from PDF'); await pf.locator('text=Re-validate & process').click(); await wait();
  ok((await state()).users.find(u => u.id === pid).tests[0].status === 'published', 'exception fixed → published');
  await visit('/admin/upload');
  await p.setInputFiles('input[name=pdf]', { name: 'lab.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% demo\n') });
  await p.click('text=Load sample with problems'); await p.click('text=Validate & process'); await wait();
  const lee = (await state()).users.find(u => u.name === 'Lee Chen').tests[0];
  ok(lee.status === 'validation_needed' && lee.issues.length >= 4, `bad upload → exception queue (${lee.issues.length} issues)`);
  ok(!!lee.pdfFile, 'lab PDF stored with the record');
  if (!STATIC) { const pdf = await p.evaluate(id => fetch('/api/files/' + id).then(r => r.status + ' ' + r.headers.get('content-disposition')), lee.pdfFile);
  ok(pdf.startsWith('200 attachment'), 'staff can download the original PDF'); }

  // rules, voice note, moderation, assistant
  await visit('/admin/rules'); await p.click('text=Run test cases'); await wait();
  ok(!(await p.textContent('#test-out')).includes('✕'), 'rule regression tests pass');
  await visit('/admin/voice'); await p.locator('form[data-form=voice-deliver]').first().locator('input[name=audio]').setInputFiles({ name: 'note.m4a', mimeType: 'audio/mp4', buffer: Buffer.from('fake-audio') });
  await p.locator('form[data-form=voice-deliver] textarea').first().fill('Hi Alex — here is your explanation.'); await p.locator('text=Upload & notify client').first().click(); await wait();
  ok((await state()).voiceNotes.some(v => v.status === 'delivered' && v.audioFile), 'voice note delivered with audio');
  await visit('/admin/moderation'); await p.locator('button:text("Approve")').first().click(); await wait();
  ok((await state()).laughs.filter(l => l.status === 'approved').length === 4, 'laugh approved');
  await visit('/admin/assistant'); await p.fill('input[name=q]', 'please clear safety for Jo'); await p.click('form[data-form=assistant] button'); await wait();
  ok((await p.textContent('#chatlog')).includes("can't do that"), 'assistant refuses clinical action');

  // a member cannot read someone else's file; Alex hears the voice note
  await as('Alex Morgan');
  if (!STATIC) { const stolen = await p.evaluate(id => fetch('/api/files/' + id).then(r => r.status), lee.pdfFile);
  ok(stolen === 404, 'member cannot download another client\'s lab PDF'); }
  await visit('/account'); ok(await p.locator('audio').count() >= 1, 'member sees their voice note player');

  // clock: reminders then expiry, paused access, renewal from purchase date
  if (!(await p.locator('details.demotools').evaluate(d => d.open))) await p.click('.demotools summary');
  for (const n of ['+90 days', '+30 days', '+30 days']) { await p.click(`button:text("${n}")`); await wait(); }
  const alex = (await state()).users[0];
  ok(alex.inbox.some(n => /renews in/.test(n.title)) && alex.inbox.some(n => /paused/.test(n.title)), 'renewal reminders and expiry notice sent');
  ok((await visit('/learn')).includes('not active'), 'expired member: learning paused');
  ok((await visit('/report')).includes('Mineral Intelligence report'), 'expired member can still read reports');
  const blocked = await api('lesson-done', { key: 'body:2' }); ok(/paused/.test(blocked.error || ''), 'server refuses member-only action after expiry');
  await visit('/join'); await p.check('input[name=terms]'); await p.click('text=Complete purchase & continue'); await wait(); await p.click('text=Pay (test)'); await wait();
  const s2 = await state(); ok(Math.abs((s2.users[0].expiresAt - s2.now) / 864e5 - 182) < 4, 'expired repurchase: 6 months from purchase date');

  // registration page: validation, then a new account
  await api('logout'); await fresh('/register');
  ok((await p.locator('.btn.social').count()) === 3, 'Google, Microsoft and Apple buttons shown on registration');
  await p.fill('input[name=name]', 'Ana López'); await p.fill('input[name=email]', 'ana@example.com'); await p.fill('input[name=phone]', '+34 612 22 58 43');
  await p.selectOption('select[name=nationality]', 'Spanish'); await p.fill('input[name=dob]', '1990-06-01'); await p.check('input[name=terms]');
  await p.fill('input[name=phone]', 'call me'); await p.click('text=Create account'); await wait();
  ok(/phone number/.test(await p.textContent('form[data-form=register] .form-error')), 'error shown inside the form, details kept');
  ok((await p.inputValue('input[name=name]')) === 'Ana López', 'typed details are not lost after an error');
  await p.fill('input[name=phone]', '+34 612 22 58 43');
  await p.click('text=Create account'); await wait();
  let ana = (await state()).users[0];
  ok(p.url().endsWith('#/join') && ana.name === 'Ana López' && ana.phone === '+34612225843' && ana.nationality === 'Spanish', 'registered with email, phone, nationality and date of birth');
  await visit('/account'); ok((await main()).includes('not confirmed'), 'account shows email not yet confirmed');
  await p.fill('#details input[name=phone]', '+34 600 000 000'); await p.click('text=Save details'); await wait();
  ok((await state()).users[0].phone === '+34600000000', 'details can be updated in Account');

  // email sign-in link round trip (via dev mailbox)
  await api('logout'); await fresh('/login');
  await p.fill('input[name=email]', 'dana@example.com'); await p.click('text=Email me a sign-in link'); await wait();
  ok((await main()).includes('Check your email'), 'sign-in link requested');
  if (STATIC) {
    await visit('/dev/mailbox'); const href = await p.getAttribute('a[href*="auth/verify"]', 'href');
    await p.click('a[href*="auth/verify"]'); await p.waitForTimeout(600); ok(p.url().endsWith('#/portal') && (await state()).users[0].name === 'Dana Price', 'magic link signs in (static)');
    await p.goto(BASE + href); await p.waitForTimeout(600); ok(p.url().includes('expired=1'), 'magic link works only once (static)');
  } else {
  await p.goto(BASE + 'dev/mailbox'); const link = await p.getAttribute('a[href*="/auth/verify"]', 'href');
  await p.goto(link); await wait(); ok(p.url().endsWith('#/portal') && (await state()).users[0].name === 'Dana Price', 'magic link signs in');
  await p.goto(link); await wait(); ok(p.url().includes('expired=1'), 'magic link works only once');
  }

  await api('reset');
  ok(errs.length === 0, 'no browser errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
  process.exit(failed ? 1 : 0);
})();
