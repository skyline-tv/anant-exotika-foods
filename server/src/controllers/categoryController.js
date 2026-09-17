const Category = require('../models/Category');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { successResponse } = require('../utils/apiResponse');
const { slugify } = require('../utils/slugify');
const { toStoredAssetPath } = require('../utils/assetUrl');

const getCategories = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.active !== 'false') {
    filter.isActive = true;
  }

  const categories = await Category.find(filter)
    .populate('parentCategory', 'name slug')
    .sort({ displayOrder: 1, name: 1 });

  successResponse(res, {
    message: 'Categories retrieved successfully',
    data: { categories },
  });
});

const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    slug: req.params.slug,
    isActive: true,
  }).populate('parentCategory', 'name slug');

  if (!category) {
    throw new AppError('Category not found.', 404);
  }

  successResponse(res, {
    message: 'Category retrieved successfully',
    data: { category },
  });
});

const createCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name) {
    throw new AppError('Category name is required.', 400);
  }

  if (req.body.parentCategory) {
    const parent = await Category.findById(req.body.parentCategory);
    if (!parent) {
      throw new AppError('Parent category not found.', 400);
    }
  }

  if (req.body.slug) {
    req.body.slug = slugify(req.body.slug);
  }

  if (req.body.image) {
    req.body.image = toStoredAssetPath(req.body.image);
  }

  const category = await Category.create(req.body);
  await category.populate('parentCategory', 'name slug');

  successResponse(res, {
    message: 'Category created successfully',
    statusCode: 201,
    data: { category },
  });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    throw new AppError('Category not found.', 404);
  }

  const allowed = [
    'name',
    'slug',
    'description',
    'image',
    'parentCategory',
    'isActive',
    'displayOrder',
    'seoTitle',
    'seoDescription',
  ];

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) {
      if (field === 'image' && req.body[field]) {
        category[field] = toStoredAssetPath(req.body[field]);
      } else {
        category[field] = req.body[field];
      }
    }
  });

  if (category.parentCategory && String(category.parentCategory) === String(category._id)) {
    throw new AppError('A category cannot be its own parent.', 400);
  }

  await category.save();
  await category.populate('parentCategory', 'name slug');

  successResponse(res, {
    message: 'Category updated successfully',
    data: { category },
  });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    throw new AppError('Category not found.', 404);
  }

  const [childCount, productCount] = await Promise.all([
    Category.countDocuments({ parentCategory: category._id }),
    Product.countDocuments({
      $or: [{ category: category._id }, { subCategory: category._id }],
    }),
  ]);

  if (childCount > 0) {
    throw new AppError('Cannot delete a category that has sub-categories.', 400);
  }

  if (productCount > 0) {
    throw new AppError('Cannot delete a category that has products.', 400);
  }

  await category.deleteOne();

  successResponse(res, {
    message: 'Category deleted successfully',
    data: {},
  });
});

module.exports = {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
};
