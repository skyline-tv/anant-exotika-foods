const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Cart = require('../models/Cart');
const Wishlist = require('../models/Wishlist');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { successResponse } = require('../utils/apiResponse');
const { getPagination, buildPagination } = require('../utils/pagination');
const { slugify } = require('../utils/slugify');
const { PRODUCT_STATUS } = require('../utils/constants');
const { normalizeProductImages } = require('../utils/assetUrl');

const PUBLIC_PRODUCT_FILTER = { status: { $in: ['active', 'out_of_stock'] } };
const PRODUCT_POPULATE = [
  { path: 'category', select: 'name slug image' },
  { path: 'subCategory', select: 'name slug image' },
];

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseBoolean = (value) => {
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return undefined;
};

const buildProductQuery = async (query, { isAdmin = false } = {}) => {
  const filter = isAdmin ? {} : { ...PUBLIC_PRODUCT_FILTER };

  if (query.ids) {
    const ids = String(query.ids)
      .split(',')
      .map((id) => id.trim())
      .filter((id) => mongoose.isValidObjectId(id));

    if (ids.length) {
      filter._id = { $in: ids };
    }
  }

  if (query.category) {
    const categoryFilter = [{ slug: query.category }];
    if (mongoose.isValidObjectId(query.category)) {
      categoryFilter.push({ _id: query.category });
    }

    const category = await Category.findOne({ $or: categoryFilter }).select('_id');

    if (category) {
      filter.category = category._id;
    } else {
      filter.category = null;
    }
  }

  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
  }

  const featured = parseBoolean(query.featured);
  if (featured !== undefined) filter.isFeatured = featured;

  const newArrival = parseBoolean(query.newArrival);
  if (newArrival !== undefined) filter.isNewArrival = newArrival;

  const bestSeller = parseBoolean(query.bestSeller);
  if (bestSeller !== undefined) filter.isBestSeller = bestSeller;

  if (isAdmin && query.status && PRODUCT_STATUS.includes(query.status)) {
    filter.status = query.status;
  }

  const search = query.search || query.q;
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { name: regex },
      { shortDescription: regex },
      { description: regex },
      { tags: regex },
      { sku: regex },
      { brand: regex },
    ];
  }

  return filter;
};

const getSort = (sort) => {
  switch (sort) {
    case 'price_asc':
    case 'price-asc':
      return { price: 1 };
    case 'price_desc':
    case 'price-desc':
      return { price: -1 };
    case 'oldest':
      return { createdAt: 1 };
    case 'name_asc':
    case 'name-asc':
      return { name: 1 };
    case 'featured':
      return { isFeatured: -1, createdAt: -1 };
    case 'newest':
    default:
      return { createdAt: -1 };
  }
};

const listProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const isAdmin = Boolean(req.admin);
  const filter = await buildProductQuery(req.query, { isAdmin });
  const sort = getSort(req.query.sort);

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate(PRODUCT_POPULATE)
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  successResponse(res, {
    message: 'Products retrieved successfully',
    data: {
      products,
      pagination: buildPagination({ page, limit, total }),
    },
  });
});

const searchProducts = asyncHandler(async (req, res, next) => {
  const search = req.query.search || req.query.q;
  if (!search) {
    throw new AppError('Search query is required.', 400);
  }

  req.query.search = search;
  return listProducts(req, res, next);
});

const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    slug: req.params.slug,
    ...PUBLIC_PRODUCT_FILTER,
  }).populate(PRODUCT_POPULATE);

  if (!product) {
    throw new AppError('Product not found.', 404);
  }

  successResponse(res, {
    message: 'Product retrieved successfully',
    data: { product },
  });
});

const getProductById = asyncHandler(async (req, res) => {
  const query = Product.findById(req.params.id).populate(PRODUCT_POPULATE);
  if (req.admin) {
    query.select('+costPrice');
  }

  const product = await query;
  if (!product) {
    throw new AppError('Product not found.', 404);
  }

  successResponse(res, {
    message: 'Product retrieved successfully',
    data: { product },
  });
});

const normalizePricing = (body) => {
  if (body.mrp !== undefined && body.compareAtPrice === undefined) {
    body.compareAtPrice = Number(body.mrp);
  }

  if (body.sellingRate !== undefined && body.price === undefined) {
    body.price = Number(body.sellingRate);
  }

  const selling = Number(body.price);
  const mrp = Number(body.compareAtPrice);

  if (Number.isFinite(mrp) && Number.isFinite(selling) && mrp > 0 && selling > mrp) {
    throw new AppError('Selling rate cannot be higher than MRP.', 400);
  }
};

const createProduct = asyncHandler(async (req, res) => {
  normalizePricing(req.body);
  const { name, sku, price, category } = req.body;

  if (!name || !sku || price === undefined || !category) {
    throw new AppError('Name, SKU, selling rate and category are required.', 400);
  }

  const categoryExists = await Category.findById(category);
  if (!categoryExists) {
    throw new AppError('Category not found.', 400);
  }

  if (req.body.subCategory) {
    const sub = await Category.findById(req.body.subCategory);
    if (!sub) {
      throw new AppError('Sub-category not found.', 400);
    }
  }

  if (req.body.slug) {
    req.body.slug = slugify(req.body.slug);
  }

  if (Array.isArray(req.body.tags)) {
    req.body.tags = req.body.tags.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (Array.isArray(req.body.images)) {
    req.body.images = normalizeProductImages(req.body.images);
  }

  const product = await Product.create(req.body);
  await product.populate(PRODUCT_POPULATE);

  successResponse(res, {
    message: 'Product created successfully',
    statusCode: 201,
    data: { product },
  });
});

const updateProduct = asyncHandler(async (req, res) => {
  normalizePricing(req.body);
  const product = await Product.findById(req.params.id).select('+costPrice');

  if (!product) {
    throw new AppError('Product not found.', 404);
  }

  const allowed = [
    'name',
    'slug',
    'shortDescription',
    'description',
    'category',
    'subCategory',
    'brand',
    'tags',
    'sku',
    'images',
    'price',
    'compareAtPrice',
    'costPrice',
    'discount',
    'stock',
    'lowStockThreshold',
    'weight',
    'dimensions',
    'isFeatured',
    'isNewArrival',
    'isBestSeller',
    'status',
    'seoTitle',
    'seoDescription',
  ];

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) {
      if (field === 'images') {
        product[field] = normalizeProductImages(req.body[field]);
      } else {
        product[field] = req.body[field];
      }
    }
  });

  if (product.category) {
    const categoryExists = await Category.findById(product.category);
    if (!categoryExists) {
      throw new AppError('Category not found.', 400);
    }
  }

  await product.save();
  await product.populate(PRODUCT_POPULATE);

  successResponse(res, {
    message: 'Product updated successfully',
    data: { product },
  });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new AppError('Product not found.', 404);
  }

  await product.deleteOne();

  await Promise.all([
    Cart.updateMany({}, { $pull: { items: { product: product._id } } }),
    Wishlist.updateMany({}, { $pull: { products: product._id } }),
  ]);

  successResponse(res, {
    message: 'Product deleted successfully',
    data: {},
  });
});

module.exports = {
  listProducts,
  searchProducts,
  getProductBySlug,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
