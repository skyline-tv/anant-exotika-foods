const SiteContent = require('../models/SiteContent');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');

const ALLOWED = [
  'storeName',
  'storeEmail',
  'phone',
  'address',
  'orderPrefix',
  'currency',
  'storeStatus',
  'commerce',
  'seoTitle',
  'seoDescription',
  'hero',
  'brandStory',
  'gifting',
  'banners',
  'featuredCategoryIds',
  'collection',
  'newsletter',
];

const CONTENT_POPULATE = [
  { path: 'featuredCategoryIds', select: 'name slug image isActive' },
  { path: 'collection.category', select: 'name slug' },
  {
    path: 'collection.products',
    select: 'name slug price compareAtPrice stock status images shortDescription category isPersonalizedHamper weight sku',
  },
];

const getOrCreateContent = async () => {
  let content = await SiteContent.findOne({ key: 'storefront' }).populate(CONTENT_POPULATE);
  if (!content) {
    content = await SiteContent.create({ key: 'storefront' });
    content = await SiteContent.findById(content._id).populate(CONTENT_POPULATE);
  }
  return content;
};

const getPublicContent = asyncHandler(async (req, res) => {
  const content = await getOrCreateContent();

  successResponse(res, {
    message: 'Storefront content retrieved successfully',
    data: { content },
  });
});

const updateContent = asyncHandler(async (req, res) => {
  const content = await getOrCreateContent();
  const incoming = SiteContent.normalizeIncoming(req.body);

  if (Array.isArray(incoming.collection)) {
    incoming.collection = incoming.collection
      .map((entry) => ({
        category: entry?.category?._id || entry?.category || null,
        products: (Array.isArray(entry?.products) ? entry.products : [])
          .map((product) => product?._id || product)
          .filter(Boolean)
          .slice(0, 4),
      }))
      .filter((entry) => entry.products.length);
  }

  ALLOWED.forEach((field) => {
    if (incoming[field] !== undefined) {
      content[field] = incoming[field];
    }
  });

  await content.save();
  await content.populate(CONTENT_POPULATE);

  successResponse(res, {
    message: 'Storefront content updated successfully',
    data: { content },
  });
});

module.exports = {
  getPublicContent,
  updateContent,
};
