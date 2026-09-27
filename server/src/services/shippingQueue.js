const Order = require('../models/Order');
const { createOrderShipment, isLegacyDelhiveryBooking } = require('./shipmentService');
const { log } = require('../utils/logger');

let timer = null;
let running = false;

const maxAttempts = () => {
  const value = Number(process.env.SHIPMENT_MAX_ATTEMPTS);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 5;
};

const processPendingShipments = async () => {
  if (running) return;
  running = true;
  try {
    const now = new Date();
    const orders = await Order.find({
      orderStatus: { $in: ['confirmed', 'processing', 'packed'] },
      'shipment.shippingStatus': 'shipping_pending',
      'shipment.awbNumber': { $in: ['', null] },
      'shipment.partner': { $ne: 'delhivery' },
      'shipment.attemptCount': { $lt: maxAttempts() },
      $and: [
        {
          $or: [{ 'shipment.nextAttemptAt': null }, { 'shipment.nextAttemptAt': { $lte: now } }],
        },
        {
          $or: [{ 'payment.method': 'cod' }, { 'payment.paymentStatus': 'paid' }],
        },
      ],
    })
      .sort({ 'shipment.nextAttemptAt': 1, createdAt: 1 })
      .limit(5);

    for (const order of orders) {
      if (isLegacyDelhiveryBooking(order)) continue;
      try {
        await createOrderShipment(order);
      } catch (error) {
        log('error', 'shipment retry failed', {
          orderId: String(order._id),
          message: String(error.message || 'Shipment request failed').slice(0, 300),
        });
      }
    }
  } catch (error) {
    log('error', 'shipment sweeper failed', {
      message: String(error.message || 'Shipment sweeper failed').slice(0, 300),
    });
  } finally {
    running = false;
  }
};

const scheduleShipment = (order) => {
  if (!order?._id) return;
  const timerId = setTimeout(() => {
    processPendingShipments().catch((error) => {
      log('error', 'shipment schedule failed', {
        message: String(error.message || '').slice(0, 300),
      });
    });
  }, 100);
  if (typeof timerId.unref === 'function') timerId.unref();
};

const startShippingWorker = () => {
  if (timer) return;
  const interval = Number(process.env.SHIPMENT_RETRY_INTERVAL_MS);
  const every = Number.isFinite(interval) && interval >= 5000 ? interval : 30000;
  timer = setInterval(() => {
    processPendingShipments().catch(() => {});
  }, every);
  if (typeof timer.unref === 'function') timer.unref();
};

const stopShippingWorker = () => {
  if (timer) clearInterval(timer);
  timer = null;
};

module.exports = {
  scheduleShipment,
  startShippingWorker,
  stopShippingWorker,
  processPendingShipments,
};
