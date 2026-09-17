const multer = require('multer');
const { errorResponse } = require('../utils/apiResponse');

const errorMiddleware = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
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
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Session expired. Please log in again.';
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
      message = err.message;
    }
  }

  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal server error';
    errors = [];
  }

  if (process.env.NODE_ENV !== 'production' && err.stack && statusCode === 500) {
    console.error(err);
  }

  return errorResponse(res, { message, errors, statusCode });
};

module.exports = errorMiddleware;
