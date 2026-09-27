const test = require('node:test');
const assert = require('node:assert/strict');

const {
  mapShiprocketStatus,
  buildAdhocOrderPayload,
  verifyWebhookToken,
  isDuplicateOrderError,
  shouldRetryShiprocketStatus,
  resetShiprocketState,
  createAdhocOrder,
} = require('./shiprocketService');
const { isStepPending, canApplyOrderStatus, shouldApplyShippingStatus } = require('./shipmentService');
const AppError = require('../utils/AppError');

test('maps Shiprocket tracking statuses onto existing order statuses', () => {
  const cases = [
    ['NEW', null, 'processing'],
    ['PICKUP SCHEDULED', 3, 'packed'],
    ['PICKED UP', 42, 'shipped'],
    ['IN TRANSIT', 18, 'shipped'],
    ['OUT FOR DELIVERY', 17, 'out_for_delivery'],
    ['DELIVERED', 7, 'delivered'],
    ['CANCELLED', 8, 'cancelled'],
    ['RTO INITIATED', 9, 'returned'],
    ['RTO DELIVERED', 10, 'returned'],
  ];

  for (const [statusText, statusId, orderStatus] of cases) {
    const mapped = mapShiprocketStatus({ statusText, statusId });
    assert.equal(mapped.orderStatus, orderStatus, statusText);
  }
});

test('does not move an order backwards or cancel a delivered order', () => {
  assert.equal(canApplyOrderStatus('shipped', 'processing'), false);
  assert.equal(canApplyOrderStatus('confirmed', 'processing'), true);
  assert.equal(canApplyOrderStatus('delivered', 'cancelled'), false);
  assert.equal(canApplyOrderStatus('shipped', 'delivered'), true);
  assert.equal(canApplyOrderStatus('shipped', 'returned'), true);
  assert.equal(canApplyOrderStatus('refunded', 'delivered'), false);
  assert.equal(shouldApplyShippingStatus('in_transit', 'new'), false);
  assert.equal(shouldApplyShippingStatus('pickup_scheduled', 'delivered'), true);
  assert.equal(shouldApplyShippingStatus('delivered', 'cancelled'), false);
});

test('skips shipment steps that have already completed', () => {
  assert.equal(isStepPending('create', { shiprocketOrderId: '99' }), false);
  assert.equal(isStepPending('create', {}), true);
  assert.equal(isStepPending('awb', { shipmentId: '5', awbNumber: 'AWB1' }), false);
  assert.equal(isStepPending('awb', { shipmentId: '5', awbNumber: '' }), true);
  assert.equal(isStepPending('pickup', { awbNumber: 'AWB1', pickupStatus: 'scheduled' }), false);
  assert.equal(isStepPending('pickup', { awbNumber: 'AWB1', pickupStatus: 'pending' }), true);
  assert.equal(isStepPending('label', { awbNumber: 'AWB1', labelUrl: 'https://labels.example/a' }), false);
});

test('builds a COD or prepaid Shiprocket order without credentials in the payload', () => {
  process.env.SHIPROCKET_PICKUP_LOCATION = 'Primary';
  const order = {
    orderNumber: 'AE1001',
    createdAt: '2026-09-27T10:00:00.000Z',
    notes: '',
    payment: { method: 'cod' },
    pricing: { discount: 10, shipping: 40, packaging: 0, handling: 0, codFee: 0, tax: 0, total: 130 },
    shippingAddress: {
      fullName: 'Asha Rao',
      phone: '+91 96230 79356',
      addressLine1: '12 Residency Road',
      addressLine2: '',
      landmark: '',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      postalCode: '560001',
    },
    billingAddress: {
      fullName: 'Asha Rao',
      phone: '9623079356',
      addressLine1: '12 Residency Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      postalCode: '560001',
    },
    items: [{ name: 'Almonds', sku: 'ALM-250', quantity: 1, price: 100 }],
  };

  const codPayload = buildAdhocOrderPayload({ order, email: 'asha@example.com', weightGrams: 500 });
  assert.equal(codPayload.payment_method, 'COD');
  assert.equal(codPayload.order_id, 'AE1001');
  assert.equal(codPayload.pickup_location, 'Primary');
  assert.equal(codPayload.shipping_phone, '9623079356');
  assert.equal(codPayload.sub_total, 100);
  assert.equal(codPayload.shipping_charges, 40);
  assert.equal(JSON.stringify(codPayload).includes('SHIPROCKET_PASSWORD'), false);
  assert.equal(codPayload.password, undefined);

  const prepaid = buildAdhocOrderPayload({
    order: { ...order, payment: { method: 'razorpay' } },
    email: 'asha@example.com',
    weightGrams: 250,
  });
  assert.equal(prepaid.payment_method, 'Prepaid');
  assert.equal(prepaid.weight, 0.5);
});

