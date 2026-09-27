const Order = require('../models/Order');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const SiteContent = require('../models/SiteContent');
const AppError = require('../utils/AppError');
const { restoreStock } = require('./inventoryService');
const { estimatePackageWeightGrams } = require('./shippingService');
const { sendOrderStatusEmail, safeSend } = require('./emailService');
const {
  isShiprocketConfigured,
  createAdhocOrder,
  assignAwb,
  requestPickup,
  generateLabel,
  trackByAwb,
  cancelShipment,
  findOrderByChannelId,
  mapShiprocketStatus,
  buildTrackingUrl,
} = require('./shiprocketService');

const LOCK_STALE_MS = 3 * 60 * 1000;
const PIPELINE = ['pending', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
const PICKUP_DONE = new Set(['scheduled', 'requested', 'picked', 'out_for_pickup', 'cancelled']);
const SHIPPING_RANK = {
  pending: 0,
  unknown: 0,
  new: 1,
  created: 1,
  awb_assigned: 2,
  label_generated: 2,
  pickup_scheduled: 3,
  pickup_queued: 3,
  pickup_rescheduled: 3,
  manifested: 3,
  out_for_pickup: 3,
  picked_up: 4,
  shipped: 5,
  in_transit: 5,
  out_for_delivery: 6,
  delivered: 7,
};
const TERMINAL_SHIPPING = new Set([
  'cancelled',
  'rto_initiated',
  'rto_delivered',
  'rto_acknowledged',
  'rto_in_transit',
]);

const clip = (value) => String(value || '').slice(0, 500);

const shipmentOf = (order) => order?.shipment?.toObject?.() || order?.shipment || {};

const isLegacyDelhiveryBooking = (order) => {
  const shipment = shipmentOf(order);
  return shipment.partner === 'delhivery' && !shipment.shiprocketOrderId && Boolean(shipment.awbNumber || shipment.shipmentId);
};

const isStepPending = (step, shipment = {}) => {
  const shiprocketOrderId = String(shipment.shiprocketOrderId || '').trim();
  const shipmentId = String(shipment.shipmentId || '').trim();
  const awbNumber = String(shipment.awbNumber || '').trim();
  const labelUrl = String(shipment.labelUrl || '').trim();

  if (step === 'create') return !shiprocketOrderId;
  if (step === 'awb') return Boolean(shipmentId) && !awbNumber;
  if (step === 'pickup') return Boolean(awbNumber) && !PICKUP_DONE.has(String(shipment.pickupStatus || ''));
  if (step === 'label') return Boolean(awbNumber) && !labelUrl;
  return false;
};

const shouldApplyShippingStatus = (current, next) => {
  if (!next) return false;
  if (next === 'cancelled') return current !== 'delivered';
  if (TERMINAL_SHIPPING.has(next)) return true;
  const from = SHIPPING_RANK[current] ?? 0;
  const to = SHIPPING_RANK[next] ?? from;
  return to >= from;
};

const canApplyOrderStatus = (current, next) => {
  if (!next || next === current) return false;
  if (['refunded', 'failed'].includes(current)) return false;
  if (next === 'cancelled') {
    return !['delivered', 'cancelled', 'refunded', 'returned', 'failed'].includes(current);
  }
  if (next === 'returned') {
    return !['cancelled', 'refunded', 'failed', 'returned'].includes(current);
  }
  const from = PIPELINE.indexOf(current);
  const to = PIPELINE.indexOf(next);
  if (from === -1 || to === -1) return false;
  return to > from;
};

const resolveCustomerEmail = async (order) => {
  if (order.user?.email) return order.user.email;
  const user = await User.findById(order.user).select('email').lean();
  if (user?.email) return user.email;
  const content = await SiteContent.findOne({ key: 'storefront' }).select('storeEmail').lean();
  return content?.storeEmail || '';
};

const packageWeight = (order, weightGrams) => {
  if (weightGrams) return weightGrams;
  const stored = Number(order.shipment?.meta?.weightGrams);
  if (Number.isFinite(stored) && stored > 0) return stored;
  return estimatePackageWeightGrams(
    (order.items || []).map((item) => ({
      quantity: item.quantity,
      weight: 250,
    }))
  );
};

const acquireShipmentLock = async (orderId) => {
  const staleBefore = new Date(Date.now() - LOCK_STALE_MS);
  return Order.findOneAndUpdate(
    {
      _id: orderId,
      $or: [
        { 'shipment.operationLock': { $in: [null, ''] } },
        { 'shipment.operationLock': { $exists: false } },
        { 'shipment.operationLockedAt': { $lt: staleBefore } },
      ],
    },
    {
      $set: {
        'shipment.operationLock': 'active',
        'shipment.operationLockedAt': new Date(),
      },
    },
    { new: true }
  );
};

const releaseShipmentLock = async (orderId) => {
  await Order.updateOne(
    { _id: orderId },
    { $set: { 'shipment.operationLock': '', 'shipment.operationLockedAt': null } }
  );
};

const withShipmentLock = async (orderId, work, { throwIfBusy = false } = {}) => {
  const locked = await acquireShipmentLock(orderId);
  if (!locked) {
    if (throwIfBusy) {
      throw new AppError('A shipment operation is already in progress for this order. Try again in a moment.', 409);
    }
    console.info('[shiprocket] Skipped overlapping shipment operation', JSON.stringify({ orderId: String(orderId) }));
    return Order.findById(orderId);
  }

  try {
    return await work(locked);
  } finally {
    await releaseShipmentLock(orderId);
  }
};

const restoreStockForCancellation = async (order) => {
  const shouldRestore =
    (order.payment?.method === 'cod' && ['pending', 'paid'].includes(order.payment?.paymentStatus)) ||
    (order.payment?.method === 'razorpay' && order.payment?.paymentStatus === 'paid');

  if (!shouldRestore) return;

  for (const item of order.items || []) {
    await restoreStock(item.product, item.quantity);
  }

  if (order.coupon?.code && order.payment?.method === 'cod' && order.payment?.paymentStatus === 'pending') {
    await Coupon.updateOne(
      { code: order.coupon.code, usedCount: { $gt: 0 } },
      { $inc: { usedCount: -1 } }
    );
  }
};

const applyMappedStatus = async (order, mapped, { note, statusText } = {}) => {
  if (!order.shipment) order.shipment = {};
  const applyShipping = shouldApplyShippingStatus(order.shipment.shippingStatus, mapped.shippingStatus);
  if (applyShipping) {
    if (mapped.shippingStatus) order.shipment.shippingStatus = mapped.shippingStatus;
    if (mapped.deliveryStatus) order.shipment.deliveryStatus = mapped.deliveryStatus;
    if (mapped.pickupStatus) order.shipment.pickupStatus = mapped.pickupStatus;
  }
  order.shipment.partner = order.shipment.partner === 'delhivery' && !order.shipment.shiprocketOrderId
    ? order.shipment.partner
    : 'shiprocket';
  order.shipment.lastSyncedAt = new Date();
  order.shipment.lastError = '';
  order.shipment.meta = {
    ...(order.shipment.meta || {}),
    shiprocketStatus: statusText || mapped.shippingStatus || '',
  };

  if (['picked', 'shipped', 'in_transit', 'out_for_delivery', 'delivered'].includes(mapped.shippingStatus) && !order.shipment.shippingDate) {
    order.shipment.shippingDate = new Date();
  }

  const nextStatus = mapped.orderStatus;
  const previousStatus = order.orderStatus;
  if (canApplyOrderStatus(previousStatus, nextStatus)) {
    if (nextStatus === 'cancelled') {
      await restoreStockForCancellation(order);
    }
    order.orderStatus = nextStatus;
    order.statusHistory.push({
      status: nextStatus,
      note: note || `Updated from Shiprocket: ${statusText || mapped.shippingStatus}`,
      updatedBy: null,
      at: new Date(),
    });
  }

  await order.save();

  if (order.orderStatus !== previousStatus) {
    const customer = await User.findById(order.user).select('name email');
    if (customer?.email) {
      safeSend(sendOrderStatusEmail, {
        to: customer.email,
        name: customer.name,
        order,
        status: order.orderStatus,
      });
    }
  }

  return order;
};

const rememberShipmentIds = async (order, created) => {
  const saved = await Order.findOneAndUpdate(
    {
      _id: order._id,
      $or: [
        { 'shipment.shiprocketOrderId': { $in: [null, ''] } },
        { 'shipment.shiprocketOrderId': { $exists: false } },
      ],
    },
    {
      $set: {
        'shipment.partner': 'shiprocket',
        'shipment.shiprocketOrderId': created.orderId,
        'shipment.shipmentId': created.shipmentId,
        'shipment.shippingStatus': 'created',
        'shipment.deliveryStatus': order.shipment?.deliveryStatus || 'pending',
        'shipment.pickupStatus': order.shipment?.pickupStatus || 'pending',
        'shipment.lastError': '',
        'shipment.lastSyncedAt': new Date(),
        ...(order.shipment?.meta?.weightGrams
          ? { 'shipment.meta.weightGrams': order.shipment.meta.weightGrams }
          : {}),
      },
    },
    { new: true }
  );

  return saved || Order.findById(order._id);
};

const runStep = async (order, step, { strict = false, weightGrams } = {}) => {
  const shipment = shipmentOf(order);

  if (step === 'create') {
    if (!isStepPending('create', shipment)) return order;
    const email = await resolveCustomerEmail(order);
    if (!email) {
      throw new AppError('A customer email is required to create a Shiprocket shipment.', 400);
    }
    const grams = packageWeight(order, weightGrams);
    order.shipment.meta = { ...(order.shipment.meta || {}), weightGrams: grams };
    const created = await createAdhocOrder({ order, email, weightGrams: grams });
    const saved = await rememberShipmentIds(order, created);
    if (created.awb && saved && !saved.shipment.awbNumber) {
      saved.shipment.awbNumber = created.awb;
      saved.shipment.courierName = created.courierName || '';
      saved.shipment.trackingUrl = buildTrackingUrl(created.awb);
      await saved.save();
    }
    console.info('[shiprocket] Stored shipment ids', JSON.stringify({
      orderNumber: order.orderNumber,
      shiprocketOrderId: created.orderId,
      shipmentId: created.shipmentId,
    }));
    return saved;
  }

  if (step === 'awb') {
    if (!shipment.shipmentId) {
      if (strict) throw new AppError('Create the shipment before generating an AWB.', 400);
      return order;
    }
    if (!isStepPending('awb', shipment)) return order;
    let assigned;
    try {
      assigned = await assignAwb(shipment.shipmentId);
    } catch (error) {
      const existing = /already/i.test(error.message || '') ? await findOrderByChannelId(order.orderNumber) : null;
      if (!existing?.awb) throw error;
      assigned = {
        awb: existing.awb,
        courierName: existing.courierName,
        trackingUrl: buildTrackingUrl(existing.awb),
      };
      console.warn('[shiprocket] Reused an AWB that was already assigned', JSON.stringify({
        orderNumber: order.orderNumber,
        awb: existing.awb,
      }));
    }
    order.shipment.awbNumber = assigned.awb;
    order.shipment.courierName = assigned.courierName || order.shipment.courierName || '';
    order.shipment.trackingUrl = assigned.trackingUrl || buildTrackingUrl(assigned.awb);
    if (!order.shipment.shippingDate) order.shipment.shippingDate = new Date();
    const note = `Shiprocket shipment created · AWB ${assigned.awb}${assigned.courierName ? ` · ${assigned.courierName}` : ''}`;
    const mapped = mapShiprocketStatus({ statusText: 'NEW', statusId: 1 });
    if (!canApplyOrderStatus(order.orderStatus, mapped.orderStatus)) {
      order.statusHistory.push({
        status: order.orderStatus,
        note,
        updatedBy: null,
        at: new Date(),
      });
    }
    return applyMappedStatus(order, mapped, { note, statusText: 'NEW' });
  }

  if (step === 'pickup') {
    if (!shipment.awbNumber) {
      if (strict) throw new AppError('Generate an AWB before requesting pickup.', 400);
      return order;
    }
    if (!isStepPending('pickup', shipment)) return order;
    const pickup = await requestPickup(shipment.shipmentId);
    order.shipment.meta = {
      ...(order.shipment.meta || {}),
      pickupDate: pickup.pickupDate || '',
      pickupToken: pickup.token || '',
    };
    return applyMappedStatus(order, mapShiprocketStatus({ statusText: 'PICKUP SCHEDULED', statusId: 3 }), {
      note: `Shiprocket pickup scheduled${pickup.pickupDate ? ` · ${pickup.pickupDate}` : ''}`,
      statusText: 'PICKUP SCHEDULED',
    });
  }

  if (step === 'label') {
    if (!shipment.awbNumber) {
      if (strict) throw new AppError('Generate an AWB before printing a label.', 400);
      return order;
    }
    if (!isStepPending('label', shipment)) return order;
    try {
      const label = await generateLabel(shipment.shipmentId);
      order.shipment.labelUrl = label.labelUrl;
      order.shipment.lastError = '';
      order.shipment.lastSyncedAt = new Date();
      await order.save();
      return order;
    } catch (error) {
      order.shipment.meta = { ...(order.shipment.meta || {}), labelError: clip(error.message) };
      if (strict) {
        order.shipment.lastError = clip(error.message);
        order.shipment.lastSyncedAt = new Date();
        await order.save();
        throw error;
      }
      console.warn('[shiprocket] Label generation failed:', error.message || error);
      await order.save();
      return order;
    }
  }

  return order;
};

const advanceShipment = async (orderInput, { steps = ['create', 'awb', 'pickup', 'label'], strict = false, weightGrams } = {}) => {
  if (!orderInput) return null;

  if (isLegacyDelhiveryBooking(orderInput)) {
    if (strict) {
      throw new AppError('This order was booked with the previous courier and was left unchanged.', 400);
    }
    return orderInput;
  }

  if (!isShiprocketConfigured()) {
    const shipment = shipmentOf(orderInput);
    orderInput.shipment = {
      ...shipment,
      partner: shipment.partner && shipment.partner !== 'delhivery' ? shipment.partner : 'manual',
      shippingStatus: shipment.shippingStatus || 'pending',
      deliveryStatus: shipment.deliveryStatus || 'pending',
      pickupStatus: shipment.pickupStatus || 'pending',
      lastError: 'Shiprocket is not configured.',
      lastSyncedAt: new Date(),
    };
    await orderInput.save();
    return orderInput;
  }

  return withShipmentLock(orderInput._id, async (locked) => {
    let current = locked;
    try {
      for (const step of steps) {
        current = await runStep(current, step, { strict, weightGrams });
      }
      if (current?.shipment) current.shipment.lastError = current.shipment.lastError || '';
      return current;
    } catch (error) {
      console.error('[shiprocket] Shipment step failed:', error.message || error);
      const latest = (await Order.findById(orderInput._id)) || current;
      if (latest) {
        latest.shipment = latest.shipment || {};
        if (!latest.shipment.partner || latest.shipment.partner === 'manual') {
          latest.shipment.partner = 'shiprocket';
        }
        latest.shipment.shippingStatus = latest.shipment.shiprocketOrderId
          ? latest.shipment.shippingStatus || 'error'
          : 'error';
        latest.shipment.lastError = clip(error.message || 'Shipment request failed');
        latest.shipment.lastSyncedAt = new Date();
        await latest.save();
      }
      if (strict) throw error;
      return latest;
    }
  }, { throwIfBusy: strict });
};

const assertCanShip = (order) => {
  if (!order) throw new AppError('Order not found.', 404);
  if (['cancelled', 'refunded', 'failed'].includes(order.orderStatus)) {
    throw new AppError('Order is not eligible for shipment creation.', 400);
  }
  if (order.payment?.method === 'razorpay' && order.payment?.paymentStatus !== 'paid') {
    throw new AppError('Online payment must be completed before creating a shipment.', 400);
  }
  if (isLegacyDelhiveryBooking(order)) {
    throw new AppError('This order was booked with the previous courier and was left unchanged.', 400);
  }
};

const createOrderShipment = async (order, { weightGrams } = {}) =>
  advanceShipment(order, { weightGrams, strict: false });

const assignOrderAwb = async (order) => {
  assertCanShip(order);
  if (order.shipment?.awbNumber) {
    throw new AppError('An AWB already exists for this order.', 400);
  }
  return advanceShipment(order, { steps: ['awb'], strict: true });
};

const requestOrderPickup = async (order) => {
  assertCanShip(order);
  if (!order.shipment?.awbNumber) {
    throw new AppError('Generate an AWB before requesting pickup.', 400);
  }
  return advanceShipment(order, { steps: ['pickup'], strict: true });
};

const generateOrderLabel = async (order) => {
  assertCanShip(order);
  if (!order.shipment?.awbNumber) {
    throw new AppError('Generate an AWB before printing a label.', 400);
  }
  return advanceShipment(order, { steps: ['label'], strict: true });
};

const cancelOrderShipment = async (order) => {
  if (!order) throw new AppError('Order not found.', 404);
  if (isLegacyDelhiveryBooking(order)) {
    throw new AppError('This order was booked with the previous courier and was left unchanged.', 400);
  }
  if (!order.shipment?.shiprocketOrderId && !order.shipment?.awbNumber) {
    throw new AppError('There is no Shiprocket shipment to cancel.', 400);
  }
  if (['delivered', 'returned', 'refunded'].includes(order.orderStatus) || order.shipment?.deliveryStatus === 'delivered') {
    throw new AppError('This shipment can no longer be cancelled.', 400);
  }
  if (order.shipment?.shippingStatus === 'cancelled') {
    return order;
  }

  return withShipmentLock(order._id, async (locked) => {
    await cancelShipment({
      shiprocketOrderId: locked.shipment?.shiprocketOrderId,
      awb: locked.shipment?.awbNumber,
    });
    return applyMappedStatus(locked, mapShiprocketStatus({ statusText: 'CANCELLED', statusId: 8 }), {
      note: 'Shipment cancelled in Shiprocket',
      statusText: 'CANCELLED',
    });
  }, { throwIfBusy: true });
};

const refreshOrderTracking = async (order) => {
  if (!order?.shipment?.awbNumber) return order;
  if (isLegacyDelhiveryBooking(order) || !isShiprocketConfigured()) return order;

  try {
    const tracking = await trackByAwb(order.shipment.awbNumber);
    if (tracking.courierName) order.shipment.courierName = tracking.courierName;
    if (tracking.trackingUrl) order.shipment.trackingUrl = tracking.trackingUrl;
    order.shipment.meta = {
      ...(order.shipment.meta || {}),
      etd: tracking.etd || order.shipment.meta?.etd || '',
      lastScan: tracking.scans?.[0] || order.shipment.meta?.lastScan || null,
    };
    return applyMappedStatus(order, tracking.mapped, {
      note: `Updated from Shiprocket: ${tracking.statusText || tracking.mapped.shippingStatus}`,
      statusText: tracking.statusText,
    });
  } catch (error) {
    console.error('[shiprocket] Tracking refresh failed:', error.message || error);
    order.shipment.lastError = clip(error.message || 'Tracking refresh failed');
    order.shipment.lastSyncedAt = new Date();
    await order.save();
    return order;
  }
};

const applyShiprocketWebhook = async (payload = {}) => {
  const awb = String(payload.awb || payload.awb_code || '').trim();
  const shiprocketOrderId = String(payload.sr_order_id || '').trim();
  const orderNumber = String(payload.order_id || '').trim();

  let order = null;
  if (awb) order = await Order.findOne({ 'shipment.awbNumber': awb });
  if (!order && shiprocketOrderId) {
    order = await Order.findOne({ 'shipment.shiprocketOrderId': shiprocketOrderId });
  }
  if (!order && orderNumber) order = await Order.findOne({ orderNumber });

  if (!order) {
    console.warn('[shiprocket] Webhook ignored; order not found', JSON.stringify({ awb, shiprocketOrderId, orderNumber }));
    return { ignored: true };
  }

  if (isLegacyDelhiveryBooking(order)) {
    console.warn('[shiprocket] Webhook ignored for a previous-courier shipment', JSON.stringify({ orderNumber: order.orderNumber }));
    return { ignored: true };
  }

  if (awb && !order.shipment.awbNumber) order.shipment.awbNumber = awb;
  if (payload.courier_name) order.shipment.courierName = String(payload.courier_name);
  if (shiprocketOrderId && !order.shipment.shiprocketOrderId) {
    order.shipment.shiprocketOrderId = shiprocketOrderId;
  }
  if (awb) order.shipment.trackingUrl = order.shipment.trackingUrl || buildTrackingUrl(awb);
  order.shipment.meta = {
    ...(order.shipment.meta || {}),
    lastScan: Array.isArray(payload.scans) ? payload.scans[0] || null : order.shipment.meta?.lastScan || null,
  };

  const statusText = payload.current_status || payload.shipment_status || '';
  const statusId = payload.current_status_id || payload.shipment_status_id;
  const mapped = mapShiprocketStatus({ statusText, statusId });
  await applyMappedStatus(order, mapped, {
    note: `Shiprocket webhook: ${statusText || mapped.shippingStatus}`,
    statusText,
  });

  console.info('[shiprocket] Webhook applied', JSON.stringify({
    orderNumber: order.orderNumber,
    status: statusText || mapped.shippingStatus,
  }));

  return { ignored: false, orderNumber: order.orderNumber };
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
  assignOrderAwb,
  requestOrderPickup,
  generateOrderLabel,
  cancelOrderShipment,
  applyShiprocketWebhook,
  findOrderByGatewayPayment,
  isStepPending,
  canApplyOrderStatus,
  shouldApplyShippingStatus,
  isLegacyDelhiveryBooking,
};
