const Order = require('../models/Order');
const {
  createShipment,
  trackShipment,
  isDelhiveryConfigured,
} = require('./delhiveryService');
const { estimatePackageWeightGrams } = require('./shippingService');

const applyShipmentToOrder = (order, shipment) => {
  order.shipment = {
    ...(order.shipment?.toObject?.() || order.shipment || {}),
    partner: shipment.partner || 'delhivery',
    awbNumber: shipment.awbNumber || '',
    shipmentId: shipment.shipmentId || '',
    trackingUrl: shipment.trackingUrl || '',
    pickupStatus: shipment.pickupStatus || 'requested',
    shippingStatus: shipment.shippingStatus || 'created',
    deliveryStatus: shipment.deliveryStatus || 'pending',
    lastSyncedAt: new Date(),
    lastError: '',
    meta: shipment.raw || order.shipment?.meta || {},
  };
  return order;
};

const createOrderShipment = async (order, { weightGrams } = {}) => {
  if (!order) return null;
  if (order.shipment?.awbNumber) {
    return order;
  }
  if (!isDelhiveryConfigured()) {
    order.shipment = {
      ...(order.shipment?.toObject?.() || order.shipment || {}),
      partner: 'manual',
      shippingStatus: 'pending',
      deliveryStatus: 'pending',
      pickupStatus: 'pending',
      lastError: 'Delhivery is not configured.',
      lastSyncedAt: new Date(),
    };
    await order.save();
    return order;
  }

  try {
    const grams =
      weightGrams ||
      estimatePackageWeightGrams(
        (order.items || []).map((item) => ({
          quantity: item.quantity,
          weight: 250,
        }))
      );
    const shipment = await createShipment({ order, weightGrams: grams });
    applyShipmentToOrder(order, shipment);
    if (!order.statusHistory.some((entry) => entry.status === 'processing')) {
      order.statusHistory.push({
        status: order.orderStatus === 'pending' ? 'confirmed' : order.orderStatus,
        note: `Delhivery shipment created${shipment.awbNumber ? ` · AWB ${shipment.awbNumber}` : ''}`,
        updatedBy: order.user,
        at: new Date(),
      });
    }
    await order.save();
    return order;
  } catch (error) {
    console.error('[delhivery] Shipment creation failed:', error.message || error);
    order.shipment = {
      ...(order.shipment?.toObject?.() || order.shipment || {}),
      partner: 'delhivery',
      shippingStatus: 'error',
      deliveryStatus: 'pending',
      pickupStatus: 'pending',
      lastError: error.message || 'Shipment creation failed',
      lastSyncedAt: new Date(),
    };
    await order.save();
    return order;
  }
};

const refreshOrderTracking = async (order) => {
  if (!order?.shipment?.awbNumber) {
    return order;
  }
  if (!isDelhiveryConfigured()) {
    return order;
  }

  try {
    const tracking = await trackShipment(order.shipment.awbNumber);
    order.shipment.shippingStatus = tracking.mapped.shippingStatus || order.shipment.shippingStatus;
    order.shipment.deliveryStatus = tracking.mapped.deliveryStatus || order.shipment.deliveryStatus;
    order.shipment.trackingUrl = tracking.trackingUrl || order.shipment.trackingUrl;
    order.shipment.lastSyncedAt = new Date();
    order.shipment.lastError = '';
    order.shipment.meta = {
      ...(order.shipment.meta || {}),
      tracking,
    };

    if (
      tracking.mapped.orderStatus &&
      tracking.mapped.orderStatus !== order.orderStatus &&
      !['cancelled', 'refunded', 'failed', 'returned'].includes(order.orderStatus)
    ) {
      order.orderStatus = tracking.mapped.orderStatus;
      order.statusHistory.push({
        status: tracking.mapped.orderStatus,
        note: `Updated from Delhivery: ${tracking.statusText || tracking.mapped.shippingStatus}`,
        updatedBy: null,
        at: new Date(),
      });
    }

    await order.save();
    return order;
  } catch (error) {
    console.error('[delhivery] Tracking refresh failed:', error.message || error);
    order.shipment.lastError = error.message || 'Tracking refresh failed';
    order.shipment.lastSyncedAt = new Date();
    await order.save();
    return order;
  }
};

const findOrderByGatewayPayment = async ({ gatewayOrderId, gatewayPaymentId }) => {
  const filter = { 'payment.method': 'razorpay' };
  if (gatewayPaymentId) {
    filter.$or = [
      { 'payment.gatewayPaymentId': gatewayPaymentId },
      { 'payment.transactionId': gatewayPaymentId },
    ];
  } else if (gatewayOrderId) {
    filter['payment.gatewayOrderId'] = gatewayOrderId;
  } else {
    return null;
  }
  return Order.findOne(filter);
};

module.exports = {
  createOrderShipment,
  refreshOrderTracking,
  applyShipmentToOrder,
  findOrderByGatewayPayment,
};
