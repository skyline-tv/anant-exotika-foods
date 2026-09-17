const crypto = require('crypto');
const Coupon = require('../models/Coupon');
const AppError = require('./AppError');

const GIFT_VOUCHER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const isGiftVoucher = (coupon) => coupon?.kind === 'gift_voucher';

const generateGiftVoucherCode = () => {
  const bytes = crypto.randomBytes(8);
  let suffix = '';
  for (let i = 0; i < 8; i += 1) {
    suffix += GIFT_VOUCHER_ALPHABET[bytes[i] % GIFT_VOUCHER_ALPHABET.length];
  }
  return `GV-${suffix}`;
};

const applyGiftVoucherRules = (payload = {}) => ({
  ...payload,
  kind: 'gift_voucher',
  discountType: 'fixed',
  usageLimit: 1,
  perUserLimit: 1,
  maximumDiscount: 0,
});

const ensureUniqueCouponCode = async (preferredCode) => {
  let candidate = String(preferredCode || generateGiftVoucherCode())
    .toUpperCase()
    .trim();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const exists = await Coupon.exists({ code: candidate });
    if (!exists) {
      return candidate;
    }
    candidate = generateGiftVoucherCode();
  }

  throw new AppError('Unable to generate a unique gift voucher code. Please try again.', 500);
};

module.exports = {
  isGiftVoucher,
  generateGiftVoucherCode,
  applyGiftVoucherRules,
  ensureUniqueCouponCode,
};
