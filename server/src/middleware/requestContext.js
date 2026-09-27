const crypto = require('crypto');
const { logRequest } = require('../utils/logger');

const requestTimeoutMs = () => {
  const value = Number(process.env.HTTP_REQUEST_TIMEOUT_MS);
  return Number.isFinite(value) && value >= 1000 ? value : 60000;
};

const requestContext = (req, res, next) => {
  const incoming = String(req.get('x-request-id') || '')
    .replace(/[^\w.-]/g, '')
    .slice(0, 80);
  const requestId = incoming || crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(503).json({
        success: false,
        message: 'Request timed out.',
        errors: [],
      });
    }
  }, requestTimeoutMs());
  if (typeof timer.unref === 'function') timer.unref();

  const started = process.hrtime.bigint();
  const finish = () => {
    clearTimeout(timer);
    const ms = Math.round(Number(process.hrtime.bigint() - started) / 1e6);
    logRequest({
      requestId,
      method: req.method,
      path: String(req.originalUrl || '').split('?')[0],
      status: res.statusCode,
      ms,
    });
  };

  res.on('finish', () => {
    if (req.path === '/health' || req.path === '/ready') {
      clearTimeout(timer);
      return;
    }
    const slowMs = Number(process.env.SLOW_REQUEST_MS) || 500;
    const elapsed = Math.round(Number(process.hrtime.bigint() - started) / 1e6);
    if (res.statusCode >= 400 || elapsed >= slowMs) {
      finish();
    } else {
      clearTimeout(timer);
    }
  });
  res.on('close', () => clearTimeout(timer));
  next();
};

module.exports = requestContext;
