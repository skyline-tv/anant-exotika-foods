const percentageType = (coupon) => {
  const type = String(coupon?.discountType || '').trim().toLowerCase();
  return type === 'percentage' || type === 'percent' || type === '%';
};

export function isPercentageCoupon(coupon) {
  return percentageType(coupon);
}

export function couponDiscountAmount(result) {
  const amount = Number(result?.discount);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function couponDiscountLabel(result) {
  const coupon = result?.coupon;
  if (!coupon) return 'Discount';
  if (coupon.kind === 'gift_voucher') return 'Gift voucher';
  if (percentageType(coupon)) return `${Number(coupon.discountValue) || 0}% off`;
  if (String(coupon.discountType || '').toLowerCase() === 'fixed') return 'Fixed amount';
  return 'Discount';
}
