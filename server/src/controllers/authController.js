const crypto = require('crypto');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const generateToken = require('../utils/generateToken');
const { successResponse } = require('../utils/apiResponse');
const { TOKEN_TYPE } = require('../utils/constants');
const { log } = require('../utils/logger');
const {
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendSignupVerificationEmail,
  sendWelcomeEmail,
  safeSend,
} = require('../services/emailService');
const { sendPhoneOtp } = require('../services/smsService');

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_WAIT_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const phoneDigits = (value) => String(value || '').replace(/\D/g, '');

const normalizePhone = (value) => {
  const digits = phoneDigits(value);
  const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(local) ? local : '';
};

const hashCode = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');

const newCode = () => String(crypto.randomInt(100000, 1000000));

const delivered = (result) => Boolean(result) && !result.skipped && !result.error;

const maskEmail = (email) => {
  const [name, domain] = String(email || '').split('@');
  if (!domain) return email;
  const visible = name.slice(0, 2);
  return `${visible}***@${domain}`;
};

const maskPhone = (phone) => `******${String(phone || '').slice(-4)}`;

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

const assignVerification = (user, emailCode, phoneCode) => {
  user.emailOtpHash = hashCode(emailCode);
  user.phoneOtpHash = hashCode(phoneCode);
  user.otpExpires = new Date(Date.now() + OTP_TTL_MS);
  user.otpAttempts = 0;
  user.otpSentAt = new Date();
  user.isEmailVerified = false;
  user.isPhoneVerified = false;
  user.status = 'inactive';
};

const issueVerification = async (user, { emailCode, phoneCode }) => {
  const [emailResult, phoneResult] = await Promise.all([
    safeSend(sendSignupVerificationEmail, { to: user.email, name: user.name, code: emailCode }),
    sendPhoneOtp({ phone: user.phone, code: phoneCode }),
  ]);

  if (process.env.NODE_ENV === 'production' && (!delivered(emailResult) || !delivered(phoneResult))) {
    throw new AppError('We could not send the verification codes. Please try again.', 503);
  }

  const devCodes = {};
  if (process.env.NODE_ENV !== 'production' && !delivered(emailResult)) devCodes.email = emailCode;
  if (process.env.NODE_ENV !== 'production' && !delivered(phoneResult)) devCodes.phone = phoneCode;

  return {
    verificationRequired: true,
    email: maskEmail(user.email),
    phone: maskPhone(user.phone),
    ...(Object.keys(devCodes).length ? { devCodes } : {}),
  };
};

const register = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = normalizePhone(req.body.phone);
  const password = String(req.body.password || '');

  if (name.length < 2 || !email || !password) {
    throw new AppError('Name, email, phone and password are required.', 400);
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new AppError('Please enter a valid email address.', 400);
  }
  if (!phone) {
    throw new AppError('Please enter a valid mobile number.', 400);
  }
  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters.', 400);
  }

  const [existingEmail, existingPhone] = await Promise.all([
    User.findOne({ email }).select('+otpSentAt'),
    User.findOne({ phone }).select('+otpSentAt'),
  ]);

  if (existingEmail && (existingEmail.status !== 'inactive' || existingEmail.isEmailVerified)) {
    throw new AppError('An account with this email already exists.', 409);
  }
  if (existingPhone && String(existingPhone._id) !== String(existingEmail?._id)) {
    if (existingPhone.status !== 'inactive' || existingPhone.isPhoneVerified) {
      throw new AppError('An account with this phone number already exists.', 409);
    }
    await User.deleteOne({ _id: existingPhone._id });
  }

  const user = existingEmail || new User({ email });
  const waiting = Boolean(existingEmail);
  if (waiting && user.otpSentAt && Date.now() - new Date(user.otpSentAt).getTime() < RESEND_WAIT_MS) {
    throw new AppError('Please wait a minute before requesting new codes.', 429);
  }

  user.name = name;
  user.email = email;
  user.phone = phone;
  user.password = password;
  const emailCode = newCode();
  const phoneCode = newCode();
  assignVerification(user, emailCode, phoneCode);

  try {
    await user.save();
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError('An account with these details already exists.', 409);
    }
    throw error;
  }

  try {
    const data = await issueVerification(user, { emailCode, phoneCode });
    successResponse(res, {
      statusCode: waiting ? 200 : 201,
      message: 'Enter the codes sent to your email and phone.',
      data,
    });
  } catch (error) {
    if (!waiting) {
      await User.deleteOne({ _id: user._id });
    } else {
      user.otpSentAt = undefined;
      await user.save({ validateBeforeSave: false });
    }
    throw error;
  }
});

