const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { successResponse } = require('../utils/apiResponse');
const { decrementStock, restoreStockItems, restoreStock } = require('../services/inventoryService');
const {
  getPublicPaymentConfig,
  verifyRazorpaySignature,
  verifyWebhookSignature,
  fetchRazorpayPayment,
  assertPaymentMatchesOrder,
  createRazorpayRefund,
  isRazorpayConfigured,
} = require('../services/paymentService');
const {
  sendOrderConfirmationEmail,
  safeSend,
} = require('../services/emailService');
const { createOrderShipment } = require('../services/shipmentService');

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
    await createOrderShipment(order);
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

  const gatewayPayment = await fetchRazorpayPayment(razorpayPaymentId);
  assertPaymentMatchesOrder(gatewayPayment, order);

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

  const customer = await User.findById(confirmed.user).select('name email');
  if (customer?.email) {
    safeSend(sendOrderConfirmationEmail, {
      to: customer.email,
      name: customer.name,
      order: confirmed,
    });
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

const handleRazorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
  verifyWebhookSignature(rawBody, signature);

  const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const eventName = event?.event;
  const paymentEntity = event?.payload?.payment?.entity;
  const refundEntity = event?.payload?.refund?.entity;

  if (eventName === 'payment.captured' && paymentEntity?.id) {
    const order = await Order.findOne({
      'payment.method': 'razorpay',
      $or: [
        { 'payment.gatewayOrderId': paymentEntity.order_id },
        { 'payment.gatewayPaymentId': paymentEntity.id },
        { orderNumber: paymentEntity.notes?.orderNumber },
      ],
    });

    if (order && order.payment.paymentStatus !== 'paid') {
      assertPaymentMatchesOrder(paymentEntity, order);
      const claimed = await Order.findOneAndUpdate(
        {
          _id: order._id,
          'payment.paymentStatus': { $ne: 'paid' },
        },
        {
          $set: {
            'payment.paymentStatus': 'paid',
            'payment.paidAt': new Date(),
            'payment.gatewayPaymentId': paymentEntity.id,
            'payment.transactionId': paymentEntity.id,
            'payment.gatewayOrderId': paymentEntity.order_id || order.payment.gatewayOrderId,
          },
        },
        { new: true }
      );

      if (claimed) {
        const confirmed = await finalizePaidOrder(claimed);
        const customer = await User.findById(confirmed.user).select('name email');
        if (customer?.email) {
          safeSend(sendOrderConfirmationEmail, {
            to: customer.email,
            name: customer.name,
            order: confirmed,
          });
        }
      }
    }
  }

  if (eventName === 'payment.failed' && paymentEntity?.id) {
    await Order.findOneAndUpdate(
      {
        'payment.method': 'razorpay',
        'payment.paymentStatus': 'pending',
        $or: [
          { 'payment.gatewayOrderId': paymentEntity.order_id },
          { 'payment.gatewayPaymentId': paymentEntity.id },
        ],
      },
      {
        $set: {
          'payment.paymentStatus': 'failed',
          orderStatus: 'failed',
        },
        $push: {
          statusHistory: {
            status: 'failed',
            note: 'Payment failed (webhook)',
            updatedBy: null,
            at: new Date(),
          },
        },
      }
    );
  }

  if ((eventName === 'refund.processed' || eventName === 'refund.created') && refundEntity) {
    const paymentId = refundEntity.payment_id;
    const order = await Order.findOne({
      'payment.method': 'razorpay',
      $or: [
        { 'payment.gatewayPaymentId': paymentId },
        { 'payment.transactionId': paymentId },
      ],
    });

    if (order && order.payment.paymentStatus !== 'refunded') {
      const refundStatus = String(refundEntity.status || '').toLowerCase();
      order.payment.refundId = refundEntity.id || order.payment.refundId;
      order.payment.refundAmount = Number(refundEntity.amount || 0) / 100;
      order.payment.refundStatus = refundStatus;
      order.payment.refundedAt = new Date();

      if (refundStatus === 'processed') {
        if (order.payment.paymentStatus === 'paid') {
          for (const item of order.items) {
            await restoreStock(item.product, item.quantity);
          }
        }
        order.payment.paymentStatus = 'refunded';
        order.orderStatus = 'refunded';
        order.statusHistory.push({
          status: 'refunded',
          note: `Refund processed · ${refundEntity.id || ''}`.trim(),
          updatedBy: null,
          at: new Date(),
        });
      }

      await order.save();
    }
  }

  successResponse(res, {
    message: 'Webhook processed',
    data: { event: eventName || 'unknown' },
  });
});

const refundOrderPayment = asyncHandler(async (req, res) => {
  if (!isRazorpayConfigured()) {
    throw new AppError('Online payment is not configured.', 503);
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    throw new AppError('Order not found.', 404);
  }
  if (order.payment.method !== 'razorpay') {
    throw new AppError('Only Razorpay payments can be refunded through the gateway.', 400);
  }
  if (order.payment.paymentStatus !== 'paid') {
    throw new AppError('Only paid orders can be refunded.', 400);
  }
  if (!order.payment.gatewayPaymentId && !order.payment.transactionId) {
    throw new AppError('Missing Razorpay payment ID for this order.', 400);
  }

  const paymentId = order.payment.gatewayPaymentId || order.payment.transactionId;
  const amount = req.body.amount !== undefined ? Number(req.body.amount) : order.pricing.total;

  order.payment.refundStatus = 'pending';
  await order.save();

  const refund = await createRazorpayRefund({
    paymentId,
    amount,
    notes: {
      orderNumber: order.orderNumber,
      reason: req.body.reason || 'Admin initiated refund',
    },
  });

  order.payment.refundId = refund.id || '';
  order.payment.refundAmount = Number(refund.amount || 0) / 100;
  order.payment.refundStatus = refund.status || 'processed';
  order.payment.refundedAt = new Date();

  if (String(refund.status).toLowerCase() === 'processed') {
    for (const item of order.items) {
      await restoreStock(item.product, item.quantity);
    }
    order.payment.paymentStatus = 'refunded';
    order.orderStatus = 'refunded';
    order.statusHistory.push({
      status: 'refunded',
      note: req.body.reason || `Refund ${refund.id}`,
      updatedBy: req.admin?._id || null,
      at: new Date(),
    });
  }

  await order.save();

  successResponse(res, {
    message: 'Refund initiated successfully',
    data: { order, refund },
  });
});

module.exports = {
  getPaymentConfig,
  verifyPayment,
  failPayment,
  handleRazorpayWebhook,
  refundOrderPayment,
  finalizePaidOrder,
};
