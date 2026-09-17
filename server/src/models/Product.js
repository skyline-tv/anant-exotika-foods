const mongoose = require('mongoose');
const { PRODUCT_STATUS } = require('../utils/constants');
const { slugify, ensureUniqueSlug } = require('../utils/slugify');
const { toPublicAssetUrl } = require('../utils/assetUrl');

const imageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    altText: {
      type: String,
      trim: true,
      default: '',
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const dimensionsSchema = new mongoose.Schema(
  {
    length: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    unit: { type: String, default: 'cm', trim: true },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [180, 'Product name cannot exceed 180 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [300, 'Short description cannot exceed 300 characters'],
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    brand: {
      type: String,
      trim: true,
      default: 'ANANT EXOTIKA',
    },
    tags: {
      type: [String],
      default: [],
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    images: {
      type: [imageSchema],
      default: [],
    },
    price: {
      type: Number,
      required: [true, 'Selling rate is required'],
      min: [0, 'Selling rate cannot be negative'],
    },
    compareAtPrice: {
      type: Number,
      min: [0, 'MRP cannot be negative'],
      default: 0,
    },
    costPrice: {
      type: Number,
      min: [0, 'Cost price cannot be negative'],
      default: 0,
      select: false,
    },
    discount: {
      type: Number,
      min: [0, 'Discount cannot be negative'],
      default: 0,
    },
    stock: {
      type: Number,
      required: true,
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      min: [0, 'Low stock threshold cannot be negative'],
      default: 5,
    },
    weight: {
      type: Number,
      min: [0, 'Weight cannot be negative'],
      default: 0,
    },
    dimensions: {
      type: dimensionsSchema,
      default: () => ({}),
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isNewArrival: {
      type: Boolean,
      default: false,
    },
    isBestSeller: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: PRODUCT_STATUS,
      default: 'draft',
    },
    seoTitle: {
      type: String,
      trim: true,
      default: '',
    },
    seoDescription: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ name: 1 });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ isNewArrival: 1 });
productSchema.index({ isBestSeller: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ name: 'text', shortDescription: 'text', tags: 'text', sku: 'text' });

productSchema.pre('save', async function generateSlug() {
  if (!this.isModified('name') && this.slug) {
    return;
  }

  const source = this.slug ? slugify(this.slug) : this.name;
  this.slug = await ensureUniqueSlug(this.constructor, source, this._id);
});

productSchema.pre('save', function syncStockStatus() {
  if (this.stock <= 0 && this.status === 'active') {
    this.status = 'out_of_stock';
  }
});

productSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.__v;
  obj.mrp = obj.compareAtPrice || 0;
  obj.sellingRate = obj.price;
  if (Array.isArray(obj.images)) {
    obj.images = obj.images.map((image) => ({
      ...image,
      url: toPublicAssetUrl(image.url),
    }));
  }
  return obj;
};

module.exports = mongoose.model('Product', productSchema);
