const Coupon = require('../models/Coupon');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { successResponse } = require('../utils/apiResponse');
const { getValidCoupon } = require('../services/couponService');
const { applyCouponDiscount, roundMoney } = require('../services/pricingService');
const { COUPON_KIND, DISCOUNT_TYPE } = require('../utils/constants');
const {
  applyGiftVoucherRules,
  ensureUniqueCouponCode,
  generateGiftVoucherCode,
  isGiftVoucher,
} = require('../utils/giftVoucher');

const getCartSubtotal = async (userId) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart || cart.items.length === 0) {
    return 0;
  }

  const products = await Product.find({
    _id: { $in: cart.items.map((item) => item.product) },
  }).select('price');
  const priceMap = new Map(products.map((product) => [String(product._id), product.price]));

  return roundMoney(
    cart.items.reduce((sum, item) => {
      const price = priceMap.get(String(item.product)) || 0;
      return sum + price * item.quantity;
    }, 0)
  );
};

const validateCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;

  if (!code) {
    throw new AppError('Coupon code is required.', 400);
  }

  const subtotal = await getCartSubtotal(req.user._id);

  if (subtotal <= 0) {
    throw new AppError('Your cart is empty.', 400);
  }

  const coupon = await getValidCoupon({
    code,
    userId: req.user._id,
    subtotal,
  });

  const discount = applyCouponDiscount(subtotal, coupon);

  successResponse(res, {
    message: isGiftVoucher(coupon) ? 'Gift voucher is valid' : 'Coupon is valid',
    data: {
      coupon: {
        kind: coupon.kind || 'promo',
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maximumDiscount: coupon.maximumDiscount,
        minimumOrderAmount: coupon.minimumOrderAmount,
      },
      subtotal,
      discount,
      total: roundMoney(Math.max(0, subtotal - discount)),
    },
  });
});

const getCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });

  successResponse(res, {
    message: 'Coupons retrieved successfully',
    data: { coupons },
  });
});

const createCoupon = asyncHandler(async (req, res) => {
  const kind = req.body.kind === 'gift_voucher' ? 'gift_voucher' : 'promo';
  let {
    code,
    discountType,
    discountValue,
    startDate,
    endDate,
    description,
    minimumOrderAmount,
    maximumDiscount,
    usageLimit,
    perUserLimit,
    isActive,
  } = req.body;

  if (kind === 'gift_voucher') {
    ({ discountType, usageLimit, perUserLimit, maximumDiscount } = applyGiftVoucherRules({
      discountType,
      usageLimit,
      perUserLimit,
      maximumDiscount,
    }));
    const requestedCode = code ? String(code).toUpperCase().trim() : '';
    if (requestedCode) {
      const exists = await Coupon.exists({ code: requestedCode });
      if (exists) {
        throw new AppError('This voucher code already exists.', 409);
      }
      code = requestedCode;
    } else {
      code = await ensureUniqueCouponCode(generateGiftVoucherCode());
    }
  }

  if (!code || !discountType || discountValue === undefined || discountValue === '' || !startDate || !endDate) {
    throw new AppError(
      kind === 'gift_voucher'
        ? 'Gift voucher amount, start date and end date are required.'
        : 'Code, discount type, discount value, start date and end date are required.',
      400
    );
  }

  if (!COUPON_KIND.includes(kind)) {
    throw new AppError('Coupon kind must be promo or gift_voucher.', 400);
  }

  if (!DISCOUNT_TYPE.includes(discountType)) {
    throw new AppError('Discount type must be percentage or fixed.', 400);
  }

  if (Number(discountValue) <= 0) {
    throw new AppError(
      kind === 'gift_voucher'
        ? 'Gift voucher amount must be greater than zero.'
        : 'Discount value must be greater than zero.',
      400
    );
  }

  if (new Date(endDate) < new Date(startDate)) {
    throw new AppError('End date must be after start date.', 400);
  }

  const coupon = await Coupon.create({
    kind,
    code: String(code).toUpperCase().trim(),
    description: description || '',
    discountType,
    discountValue: Number(discountValue),
    minimumOrderAmount: Number(minimumOrderAmount) || 0,
    maximumDiscount: Number(maximumDiscount) || 0,
    startDate,
    endDate,
    usageLimit: Number(usageLimit) || 0,
    usedCount: 0,
    perUserLimit: perUserLimit === undefined || perUserLimit === '' ? 1 : Number(perUserLimit),
    isActive: isActive !== false,
  });

  successResponse(res, {
    message:
      kind === 'gift_voucher'
        ? 'Gift voucher created successfully'
        : 'Coupon created successfully',
    statusCode: 201,
    data: { coupon },
  });
});

const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    throw new AppError('Coupon not found.', 404);
  }

  const allowed = [
    'code',
    'description',
    'discountType',
    'discountValue',
    'minimumOrderAmount',
    'maximumDiscount',
    'startDate',
    'endDate',
    'usageLimit',
    'perUserLimit',
    'isActive',
  ];

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) {
      coupon[field] = req.body[field];
    }
  });

  if (isGiftVoucher(coupon)) {
    const forced = applyGiftVoucherRules(coupon);
    coupon.discountType = forced.discountType;
    coupon.usageLimit = forced.usageLimit;
    coupon.perUserLimit = forced.perUserLimit;
    coupon.maximumDiscount = forced.maximumDiscount;
    coupon.kind = 'gift_voucher';
  }

  await coupon.save();

  successResponse(res, {
    message: isGiftVoucher(coupon)
      ? 'Gift voucher updated successfully'
      : 'Coupon updated successfully',
    data: { coupon },
  });
});

const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    throw new AppError('Coupon not found.', 404);
  }

  await coupon.deleteOne();

  successResponse(res, {
    message: 'Coupon deleted successfully',
    data: {},
  });
});

module.exports = {
  validateCoupon,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
};
