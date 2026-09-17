const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const AppError = require('../utils/AppError');
const { isGiftVoucher } = require('../utils/giftVoucher');

const labelFor = (coupon) => (isGiftVoucher(coupon) ? 'gift voucher' : 'coupon');

const getValidCoupon = async ({ code, userId, subtotal }) => {
  if (!code) {
    return null;
  }

  const coupon = await Coupon.findOne({
    code: String(code).toUpperCase().trim(),
  });

  if (!coupon || !coupon.isActive) {
    const noun = coupon && isGiftVoucher(coupon) ? 'gift voucher' : 'coupon';
    throw new AppError(`Invalid or inactive ${noun} code.`, 400);
  }

  const noun = labelFor(coupon);
  const now = new Date();
  if (now < coupon.startDate || now > coupon.endDate) {
    throw new AppError(`This ${noun} is not valid at this time.`, 400);
  }

  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    throw new AppError(
      isGiftVoucher(coupon)
        ? 'This gift voucher has already been used.'
        : 'This coupon has reached its usage limit.',
      400
    );
  }

  if (subtotal < coupon.minimumOrderAmount) {
    throw new AppError(
      `Minimum order amount of ${coupon.minimumOrderAmount} is required for this ${noun}.`,
      400
    );
  }

  if (userId && coupon.perUserLimit > 0) {
    const usedByUser = await Order.countDocuments({
      user: userId,
      'coupon.code': coupon.code,
      orderStatus: { $nin: ['cancelled', 'failed'] },
      $or: [{ 'payment.method': 'cod' }, { 'payment.paymentStatus': 'paid' }],
    });

    if (usedByUser >= coupon.perUserLimit) {
      throw new AppError(
        isGiftVoucher(coupon)
          ? 'This gift voucher has already been used.'
          : 'You have already used this coupon.',
        400
      );
    }
  }

  return coupon;
};

module.exports = {
  getValidCoupon,
};
