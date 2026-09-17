const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { successResponse } = require('../utils/apiResponse');

const WISHLIST_POPULATE = {
  path: 'products',
  select: 'name slug images price status sku compareAtPrice',
  populate: { path: 'category', select: 'name slug image' },
};

const getOrCreateWishlist = async (userId) => {
  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: userId, products: [] });
  }
  return wishlist;
};

const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await getOrCreateWishlist(req.user._id);
  await wishlist.populate(WISHLIST_POPULATE);

  successResponse(res, {
    message: 'Wishlist retrieved successfully',
    data: { wishlist },
  });
});

const addToWishlist = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.productId);
  if (!product) {
    throw new AppError('Product not found.', 404);
  }

  const wishlist = await getOrCreateWishlist(req.user._id);
  const alreadyAdded = wishlist.products.some(
    (id) => String(id) === String(product._id)
  );

  if (!alreadyAdded) {
    wishlist.products.push(product._id);
    await wishlist.save();
  }

  await wishlist.populate(WISHLIST_POPULATE);

  successResponse(res, {
    message: alreadyAdded ? 'Product already in wishlist' : 'Product added to wishlist',
    data: { wishlist },
  });
});

const removeFromWishlist = asyncHandler(async (req, res) => {
  const wishlist = await getOrCreateWishlist(req.user._id);
  const before = wishlist.products.length;

  wishlist.products = wishlist.products.filter(
    (id) => String(id) !== String(req.params.productId)
  );

  if (wishlist.products.length === before) {
    throw new AppError('Product not found in wishlist.', 404);
  }

  await wishlist.save();
  await wishlist.populate(WISHLIST_POPULATE);

  successResponse(res, {
    message: 'Product removed from wishlist',
    data: { wishlist },
  });
});

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
};
