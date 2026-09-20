const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Address = require('../models/Address');
const Coupon = require('../models/Coupon');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { successResponse } = require('../utils/apiResponse');
const generateOrderNumber = require('../utils/generateOrderNumber');
const { getPagination, buildPagination } = require('../utils/pagination');
const snapshotAddress = require('../utils/addressSnapshot');
const { getValidCoupon } = require('../services/couponService');
const {
  calculateItemTotal,
  calculateOrderPricing,
} = require('../services/pricingService');
const { PAYMENT_METHOD, ORDER_STATUS } = require('../utils/constants');
const { toStoredAssetPath } = require('../utils/assetUrl');
const { decrementStock, restoreStock, restoreStockItems } = require('../services/inventoryService');
const {
  isRazorpayConfigured,
  createRazorpayOrder,
} = require('../services/paymentService');
const SiteContent = require('../models/SiteContent');
const User = require('../models/User');
const {
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  safeSend,
} = require('../services/emailService');
const { quoteShipping, isCodEnabledGlobally, estimatePackageWeightGrams } = require('../services/shippingService');
const { createOrderShipment, refreshOrderTracking } = require('../services/shipmentService');

const getPrimaryImage = (product) => {
  if (!product.images || product.images.length === 0) {
    return '';
  }
  const primary = product.images.find((image) => image.isPrimary);
  const url = (primary || product.images[0]).url;
  return toStoredAssetPath(url);
};

