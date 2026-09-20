const mongoose = require('mongoose');
const {
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  ORDER_STATUS,
} = require('../utils/constants');
const { toPublicAssetUrl, toStoredAssetPath } = require('../utils/assetUrl');

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default: '',
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const addressSnapshotSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true, default: '' },
    landmark: { type: String, trim: true, default: '' },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    country: { type: String, trim: true, default: 'India' },
    postalCode: { type: String, required: true, trim: true },
    addressType: { type: String, default: 'home' },
  },
  { _id: false }
);

const pricingSchema = new mongoose.Schema(
  {
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    shipping: { type: Number, required: true, min: 0, default: 0 },
    tax: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: PAYMENT_METHOD,
      required: true,
    },
    transactionId: {
      type: String,
      default: '',
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUS,
      default: 'pending',
    },
    paidAt: {
      type: Date,
      default: null,
    },
    gateway: {
      type: String,
      default: '',
    },
    gatewayOrderId: {
      type: String,
      default: '',
    },
    gatewayPaymentId: {
      type: String,
      default: '',
    },
    gatewaySignature: {
      type: String,
      default: '',
    },
    refundId: {
      type: String,
      default: '',
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    refundStatus: {
      type: String,
      default: '',
    },
    refundedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const shipmentSchema = new mongoose.Schema(
  {
    partner: {
      type: String,
      default: '',
      trim: true,
    },
    awbNumber: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    shipmentId: {
      type: String,
      default: '',
      trim: true,
    },
    trackingUrl: {
      type: String,
      default: '',
      trim: true,
    },
    pickupStatus: {
      type: String,
      default: 'pending',
      trim: true,
    },
    shippingStatus: {
      type: String,
      default: 'pending',
      trim: true,
    },
    deliveryStatus: {
      type: String,
      default: 'pending',
      trim: true,
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
      default: '',
      trim: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ORDER_STATUS,
      required: true,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
    },
    shippingAddress: {
      type: addressSnapshotSchema,
      required: true,
    },
    billingAddress: {
      type: addressSnapshotSchema,
      required: true,
    },
    pricing: {
      type: pricingSchema,
      required: true,
    },
    payment: {
      type: paymentSchema,
      required: true,
    },
    shipment: {
      type: shipmentSchema,
      default: () => ({}),
    },
    orderStatus: {
      type: String,
      enum: ORDER_STATUS,
      default: 'pending',
      index: true,
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    coupon: {
      kind: { type: String, default: '' },
      code: { type: String, default: '' },
      discountType: { type: String, default: '' },
      discountValue: { type: Number, default: 0 },
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'payment.paymentStatus': 1 });
orderSchema.index({ user: 1, createdAt: -1 });

orderSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.__v;
  if (Array.isArray(obj.items)) {
    obj.items = obj.items.map((item) => ({
      ...item,
      image: item.image ? toPublicAssetUrl(item.image) : item.image,
    }));
  }
  return obj;
};

module.exports = mongoose.model('Order', orderSchema);
