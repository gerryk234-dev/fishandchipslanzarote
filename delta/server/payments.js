/* Payments. With STRIPE_SECRET_KEY set, uses Stripe Checkout (card details never touch DELTA's
   servers); fulfilment happens on the signed webhook and, as a fallback, on return from Checkout.
   Without a key, runs in clearly-labelled TEST mode with a simulated payment page. */
'use strict';
function createPayments(store, L, config) {
  let stripe = null;
  if (config.stripeKey) {
    try { stripe = require('stripe')(config.stripeKey); }
    catch (e) { console.warn('stripe package not installed — payments fall back to TEST mode:', e.message); }
  }
  const P = {
    mode: stripe ? 'stripe' : 'test',
    async checkout(order, user) {
      if (!stripe) return { redirect: `#/pay/${order.id}` };
      const session = await stripe.checkout.sessions.create({
        mode: 'payment', customer_email: user.email, client_reference_id: order.id, metadata: { orderId: order.id },
        line_items: [{ quantity: 1, price_data: { currency: 'gbp', unit_amount: Math.round(order.amount * 100), product_data: { name: order.desc } } }],
        success_url: `${config.baseUrl}/#/paid?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${config.baseUrl}/#/join?cancelled=1`,
      });
      order.providerSession = session.id; store.put('orders', order);
      return { redirect: session.url };
    },
    /* Called when the buyer returns from Stripe — verifies with Stripe, never trusts the browser. */
    async confirm(sessionId) {
      if (!stripe) throw Object.assign(new Error('Stripe is not configured'), { status: 400 });
      const s = await stripe.checkout.sessions.retrieve(String(sessionId));
      if (s.payment_status !== 'paid') return null;
      return L.fulfil(s.metadata.orderId, s.payment_intent || s.id);
    },
    webhook(rawBody, signature) {
      if (!stripe || !config.stripeWebhookSecret) throw Object.assign(new Error('Webhook not configured'), { status: 400 });
      const event = stripe.webhooks.constructEvent(rawBody, signature, config.stripeWebhookSecret);
      if (event.type === 'checkout.session.completed' && event.data.object.payment_status === 'paid') {
        const s = event.data.object; L.fulfil(s.metadata.orderId, s.payment_intent || s.id, 'Stripe webhook');
      }
      return event.type;
    },
  };
  return P;
}
module.exports = { createPayments };