const verifyRegistration = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const emailCode = String(req.body.emailCode || '').replace(/\D/g, '');
  const phoneCode = String(req.body.phoneCode || '').replace(/\D/g, '');

  if (!email || emailCode.length !== 6 || phoneCode.length !== 6) {
    throw new AppError('Enter the 6-digit codes from your email and phone.', 400);
  }

  const user = await User.findOne({ email }).select(
    '+emailOtpHash +phoneOtpHash +otpExpires +otpAttempts'
  );

  if (!user || user.status === 'blocked' || user.isEmailVerified) {
    throw new AppError('This verification has expired. Please create the account again.', 400);
  }
  if (!user.emailOtpHash || !user.phoneOtpHash || !user.otpExpires || user.otpExpires < new Date()) {
    throw new AppError('These codes have expired. Please request new ones.', 400);
  }
  if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
    throw new AppError('Too many attempts. Please request new codes.', 429);
  }
  if (hashCode(emailCode) !== user.emailOtpHash || hashCode(phoneCode) !== user.phoneOtpHash) {
    user.otpAttempts += 1;
    await user.save({ validateBeforeSave: false });
    throw new AppError('Those codes do not match. Please try again.', 400);
  }

  user.isEmailVerified = true;
  user.isPhoneVerified = true;
  user.status = 'active';
  user.emailOtpHash = undefined;
  user.phoneOtpHash = undefined;
  user.otpExpires = undefined;
  user.otpAttempts = 0;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  safeSend(sendWelcomeEmail, { to: user.email, name: user.name });
  sendUserAuth(res, user, 'Account created successfully', 201);
});

const resendRegistrationCodes = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = await User.findOne({ email }).select('+otpSentAt +emailOtpHash');

  if (!user || user.status !== 'inactive' || user.isEmailVerified) {
    throw new AppError('Start account creation again to receive new codes.', 400);
  }
  if (user.otpSentAt && Date.now() - new Date(user.otpSentAt).getTime() < RESEND_WAIT_MS) {
    throw new AppError('Please wait a minute before requesting new codes.', 429);
  }

  const emailCode = newCode();
  const phoneCode = newCode();
  assignVerification(user, emailCode, phoneCode);
  await user.save({ validateBeforeSave: false });

  try {
    const data = await issueVerification(user, { emailCode, phoneCode });
    successResponse(res, {
      message: 'New codes were sent to your email and phone.',
      data,
    });
  } catch (error) {
    user.otpSentAt = undefined;
    await user.save({ validateBeforeSave: false });
    throw error;
  }
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
    throw new AppError(
      user.isEmailVerified && user.isPhoneVerified
        ? 'Your account is inactive.'
        : 'Verify your email and phone number to activate this account.',
      403
    );
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

  const result = await safeSend(sendPasswordResetEmail, {
    to: user.email,
    name: user.name,
    resetToken,
  });
  const delivered = Boolean(result) && !result.skipped && !result.error;

  if (!delivered && process.env.NODE_ENV === 'production') {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    log('error', 'password reset email was not delivered', {});
  }

  const data = {};
  if (process.env.NODE_ENV !== 'production' && user.passwordResetToken) {
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

  safeSend(sendPasswordChangedEmail, {
    to: user.email,
    name: user.name,
    changedAt: new Date(),
  });

  sendUserAuth(res, user, 'Password reset successfully');
});

module.exports = {
  register,
  verifyRegistration,
  resendRegistrationCodes,
  login,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
};
