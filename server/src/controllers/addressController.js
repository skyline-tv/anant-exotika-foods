const Address = require('../models/Address');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { successResponse } = require('../utils/apiResponse');
const { ADDRESS_TYPE } = require('../utils/constants');

const unsetOtherDefaults = async (userId, keepId) => {
  await Address.updateMany(
    { user: userId, _id: { $ne: keepId }, isDefault: true },
    { $set: { isDefault: false } }
  );
};

const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ user: req.user._id }).sort({
    isDefault: -1,
    createdAt: -1,
  });

  successResponse(res, {
    message: 'Addresses retrieved successfully',
    data: { addresses },
  });
});

const createAddress = asyncHandler(async (req, res) => {
  const { fullName, phone, addressLine1, city, state, postalCode } = req.body;

  if (!fullName || !phone || !addressLine1 || !city || !state || !postalCode) {
    throw new AppError(
      'Full name, phone, address line 1, city, state and postal code are required.',
      400
    );
  }

  if (req.body.addressType && !ADDRESS_TYPE.includes(req.body.addressType)) {
    throw new AppError('Invalid address type.', 400);
  }

  const count = await Address.countDocuments({ user: req.user._id });
  const isDefault = count === 0 ? true : Boolean(req.body.isDefault);

  const address = await Address.create({
    user: req.user._id,
    fullName,
    phone,
    addressLine1,
    addressLine2: req.body.addressLine2 || '',
    landmark: req.body.landmark || '',
    city,
    state,
    country: req.body.country || 'India',
    postalCode,
    addressType: req.body.addressType || 'home',
    isDefault,
  });

  if (address.isDefault) {
    await unsetOtherDefaults(req.user._id, address._id);
  }

  successResponse(res, {
    message: 'Address created successfully',
    statusCode: 201,
    data: { address },
  });
});

const updateAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!address) {
    throw new AppError('Address not found.', 404);
  }

  const allowed = [
    'fullName',
    'phone',
    'addressLine1',
    'addressLine2',
    'landmark',
    'city',
    'state',
    'country',
    'postalCode',
    'addressType',
    'isDefault',
  ];

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) {
      address[field] = req.body[field];
    }
  });

  await address.save();

  if (address.isDefault) {
    await unsetOtherDefaults(req.user._id, address._id);
  }

  successResponse(res, {
    message: 'Address updated successfully',
    data: { address },
  });
});

const deleteAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!address) {
    throw new AppError('Address not found.', 404);
  }

  const wasDefault = address.isDefault;
  await address.deleteOne();

  if (wasDefault) {
    const nextDefault = await Address.findOne({ user: req.user._id }).sort({
      createdAt: -1,
    });
    if (nextDefault) {
      nextDefault.isDefault = true;
      await nextDefault.save();
    }
  }

  successResponse(res, {
    message: 'Address deleted successfully',
    data: {},
  });
});

const setDefaultAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!address) {
    throw new AppError('Address not found.', 404);
  }

  address.isDefault = true;
  await address.save();
  await unsetOtherDefaults(req.user._id, address._id);

  successResponse(res, {
    message: 'Default address updated successfully',
    data: { address },
  });
});

module.exports = {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
