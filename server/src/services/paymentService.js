const Razorpay = require('razorpay');
const crypto = require('crypto');
const AppError = require('../utils/AppError');
const { isCodEnabledGlobally, getPublicShippingConfig } = require('./shippingService');

const isRazorpayConfigured = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

let client;

const getClient = () => {
  if (!isRazorpayConfigured()) {
    throw new AppError('Online payment is not configured.', 503);
  }
  if (!client) {
    client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return client;
};

const getPublicPaymentConfig = () => {
  const shipping = getPublicShippingConfig();
  const razorpayEnabled = isRazorpayConfigured();
  const codEnabled = isCodEnabledGlobally();
  const methods = [];

  if (razorpayEnabled) {
    methods.push({
      value: 'razorpay',
      label: 'Pay securely (UPI / Cards / Netbanking / Wallets)',
    });
  }
  if (codEnabled) {
    methods.push({ value: 'cod', label: 'Cash on Delivery' });
  }
  if (!methods.length) {
    methods.push({ value: 'cod', label: 'Cash on Delivery' });
  }

  return {
    razorpayEnabled,
    codEnabled,
    keyId: razorpayEnabled ? process.env.RAZORPAY_KEY_ID : '',
    methods,
    shipping,
  };
};

const createRazorpayOrder = async ({ amount, receipt, notes = {} }) => {
  const paise = Math.round(Number(amount) * 100);
  if (!Number.isFinite(paise) || paise < 100) {
    throw new AppError('Order amount is too low for online payment.', 400);
  }

  return getClient().orders.create({
    amount: paise,
    currency: 'INR',
    receipt: String(receipt).slice(0, 40),
    payment_capture: 1,
    notes,
  });
};

const verifyRazorpaySignature = ({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new AppError('Payment verification details are incomplete.', 400);
  }

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(String(razorpaySignature));

  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    throw new AppError('Payment verification failed. Your order has not been confirmed.', 400);
  }

  return true;
};

const verifyWebhookSignature = (rawBody, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new AppError('Razorpay webhook secret is not configured.', 503);
  }
  if (!signature) {
    throw new AppError('Missing webhook signature.', 400);
  }

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(String(signature));

  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    throw new AppError('Invalid webhook signature.', 400);
  }

  return true;
};

const fetchRazorpayPayment = async (paymentId) => {
  if (!paymentId) {
    throw new AppError('Payment ID is required.', 400);
  }
  return getClient().payments.fetch(paymentId);
};

const assertPaymentMatchesOrder = (payment, order) => {
  const expectedPaise = Math.round(Number(order.pricing?.total || 0) * 100);
  const paidPaise = Number(payment.amount);
  const currency = String(payment.currency || '').toUpperCase();

  if (currency && currency !== 'INR') {
    throw new AppError('Payment currency mismatch.', 400);
  }

  if (!Number.isFinite(paidPaise) || paidPaise !== expectedPaise) {
    throw new AppError('Payment amount does not match the order total.', 400);
  }

  if (order.payment?.gatewayOrderId && payment.order_id && payment.order_id !== order.payment.gatewayOrderId) {
    throw new AppError('Payment does not belong to this order.', 400);
  }

  const status = String(payment.status || '').toLowerCase();
  if (!['captured', 'authorized'].includes(status)) {
    throw new AppError(`Payment is not successful (status: ${payment.status || 'unknown'}).`, 400);
  }

  return true;
};

const createRazorpayRefund = async ({ paymentId, amount, notes = {} }) => {
  if (!paymentId) {
    throw new AppError('Payment ID is required for refund.', 400);
  }
  const payload = { notes };
  if (amount !== undefined && amount !== null) {
    const paise = Math.round(Number(amount) * 100);
    if (!Number.isFinite(paise) || paise < 100) {
      throw new AppError('Refund amount is invalid.', 400);
    }
    payload.amount = paise;
  }
  return getClient().payments.refund(paymentId, payload);
};

module.exports = {
  isRazorpayConfigured,
  getPublicPaymentConfig,
  createRazorpayOrder,
  verifyRazorpaySignature,
  verifyWebhookSignature,
  fetchRazorpayPayment,
  assertPaymentMatchesOrder,
  createRazorpayRefund,
};
