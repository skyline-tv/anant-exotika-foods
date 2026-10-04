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
const { couponDiscountBreakdown, linesFromProducts, normalizeDiscountApplyOn, roundMoney } = require('../services/pricingService');
const { quoteShipping, getPublicShippingConfig } = require('../services/shippingService');
const { verifyWebhookToken } = require('../services/shiprocketService');
const { applyShiprocketWebhook } = require('../services/shipmentService');

const getShippingConfig = asyncHandler(async (req, res) => {
  successResponse(res, {
    message: 'Shipping configuration retrieved successfully',
    data: await getPublicShippingConfig(),
  });
});

const checkPincode = asyncHandler(async (req, res) => {
  const pincode = req.query.pincode || req.body.pincode;
  const weight = Number(req.query.weight);
  const subtotal = Number(req.query.subtotal);
  const quote = await quoteShipping({
    postalCode: pincode,
    subtotal: Number.isFinite(subtotal) && subtotal > 0 ? subtotal : 0,
    discount: 0,
    paymentMethod: 'razorpay',
    items: [{ quantity: 1, weight: Number.isFinite(weight) && weight > 0 ? weight : 500 }],
  });
  const publicQuote = { ...quote };
  delete publicQuote.raw;
  successResponse(res, {
    message: 'Shipping rate calculated',
    data: publicQuote,
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
  const lines = linesFromProducts(cart.items, productMap);

  const weightedItems = [];
  for (const item of cart.items) {
    const product = productMap.get(String(item.product));
    if (!product) continue;
    weightedItems.push({
      quantity: item.quantity,
      weight: product.weight,
      product,
    });
  }
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.total, 0));

  let coupon = null;
  if (couponCode) {
    coupon = await getValidCoupon({
      code: couponCode,
      userId: req.user._id,
      subtotal,
    });
  }
  const breakdown = couponDiscountBreakdown(subtotal, coupon, lines);
  const discount = breakdown.discount;

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
      mrpSubtotal: breakdown.mrpSubtotal,
      productPayable: breakdown.productPayable,
      discount,
      estimatedTotal: quote.estimatedTotal,
      coupon: coupon
        ? {
            code: coupon.code,
            kind: coupon.kind || 'promo',
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            discountApplyOn: normalizeDiscountApplyOn(coupon),
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
