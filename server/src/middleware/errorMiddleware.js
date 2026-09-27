const multer = require('multer');
const { errorResponse } = require('../utils/apiResponse');
const { log, redact } = require('../utils/logger');

const errorMiddleware = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || [];

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));
  }

  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `${field} already exists`;
    errors = [{ field, message }];
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}`;
    errors = [{ field: err.path, message: `Invalid value for ${err.path}` }];
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token.';
    errors = [];
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Session expired. Please log in again.';
    errors = [];
  }

  if (
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongooseServerSelectionError' ||
    err.name === 'MongoNetworkError' ||
    err.name === 'MongoTimeoutError'
  ) {
    statusCode = 503;
    message = 'The service is temporarily unavailable. Please try again.';
    errors = [];
  }

  if (err.type === 'entity.too.large' || statusCode === 413) {
    statusCode = 413;
    message = 'Request payload is too large.';
    errors = [];
  }

  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400)) {
    statusCode = 400;
    message = 'Invalid JSON payload.';
    errors = [];
  }

  if (err instanceof multer.MulterError) {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File is too large. Maximum size is 5MB per image.';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files. Maximum is 10 images.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file field.';
    } else {
      message = 'Upload could not be processed.';
    }
    errors = [];
  }

  if (statusCode >= 500) {
    log('error', 'request failed', {
      requestId: req.id,
      method: req.method,
      path: String(req.originalUrl || '').split('?')[0],
      status: statusCode,
      name: err.name,
      message: redact(message),
    });
  }

  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    message = statusCode === 503
      ? 'The service is temporarily unavailable. Please try again.'
      : 'Internal server error';
    errors = [];
  }

  if (res.headersSent) {
    return next(err);
  }

  return errorResponse(res, { message, errors, statusCode });
};

module.exports = errorMiddleware;
