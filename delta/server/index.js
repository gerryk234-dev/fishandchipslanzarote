'use strict';
const config = require('./config');
const { createApp } = require('./app');
const { app } = createApp(config);
app.listen(config.port, () => {
  console.log(`DELTA running at ${config.baseUrl}`);
  console.log(`  demo mode: ${config.demo ? 'ON (personas, demo clock, dev mailbox at /dev/mailbox)' : 'off'}`);
  console.log(`  payments:  ${config.stripeKey ? 'Stripe' : 'TEST mode (no real payments)'}`);
  console.log(`  email:     ${config.smtpUrl ? 'SMTP' : 'logged only (see outbox / dev mailbox)'}`);
});
