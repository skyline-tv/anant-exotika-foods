const mongoose = require('mongoose');
const { slugify, ensureUniqueSlug } = require('../utils/slugify');
const { toPublicAssetUrl } = require('../utils/assetUrl');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [80, 'Category name cannot exceed 80 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    image: {
      type: String,
      trim: true,
      default: '',
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
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

categorySchema.index({ parentCategory: 1, displayOrder: 1 });
categorySchema.index({ isActive: 1 });

categorySchema.pre('save', async function generateSlug() {
  if (!this.isModified('name') && this.slug) {
    return;
  }

  const source = this.slug ? slugify(this.slug) : this.name;
  this.slug = await ensureUniqueSlug(this.constructor, source, this._id);
});

categorySchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.__v;
  if (obj.image) {
    obj.image = toPublicAssetUrl(obj.image);
  }
  return obj;
};

module.exports = mongoose.model('Category', categorySchema);
