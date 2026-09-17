const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { TOKEN_TYPE } = require('../utils/constants');

const authenticateUser = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null;

  if (!token) {
    throw new AppError('Authentication required. Please log in.', 401);
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

  if (decoded.type !== TOKEN_TYPE.USER) {
    throw new AppError('Customer access required.', 403);
  }

  const user = await User.findById(decoded.id);

  if (!user) {
    throw new AppError('User not found.', 401);
  }

  if (user.status === 'blocked') {
    throw new AppError('Your account has been blocked.', 403);
  }

  if (user.status === 'inactive') {
    throw new AppError('Your account is inactive.', 403);
  }

  req.user = user;
  next();
});

module.exports = {
  authenticateUser,
};
