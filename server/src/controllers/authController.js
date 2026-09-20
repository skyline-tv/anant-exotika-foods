const crypto = require('crypto');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const generateToken = require('../utils/generateToken');
const { successResponse } = require('../utils/apiResponse');
const { TOKEN_TYPE } = require('../utils/constants');
const {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  safeSend,
} = require('../services/emailService');

const sendUserAuth = (res, user, message, statusCode = 200) => {
  const token = generateToken(user._id, TOKEN_TYPE.USER);
  return successResponse(res, {
    message,
    statusCode,
    data: {
      user,
      token,
    },
  });
};

const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !password) {
    throw new AppError('Name, email and password are required.', 400);
  }

  if (String(password).length < 8) {
    throw new AppError('Password must be at least 8 characters.', 400);
  }

  const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingEmail) {
    throw new AppError('An account with this email already exists.', 409);
  }

  if (phone) {
    const existingPhone = await User.findOne({ phone: String(phone).trim() });
    if (existingPhone) {
      throw new AppError('An account with this phone number already exists.', 409);
    }
  }

  const user = await User.create({
    name,
    email,
    phone: phone ? String(phone).trim() || null : null,
    password,
  });

  safeSend(sendWelcomeEmail, { to: user.email, name: user.name });

  sendUserAuth(res, user, 'Account created successfully', 201);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required.', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    '+password'
  );

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password.', 401);
  }

  if (user.status === 'blocked') {
    throw new AppError('Your account has been blocked.', 403);
  }

  if (user.status === 'inactive') {
    throw new AppError('Your account is inactive.', 403);
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  sendUserAuth(res, user, 'Logged in successfully');
});

const getMe = asyncHandler(async (req, res) => {
  successResponse(res, {
    message: 'Profile retrieved successfully',
    data: { user: req.user },
  });
});

const logout = asyncHandler(async (req, res) => {
  successResponse(res, {
    message: 'Logged out successfully. Please discard the token on the client.',
    data: {},
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('Email is required.', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  const genericMessage =
    'If an account exists for this email, password reset instructions have been sent.';

  if (!user) {
    return successResponse(res, { message: genericMessage, data: {} });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  try {
    const result = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetToken,
    });

    if (result?.skipped && process.env.NODE_ENV === 'production') {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      throw new AppError('Unable to send password reset email. Please try again later.', 500);
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    throw new AppError('Unable to send password reset email. Please try again later.', 500);
  }

  const data = {};
  if (process.env.NODE_ENV !== 'production') {
    data.resetToken = resetToken;
    data.expiresAt = user.passwordResetExpires;
  }

  successResponse(res, {
    message: genericMessage,
    data,
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    throw new AppError('Token and new password are required.', 400);
  }

  if (String(password).length < 8) {
    throw new AppError('Password must be at least 8 characters.', 400);
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    throw new AppError('Password reset token is invalid or has expired.', 400);
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  sendUserAuth(res, user, 'Password reset successfully');
});

module.exports = {
  register,
  login,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
};