test('rejects an unsigned webhook and recognises a duplicate order error', () => {
  process.env.SHIPROCKET_WEBHOOK_TOKEN = 'hook-secret';
  assert.equal(verifyWebhookToken('hook-secret'), true);
  assert.equal(verifyWebhookToken('other-secret'), false);
  assert.equal(verifyWebhookToken(''), false);
  delete process.env.SHIPROCKET_WEBHOOK_TOKEN;
  assert.equal(verifyWebhookToken('hook-secret'), false);
  assert.equal(isDuplicateOrderError(new AppError('The order id has already been taken.', 400)), true);
  assert.equal(isDuplicateOrderError(new AppError('Pickup location was not found.', 400)), false);
});

test('reuses an existing Shiprocket order instead of creating a second one', async () => {
  process.env.SHIPROCKET_EMAIL = 'api@anantexotika.in';
  process.env.SHIPROCKET_PASSWORD = 'secret';
  process.env.SHIPROCKET_PICKUP_LOCATION = 'Primary';
  resetShiprocketState();

  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    const href = String(url);
    calls.push({ href, body: options.body });
    if (href.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ token: 'test-token' }), { status: 200 });
    }
    if (href.endsWith('/orders/create/adhoc')) {
      return new Response(JSON.stringify({ message: 'Order ID already exists' }), { status: 422 });
    }
    if (href.includes('/orders?')) {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: 555,
              channel_order_id: 'AE1001',
              shipments: { id: 777, awb: '', courier: '' },
            },
          ],
        }),
        { status: 200 }
      );
    }
    return new Response(JSON.stringify({ message: 'unexpected' }), { status: 500 });
  };

  try {
    const created = await createAdhocOrder({
      order: {
        orderNumber: 'AE1001',
        createdAt: new Date().toISOString(),
        payment: { method: 'razorpay' },
        pricing: { discount: 0, shipping: 0, packaging: 0, handling: 0, codFee: 0, tax: 0 },
        shippingAddress: {
          fullName: 'Asha Rao',
          phone: '9623079356',
          addressLine1: '12 Residency Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560001',
        },
        billingAddress: {
          fullName: 'Asha Rao',
          phone: '9623079356',
          addressLine1: '12 Residency Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560001',
        },
        items: [{ name: 'Almonds', sku: 'ALM-250', quantity: 1, price: 100 }],
      },
      email: 'asha@example.com',
      weightGrams: 500,
    });

    assert.equal(created.orderId, '555');
    assert.equal(created.shipmentId, '777');
    assert.equal(calls.filter((call) => call.href.endsWith('/orders/create/adhoc')).length, 1);
    const loginBody = JSON.parse(calls.find((call) => call.href.endsWith('/auth/login')).body);
    assert.equal(loginBody.email, 'api@anantexotika.in');
    assert.equal(calls.some((call) => String(call.body || '').includes('test-token')), false);
  } finally {
    global.fetch = originalFetch;
    resetShiprocketState();
    delete process.env.SHIPROCKET_EMAIL;
    delete process.env.SHIPROCKET_PASSWORD;
  }
});

test('retries Shiprocket 429 and 5xx responses and leaves 4xx alone', () => {
  assert.equal(shouldRetryShiprocketStatus(429), true);
  assert.equal(shouldRetryShiprocketStatus(502), true);
  assert.equal(shouldRetryShiprocketStatus(503), true);
  assert.equal(shouldRetryShiprocketStatus(400), false);
  assert.equal(shouldRetryShiprocketStatus(401), false);
  assert.equal(shouldRetryShiprocketStatus(422), false);
});
