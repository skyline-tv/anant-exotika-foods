const mongoose = require('mongoose');
const { COUPON_KIND, DISCOUNT_TYPE } = require('../utils/constants');

const couponSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: COUPON_KIND,
      default: 'promo',
    },
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    discountType: {
      type: String,
      enum: DISCOUNT_TYPE,
      required: [true, 'Discount type is required'],
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Discount value cannot be negative'],
    },
    minimumOrderAmount: {
      type: Number,
      min: [0, 'Minimum order amount cannot be negative'],
      default: 0,
    },
    maximumDiscount: {
      type: Number,
      min: [0, 'Maximum discount cannot be negative'],
      default: 0,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    usageLimit: {
      type: Number,
      min: [0, 'Usage limit cannot be negative'],
      default: 0,
    },
    usedCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    perUserLimit: {
      type: Number,
      min: [0, 'Per-user limit cannot be negative'],
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

couponSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

couponSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Coupon', couponSchema);
