/* Configuration for the instant browser demo: always demo mode, test payments, logged email. */
'use strict';
module.exports = {
  production: false, demo: true, memory: true, baseUrl: '', dataDir: '/demo', stripeKey: '', stripeWebhookSecret: '', smtpUrl: '', mailFrom: 'DELTA <demo@delta.example>',
  google: {}, microsoft: {}, apple: {}, adminEmails: [], cookieSecure: false, sessionDays: 30, loginTokenMinutes: 20, maxUploadMb: 8,
};
