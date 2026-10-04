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

const isPercentageDiscount = (coupon) => {
  const type = String(coupon?.discountType || '').trim().toLowerCase();
  return type === 'percentage' || type === 'percent' || type === '%';
};

const normalizeDiscountApplyOn = (coupon) => {
  const value = String(coupon?.discountApplyOn || 'CHECKOUT_PRICE').trim().toUpperCase();
  return value === 'MRP' ? 'MRP' : 'CHECKOUT_PRICE';
};

const lineMoney = (unit, quantity) =>
  roundMoney(Math.max(0, Number(unit) || 0) * Math.max(0, Number(quantity) || 0));

const couponBases = (items, coupon) => {
  const applyOn = normalizeDiscountApplyOn(coupon);
  let checkout = 0;
  let basis = 0;

  items.forEach((item) => {
    const price = Math.max(0, Number(item.price) || 0);
    const quantity = Math.max(0, Number(item.quantity) || 0);
    const listedMrp = Number(item.compareAtPrice ?? item.mrp);
    const mrp = Number.isFinite(listedMrp) && listedMrp > 0 ? listedMrp : price;
    checkout += lineMoney(price, quantity);
    basis += lineMoney(applyOn === 'MRP' ? mrp : price, quantity);
  });

  return {
    checkout: roundMoney(checkout),
    basis: roundMoney(basis),
    applyOn,
  };
};

const couponDiscountBreakdown = (subtotal, coupon, items) => {
  const priced = Array.isArray(items) && items.length ? couponBases(items, coupon) : null;
  const checkout = priced ? priced.checkout : Math.max(0, Number(subtotal) || 0);
  const basis = priced ? priced.basis : checkout;
  const applyOn = priced ? priced.applyOn : normalizeDiscountApplyOn(coupon);
  const empty = {
    discount: 0,
    mrpSubtotal: basis,
    listedSubtotal: checkout,
    productPayable: checkout,
    applyOn,
  };

  if (!coupon) return empty;

  const value = Number(coupon.discountValue) || 0;
  const type = String(coupon.discountType || '').trim().toLowerCase();
  const cap = Number(coupon.maximumDiscount) || 0;

  if (applyOn === 'MRP' && isPercentageDiscount(coupon) && value > 0) {
    let cut = (basis * value) / 100;
    if (cap > 0) cut = Math.min(cut, cap);
    cut = Math.min(Math.max(0, cut), basis);
    const afterMrp = roundMoney(basis - cut);
    const productPayable = roundMoney(Math.min(checkout, afterMrp));
    return {
      discount: roundMoney(checkout - productPayable),
      mrpSubtotal: basis,
      listedSubtotal: checkout,
      productPayable,
      applyOn,
    };
  }

  let discount = 0;
  if (isPercentageDiscount(coupon)) {
    discount = (basis * value) / 100;
  } else if (type === 'fixed') {
    discount = value;
  }

  if (cap > 0) discount = Math.min(discount, cap);
  discount = roundMoney(Math.min(Math.max(0, discount), checkout));

  return {
    discount,
    mrpSubtotal: basis,
    listedSubtotal: checkout,
    productPayable: roundMoney(checkout - discount),
    applyOn,
  };
};

const applyCouponDiscount = (subtotal, coupon, items) =>
  couponDiscountBreakdown(subtotal, coupon, items).discount;

const linesFromProducts = (cartItems, productMap) =>
  cartItems.reduce((lines, item) => {
    const product = productMap.get(String(item.product));
    if (!product) return lines;
    const price = Math.max(0, Number(product.price) || 0);
    const quantity = Math.max(0, Number(item.quantity) || 0);
    lines.push({
      price,
      compareAtPrice: Math.max(0, Number(product.compareAtPrice) || 0),
      quantity,
      total: calculateItemTotal(price, quantity),
    });
    return lines;
  }, []);

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
  const discount = applyCouponDiscount(subtotal, coupon, items);
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
  couponDiscountBreakdown,
  normalizeDiscountApplyOn,
  linesFromProducts,
  calculateOrderPricing,
};
