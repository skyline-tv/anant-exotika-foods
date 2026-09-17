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
  'seoTitle',
  'seoDescription',
  'hero',
  'brandStory',
  'gifting',
  'banners',
  'featuredCategoryIds',
  'newsletter',
];

const getOrCreateContent = async () => {
  let content = await SiteContent.findOne({ key: 'storefront' }).populate(
    'featuredCategoryIds',
    'name slug image isActive'
  );
  if (!content) {
    content = await SiteContent.create({ key: 'storefront' });
    content = await SiteContent.findById(content._id).populate(
      'featuredCategoryIds',
      'name slug image isActive'
    );
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

  ALLOWED.forEach((field) => {
    if (incoming[field] !== undefined) {
      content[field] = incoming[field];
    }
  });

  await content.save();
  await content.populate('featuredCategoryIds', 'name slug image isActive');

  successResponse(res, {
    message: 'Storefront content updated successfully',
    data: { content },
  });
});

module.exports = {
  getPublicContent,
  updateContent,
};
