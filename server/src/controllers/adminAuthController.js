const Admin = require('../models/Admin');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const generateToken = require('../utils/generateToken');
const { successResponse } = require('../utils/apiResponse');
const { TOKEN_TYPE } = require('../utils/constants');

const sendAdminAuth = (res, admin, message, statusCode = 200) => {
  const token = generateToken(admin._id, TOKEN_TYPE.ADMIN);
  return successResponse(res, {
    message,
    statusCode,
    data: {
      admin,
      token,
    },
  });
};

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required.', 400);
  }

  const admin = await Admin.findOne({ email: email.toLowerCase().trim() }).select(
    '+password'
  );

  if (!admin || !(await admin.comparePassword(password))) {
    throw new AppError('Invalid email or password.', 401);
  }

  if (!admin.isActive) {
    throw new AppError('Admin account is inactive.', 403);
  }

  admin.lastLogin = new Date();
  await admin.save({ validateBeforeSave: false });

  sendAdminAuth(res, admin, 'Admin logged in successfully');
});

const getMe = asyncHandler(async (req, res) => {
  successResponse(res, {
    message: 'Admin profile retrieved successfully',
    data: { admin: req.admin },
  });
});

const logout = asyncHandler(async (req, res) => {
  successResponse(res, {
    message: 'Logged out successfully. Please discard the token on the client.',
    data: {},
  });
});

module.exports = {
  login,
  getMe,
  logout,
};
