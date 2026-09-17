const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { TOKEN_TYPE } = require('../utils/constants');

const readBearerToken = (req) => {
  const authHeader = req.headers.authorization;
  return authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;
};

const authenticateAdmin = asyncHandler(async (req, res, next) => {
  const token = readBearerToken(req);

  if (!token) {
    throw new AppError('Admin authentication required.', 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Session expired. Please log in again.', 401);
    }
    throw new AppError('Invalid authentication token.', 401);
  }

  if (decoded.type !== TOKEN_TYPE.ADMIN) {
    throw new AppError('Admin access required.', 403);
  }

  const admin = await Admin.findById(decoded.id);

  if (!admin) {
    throw new AppError('Admin not found.', 401);
  }

  if (!admin.isActive) {
    throw new AppError('Admin account is inactive.', 403);
  }

  req.admin = admin;
  next();
});

const optionalAuthenticateAdmin = asyncHandler(async (req, res, next) => {
  const token = readBearerToken(req);
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== TOKEN_TYPE.ADMIN) {
      return next();
    }

    const admin = await Admin.findById(decoded.id);
    if (admin && admin.isActive) {
      req.admin = admin;
    }
  } catch {
    // Public product/category reads should still succeed without a valid admin token.
  }

  next();
});

module.exports = {
  authenticateAdmin,
  optionalAuthenticateAdmin,
};
