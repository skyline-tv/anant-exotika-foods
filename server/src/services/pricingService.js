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

const calculateOrderPricing = ({
  items,
  coupon = null,
  shipping = 0,
  packaging = 0,
  handling = 0,
  codFee = 0,
  taxPercent = 0,
  tax,
}) => {
  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + item.total, 0)
  );
  const discount = applyCouponDiscount(subtotal, coupon);
  const shippingAmount = roundMoney(Math.max(0, Number(shipping) || 0));
  const packagingAmount = roundMoney(Math.max(0, Number(packaging) || 0));
  const handlingAmount = roundMoney(Math.max(0, Number(handling) || 0));
  const codFeeAmount = roundMoney(Math.max(0, Number(codFee) || 0));
  const percent = roundMoney(Math.max(0, Number(taxPercent) || 0));
  const taxable = Math.max(0, subtotal - discount);
  const taxAmount =
    tax === undefined
      ? roundMoney((taxable * percent) / 100)
      : roundMoney(Math.max(0, Number(tax) || 0));
  const total = roundMoney(
    Math.max(0, taxable + shippingAmount + packagingAmount + handlingAmount + codFeeAmount + taxAmount)
  );

  return {
    subtotal,
    discount,
    shipping: shippingAmount,
    packaging: packagingAmount,
    handling: handlingAmount,
    codFee: codFeeAmount,
    tax: taxAmount,
    taxPercent: percent,
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