const createOrder = asyncHandler(async (req, res) => {
  const { shippingAddressId, billingAddressId, couponCode, paymentMethod, notes } =
    req.body;

  if (!shippingAddressId) {
    throw new AppError('Shipping address is required.', 400);
  }

  if (!paymentMethod || !PAYMENT_METHOD.includes(paymentMethod)) {
    throw new AppError('Valid payment method is required (cod or razorpay).', 400);
  }

  const storefront = await SiteContent.findOne({ key: 'storefront' }).select('storeStatus');
  if (storefront?.storeStatus === 'closed') {
    throw new AppError('The store is temporarily closed. Orders cannot be placed right now.', 400);
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || cart.items.length === 0) {
    throw new AppError('Your cart is empty.', 400);
  }

  const shippingAddress = await Address.findOne({
    _id: shippingAddressId,
    user: req.user._id,
  });
  if (!shippingAddress) {
    throw new AppError('Shipping address not found.', 404);
  }

  let billingAddress = shippingAddress;
  if (billingAddressId && String(billingAddressId) !== String(shippingAddressId)) {
    billingAddress = await Address.findOne({
      _id: billingAddressId,
      user: req.user._id,
    });
    if (!billingAddress) {
      throw new AppError('Billing address not found.', 404);
    }
  }

  const productIds = cart.items.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((product) => [String(product._id), product]));

  const orderItems = [];
  const weightedItems = [];

  for (const item of cart.items) {
    const product = productMap.get(String(item.product));
    if (!product || product.status === 'inactive' || product.status === 'draft') {
      throw new AppError('One or more products in your cart are no longer available.', 400);
    }
    if (product.stock < item.quantity) {
      throw new AppError(`Insufficient stock for ${product.name}.`, 400);
    }

    const price = product.price;
    orderItems.push({
      product: product._id,
      name: product.name,
      sku: product.sku,
      image: getPrimaryImage(product),
      price,
      quantity: item.quantity,
      total: calculateItemTotal(price, item.quantity),
    });
    weightedItems.push({
      quantity: item.quantity,
      weight: product.weight,
      product,
    });
  }

  const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
  let coupon = null;
  if (couponCode) {
    coupon = await getValidCoupon({
      code: couponCode,
      userId: req.user._id,
      subtotal,
    });
  }

  const provisional = calculateOrderPricing({ items: orderItems, coupon, shipping: 0 });
  const shippingQuote = await quoteShipping({
    postalCode: shippingAddress.postalCode,
    subtotal: provisional.subtotal,
    discount: provisional.discount,
    paymentMethod,
    items: weightedItems,
  });

  if (paymentMethod === 'cod') {
    if (!isCodEnabledGlobally()) {
      throw new AppError('Cash on Delivery is currently unavailable.', 400);
    }
    if (!shippingQuote.codAvailable) {
      throw new AppError('Cash on Delivery is not available for this delivery pincode.', 400);
    }
  }

  const pricing = calculateOrderPricing({
    items: orderItems,
    coupon,
    shipping: shippingQuote.shipping,
  });
  const packageWeightGrams = shippingQuote.weightGrams || estimatePackageWeightGrams(weightedItems);
  const orderNumber = await generateOrderNumber();
  const useRazorpay = paymentMethod === 'razorpay';

  if (useRazorpay && !isRazorpayConfigured()) {
    throw new AppError('Online payment is not available. Please choose Cash on Delivery.', 400);
  }

  let razorpayOrder = null;
  if (useRazorpay) {
    razorpayOrder = await createRazorpayOrder({
      amount: pricing.total,
      receipt: orderNumber,
      notes: {
        orderNumber,
        userId: String(req.user._id),
      },
    });
  }

  const payment = {
    method: paymentMethod,
    transactionId: '',
    paymentStatus: 'pending',
    paidAt: null,
    gateway: useRazorpay ? 'razorpay' : '',
    gatewayOrderId: razorpayOrder?.id || '',
  };

  const orderPayload = {
    orderNumber,
    user: req.user._id,
    items: orderItems,
    shippingAddress: snapshotAddress(shippingAddress),
    billingAddress: snapshotAddress(billingAddress),
    pricing,
    payment,
    shipment: {
      partner: shippingQuote.partner || 'delhivery',
      shippingStatus: 'pending',
      deliveryStatus: 'pending',
      pickupStatus: 'pending',
    },
    orderStatus: 'pending',
    statusHistory: [
      {
        status: 'pending',
        note: useRazorpay ? 'Order created, awaiting payment' : 'Order placed',
        updatedBy: req.user._id,
        at: new Date(),
      },
    ],
    coupon: coupon
      ? {
          kind: coupon.kind || 'promo',
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
        }
      : undefined,
    notes: notes || '',
  };

  if (useRazorpay) {
    const order = await Order.create(orderPayload);
    successResponse(res, {
      message: 'Order created. Complete payment to confirm.',
      statusCode: 201,
      data: {
        order,
        payment: {
          method: 'razorpay',
          keyId: process.env.RAZORPAY_KEY_ID,
          razorpayOrderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
        },
        shipping: shippingQuote,
      },
    });
    return;
  }

  const decremented = [];
  try {
    for (const item of orderItems) {
      const updated = await decrementStock(item.product, item.quantity);
      if (!updated) {
        throw new AppError(`Insufficient stock for ${item.name}.`, 409);
      }
      decremented.push(item);
    }

    orderPayload.orderStatus = 'confirmed';
    orderPayload.statusHistory.push({
      status: 'confirmed',
      note: 'COD order confirmed',
      updatedBy: req.user._id,
      at: new Date(),
    });

    let order = await Order.create(orderPayload);

    if (coupon) {
      coupon.usedCount += 1;
      await coupon.save();
    }

    cart.items = [];
    await cart.save();

    order = await createOrderShipment(order, { weightGrams: packageWeightGrams });

    safeSend(sendOrderConfirmationEmail, {
      to: req.user.email,
      name: req.user.name,
      order,
    });

    successResponse(res, {
      message: 'Order created successfully',
      statusCode: 201,
      data: { order, payment: { method: 'cod' }, shipping: shippingQuote },
    });
  } catch (error) {
    await restoreStockItems(decremented);
    throw error;
  }
});

const getMyOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);

  const filter = { user: req.user._id };
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  successResponse(res, {
    message: 'Orders retrieved successfully',
    data: {
      orders,
      pagination: buildPagination({ page, limit, total }),
    },
  });
});

const getMyOrderById = asyncHandler(async (req, res) => {
  let order = await Order.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!order) {
    throw new AppError('Order not found.', 404);
  }

  if (req.query.refreshTracking === '1' || req.query.refreshTracking === 'true') {
    order = await refreshOrderTracking(order);
  }

  successResponse(res, {
    message: 'Order retrieved successfully',
    data: { order },
  });
});

const getAdminOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};

  if (req.query.status && ORDER_STATUS.includes(req.query.status)) {
    filter.orderStatus = req.query.status;
  }

  if (req.query.paymentStatus) {
    filter['payment.paymentStatus'] = req.query.paymentStatus;
  }

  if (req.query.search) {
    filter.orderNumber = new RegExp(String(req.query.search).trim(), 'i');
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  successResponse(res, {
    message: 'Orders retrieved successfully',
    data: {
      orders,
      pagination: buildPagination({ page, limit, total }),
    },
  });
});

const getAdminOrderById = asyncHandler(async (req, res) => {
  let order = await Order.findById(req.params.id).populate(
    'user',
    'name email phone'
  );

  if (!order) {
    throw new AppError('Order not found.', 404);
  }

  if (req.query.refreshTracking === '1' || req.query.refreshTracking === 'true') {
    order = await refreshOrderTracking(order);
    order = await Order.findById(req.params.id).populate('user', 'name email phone');
  }

  successResponse(res, {
    message: 'Order retrieved successfully',
    data: { order },
  });
});

const retryOrderShipment = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    throw new AppError('Order not found.', 404);
  }
  if (['cancelled', 'refunded', 'failed'].includes(order.orderStatus)) {
    throw new AppError('Order is not eligible for shipment creation.', 400);
  }
  if (order.payment.method === 'razorpay' && order.payment.paymentStatus !== 'paid') {
    throw new AppError('Online payment must be completed before creating a shipment.', 400);
  }
  if (order.shipment?.awbNumber) {
    throw new AppError('Shipment already exists for this order.', 400);
  }

  const updated = await createOrderShipment(order);
  successResponse(res, {
    message: 'Shipment creation attempted',
    data: { order: updated },
  });
});

const syncOrderTracking = asyncHandler(async (req, res) => {
  let order = await Order.findById(req.params.id);
  if (!order) {
    throw new AppError('Order not found.', 404);
  }
  order = await refreshOrderTracking(order);
  successResponse(res, {
    message: 'Tracking refreshed',
    data: { order },
  });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;

  if (!status || !ORDER_STATUS.includes(status)) {
    throw new AppError('A valid order status is required.', 400);
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    throw new AppError('Order not found.', 404);
  }

  const previousStatus = order.orderStatus;
  const alreadyClosed = previousStatus === 'cancelled' || previousStatus === 'refunded';

  order.orderStatus = status;
  order.statusHistory.push({
    status,
    note: note || '',
    updatedBy: req.admin._id,
    at: new Date(),
  });

  const shouldRestoreStock =
    ['cancelled', 'refunded'].includes(status) &&
    !alreadyClosed &&
    ((order.payment.method === 'cod' && ['pending', 'paid'].includes(order.payment.paymentStatus)) ||
      (order.payment.method === 'razorpay' && order.payment.paymentStatus === 'paid'));

  if (shouldRestoreStock) {
    for (const item of order.items) {
      await restoreStock(item.product, item.quantity);
    }

    if (order.coupon && order.coupon.code && order.payment.method === 'cod' && order.payment.paymentStatus === 'pending') {
      await Coupon.updateOne(
        { code: order.coupon.code, usedCount: { $gt: 0 } },
        { $inc: { usedCount: -1 } }
      );
    }
  }

  if (status === 'refunded') {
    order.payment.paymentStatus = 'refunded';
  }

  await order.save();

  const customer = await User.findById(order.user).select('name email');
  if (customer?.email && previousStatus !== status) {
    safeSend(sendOrderStatusEmail, {
      to: customer.email,
      name: customer.name,
      order,
      status,
    });
  }

  successResponse(res, {
    message: 'Order status updated successfully',
    data: { order },
  });
});

module.exports = {
  createOrder,
  getMyOrders,
  getMyOrderById,
  getAdminOrders,
  getAdminOrderById,
  updateOrderStatus,
  retryOrderShipment,
  syncOrderTracking,
};
