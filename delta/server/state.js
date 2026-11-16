/* Builds the data snapshot the browser renders from — scoped to the signed-in person's role.
   Members only ever receive their own records; unpublished or safety-held report content is
   stripped server-side, not just hidden in the UI. */
'use strict';
const Dom = require('../shared/domain.js');

const PERMS = {
  admin: '*',
  practitioner: ['/admin', '/admin/members', '/admin/upload', '/admin/exceptions', '/admin/safety', '/admin/reports', '/admin/analyses', '/admin/voice', '/admin/rules', '/admin/assistant'],
  moderator: ['/admin', '/admin/moderation'],
  support: ['/admin', '/admin/members', '/admin/audit'],
};
const can = (u, area) => !!u && u.role !== 'member' && (PERMS[u.role] === '*' || (PERMS[u.role] || []).includes(area));
const CLIENT_DATA_AREAS = ['/admin/members', '/admin/upload', '/admin/exceptions', '/admin/safety', '/admin/reports', '/admin/analyses', '/admin/voice'];

function createState(store, L, mailer, payments, config, oauth) {
  const files = uid => store.db.prepare('SELECT id, kind, name, mime, size, at FROM files WHERE user_id = ? ORDER BY at').all(uid);

  function memberTest(u, t) {
    const base = { id: t.id, status: t.status, created: t.created, receivedAt: t.receivedAt, publishedAt: t.publishedAt, wasReviewed: t.wasReviewed, minerals: [], toxic: {}, findings: [], programme: [], sections: {}, lessons: [] };
    if (t.status !== 'published') return base;
    const held = u.intake?.review_status === 'needs_review';
    const { issues, hadIssues, ...rest } = t;
    return { ...rest, programme: held ? [] : t.programme, findings: held ? t.findings.filter(f => !f.supplement) : t.findings };
  }
  function fullUser(u, { self, staffView }) {
    const orders = store.find('orders', { user_id: u.id }).filter(o => o.status === 'paid');
    const tests = store.find('tests', { user_id: u.id });
    return {
      id: u.id, name: u.name, email: staffView || self ? u.email : undefined, role: u.role, expiresAt: u.expiresAt, createdAt: u.createdAt,
      phone: staffView || self ? u.phone : undefined, nationality: staffView || self ? u.nationality : undefined, dob: staffView || self ? u.dob : undefined,
      signIn: staffView || self ? ['email', ...oauth.providersFor(u.id)] : undefined, emailVerified: self ? u.emailVerified : undefined,
      intake: self || staffView ? u.intake : undefined, consent: self ? u.consent : undefined,
      lessonsDone: u.lessonsDone || [], practice: self ? u.practice || {} : {},
      inbox: self ? store.find('notifications', { user_id: u.id }, 'desc').slice(0, 100) : [],
      purchases: orders.map(o => ({ id: o.id, at: o.paidAt || o.at, type: o.type, amount: o.amount, desc: o.desc })),
      tests: staffView ? tests : tests.map(t => memberTest(u, t)),
      files: self || staffView ? files(u.id) : [],
    };
  }

  return function build(user) {
    const now = L.now(), s = L.settings();
    const staff = !!user && user.role !== 'member';
    const content = store.all('content');
    const of = k => content.filter(c => c.kind === k);
    const contentAdmin = can(user, '/admin/content'), partnerAdmin = can(user, '/admin/partners');
    const access = !!user && L.hasAccess(user);
    const out = {
      v: 3, oauth: oauth.enabled(), now, demo: config.demo, clockDays: config.demo ? store.kvGet('clockDays', 0) : 0, payments: payments.mode, mail: mailer.mode,
      session: user ? user.id : null, role: user ? user.role : null,
      perms: user ? (PERMS[user.role] || []) : [],
      settings: s,
      founderStory: store.kvGet('founderStory', ''),
      lessons: of('lesson').sort((a, b) => a.at - b.at).map(l => ({ id: l.pillarId, pillar: l.pillar, title: l.title, body: l.body, release: l.release || '' })),
      episodes: of('episode').filter(e => contentAdmin || !e.archived).sort((a, b) => b.n - a.n),
      videos: of('video').filter(v => contentAdmin || (!v.archived && v.status !== 'review')).sort((a, b) => (b.order || 0) - (a.order || 0)),
      partners: of('partner').filter(p => partnerAdmin || p.active).map(p => partnerAdmin ? p : { ...p, clicks: undefined }),
      users: [], voiceNotes: [], laughs: [], posts: [], audit: [], outbox: [], personas: [],
    };
    if (user) {
      const clientData = CLIENT_DATA_AREAS.some(a => can(user, a));
      out.users = clientData
        ? store.all('users').map(u => fullUser(u, { self: u.id === user.id, staffView: true }))
        : [fullUser(user, { self: true, staffView: false })];
      out.voiceNotes = (can(user, '/admin/voice') ? store.all('voice_notes') : store.find('voice_notes', { user_id: user.id })).sort((a, b) => b.at - a.at);
      const mod = can(user, '/admin/moderation');
      if (access || mod) {
        out.laughs = store.all('laughs').filter(l => mod || l.status === 'approved')
          .map(({ userId, lovedBy, ...l }) => ({ ...l, loved: (lovedBy || []).includes(user.id), mine: userId === user.id }));
        out.posts = store.all('posts').filter(p => !p.removed)
          .map(({ userId, lovedBy, ...p }) => ({ ...p, loved: (lovedBy || []).includes(user.id), reportReason: mod ? p.reportReason : undefined }));
      }
      if (staff) {
        const lim = can(user, '/admin/audit') ? 400 : 15;
        out.audit = store.db.prepare('SELECT at, actor, action, details FROM audit ORDER BY id DESC LIMIT ?').all(lim);
        if (can(user, '/admin/audit')) out.outbox = mailer.recent(80).map(o => ({ at: o.at, to: o.to_name || o.to_email, channel: o.channel, title: o.subject, status: o.status }));
      }
    }
    if (config.demo) out.personas = store.all('users').filter(u => u.demo).map(u => {
      const t = L.latestTest(u.id);
      return { id: u.id, name: u.name, role: u.role, desc: u.role !== 'member' ? u.role : `${L.memberStatus(u)} · ${t ? Dom.stageLabel(Dom.stageOf(u, t)) : 'no test'}` };
    });
    return out;
  };
}
module.exports = { createState, PERMS, can };
