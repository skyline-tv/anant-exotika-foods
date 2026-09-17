const USER_STATUS = ['active', 'inactive', 'blocked'];
const PRODUCT_STATUS = ['draft', 'active', 'inactive', 'out_of_stock'];
const ADDRESS_TYPE = ['home', 'work', 'other'];
const DISCOUNT_TYPE = ['percentage', 'fixed'];
const COUPON_KIND = ['promo', 'gift_voucher'];
const PAYMENT_METHOD = ['cod', 'razorpay'];
const PAYMENT_STATUS = ['pending', 'paid', 'failed', 'refunded'];
const ORDER_STATUS = [
  'pending',
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'returned',
  'refunded',
];
const TOKEN_TYPE = {
  USER: 'user',
  ADMIN: 'admin',
};

const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 12,
  MAX_LIMIT: 50,
};

module.exports = {
  USER_STATUS,
  PRODUCT_STATUS,
  ADDRESS_TYPE,
  DISCOUNT_TYPE,
  COUPON_KIND,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  ORDER_STATUS,
  TOKEN_TYPE,
  PAGINATION,
};
