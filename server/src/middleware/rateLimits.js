const rateLimit = require('express-rate-limit');

const positiveInt = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
};

const buildLimiter = (maxEnv, fallback, message) =>
  rateLimit({
    windowMs: positiveInt('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    max: positiveInt(maxEnv, fallback),
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    skip: (req) => {
      const url = String(req.originalUrl || '');
      return url.includes('/shipping/webhook') || url.includes('/payments/webhook');
    },
    message: {
      success: false,
      message,
      errors: [],
    },
  });

const searchLimiter = buildLimiter(
  'RATE_LIMIT_SEARCH_MAX',
  120,
  'Too many search requests, please try again later.'
);

const limitSearch = (req, res, next) => {
  if (req.query.search || req.query.q) {
    return searchLimiter(req, res, next);
  }
  return next();
};

module.exports = {
  publicLimiter: buildLimiter(
    'RATE_LIMIT_PUBLIC_MAX',
    600,
    'Too many requests, please try again later.'
  ),
  authLimiter: buildLimiter(
    'RATE_LIMIT_AUTH_MAX',
    20,
    'Too many authentication attempts, please try again later.'
  ),
  orderLimiter: buildLimiter(
    'RATE_LIMIT_ORDER_MAX',
    30,
    'Too many order attempts, please try again later.'
  ),
  paymentLimiter: buildLimiter(
    'RATE_LIMIT_PAYMENT_MAX',
    40,
    'Too many payment attempts, please try again later.'
  ),
  shippingLimiter: buildLimiter(
    'RATE_LIMIT_SHIPPING_MAX',
    60,
    'Too many shipping requests, please try again later.'
  ),
  uploadLimiter: buildLimiter(
    'RATE_LIMIT_UPLOAD_MAX',
    30,
    'Too many upload attempts, please try again later.'
  ),
  searchLimiter,
  limitSearch,
};
