const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const {
  claimWebhookEvent,
  releaseWebhookEvent,
  hashEvent,
} = require('../services/webhookEventService');
const AppError = require('../utils/AppError');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Address = require('../models/Address');
const { getValidCoupon } = require('../services/couponService');
const { calculateItemTotal, applyCouponDiscount, roundMoney } = require('../services/pricingService');
const { quoteShipping, getPublicShippingConfig } = require('../services/shippingService');
const { checkPincodeServiceability, verifyWebhookToken } = require('../services/shiprocketService');
const { applyShiprocketWebhook } = require('../services/shipmentService');

const getShippingConfig = asyncHandler(async (req, res) => {
  successResponse(res, {
    message: 'Shipping configuration retrieved successfully',
    data: await getPublicShippingConfig(),
  });
});

const checkPincode = asyncHandler(async (req, res) => {
  const pincode = req.query.pincode || req.body.pincode;
  const result = await checkPincodeServiceability(pincode);
  if (!result.serviceable && result.definitive) {
    throw new AppError(result.remarks || 'This pincode is not serviceable.', 400);
  }
  const publicResult = { ...result };
  delete publicResult.raw;
  successResponse(res, {
    message: 'Pincode is serviceable',
    data: publicResult,
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
  const publicQuote = { ...quote };
  delete publicQuote.raw;

  successResponse(res, {
    message: 'Shipping quote calculated successfully',
    data: {
      ...publicQuote,
      subtotal,
      discount,
      estimatedTotal: quote.estimatedTotal,
      coupon: coupon
        ? {
            code: coupon.code,
            kind: coupon.kind || 'promo',
          }
        : null,
    },
  });
});

const handleShiprocketWebhook = asyncHandler(async (req, res) => {
  const provided = req.get('x-api-key') || req.get('x-shiprocket-token') || '';
  if (!verifyWebhookToken(provided)) {
    throw new AppError('Invalid Shiprocket webhook token.', 401);
  }

  const payload = req.body;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AppError('Invalid Shiprocket webhook payload.', 400);
  }

  const eventKey = hashEvent(
    [
      payload.awb || payload.awb_code || '',
      payload.current_status || payload.shipment_status || '',
      payload.order_id || payload.sr_order_id || '',
      payload.current_timestamp || '',
    ].join('|')
  );
  const claim = await claimWebhookEvent('shiprocket', eventKey);
  if (!claim.claimed) {
    return successResponse(res, {
      message: 'Webhook already processed',
      data: { ignored: true },
    });
  }

  try {
    const result = await applyShiprocketWebhook(payload);
    successResponse(res, {
      message: result.ignored ? 'Webhook ignored' : 'Webhook processed',
      data: { ignored: Boolean(result.ignored) },
    });
  } catch (error) {
    await releaseWebhookEvent(claim.key);
    throw error;
  }
});

module.exports = {
  getShippingConfig,
  checkPincode,
  quoteCheckoutShipping,
  handleShiprocketWebhook,
};
