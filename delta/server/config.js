'use strict';
const path = require('node:path');
const env = process.env;
const production = env.NODE_ENV === 'production';
const config = {
  production,
  port: +(env.PORT || 3000),
  /* In GitHub Codespaces, links in emails must use the forwarded preview address. */
  baseUrl: (env.BASE_URL || (env.CODESPACE_NAME && env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
    ? `https://${env.CODESPACE_NAME}-${env.PORT || 3000}.${env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
    : `http://localhost:${env.PORT || 3000}`)).replace(/\/$/, ''),
  /* Demo mode: seeded personas, persona switching, demo clock, simulated results, dev mailbox. Never in production. */
  demo: env.DEMO_MODE ? env.DEMO_MODE === '1' : !production,
  dataDir: env.DATA_DIR || path.join(__dirname, '..', 'data'),
  stripeKey: env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET || '',
  smtpUrl: env.SMTP_URL || '',
  mailFrom: env.MAIL_FROM || 'DELTA <no-reply@delta.example>',
  google: { clientId: env.GOOGLE_CLIENT_ID || '', clientSecret: env.GOOGLE_CLIENT_SECRET || '' },
  microsoft: { clientId: env.MICROSOFT_CLIENT_ID || '', clientSecret: env.MICROSOFT_CLIENT_SECRET || '', tenant: env.MICROSOFT_TENANT || 'common' },
  apple: { clientId: env.APPLE_CLIENT_ID || '', teamId: env.APPLE_TEAM_ID || '', keyId: env.APPLE_KEY_ID || '', privateKey: env.APPLE_PRIVATE_KEY || '' },
  adminEmails: (env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
  cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === '1' : production,
  sessionDays: 30,
  loginTokenMinutes: 20,
  maxUploadMb: 15,
};
if (production && config.demo) { console.error('Refusing to start: DEMO_MODE must be off in production.'); process.exit(1); }
module.exports = config;
