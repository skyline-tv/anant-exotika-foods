const percentageType = (coupon) => {
  const type = String(coupon?.discountType || '').trim().toLowerCase();
  return type === 'percentage' || type === 'percent' || type === '%';
};

export function isPercentageCoupon(coupon) {
  return percentageType(coupon);
}

export function couponDiscountAmount(result, subtotal) {
  const coupon = result?.coupon;
  const cartSubtotal = Math.max(0, Number(subtotal) || Number(result?.subtotal) || 0);
  const value = Number(coupon?.discountValue) || 0;
  const cap = Number(coupon?.maximumDiscount) || 0;

  let amount = Number(result?.discount) || 0;
  if (percentageType(coupon)) {
    amount = (cartSubtotal * value) / 100;
    if (cap > 0) amount = Math.min(amount, cap);
    amount = Math.min(amount, cartSubtotal);
  }

  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function couponDiscountLabel(result) {
  const coupon = result?.coupon;
  if (!coupon) return 'Discount';
  if (coupon.kind === 'gift_voucher') return 'Gift voucher';
  if (percentageType(coupon)) return `${Number(coupon.discountValue) || 0}% off`;
  return 'Discount';
}
