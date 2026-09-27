const AppError = require('../utils/AppError');
const SiteContent = require('../models/SiteContent');
const { roundMoney } = require('./pricingService');
const {
  isShiprocketConfigured,
  getPickupPin,
  lookupServiceability,
} = require('./shiprocketService');

const getOriginPin = () => getPickupPin();

const nonNegative = (value, fallback) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? roundMoney(amount) : fallback;
};

const envFallbackRate = () => {
  const value = Number(process.env.SHIPPING_FALLBACK_RATE);
  return Number.isFinite(value) && value >= 0 ? value : 79;
};

const envFreeThreshold = () => {
  const value = Number(process.env.SHIPPING_FREE_THRESHOLD);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const getCommerceSettings = async () => {
  const content = await SiteContent.findOne({ key: 'storefront' }).select('commerce').lean();
  const stored = content?.commerce || {};
  const hasSavedCommerce = Boolean(content?.commerce);

  return {
    shippingMode: stored.shippingMode === 'shiprocket' || stored.shippingMode === 'delhivery' ? 'shiprocket' : 'flat',
    shippingCharge: nonNegative(
      stored.shippingCharge,
      hasSavedCommerce ? 0 : envFallbackRate()
    ),
    freeShippingThreshold: nonNegative(
      stored.freeShippingThreshold,
      hasSavedCommerce ? 0 : envFreeThreshold()
    ),
    packagingCharge: nonNegative(stored.packagingCharge, 0),
    handlingCharge: nonNegative(stored.handlingCharge, 0),
    taxPercent: Math.min(100, nonNegative(stored.taxPercent, 0)),
    codEnabled: stored.codEnabled !== false && process.env.COD_ENABLED !== 'false',
    codFee: nonNegative(stored.codFee, 0),
  };
};

const isCodEnabledGlobally = async () => {
  const settings = await getCommerceSettings();
  return settings.codEnabled;
};

const estimatePackageWeightGrams = (items = []) => {
  const total = items.reduce((sum, item) => {
    const unit = Number(item.weight || item.product?.weight || 0);
    const qty = Number(item.quantity || 1);
    const grams = unit > 0 ? unit : 250;
    return sum + grams * qty;
  }, 0);
  return Math.max(500, Math.ceil(total || 500));
};

const quoteShipping = async ({
  postalCode,
  subtotal = 0,
  discount = 0,
  paymentMethod = 'razorpay',
  items = [],
}) => {
  const pin = String(postalCode || '').trim();
  if (!/^[1-9][0-9]{5}$/.test(pin)) {
    throw new AppError('Enter a valid 6-digit pincode.', 400);
  }

  const settings = await getCommerceSettings();
  const payableGoods = Math.max(0, Number(subtotal) - Number(discount));
  const freeThreshold = settings.freeShippingThreshold;
  const freeShipping = freeThreshold > 0 && payableGoods >= freeThreshold;
  const weightGrams = estimatePackageWeightGrams(items);
  const wantsCod = paymentMethod === 'cod';
  const serviceability = await lookupServiceability({
    destinationPin: pin,
    weightGrams,
    paymentMode,
  });
  if (!serviceability.serviceable && serviceability.definitive) {
    throw new AppError(
      serviceability.remarks || 'Sorry, we do not deliver to this pincode yet.',
      400
    );
  }

  const codAvailable = settings.codEnabled && serviceability.cod !== false;

  if (wantsCod && !settings.codEnabled) {
    throw new AppError('Cash on Delivery is currently unavailable.', 400);
  }
  if (wantsCod && !codAvailable) {
    throw new AppError('Cash on Delivery is not available for this pincode.', 400);
  }

  let amount = 0;
  let source = 'free';
  let raw = null;

  if (!freeShipping) {
    const useLiveRate = settings.shippingMode === 'shiprocket' && serviceability.source === 'shiprocket';
    if (useLiveRate && serviceability.amount !== null) {
      amount = serviceability.amount;
      source = 'shiprocket';
      raw = serviceability.raw;
    } else {
      amount = settings.shippingCharge;
      source = 'configured';
    }
  }

  amount = roundMoney(amount);
  const packaging = settings.packagingCharge;
  const handling = settings.handlingCharge;
  const codFee = wantsCod ? settings.codFee : 0;
  const tax = roundMoney((payableGoods * settings.taxPercent) / 100);
  const estimatedTotal = roundMoney(Math.max(0, payableGoods + amount + packaging + handling + codFee + tax));

  return {
    postalCode: pin,
    serviceable: true,
    prepaid: serviceability.prepaid !== false,
    codAvailable,
    freeShipping,
    freeShippingThreshold: freeThreshold,
    shipping: amount,
    packaging,
    handling,
    codFee,
    tax,
    taxPercent: settings.taxPercent,
    estimatedTotal,
    weightGrams,
    source,
    shippingMode: settings.shippingMode,
    partner: settings.shippingMode === 'shiprocket' && isShiprocketConfigured() ? 'shiprocket' : 'manual',
    city: serviceability.city || '',
    state: serviceability.state || '',
    remarks: freeShipping
      ? `Free shipping on orders of ₹${freeThreshold}+.`
      : serviceability.remarks || '',
    raw,
  };
};

const getPublicShippingConfig = async () => {
  const settings = await getCommerceSettings();
  return {
    partner: settings.shippingMode === 'shiprocket' && isShiprocketConfigured() ? 'shiprocket' : 'manual',
    shippingMode: settings.shippingMode,
    shippingCharge: settings.shippingCharge,
    freeShippingThreshold: settings.freeShippingThreshold,
    packagingCharge: settings.packagingCharge,
    handlingCharge: settings.handlingCharge,
    taxPercent: settings.taxPercent,
    codFee: settings.codFee,
    codEnabled: settings.codEnabled,
    configured: isShiprocketConfigured(),
  };
};

module.exports = {
  getOriginPin,
  getCommerceSettings,
  isCodEnabledGlobally,
  estimatePackageWeightGrams,
  quoteShipping,
  getPublicShippingConfig,
};
