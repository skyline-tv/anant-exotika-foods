const User = require('../models/User');
const Order = require('../models/Order');
const Address = require('../models/Address');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { successResponse } = require('../utils/apiResponse');
const { getPagination, buildPagination } = require('../utils/pagination');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const attachOrderStats = async (users) => {
  const ids = users.map((user) => user._id);
  if (ids.length === 0) return [];

  const stats = await Order.aggregate([
    { $match: { user: { $in: ids } } },
    {
      $group: {
        _id: '$user',
        ordersCount: { $sum: 1 },
        totalSpent: { $sum: '$pricing.total' },
        lastOrderAt: { $max: '$createdAt' },
      },
    },
  ]);

  const statsMap = new Map(stats.map((item) => [String(item._id), item]));

  return users.map((user) => {
    const entry = statsMap.get(String(user._id));
    const json = user.toJSON();
    return {
      ...json,
      joinedAt: user.createdAt,
      ordersCount: entry?.ordersCount || 0,
      totalSpent: entry?.totalSpent || 0,
      lastOrderAt: entry?.lastOrderAt || null,
    };
  });
};

const listCustomers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};

  if (req.query.search) {
    const regex = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }

  if (req.query.status) {
    filter.status = req.query.status;
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  const customers = await attachOrderStats(users);

  successResponse(res, {
    message: 'Customers retrieved successfully',
    data: {
      customers,
      pagination: buildPagination({ page, limit, total }),
    },
  });
});

const getCustomerById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('Customer not found.', 404);
  }

  const [addresses, orders] = await Promise.all([
    Address.find({ user: user._id }).sort({ isDefault: -1, createdAt: -1 }),
    Order.find({ user: user._id }).sort({ createdAt: -1 }).limit(50),
  ]);

  const [customer] = await attachOrderStats([user]);

  successResponse(res, {
    message: 'Customer retrieved successfully',
    data: {
      customer: {
        ...customer,
        addresses,
        orders,
      },
    },
  });
});

module.exports = {
  listCustomers,
  getCustomerById,
};
