const assert = require('node:assert/strict');
const { describe, test } = require('node:test');
const { applyCouponDiscount, calculateOrderPricing, couponDiscountBreakdown } = require('./pricingService');

const line = (price, mrp, quantity = 1) => ({
  price,
  compareAtPrice: mrp,
  quantity,
  total: Math.round(price * quantity * 100) / 100,
});

describe('coupon discount basis', () => {
  test('50% off MRP ₹700 with listed price ₹600 is payable ₹350', () => {
    const items = [line(600, 700)];
    const coupon = { discountType: 'percentage', discountValue: 50, discountApplyOn: 'MRP' };
    const breakdown = couponDiscountBreakdown(600, coupon, items);
    const pricing = calculateOrderPricing({ items, coupon, shipping: 0, tax: 0 });

    assert.equal(breakdown.mrpSubtotal, 700);
    assert.equal(breakdown.listedSubtotal, 600);
    assert.equal(breakdown.productPayable, 350);
    assert.equal(breakdown.discount, 250);
    assert.equal(pricing.subtotal, 600);
    assert.equal(pricing.total, 350);
  });

  test('a small MRP percentage does not raise the price above the listed price', () => {
    const items = [line(799, 999)];
    const coupon = { discountType: 'percentage', discountValue: 10, discountApplyOn: 'MRP' };
    const breakdown = couponDiscountBreakdown(799, coupon, items);

    assert.equal(breakdown.productPayable, 799);
    assert.equal(breakdown.discount, 0);
    assert.equal(applyCouponDiscount(799, coupon, items), 0);
  });

  test('10% of checkout price ₹799 is ₹79.90', () => {
    const items = [line(799, 999)];
    const coupon = { discountType: 'percentage', discountValue: 10, discountApplyOn: 'CHECKOUT_PRICE' };
    const pricing = calculateOrderPricing({ items, coupon, shipping: 0, tax: 0 });

    assert.equal(pricing.discount, 79.9);
    assert.equal(pricing.total, 719.1);
  });

  test('a coupon saved before this field still discounts the checkout price', () => {
    const items = [line(799, 999)];
    const coupon = { discountType: 'percentage', discountValue: 10 };
    assert.equal(applyCouponDiscount(799, coupon, items), 79.9);
  });

  test('mixed cart pays the discounted MRP when it is below the listed total', () => {
    const items = [line(600, 700, 1), line(400, 800, 1)];
    const coupon = { discountType: 'percentage', discountValue: 50, discountApplyOn: 'MRP' };
    const breakdown = couponDiscountBreakdown(1000, coupon, items);
    assert.equal(breakdown.mrpSubtotal, 1500);
    assert.equal(breakdown.productPayable, 750);
    assert.equal(breakdown.discount, 250);
  });

  test('quantity change recalculates a percentage of MRP', () => {
    const coupon = { discountType: 'percentage', discountValue: 50, discountApplyOn: 'MRP' };
    const breakdown = couponDiscountBreakdown(1200, coupon, [line(600, 700, 2)]);
    assert.equal(breakdown.mrpSubtotal, 1400);
    assert.equal(breakdown.productPayable, 700);
  });

  test('missing MRP falls back to the checkout price', () => {
    const coupon = { discountType: 'percentage', discountValue: 10, discountApplyOn: 'MRP' };
    assert.equal(applyCouponDiscount(799, coupon, [line(799, 0)]), 79.9);
  });

  test('fixed discount cannot reduce the checkout total below zero', () => {
    const coupon = { discountType: 'fixed', discountValue: 1000, discountApplyOn: 'MRP' };
    const pricing = calculateOrderPricing({
      items: [line(799, 999)],
      coupon,
      shipping: 0,
      tax: 0,
    });
    assert.equal(pricing.discount, 799);
    assert.equal(pricing.total, 0);
  });

  test('maximum discount caps how much comes off the MRP', () => {
    const coupon = {
      discountType: 'percentage',
      discountValue: 50,
      discountApplyOn: 'MRP',
      maximumDiscount: 200,
    };
    const breakdown = couponDiscountBreakdown(600, coupon, [line(600, 700)]);
    assert.equal(breakdown.productPayable, 500);
    assert.equal(breakdown.discount, 100);
  });

  test('fixed discount respects the maximum discount cap', () => {
    const coupon = {
      discountType: 'fixed',
      discountValue: 200,
      discountApplyOn: 'CHECKOUT_PRICE',
      maximumDiscount: 75,
    };
    assert.equal(applyCouponDiscount(799, coupon, [line(799, 999)]), 75);
  });
});
