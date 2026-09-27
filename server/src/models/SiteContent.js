const mongoose = require('mongoose');
const { toPublicAssetUrl, toStoredAssetPath } = require('../utils/assetUrl');

const ctaSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: '' },
    to: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const heroSchema = new mongoose.Schema(
  {
    image: { type: String, trim: true, default: '' },
    heading: { type: String, trim: true, default: 'Thoughtfully Curated. Elegantly Gifted.' },
    subheading: {
      type: String,
      trim: true,
      default:
        'Premium dry fruits and gifting, selected for flavour, freshness and the occasion — from family festivals to corporate courtesy.',
    },
    primaryCta: {
      type: ctaSchema,
      default: () => ({ label: 'Shop Hampers', to: '/shop' }),
    },
    secondaryCta: {
      type: ctaSchema,
      default: () => ({ label: 'Explore Dry Fruits', to: '/shop' }),
    },
  },
  { _id: false }
);

const storySchema = new mongoose.Schema(
  {
    image: { type: String, trim: true, default: '' },
    eyebrow: { type: String, trim: true, default: 'Our story' },
    heading: {
      type: String,
      trim: true,
      default: 'Quality, elegance and the art of giving well',
    },
    body: {
      type: String,
      trim: true,
      default:
        'Anant Exotika Foods is a modern Indian house for premium dry fruits and gifting. We select for taste, pack with care, and present each piece so it feels worthy of the occasion.',
    },
    cta: {
      type: ctaSchema,
      default: () => ({ label: 'Discover our story', to: '/about' }),
    },
  },
  { _id: false }
);

const tileSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: '' },
    text: { type: String, trim: true, default: '' },
    image: { type: String, trim: true, default: '' },
    to: { type: String, trim: true, default: '/shop' },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
  },
  { _id: true }
);

const commerceSchema = new mongoose.Schema(
  {
    shippingMode: { type: String, enum: ['flat', 'delhivery'], default: 'flat' },
    shippingCharge: { type: Number, min: 0, default: 79 },
    freeShippingThreshold: { type: Number, min: 0, default: 0 },
    packagingCharge: { type: Number, min: 0, default: 0 },
    handlingCharge: { type: Number, min: 0, default: 0 },
    taxPercent: { type: Number, min: 0, max: 100, default: 0 },
    codEnabled: { type: Boolean, default: true },
    codFee: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const siteContentSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      unique: true,
      default: 'storefront',
      trim: true,
    },
    storeName: { type: String, trim: true, default: 'Anant Exotika Foods' },
    storeEmail: { type: String, trim: true, default: 'info@anantexotika.in' },
    phone: { type: String, trim: true, default: '9623079356' },
    address: { type: String, trim: true, default: '' },
    orderPrefix: { type: String, trim: true, default: 'AE' },
    currency: { type: String, trim: true, default: 'INR' },
    storeStatus: { type: String, enum: ['open', 'closed'], default: 'open' },
    commerce: { type: commerceSchema, default: () => ({}) },
    seoTitle: {
      type: String,
      trim: true,
      default: 'Anant Exotika Foods | Premium Dry Fruits & Gifting',
    },
    seoDescription: {
      type: String,
      trim: true,
      default:
        'Anant Exotika Foods — premium dry fruits, gift hampers and corporate gifting, thoughtfully curated and elegantly presented.',
    },
    hero: { type: heroSchema, default: () => ({}) },
    brandStory: { type: storySchema, default: () => ({}) },
    gifting: { type: [tileSchema], default: [] },
    banners: { type: [tileSchema], default: [] },
    featuredCategoryIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
      default: [],
    },
    newsletter: {
      heading: { type: String, trim: true, default: 'Invitations, harvests and gifting notes' },
      body: {
        type: String,
        trim: true,
        default: 'Be first to know about festive collections, corporate programmes and limited harvests.',
      },
    },
  },
  { timestamps: true }
);

const mapTile = (tile) => ({
  ...tile,
  image: tile.image ? toPublicAssetUrl(tile.image) : tile.image,
});

siteContentSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.__v;
  if (obj.hero?.image) obj.hero.image = toPublicAssetUrl(obj.hero.image);
  if (obj.brandStory?.image) obj.brandStory.image = toPublicAssetUrl(obj.brandStory.image);
  if (Array.isArray(obj.gifting)) obj.gifting = obj.gifting.map(mapTile);
  if (Array.isArray(obj.banners)) obj.banners = obj.banners.map(mapTile);
  return obj;
};

siteContentSchema.statics.normalizeIncoming = function normalizeIncoming(body = {}) {
  const next = { ...body };
  if (next.hero?.image) next.hero.image = toStoredAssetPath(next.hero.image);
  if (next.brandStory?.image) next.brandStory.image = toStoredAssetPath(next.brandStory.image);
  if (Array.isArray(next.gifting)) {
    next.gifting = next.gifting.map((tile) => ({
      ...tile,
      image: tile.image ? toStoredAssetPath(tile.image) : '',
    }));
  }
  if (Array.isArray(next.banners)) {
    next.banners = next.banners.map((tile) => ({
      ...tile,
      image: tile.image ? toStoredAssetPath(tile.image) : '',
    }));
  }
  return next;
};

module.exports = mongoose.model('SiteContent', siteContentSchema);
