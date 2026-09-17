const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { successResponse } = require('../utils/apiResponse');
const { decrementStock, restoreStockItems } = require('../services/inventoryService');
const {
  getPublicPaymentConfig,
  verifyRazorpaySignature,
} = require('../services/paymentService');

const finalizePaidOrder = async (order) => {
  const decremented = [];
  try {
    for (const item of order.items) {
      const updated = await decrementStock(item.product, item.quantity);
      if (!updated) {
        throw new AppError(
          `Insufficient stock for ${item.name}. Payment verification could not confirm this order.`,
          409
        );
      }
      decremented.push(item);
    }
  } catch (error) {
    await restoreStockItems(decremented);
    throw error;
  }

  try {
    if (order.coupon?.code) {
      await Coupon.updateOne({ code: order.coupon.code }, { $inc: { usedCount: 1 } });
    }

    await Cart.updateOne({ user: order.user }, { $set: { items: [] } });

    if (order.payment.paymentStatus !== 'paid') {
      order.payment.paymentStatus = 'paid';
      order.payment.paidAt = new Date();
    }
    if (order.orderStatus === 'pending' || order.orderStatus === 'failed') {
      order.orderStatus = 'confirmed';
      order.statusHistory.push({
        status: 'confirmed',
        note: 'Payment verified',
        updatedBy: order.user,
        at: new Date(),
      });
    }
    await order.save();
    return order;
  } catch (error) {
    await restoreStockItems(decremented);
    throw error;
  }
};

const getPaymentConfig = asyncHandler(async (req, res) => {
  successResponse(res, {
    message: 'Payment configuration retrieved successfully',
    data: getPublicPaymentConfig(),
  });
});

const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  if (!orderId) {
    throw new AppError('Order ID is required.', 400);
  }

  const order = await Order.findOne({ _id: orderId, user: req.user._id });
  if (!order) {
    throw new AppError('Order not found.', 404);
  }

  if (order.payment.method !== 'razorpay') {
    throw new AppError('This order is not an online payment order.', 400);
  }

  if (order.payment.paymentStatus === 'paid') {
    successResponse(res, {
      message: 'Payment already verified',
      data: { order },
    });
    return;
  }

  if (order.payment.gatewayOrderId && razorpayOrderId && order.payment.gatewayOrderId !== razorpayOrderId) {
    throw new AppError('Payment verification failed. Your order has not been confirmed.', 400);
  }

  verifyRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature });

  const claimed = await Order.findOneAndUpdate(
    {
      _id: order._id,
      user: req.user._id,
      'payment.method': 'razorpay',
      'payment.paymentStatus': { $ne: 'paid' },
    },
    {
      $set: {
        'payment.paymentStatus': 'paid',
        'payment.paidAt': new Date(),
        'payment.gatewayPaymentId': razorpayPaymentId,
        'payment.gatewaySignature': razorpaySignature,
        'payment.transactionId': razorpayPaymentId,
      },
    },
    { new: true }
  );

  if (!claimed) {
    const existing = await Order.findOne({ _id: order._id, user: req.user._id });
    successResponse(res, {
      message: 'Payment already verified',
      data: { order: existing || order },
    });
    return;
  }

  let confirmed;
  try {
    confirmed = await finalizePaidOrder(claimed);
  } catch (error) {
    claimed.payment.paymentStatus = 'failed';
    claimed.payment.paidAt = null;
    await claimed.save();
    throw error;
  }

  successResponse(res, {
    message: 'Payment verified successfully',
    data: { order: confirmed },
  });
});

const failPayment = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const order = await Order.findOne({ _id: orderId, user: req.user._id });
  if (!order) {
    throw new AppError('Order not found.', 404);
  }

  if (order.payment.paymentStatus === 'paid') {
    throw new AppError('This order has already been paid.', 400);
  }

  order.payment.paymentStatus = 'failed';
  order.orderStatus = 'failed';
  order.statusHistory.push({
    status: 'failed',
    note: 'Payment cancelled or failed',
    updatedBy: req.user._id,
    at: new Date(),
  });
  await order.save();

  successResponse(res, {
    message: 'Payment was not completed. Your order has not been confirmed.',
    data: { order },
  });
});

module.exports = {
  getPaymentConfig,
  verifyPayment,
  failPayment,
};
