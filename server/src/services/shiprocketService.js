const crypto = require('crypto');
const AppError = require('../utils/AppError');

const DEFAULT_BASE_URL = 'https://apiv2.shiprocket.in/v1/external';
const REQUEST_TIMEOUT_MS = 20000;
const TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000;
const SERVICEABILITY_CACHE_MS = 5 * 60 * 1000;
const SERVICEABILITY_CACHE_LIMIT = 200;

let tokenCache = { value: '', expiresAt: 0 };
let tokenRequest = null;
const serviceabilityCache = new Map();

const log = (level, message, details) => {
  const suffix = details ? ` ${JSON.stringify(details)}` : '';
  const writer = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
  writer(`[shiprocket] ${message}${suffix}`);
};

const clip = (value, max = 500) => String(value || '').slice(0, max);

const isShiprocketConfigured = () =>
  Boolean(String(process.env.SHIPROCKET_EMAIL || '').trim() && String(process.env.SHIPROCKET_PASSWORD || '').trim());

const getBaseUrl = () =>
  String(process.env.SHIPROCKET_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');

const getPickupPin = () =>
  String(process.env.SHIPROCKET_PICKUP_PIN || process.env.SHIPPING_ORIGIN_PIN || '').trim();

const getPickupLocation = () => String(process.env.SHIPROCKET_PICKUP_LOCATION || '').trim();

const packageDimension = (envName, fallback) => {
  const value = Number(process.env[envName]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const toKilograms = (weightGrams) => {
  const kg = Math.max(0.5, (Number(weightGrams) || 500) / 1000);
  return Math.round(kg * 100) / 100;
};

const resetShiprocketState = () => {
  tokenCache = { value: '', expiresAt: 0 };
  tokenRequest = null;
  serviceabilityCache.clear();
};

const tokensMatch = (provided, expected) => {
  const left = Buffer.from(String(provided || ''));
  const right = Buffer.from(String(expected || ''));
  if (!left.length || left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

const extractMessage = (data, fallback) => {
  if (!data) return fallback;
  if (typeof data.message === 'string' && data.message.trim()) return clip(data.message);
  if (typeof data.error === 'string' && data.error.trim()) return clip(data.error);
  if (data.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors).flat().find(Boolean);
    if (first) return clip(first);
  }
  if (typeof data.response?.data === 'string' && data.response.data.trim()) return clip(data.response.data);
  return fallback;
};

const requestShiprocket = async (path, { method = 'GET', query, body, auth = true, retryAuth = true } = {}) => {
  const url = new URL(`${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const headers = { Accept: 'application/json' };
  if (auth) {
    headers.Authorization = `Bearer ${await getToken()}`;
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const started = Date.now();
  log('info', `${method} ${path}`);

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      log('error', `${method} ${path} timed out`, { ms: Date.now() - started });
      throw new AppError('Shiprocket request timed out. Please try again.', 504);
    }
    log('error', `${method} ${path} failed`, { message: error.message });
    throw new AppError('Shiprocket could not be reached. Please try again.', 502);
  }

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: clip(text, 300) };
  }

  log('info', `${method} ${path} responded`, { status: response.status, ms: Date.now() - started });

  if (response.status === 401 && auth && retryAuth) {
    log('warn', 'Shiprocket token rejected; refreshing');
    tokenCache = { value: '', expiresAt: 0 };
    return requestShiprocket(path, { method, query, body, auth, retryAuth: false });
  }

  if (!response.ok) {
    const message = extractMessage(data, `Shiprocket request failed (${response.status}).`);
    log('error', `${method} ${path} error`, { status: response.status, message });
    const error = new AppError(message, response.status >= 500 ? 502 : 400);
    error.shiprocketStatus = response.status;
    throw error;
  }

  return data;
};

const requestToken = async () => {
  const data = await requestShiprocket('/auth/login', {
    method: 'POST',
    auth: false,
    body: {
      email: String(process.env.SHIPROCKET_EMAIL).trim(),
      password: String(process.env.SHIPROCKET_PASSWORD),
    },
  });

  if (!data?.token) {
    throw new AppError('Shiprocket authentication failed.', 502);
  }

  tokenCache = { value: data.token, expiresAt: Date.now() + TOKEN_TTL_MS };
  log('info', 'Authenticated with Shiprocket');
  return data.token;
};

const getToken = async () => {
  if (!isShiprocketConfigured()) {
    throw new AppError('Shiprocket shipping is not configured.', 503);
  }
  if (tokenCache.value && Date.now() < tokenCache.expiresAt) {
    return tokenCache.value;
  }
  if (!tokenRequest) {
    tokenRequest = requestToken().finally(() => {
      tokenRequest = null;
    });
  }
  return tokenRequest;
};

const splitName = (fullName) => {
  const parts = String(fullName || 'Customer').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: 'Customer', last: 'Customer' };
  if (parts.length === 1) return { first: parts[0], last: parts[0] };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
};

const normalizePhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

const formatOrderDate = (value) => {
  const date = value ? new Date(value) : new Date();
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const asId = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && String(numeric) === String(value).trim() ? numeric : value;
};

const buildTrackingUrl = (awb) =>
  awb ? `https://shiprocket.co/tracking/${encodeURIComponent(String(awb))}` : '';

const buildAdhocOrderPayload = ({ order, email, weightGrams }) => {
  const pickupLocation = getPickupLocation();
  if (!pickupLocation) {
    throw new AppError('Shiprocket pickup location is not configured.', 503);
  }

  const shipping = order.shippingAddress || {};
  const billing = order.billingAddress || shipping;
  const phone = normalizePhone(shipping.phone);
  if (!/^[6-9][0-9]{9}$/.test(phone)) {
    throw new AppError('A valid 10-digit Indian mobile number is required for shipping.', 400);
  }

  const shippingName = splitName(shipping.fullName);
  const billingName = splitName(billing.fullName);
  const sameAddress =
    shipping.addressLine1 === billing.addressLine1 &&
    shipping.postalCode === billing.postalCode &&
    shipping.fullName === billing.fullName;

  const items = (order.items || []).map((item) => ({
    name: String(item.name || 'Item').slice(0, 200),
    sku: String(item.sku || 'SKU').slice(0, 50),
    units: Math.max(1, Number(item.quantity) || 1),
    selling_price: Math.max(0, Number(item.price) || 0),
    discount: 0,
    tax: 0,
    hsn: '',
  }));

  if (items.length === 0) {
    throw new AppError('Order has no items to ship.', 400);
  }

  const pricing = order.pricing || {};
  const subTotal = items.reduce((sum, item) => sum + item.selling_price * item.units, 0);
  const extraCharges =
    Number(pricing.shipping || 0) +
    Number(pricing.packaging || 0) +
    Number(pricing.handling || 0) +
    Number(pricing.codFee || 0) +
    Number(pricing.tax || 0);
  const isCod = order.payment?.method === 'cod';
  const channelId = String(process.env.SHIPROCKET_CHANNEL_ID || '').trim();

  const payload = {
    order_id: order.orderNumber,
    order_date: formatOrderDate(order.createdAt),
    pickup_location: pickupLocation,
    comment: String(order.notes || '').slice(0, 200),
    billing_customer_name: billingName.first.slice(0, 100),
    billing_last_name: billingName.last.slice(0, 100),
    billing_address: String(billing.addressLine1 || '').slice(0, 190),
    billing_address_2: [billing.addressLine2, billing.landmark].filter(Boolean).join(', ').slice(0, 190),
    billing_city: String(billing.city || '').slice(0, 50),
    billing_pincode: String(billing.postalCode || ''),
    billing_state: String(billing.state || '').slice(0, 50),
    billing_country: billing.country || 'India',
    billing_email: email,
    billing_phone: normalizePhone(billing.phone) || phone,
    shipping_is_billing: sameAddress,
    shipping_customer_name: shippingName.first.slice(0, 100),
    shipping_last_name: shippingName.last.slice(0, 100),
    shipping_address: String(shipping.addressLine1 || '').slice(0, 190),
    shipping_address_2: [shipping.addressLine2, shipping.landmark].filter(Boolean).join(', ').slice(0, 190),
    shipping_city: String(shipping.city || '').slice(0, 50),
    shipping_pincode: String(shipping.postalCode || ''),
    shipping_country: shipping.country || 'India',
    shipping_state: String(shipping.state || '').slice(0, 50),
    shipping_email: email,
    shipping_phone: phone,
    order_items: items,
    payment_method: isCod ? 'COD' : 'Prepaid',
    shipping_charges: Math.round((extraCharges + Number.EPSILON) * 100) / 100,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: Math.max(0, Number(pricing.discount) || 0),
    sub_total: Math.round((subTotal + Number.EPSILON) * 100) / 100,
    length: packageDimension('SHIPROCKET_PACKAGE_LENGTH_CM', 10),
    breadth: packageDimension('SHIPROCKET_PACKAGE_BREADTH_CM', 10),
    height: packageDimension('SHIPROCKET_PACKAGE_HEIGHT_CM', 10),
    weight: toKilograms(weightGrams),
  };

  if (channelId) payload.channel_id = channelId;
  return payload;
};

const readShipmentRecord = (entry) => {
  if (!entry) return { shipmentId: '', awb: '', courierName: '' };
  const shipment = Array.isArray(entry.shipments) ? entry.shipments[0] : entry.shipments || entry;
  return {
    orderId: String(entry.id || entry.order_id || ''),
    shipmentId: String(shipment?.id || entry.shipment_id || ''),
    awb: String(shipment?.awb || shipment?.awb_code || entry.awb_code || ''),
    courierName: String(shipment?.courier || shipment?.courier_name || entry.courier_name || ''),
  };
};

const createAdhocOrder = async ({ order, email, weightGrams }) => {
  const payload = buildAdhocOrderPayload({ order, email, weightGrams });
  let response;
  try {
    response = await requestShiprocket('/orders/create/adhoc', { method: 'POST', body: payload });
  } catch (error) {
    if (isDuplicateOrderError(error)) {
      log('warn', 'Shiprocket order already exists; reusing it', { orderNumber: order.orderNumber });
      const existing = await findOrderByChannelId(order.orderNumber);
      if (existing?.orderId && existing?.shipmentId) return existing;
    }
    throw error;
  }

  const orderId = response?.order_id || response?.payload?.order_id;
  const shipmentId = response?.shipment_id || response?.payload?.shipment_id;
  if (!orderId || !shipmentId) {
    throw new AppError(extractMessage(response, 'Shiprocket could not create the order.'), 502);
  }

  log('info', 'Shiprocket order created', {
    orderNumber: order.orderNumber,
    shiprocketOrderId: orderId,
    shipmentId,
  });

  return {
    orderId: String(orderId),
    shipmentId: String(shipmentId),
    awb: String(response?.awb_code || ''),
    courierName: String(response?.courier_name || ''),
    status: response?.status || 'NEW',
    raw: response,
  };
};

const isDuplicateOrderError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('already') && (message.includes('order') || message.includes('taken'));
};

const findOrderByChannelId = async (orderNumber) => {
  const response = await requestShiprocket('/orders', {
    query: { search: orderNumber, per_page: 10 },
  });
  const rows = response?.data || [];
  const match = rows.find((row) => String(row.channel_order_id || row.order_id || '') === String(orderNumber));
  if (!match) return null;
  const record = readShipmentRecord(match);
  return {
    orderId: String(match.id || record.orderId),
    shipmentId: record.shipmentId,
    awb: record.awb,
    courierName: record.courierName,
    status: match.status || '',
    raw: match,
  };
};

const assignAwb = async (shipmentId) => {
  const response = await requestShiprocket('/courier/assign/awb', {
    method: 'POST',
    body: { shipment_id: asId(shipmentId) },
  });

  const data = response?.response?.data || response?.data || {};
  const awb = typeof data === 'object' ? data.awb_code || data.awb : '';
  const assigned = response?.awb_assign_status === 1 || Boolean(awb);

  if (!assigned || !awb) {
    const message =
      (typeof data === 'string' && data) ||
      data?.message ||
      extractMessage(response, 'Shiprocket could not assign an AWB.');
    throw new AppError(message, 502);
  }

  log('info', 'AWB assigned', { shipmentId, awb, courier: data.courier_name || '' });

  return {
    awb: String(awb),
    courierName: String(data.courier_name || ''),
    courierId: data.courier_company_id ? String(data.courier_company_id) : '',
    trackingUrl: buildTrackingUrl(awb),
    raw: response,
  };
};

const requestPickup = async (shipmentId) => {
  const response = await requestShiprocket('/courier/generate/pickup', {
    method: 'POST',
    body: { shipment_id: [asId(shipmentId)] },
  });

  const scheduled = response?.pickup_status === 1 || /pickup/i.test(String(response?.response?.data || response?.message || ''));
  if (!scheduled && response?.pickup_status === 0) {
    throw new AppError(extractMessage(response, 'Shiprocket could not schedule pickup.'), 502);
  }

  const pickupDate = response?.response?.pickup_scheduled_date || response?.pickup_scheduled_date || '';
  log('info', 'Pickup requested', { shipmentId, pickupDate: pickupDate || undefined });

  return {
    pickupStatus: 'scheduled',
    pickupDate: pickupDate ? String(pickupDate) : '',
    token: String(response?.response?.pickup_token_number || ''),
    raw: response,
  };
};

const generateLabel = async (shipmentId) => {
  const response = await requestShiprocket('/courier/generate/label', {
    method: 'POST',
    body: { shipment_id: [asId(shipmentId)] },
  });

  const labelUrl = response?.label_url || '';
  if (!labelUrl) {
    throw new AppError(extractMessage(response, 'Shiprocket could not generate a shipping label.'), 502);
  }

  log('info', 'Label generated', { shipmentId });
  return { labelUrl: String(labelUrl), raw: response };
};

const trackByAwb = async (awb) => {
  if (!awb) throw new AppError('AWB number is required for tracking.', 400);
  const response = await requestShiprocket(`/courier/track/awb/${encodeURIComponent(String(awb))}`);
  const tracking = response?.tracking_data || response || {};
  const shipmentTrack = tracking?.shipment_track?.[0] || {};
  const statusText = shipmentTrack.current_status || tracking.shipment_status || '';
  const statusId = tracking.shipment_status_id || shipmentTrack.shipment_status_id || tracking.shipment_status;
  const mapped = mapShiprocketStatus({ statusText, statusId });

  return {
    awb: String(awb),
    statusText: typeof statusText === 'string' ? statusText : '',
    statusId: Number.isFinite(Number(statusId)) ? Number(statusId) : null,
    courierName: String(shipmentTrack.courier_name || ''),
    trackingUrl: tracking.track_url || buildTrackingUrl(awb),
    etd: shipmentTrack.edd || tracking.etd || '',
    scans: tracking.shipment_track_activities || [],
    mapped,
    raw: response,
  };
};

const cancelShipment = async ({ shiprocketOrderId, awb }) => {
  if (awb) {
    const response = await requestShiprocket('/orders/cancel/shipment/awbs', {
      method: 'POST',
      body: { awbs: [String(awb)] },
    });
    log('info', 'Shipment cancelled by AWB', { awb });
    return response;
  }

  if (!shiprocketOrderId) {
    throw new AppError('There is no Shiprocket shipment to cancel.', 400);
  }

  const response = await requestShiprocket('/orders/cancel', {
    method: 'POST',
    body: { ids: [asId(shiprocketOrderId)] },
  });
  log('info', 'Shiprocket order cancelled', { shiprocketOrderId });
  return response;
};

const readCouriers = (payload) =>
  payload?.data?.available_courier_companies || payload?.available_courier_companies || [];

const cheapestRate = (couriers) => {
  const rates = couriers
    .map((courier) => Number(courier.rate ?? courier.freight_charge))
    .filter((amount) => Number.isFinite(amount) && amount >= 0);
  if (rates.length === 0) return null;
  return Math.round((Math.min(...rates) + Number.EPSILON) * 100) / 100;
};

const rememberServiceability = (key, value) => {
  if (serviceabilityCache.size >= SERVICEABILITY_CACHE_LIMIT) {
    const oldest = serviceabilityCache.keys().next().value;
    serviceabilityCache.delete(oldest);
  }
  serviceabilityCache.set(key, { value, at: Date.now() });
};

const fetchCourierCompanies = async ({ destinationPin, weightGrams, cod }) => {
  const origin = getPickupPin();
  const weight = toKilograms(weightGrams);
  const key = `${origin}:${destinationPin}:${weight}:${cod ? 1 : 0}`;
  const cached = serviceabilityCache.get(key);
  if (cached && Date.now() - cached.at < SERVICEABILITY_CACHE_MS) {
    return cached.value;
  }

  try {
    const payload = await requestShiprocket('/courier/serviceability/', {
      query: {
        pickup_postcode: origin,
        delivery_postcode: destinationPin,
        weight,
        cod: cod ? 1 : 0,
      },
    });
    const couriers = readCouriers(payload);
    const result = { couriers, unavailable: couriers.length === 0, payload };
    rememberServiceability(key, result);
    return result;
  } catch (error) {
    const notServiceable =
      error.shiprocketStatus === 404 ||
      /not serviceable|not available|invalid pin|no courier/i.test(error.message || '');
    if (notServiceable) {
      const result = { couriers: [], unavailable: true, payload: null };
      rememberServiceability(key, result);
      return result;
    }
    throw error;
  }
};

const lookupServiceability = async ({ destinationPin, weightGrams = 500, paymentMode = 'razorpay' } = {}) => {
  const pin = String(destinationPin || '').trim();
  if (!/^[1-9][0-9]{5}$/.test(pin)) {
    throw new AppError('Enter a valid 6-digit pincode.', 400);
  }

  const fallback = {
    serviceable: true,
    definitive: false,
    prepaid: true,
    cod: process.env.COD_ENABLED !== 'false',
    city: '',
    state: '',
    remarks: 'Shiprocket is not configured; using local shipping rules.',
    amount: null,
    source: 'fallback',
    raw: null,
  };

  if (!isShiprocketConfigured() || !getPickupPin()) {
    if (isShiprocketConfigured() && !getPickupPin()) {
      fallback.remarks = 'Shiprocket pickup pincode is not configured; using local shipping rules.';
    }
    return fallback;
  }

  const wantsCod = String(paymentMode).toLowerCase() === 'cod';

  try {
    const [prepaidResult, codResult] = await Promise.all([
      fetchCourierCompanies({ destinationPin: pin, weightGrams, cod: false }),
      fetchCourierCompanies({ destinationPin: pin, weightGrams, cod: true }),
    ]);

    const prepaidCouriers = prepaidResult.couriers || [];
    const codCouriers = codResult.couriers || [];
    const serviceable = prepaidCouriers.length > 0 || codCouriers.length > 0;
    const ratePool = wantsCod ? codCouriers : prepaidCouriers.length ? prepaidCouriers : codCouriers;

    if (!serviceable) {
      return {
        serviceable: false,
        definitive: true,
        prepaid: false,
        cod: false,
        city: '',
        state: '',
        remarks: 'Sorry, we do not deliver to this pincode yet.',
        amount: null,
        source: 'shiprocket',
        raw: null,
      };
    }

    return {
      serviceable: true,
      definitive: true,
      prepaid: prepaidCouriers.length > 0,
      cod: codCouriers.length > 0,
      city: '',
      state: '',
      remarks: '',
      amount: cheapestRate(ratePool),
      source: 'shiprocket',
      raw: wantsCod ? codResult.payload : prepaidResult.payload,
    };
  } catch (error) {
    log('warn', 'Serviceability lookup failed', { pin, message: error.message });
    return {
      ...fallback,
      remarks: 'Shipping partner could not confirm this pincode. Local shipping rules are being used.',
    };
  }
};

const checkPincodeServiceability = async (pincode) => lookupServiceability({ destinationPin: pincode });

const calculateShippingCharge = async ({ destinationPin, weightGrams, paymentMode }) => {
  const lookup = await lookupServiceability({ destinationPin, weightGrams, paymentMode });
  if (!lookup.definitive || lookup.amount === null) return null;
  return { amount: lookup.amount, raw: lookup.raw };
};

const STATUS_BY_ID = {
  1: { shippingStatus: 'new', deliveryStatus: 'pending', pickupStatus: 'pending', orderStatus: 'processing' },
  2: { shippingStatus: 'label_generated', deliveryStatus: 'pending', pickupStatus: 'pending', orderStatus: 'processing' },
  3: { shippingStatus: 'pickup_scheduled', deliveryStatus: 'pending', pickupStatus: 'scheduled', orderStatus: 'packed' },
  4: { shippingStatus: 'pickup_queued', deliveryStatus: 'pending', pickupStatus: 'scheduled', orderStatus: 'packed' },
  5: { shippingStatus: 'manifested', deliveryStatus: 'pending', pickupStatus: 'scheduled', orderStatus: 'packed' },
  6: { shippingStatus: 'shipped', deliveryStatus: 'in_transit', pickupStatus: 'picked', orderStatus: 'shipped' },
  7: { shippingStatus: 'delivered', deliveryStatus: 'delivered', pickupStatus: 'picked', orderStatus: 'delivered' },
  8: { shippingStatus: 'cancelled', deliveryStatus: 'cancelled', pickupStatus: 'cancelled', orderStatus: 'cancelled' },
  9: { shippingStatus: 'rto_initiated', deliveryStatus: 'rto', pickupStatus: 'picked', orderStatus: 'returned' },
  10: { shippingStatus: 'rto_delivered', deliveryStatus: 'rto', pickupStatus: 'picked', orderStatus: 'returned' },
  12: { shippingStatus: 'lost', deliveryStatus: 'failed', pickupStatus: 'picked', orderStatus: null },
  13: { shippingStatus: 'pickup_error', deliveryStatus: 'pending', pickupStatus: 'error', orderStatus: null },
  14: { shippingStatus: 'rto_acknowledged', deliveryStatus: 'rto', pickupStatus: 'picked', orderStatus: 'returned' },
  15: { shippingStatus: 'pickup_rescheduled', deliveryStatus: 'pending', pickupStatus: 'rescheduled', orderStatus: 'packed' },
  16: { shippingStatus: 'cancellation_requested', deliveryStatus: 'pending', pickupStatus: 'pending', orderStatus: null },
  17: { shippingStatus: 'out_for_delivery', deliveryStatus: 'out_for_delivery', pickupStatus: 'picked', orderStatus: 'out_for_delivery' },
  18: { shippingStatus: 'in_transit', deliveryStatus: 'in_transit', pickupStatus: 'picked', orderStatus: 'shipped' },
  19: { shippingStatus: 'out_for_pickup', deliveryStatus: 'pending', pickupStatus: 'out_for_pickup', orderStatus: 'packed' },
  20: { shippingStatus: 'pickup_exception', deliveryStatus: 'pending', pickupStatus: 'exception', orderStatus: null },
  21: { shippingStatus: 'undelivered', deliveryStatus: 'failed', pickupStatus: 'picked', orderStatus: null },
  38: { shippingStatus: 'in_transit', deliveryStatus: 'in_transit', pickupStatus: 'picked', orderStatus: 'shipped' },
  42: { shippingStatus: 'picked_up', deliveryStatus: 'in_transit', pickupStatus: 'picked', orderStatus: 'shipped' },
  46: { shippingStatus: 'rto_in_transit', deliveryStatus: 'rto', pickupStatus: 'picked', orderStatus: 'returned' },
};

const mapByText = (statusText = '') => {
  const value = String(statusText).trim().toUpperCase();
  if (!value) {
    return { shippingStatus: 'unknown', deliveryStatus: 'unknown', pickupStatus: null, orderStatus: null };
  }
  if (value.includes('RTO')) return STATUS_BY_ID[9];
  if (value.includes('CANCEL')) return STATUS_BY_ID[8];
  if (value.includes('OUT FOR DELIVERY')) return STATUS_BY_ID[17];
  if (value.includes('DELIVERED')) return STATUS_BY_ID[7];
  if (value.includes('UNDELIVER')) return STATUS_BY_ID[21];
  if (value.includes('PICKED')) return STATUS_BY_ID[42];
  if (value.includes('OUT FOR PICKUP')) return STATUS_BY_ID[19];
  if (value.includes('PICKUP')) return STATUS_BY_ID[3];
  if (value.includes('IN TRANSIT') || value.includes('SHIPPED') || value.includes('DISPATCH')) return STATUS_BY_ID[18];
  if (value.includes('MANIFEST')) return STATUS_BY_ID[5];
  if (value === 'NEW' || value.includes('AWB')) return STATUS_BY_ID[1];
  return {
    shippingStatus: value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40),
    deliveryStatus: 'in_progress',
    pickupStatus: null,
    orderStatus: null,
  };
};

const mapShiprocketStatus = ({ statusText, statusId } = {}) => {
  const id = Number(statusId);
  if (Number.isFinite(id) && STATUS_BY_ID[id]) {
    return { ...STATUS_BY_ID[id] };
  }
  const mapped = mapByText(statusText);
  return { ...mapped };
};

const verifyWebhookToken = (provided) => {
  const expected = String(process.env.SHIPROCKET_WEBHOOK_TOKEN || '').trim();
  if (!expected) return false;
  return tokensMatch(provided, expected);
};

module.exports = {
  isShiprocketConfigured,
  getPickupPin,
  getPickupLocation,
  lookupServiceability,
  checkPincodeServiceability,
  calculateShippingCharge,
  createAdhocOrder,
  assignAwb,
  requestPickup,
  generateLabel,
  trackByAwb,
  cancelShipment,
  findOrderByChannelId,
  mapShiprocketStatus,
  buildAdhocOrderPayload,
  buildTrackingUrl,
  verifyWebhookToken,
  resetShiprocketState,
  isDuplicateOrderError,
};
