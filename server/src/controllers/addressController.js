const Address = require('../models/Address');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { successResponse } = require('../utils/apiResponse');
const { ADDRESS_TYPE } = require('../utils/constants');
const { validateAddressPayload } = require('../utils/addressValidation');

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
  const validated = validateAddressPayload(req.body);
  if (!validated.valid) {
    throw new AppError(validated.message, 400);
  }

  if (req.body.addressType && !ADDRESS_TYPE.includes(req.body.addressType)) {
    throw new AppError('Invalid address type.', 400);
  }

  const count = await Address.countDocuments({ user: req.user._id });
  const isDefault = count === 0 ? true : Boolean(req.body.isDefault);
  const payload = validated.value;

  const address = await Address.create({
    user: req.user._id,
    fullName: payload.fullName,
    phone: payload.phone,
    addressLine1: payload.addressLine1,
    addressLine2: payload.addressLine2,
    landmark: payload.landmark,
    city: payload.city,
    state: payload.state,
    country: payload.country,
    postalCode: payload.postalCode,
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

  const merged = {
    fullName: req.body.fullName ?? address.fullName,
    phone: req.body.phone ?? address.phone,
    addressLine1: req.body.addressLine1 ?? address.addressLine1,
    addressLine2: req.body.addressLine2 ?? address.addressLine2,
    landmark: req.body.landmark ?? address.landmark,
    city: req.body.city ?? address.city,
    state: req.body.state ?? address.state,
    country: req.body.country ?? address.country,
    postalCode: req.body.postalCode ?? address.postalCode,
    addressType: req.body.addressType ?? address.addressType,
    isDefault: req.body.isDefault ?? address.isDefault,
  };

  const validated = validateAddressPayload(merged);
  if (!validated.valid) {
    throw new AppError(validated.message, 400);
  }

  if (merged.addressType && !ADDRESS_TYPE.includes(merged.addressType)) {
    throw new AppError('Invalid address type.', 400);
  }

  Object.assign(address, {
    ...validated.value,
    addressType: merged.addressType || address.addressType,
    isDefault: Boolean(merged.isDefault),
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
