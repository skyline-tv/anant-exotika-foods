const AppError = require('../utils/AppError');
const { roundMoney } = require('./pricingService');
const {
  isDelhiveryConfigured,
  checkPincodeServiceability,
  calculateShippingCharge,
} = require('./delhiveryService');

const getOriginPin = () =>
  String(process.env.DELHIVERY_PICKUP_PIN || process.env.SHIPPING_ORIGIN_PIN || '').trim();

const getFreeShippingThreshold = () => {
  const value = Number(process.env.SHIPPING_FREE_THRESHOLD);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const getFallbackRate = () => {
  const value = Number(process.env.SHIPPING_FALLBACK_RATE);
  return Number.isFinite(value) && value >= 0 ? value : 79;
};

const isCodEnabledGlobally = () => process.env.COD_ENABLED !== 'false';

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

  const serviceability = await checkPincodeServiceability(pin);
  if (!serviceability.serviceable) {
    throw new AppError(
      serviceability.remarks || 'Sorry, we do not deliver to this pincode yet.',
      400
    );
  }

  const payableGoods = Math.max(0, Number(subtotal) - Number(discount));
  const freeThreshold = getFreeShippingThreshold();
  const freeShipping = freeThreshold > 0 && payableGoods >= freeThreshold;
  const weightGrams = estimatePackageWeightGrams(items);
  const wantsCod = paymentMethod === 'cod';
  const codAvailable = isCodEnabledGlobally() && serviceability.cod !== false;

  if (wantsCod && !codAvailable) {
    throw new AppError('Cash on Delivery is not available for this pincode.', 400);
  }

  let amount = 0;
  let source = 'free';
  let raw = null;

  if (!freeShipping) {
    const originPin = getOriginPin();
    if (isDelhiveryConfigured() && originPin) {
      try {
        const quote = await calculateShippingCharge({
          destinationPin: pin,
          originPin,
          weightGrams,
          paymentMode: wantsCod ? 'COD' : 'Prepaid',
        });
        if (quote) {
          amount = quote.amount;
          source = 'delhivery';
          raw = quote.raw;
        }
      } catch (error) {
        console.warn('[shipping] Delhivery rate lookup failed:', error.message || error);
      }
    }

    if (source !== 'delhivery') {
      amount = getFallbackRate();
      source = isDelhiveryConfigured() ? 'fallback' : 'configured';
    }
  }

  amount = roundMoney(amount);

  return {
    postalCode: pin,
    serviceable: true,
    prepaid: serviceability.prepaid !== false,
    codAvailable,
    freeShipping,
    freeShippingThreshold: freeThreshold,
    shipping: amount,
    weightGrams,
    source,
    partner: isDelhiveryConfigured() ? 'delhivery' : 'manual',
    city: serviceability.city || '',
    state: serviceability.state || '',
    remarks: freeShipping
      ? `Free shipping on orders of ${freeThreshold ? `₹${freeThreshold}+` : 'eligible carts'}.`
      : serviceability.remarks || '',
    raw,
  };
};

const getPublicShippingConfig = () => ({
  partner: isDelhiveryConfigured() ? 'delhivery' : 'manual',
  freeShippingThreshold: getFreeShippingThreshold(),
  fallbackRate: getFallbackRate(),
  codEnabled: isCodEnabledGlobally(),
  configured: isDelhiveryConfigured(),
});

module.exports = {
  getOriginPin,
  getFreeShippingThreshold,
  getFallbackRate,
  isCodEnabledGlobally,
  estimatePackageWeightGrams,
  quoteShipping,
  getPublicShippingConfig,
};
