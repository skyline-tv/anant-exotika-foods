const assert = require('node:assert/strict');
const { describe, test, before, afterEach } = require('node:test');

const sent = [];
let failNext = false;

require.cache[require.resolve('resend')] = {
  id: require.resolve('resend'),
  filename: require.resolve('resend'),
  loaded: true,
  exports: {
    Resend: class Resend {
      emails = {
        send: async (payload) => {
          if (failNext) {
            failNext = false;
            return { data: null, error: { message: 'Resend unavailable', name: 'application_error' } };
          }
          sent.push(payload);
          return { data: { id: 'email_test' }, error: null };
        },
      };
    },
  },
};

delete require.cache[require.resolve('./emailService')];

const {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  safeSend,
  shouldNotifyOrderStatus,
  statusCopy,
} = require('./emailService');

const sampleOrder = {
  _id: 'order1',
  orderNumber: 'AE-2026-000001',
  createdAt: '2026-09-28T04:00:00.000Z',
  orderStatus: 'confirmed',
  payment: { method: 'cod' },
  items: [{ name: 'Honey Cashew 100g', quantity: 2, price: 529, total: 1058 }],
  pricing: { subtotal: 1058, discount: 50, shipping: 79, packaging: 0, handling: 0, codFee: 0, tax: 0, total: 1087 },
  shippingAddress: {
    fullName: 'Asha Rao',
    addressLine1: '12 MG Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560001',
    phone: '9623079356',
  },
};

describe('customer email', () => {
  before(() => {
    process.env.RESEND_API_KEY = 're_test_key_not_real';
    process.env.EMAIL_FROM = 'Anant Exotika <orders@foods.anantexotika.in>';
    process.env.CLIENT_URL = 'https://foods.anantexotika.in';
  });

  afterEach(() => {
    sent.length = 0;
    failNext = false;
  });

  test('welcome email uses the store URL and does not include the API key', async () => {
    await sendWelcomeEmail({ to: 'asha@example.com', name: 'Asha' });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].subject, 'Welcome to Anant Exotika');
    assert.match(sent[0].html, /https:\/\/foods\.anantexotika\.in/);
    assert.match(sent[0].text, /https:\/\/foods\.anantexotika\.in/);
    assert.equal(JSON.stringify(sent[0]).includes('re_test_key_not_real'), false);
  });

  test('password reset link uses CLIENT_URL and the token once in the URL', async () => {
    await sendPasswordResetEmail({ to: 'asha@example.com', name: 'Asha', resetToken: 'abc123' });
    const url = 'https://foods.anantexotika.in/reset-password?token=abc123';
    assert.equal(sent[0].subject, 'Reset your Anant Exotika password');
    assert.match(sent[0].html, /expires in one hour/);
    assert.match(sent[0].html, new RegExp(url.replace(/[?]/g, '\\?')));
    assert.match(sent[0].text, /If you did not request this/);
  });

  test('password changed email is sent only through the caller after success', async () => {
    await sendPasswordChangedEmail({ to: 'asha@example.com', name: 'Asha', changedAt: '2026-09-28T04:00:00.000Z' });
    assert.equal(sent[0].subject, 'Your Anant Exotika password was changed');
    assert.match(sent[0].text, /info@anantexotika\.in/);
    assert.equal(JSON.stringify(sent[0]).includes('abc123'), false);
  });

  test('order confirmation includes line items, totals, and one message', async () => {
    await sendOrderConfirmationEmail({ to: 'asha@example.com', name: 'Asha', order: sampleOrder });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].subject, 'Order confirmed — #AE-2026-000001');
    assert.match(sent[0].html, /Honey Cashew 100g/);
    assert.match(sent[0].html, /Qty 2/);
    assert.match(sent[0].text, /Subtotal/);
    assert.match(sent[0].text, /Discount/);
    assert.match(sent[0].text, /Cash on Delivery/);
    assert.match(sent[0].html, /560001/);
  });

  test('status email uses the transition copy and is skipped when status is unchanged', async () => {
    assert.equal(shouldNotifyOrderStatus('confirmed', 'confirmed'), false);
    assert.equal(shouldNotifyOrderStatus('confirmed', 'shipped'), true);
    assert.match(statusCopy('shipped', 'AE-2026-000001').subject, /has been shipped/);
    assert.match(statusCopy('delivered', 'AE-2026-000001').subject, /has been delivered/);
    assert.match(statusCopy('cancelled', 'AE-2026-000001').subject, /has been cancelled/);

    await sendOrderStatusEmail({ to: 'asha@example.com', name: 'Asha', order: sampleOrder, status: 'shipped' });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].subject, 'Your order #AE-2026-000001 has been shipped');
  });

  test('a Resend failure does not throw out of safeSend', async () => {
    failNext = true;
    const result = await safeSend(sendWelcomeEmail, { to: 'asha@example.com', name: 'Asha' });
    assert.deepEqual(result, { error: true });
    assert.equal(sent.length, 0);
  });
});
