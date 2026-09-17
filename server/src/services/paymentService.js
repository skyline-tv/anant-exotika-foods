const Razorpay = require('razorpay');
const crypto = require('crypto');
const AppError = require('../utils/AppError');

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

const getPublicPaymentConfig = () => ({
  razorpayEnabled: isRazorpayConfigured(),
  keyId: isRazorpayConfigured() ? process.env.RAZORPAY_KEY_ID : '',
  methods: isRazorpayConfigured()
    ? [
        { value: 'cod', label: 'Cash on Delivery' },
        { value: 'razorpay', label: 'UPI / Cards / Netbanking' },
      ]
    : [{ value: 'cod', label: 'Cash on Delivery' }],
});

const createRazorpayOrder = async ({ amount, receipt }) => {
  const paise = Math.round(Number(amount) * 100);
  if (!Number.isFinite(paise) || paise < 100) {
    throw new AppError('Order amount is too low for online payment.', 400);
  }

  return getClient().orders.create({
    amount: paise,
    currency: 'INR',
    receipt: String(receipt).slice(0, 40),
    payment_capture: 1,
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

module.exports = {
  isRazorpayConfigured,
  getPublicPaymentConfig,
  createRazorpayOrder,
  verifyRazorpaySignature,
};
