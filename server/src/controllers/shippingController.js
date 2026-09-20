const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Address = require('../models/Address');
const { getValidCoupon } = require('../services/couponService');
const { calculateItemTotal, applyCouponDiscount, roundMoney } = require('../services/pricingService');
const { quoteShipping, getPublicShippingConfig } = require('../services/shippingService');
const { checkPincodeServiceability } = require('../services/delhiveryService');

const getShippingConfig = asyncHandler(async (req, res) => {
  successResponse(res, {
    message: 'Shipping configuration retrieved successfully',
    data: getPublicShippingConfig(),
  });
});

const checkPincode = asyncHandler(async (req, res) => {
  const pincode = req.query.pincode || req.body.pincode;
  const result = await checkPincodeServiceability(pincode);
  if (!result.serviceable) {
    throw new AppError(result.remarks || 'This pincode is not serviceable.', 400);
  }
  successResponse(res, {
    message: 'Pincode is serviceable',
    data: result,
  });
});

const quoteCheckoutShipping = asyncHandler(async (req, res) => {
  const { shippingAddressId, postalCode, paymentMethod = 'razorpay', couponCode } = req.body;

  let pin = String(postalCode || '').trim();
  if (shippingAddressId) {
    const address = await Address.findOne({ _id: shippingAddressId, user: req.user._id });
    if (!address) {
      throw new AppError('Shipping address not found.', 404);
    }
    pin = address.postalCode;
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || cart.items.length === 0) {
    throw new AppError('Your cart is empty.', 400);
  }

  const productIds = cart.items.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((product) => [String(product._id), product]));

  const weightedItems = [];
  let subtotal = 0;
  for (const item of cart.items) {
    const product = productMap.get(String(item.product));
    if (!product) continue;
    const lineTotal = calculateItemTotal(product.price, item.quantity);
    subtotal += lineTotal;
    weightedItems.push({
      quantity: item.quantity,
      weight: product.weight,
      product,
    });
  }
  subtotal = roundMoney(subtotal);

  let coupon = null;
  if (couponCode) {
    coupon = await getValidCoupon({
      code: couponCode,
      userId: req.user._id,
      subtotal,
    });
  }
  const discount = applyCouponDiscount(subtotal, coupon);

  const quote = await quoteShipping({
    postalCode: pin,
    subtotal,
    discount,
    paymentMethod,
    items: weightedItems,
  });

  successResponse(res, {
    message: 'Shipping quote calculated successfully',
    data: {
      ...quote,
      subtotal,
      discount,
      estimatedTotal: roundMoney(Math.max(0, subtotal - discount + quote.shipping)),
      coupon: coupon
        ? {
            code: coupon.code,
            kind: coupon.kind || 'promo',
          }
        : null,
    },
  });
});

module.exports = {
  getShippingConfig,
  checkPincode,
  quoteCheckoutShipping,
};
