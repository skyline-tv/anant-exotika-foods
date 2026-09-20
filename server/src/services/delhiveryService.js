const AppError = require('../utils/AppError');

const getMode = () =>
  String(process.env.DELHIVERY_MODE || 'staging').toLowerCase() === 'production'
    ? 'production'
    : 'staging';

const getBaseUrl = () => {
  if (process.env.DELHIVERY_BASE_URL) {
    return String(process.env.DELHIVERY_BASE_URL).replace(/\/$/, '');
  }
  return getMode() === 'production'
    ? 'https://track.delhivery.com'
    : 'https://staging-express.delhivery.com';
};

const isDelhiveryConfigured = () => Boolean(process.env.DELHIVERY_API_KEY);

const getAuthHeaders = () => {
  if (!isDelhiveryConfigured()) {
    throw new AppError('Delhivery shipping is not configured.', 503);
  }
  return {
    Authorization: `Token ${process.env.DELHIVERY_API_KEY}`,
    Accept: 'application/json',
  };
};

const requestDelhivery = async (path, { method = 'GET', query, body, form } = {}) => {
  const url = new URL(`${getBaseUrl()}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const headers = getAuthHeaders();
  const options = { method, headers };

  if (form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    options.body = new URLSearchParams(form).toString();
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message =
      data?.rmk ||
      data?.Error ||
      data?.error ||
      data?.message ||
      `Delhivery request failed (${response.status}).`;
    const error = new AppError(message, 502);
    error.delhivery = data;
    throw error;
  }

  return data;
};

const normalizeServiceability = (payload, pincode) => {
  const codes = payload?.delivery_codes || payload?.delivery_codes_list || [];
  const entry = codes.find((item) => {
    const pin = item?.postal_code?.pin || item?.postal_code?.postal_code || item?.pin || item?.postal_code;
    return String(pin) === String(pincode);
  });

  if (!entry) {
    return {
      serviceable: false,
      prepaid: false,
      cod: false,
      remarks: payload?.rmk || 'Pincode is not serviceable with Delhivery.',
      raw: payload,
    };
  }

  const details = entry.postal_code || entry;
  const flag = (value) => {
    const normalized = String(value ?? '').toUpperCase();
    return normalized === 'Y' || normalized === 'YES' || normalized === 'TRUE' || value === true || value === 1;
  };

  return {
    serviceable: true,
    prepaid: flag(details.prepaid ?? details.pre_paid ?? details.online),
    cod: flag(details.cod),
    city: details.city || '',
    state: details.state_code || details.state || '',
    remarks: details.remarks || '',
    raw: payload,
  };
};

const checkPincodeServiceability = async (pincode) => {
  const pin = String(pincode || '').trim();
  if (!/^[1-9][0-9]{5}$/.test(pin)) {
    throw new AppError('Enter a valid 6-digit pincode.', 400);
  }

  if (!isDelhiveryConfigured()) {
    return {
      serviceable: true,
      prepaid: true,
      cod: process.env.COD_ENABLED !== 'false',
      city: '',
      state: '',
      remarks: 'Delhivery is not configured; using local shipping rules.',
      source: 'fallback',
    };
  }

  const payload = await requestDelhivery('/c/api/pin-codes/json/', {
    query: { filter_codes: pin },
  });
  return { ...normalizeServiceability(payload, pin), source: 'delhivery' };
};

const calculateShippingCharge = async ({
  destinationPin,
  originPin,
  weightGrams,
  paymentMode = 'Prepaid',
}) => {
  if (!isDelhiveryConfigured()) {
    return null;
  }

  const cgm = Math.max(100, Math.ceil(Number(weightGrams) || 500));
  const pt = String(paymentMode).toLowerCase() === 'cod' ? 'COD' : 'Pre-paid';
  const md = process.env.DELHIVERY_SHIPPING_MODE || 'E';

  const payload = await requestDelhivery('/api/kinko/v1/invoice/charges/.json', {
    query: {
      md,
      ss: 'Delivered',
      d_pin: destinationPin,
      o_pin: originPin,
      cgm,
      pt,
    },
  });

  const amount =
    Number(payload?.total_amount) ||
    Number(payload?.[0]?.total_amount) ||
    Number(payload?.charge_DL) ||
    Number(payload?.['gross_amount']);

  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return {
    amount: Math.round((amount + Number.EPSILON) * 100) / 100,
    raw: payload,
  };
};

const createShipment = async ({ order, weightGrams }) => {
  if (!isDelhiveryConfigured()) {
    throw new AppError('Delhivery shipping is not configured.', 503);
  }

  const pickupName = process.env.DELHIVERY_PICKUP_NAME;
  if (!pickupName) {
    throw new AppError('Delhivery pickup location is not configured.', 503);
  }

  const address = order.shippingAddress;
  const isCod = order.payment?.method === 'cod';
  const shipment = {
    name: address.fullName,
    add: [address.addressLine1, address.addressLine2, address.landmark].filter(Boolean).join(', '),
    pin: address.postalCode,
    city: address.city,
    state: address.state,
    country: address.country || 'India',
    phone: address.phone,
    order: order.orderNumber,
    payment_mode: isCod ? 'COD' : 'Prepaid',
    cod_amount: isCod ? String(order.pricing?.total || 0) : '0',
    order_date: order.createdAt ? new Date(order.createdAt).toISOString().slice(0, 10) : undefined,
    total_amount: String(order.pricing?.total || 0),
    products_desc: (order.items || [])
      .map((item) => `${item.name} x${item.quantity}`)
      .join(', ')
      .slice(0, 200),
    quantity: String((order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 1),
    weight: String(Math.max(0.1, (Number(weightGrams) || 500) / 1000)),
    shipping_mode: process.env.DELHIVERY_SHIPPING_MODE === 'S' ? 'Surface' : 'Express',
  };

  const payload = {
    shipments: [shipment],
    pickup_location: {
      name: pickupName,
    },
  };

  const response = await requestDelhivery('/api/cmu/create.json', {
    method: 'POST',
    form: {
      format: 'json',
      data: JSON.stringify(payload),
    },
  });

  const packages = response?.packages || response?.shipment_data || [];
  const first = Array.isArray(packages) ? packages[0] : packages;
  const waybill =
    first?.waybill ||
    first?.wbns ||
    response?.waybill ||
    (Array.isArray(first?.waybill) ? first.waybill[0] : '');

  const success =
    response?.success !== false &&
    !response?.Error &&
    (first?.status === 'Success' || first?.remarks === 'success' || Boolean(waybill));

  if (!success && !waybill) {
    const message =
      first?.remarks ||
      response?.rmk ||
      response?.Error ||
      'Delhivery could not create the shipment.';
    throw new AppError(message, 502);
  }

  return {
    partner: 'delhivery',
    awbNumber: String(waybill || ''),
    shipmentId: String(first?.refnum || first?.client || order.orderNumber),
    trackingUrl: waybill
      ? `https://www.delhivery.com/track/package/${encodeURIComponent(waybill)}`
      : '',
    pickupStatus: 'requested',
    shippingStatus: 'created',
    deliveryStatus: 'pending',
    raw: response,
  };
};

