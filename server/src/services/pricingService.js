const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const calculateItemTotal = (price, quantity) => roundMoney(price * quantity);

const calculateShipping = () => {
  // Placeholder for Shiprocket / shipping rules
  return 0;
};

const calculateTax = () => {
  // Placeholder for GST calculation
  return 0;
};

const applyCouponDiscount = (subtotal, coupon) => {
  if (!coupon) {
    return 0;
  }

  let discount = 0;

  if (coupon.discountType === 'percentage') {
    discount = (subtotal * coupon.discountValue) / 100;
  } else if (coupon.discountType === 'fixed') {
    discount = coupon.discountValue;
  }

  if (coupon.maximumDiscount && coupon.maximumDiscount > 0) {
    discount = Math.min(discount, coupon.maximumDiscount);
  }

  discount = Math.min(discount, subtotal);
  return roundMoney(discount);
};

const calculateOrderPricing = ({ items, coupon = null }) => {
  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + item.total, 0)
  );
  const discount = applyCouponDiscount(subtotal, coupon);
  const shipping = calculateShipping();
  const tax = calculateTax();
  const total = roundMoney(Math.max(0, subtotal - discount + shipping + tax));

  return {
    subtotal,
    discount,
    shipping,
    tax,
    total,
  };
};

module.exports = {
  roundMoney,
  calculateItemTotal,
  calculateShipping,
  calculateTax,
  applyCouponDiscount,
  calculateOrderPricing,
};
