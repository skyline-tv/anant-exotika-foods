const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { successResponse } = require('../utils/apiResponse');
const { getPagination, buildPagination } = require('../utils/pagination');

const hasPurchasedProduct = async (userId, productId) => {
  return Order.exists({
    user: userId,
    orderStatus: { $in: ['delivered'] },
    'items.product': productId,
  });
};

const getProductReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { product: req.params.productId, isApproved: true };

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments(filter),
  ]);

  successResponse(res, {
    message: 'Reviews retrieved successfully',
    data: {
      reviews,
      pagination: buildPagination({ page, limit, total }),
    },
  });
});

const createReview = asyncHandler(async (req, res) => {
  const { productId, rating, title, comment } = req.body;

  if (!productId || !rating) {
    throw new AppError('Product ID and rating are required.', 400);
  }

  const numericRating = Number(rating);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    throw new AppError('Rating must be an integer between 1 and 5.', 400);
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError('Product not found.', 404);
  }

  const purchased = await hasPurchasedProduct(req.user._id, product._id);
  if (!purchased) {
    throw new AppError('You can only review products you have purchased.', 403);
  }

  const existing = await Review.findOne({
    user: req.user._id,
    product: product._id,
  });
  if (existing) {
    throw new AppError('You have already reviewed this product.', 409);
  }

  const review = await Review.create({
    user: req.user._id,
    product: product._id,
    rating: numericRating,
    title: title || '',
    comment: comment || '',
    isApproved: false,
  });

  successResponse(res, {
    message: 'Review submitted successfully and is pending approval',
    statusCode: 201,
    data: { review },
  });
});

const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!review) {
    throw new AppError('Review not found.', 404);
  }

  if (req.body.rating !== undefined) {
    const numericRating = Number(req.body.rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      throw new AppError('Rating must be an integer between 1 and 5.', 400);
    }
    review.rating = numericRating;
  }

  if (req.body.title !== undefined) review.title = req.body.title;
  if (req.body.comment !== undefined) review.comment = req.body.comment;
  review.isApproved = false;

  await review.save();

  successResponse(res, {
    message: 'Review updated successfully and is pending approval',
    data: { review },
  });
});

const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    throw new AppError('Review not found.', 404);
  }

  const isOwner = String(review.user) === String(req.user._id);
  if (!isOwner) {
    throw new AppError('You can only delete your own review.', 403);
  }

  await review.deleteOne();

  successResponse(res, {
    message: 'Review deleted successfully',
    data: {},
  });
});

const getAdminReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};

  if (req.query.approved === 'true') filter.isApproved = true;
  if (req.query.approved === 'false') filter.isApproved = false;
  if (req.query.productId) filter.product = req.query.productId;

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate('user', 'name email')
      .populate('product', 'name slug sku')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments(filter),
  ]);

  successResponse(res, {
    message: 'Reviews retrieved successfully',
    data: {
      reviews,
      pagination: buildPagination({ page, limit, total }),
    },
  });
});

const moderateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    throw new AppError('Review not found.', 404);
  }

  if (req.body.isApproved === undefined) {
    throw new AppError('isApproved is required.', 400);
  }

  review.isApproved = Boolean(req.body.isApproved);
  await review.save();

  successResponse(res, {
    message: review.isApproved ? 'Review approved' : 'Review unapproved',
    data: { review },
  });
});

const adminDeleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    throw new AppError('Review not found.', 404);
  }

  await review.deleteOne();

  successResponse(res, {
    message: 'Review deleted successfully',
    data: {},
  });
});

module.exports = {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  getAdminReviews,
  moderateReview,
  adminDeleteReview,
};