const mapDelhiveryStatus = (statusText = '') => {
  const value = String(statusText).toLowerCase();
  if (!value) return { shippingStatus: 'unknown', deliveryStatus: 'unknown', orderStatus: null };
  if (value.includes('deliver')) {
    return { shippingStatus: 'delivered', deliveryStatus: 'delivered', orderStatus: 'delivered' };
  }
  if (value.includes('out for delivery') || value.includes('ofd')) {
    return {
      shippingStatus: 'out_for_delivery',
      deliveryStatus: 'out_for_delivery',
      orderStatus: 'out_for_delivery',
    };
  }
  if (value.includes('in transit') || value.includes('dispatched') || value.includes('shipped')) {
    return { shippingStatus: 'shipped', deliveryStatus: 'in_transit', orderStatus: 'shipped' };
  }
  if (value.includes('pickup') || value.includes('manifest')) {
    return { shippingStatus: 'pickup', deliveryStatus: 'pending', orderStatus: 'packed' };
  }
  if (value.includes('cancel') || value.includes('rto')) {
    return { shippingStatus: 'cancelled', deliveryStatus: 'failed', orderStatus: null };
  }
  return { shippingStatus: value.replace(/\s+/g, '_').slice(0, 40), deliveryStatus: 'in_progress', orderStatus: null };
};

const trackShipment = async (awbNumber) => {
  if (!awbNumber) {
    throw new AppError('AWB number is required for tracking.', 400);
  }
  if (!isDelhiveryConfigured()) {
    throw new AppError('Delhivery shipping is not configured.', 503);
  }

  const payload = await requestDelhivery('/api/v1/packages/json/', {
    query: { waybill: awbNumber },
  });

  const shipmentData = payload?.ShipmentData?.[0]?.Shipment || payload?.ShipmentData?.[0] || payload;
  const status =
    shipmentData?.Status?.Status ||
    shipmentData?.Status?.StatusLocation ||
    shipmentData?.Status ||
    '';
  const mapped = mapDelhiveryStatus(typeof status === 'string' ? status : status?.Status);

  return {
    awbNumber: String(awbNumber),
    statusText: typeof status === 'string' ? status : status?.Status || '',
    trackingUrl: `https://www.delhivery.com/track/package/${encodeURIComponent(awbNumber)}`,
    scans: shipmentData?.Scans || [],
    mapped,
    raw: payload,
  };
};

module.exports = {
  isDelhiveryConfigured,
  getMode,
  checkPincodeServiceability,
  calculateShippingCharge,
  createShipment,
  trackShipment,
  mapDelhiveryStatus,
};
