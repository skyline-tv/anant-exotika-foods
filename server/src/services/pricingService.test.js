const assert = require('node:assert/strict');
const { describe, test } = require('node:test');
const { applyCouponDiscount, calculateOrderPricing } = require('./pricingService');

const line = (price, mrp, quantity = 1) => ({
  price,
  compareAtPrice: mrp,
  quantity,
  total: Math.round(price * quantity * 100) / 100,
});

describe('coupon discount basis', () => {
  test('10% of MRP ₹999 is ₹99.90 off the ₹799 checkout price', () => {
    const items = [line(799, 999)];
    const coupon = { discountType: 'percentage', discountValue: 10, discountApplyOn: 'MRP' };
    const discount = applyCouponDiscount(799, coupon, items);
    const pricing = calculateOrderPricing({ items, coupon, shipping: 0, tax: 0 });

    assert.equal(discount, 99.9);
    assert.equal(pricing.subtotal, 799);
    assert.equal(pricing.discount, 99.9);
    assert.equal(pricing.total, 699.1);
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

  test('mixed cart uses each line MRP and quantity', () => {
    const items = [line(799, 999, 1), line(500, 500, 2)];
    const coupon = { discountType: 'percentage', discountValue: 10, discountApplyOn: 'MRP' };
    assert.equal(applyCouponDiscount(1799, coupon, items), 199.9);
  });

  test('quantity change recalculates a percentage of MRP', () => {
    const coupon = { discountType: 'percentage', discountValue: 10, discountApplyOn: 'MRP' };
    assert.equal(applyCouponDiscount(1598, coupon, [line(799, 999, 2)]), 199.8);
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

  test('maximum discount caps a percentage of MRP', () => {
    const coupon = {
      discountType: 'percentage',
      discountValue: 10,
      discountApplyOn: 'MRP',
      maximumDiscount: 50,
    };
    assert.equal(applyCouponDiscount(799, coupon, [line(799, 999)]), 50);
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
