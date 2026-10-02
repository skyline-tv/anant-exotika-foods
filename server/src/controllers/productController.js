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
const { normalizeHamper } = require('../services/hamperService');

const PUBLIC_PRODUCT_FILTER = { status: { $in: ['active', 'out_of_stock'] } };
const PRODUCT_POPULATE = [
  { path: 'category', select: 'name slug image' },
  { path: 'categories', select: 'name slug image' },
  { path: 'subCategory', select: 'name slug image' },
  { path: 'slots.products', select: 'name slug price stock status images sku' },
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

  let categoryId = null;
  if (query.category) {
    const categoryFilter = [{ slug: query.category }];
    if (mongoose.isValidObjectId(query.category)) {
      categoryFilter.push({ _id: query.category });
    }

    const category = await Category.findOne({ $or: categoryFilter }).select('_id');
    categoryId = category ? category._id : null;
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

  const personalized = parseBoolean(query.isPersonalizedHamper);
  if (personalized === true) filter.isPersonalizedHamper = true;
  if (personalized === false) filter.isPersonalizedHamper = { $ne: true };

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

  if (query.category) {
    const membership = categoryId
      ? {
          $or: [
            { category: categoryId },
            { categories: categoryId },
            { subCategory: categoryId },
          ],
        }
      : { category: null };
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, membership];
      delete filter.$or;
    } else {
      Object.assign(filter, membership);
    }
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
      return { isFeatured: -1, displayOrder: 1, createdAt: -1 };
    case 'manual':
      return { displayOrder: 1, createdAt: -1 };
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

const normalizeCategorySelection = async (body) => {
  const raw = [];
  if (Array.isArray(body.categories)) raw.push(...body.categories);
  if (body.category) raw.push(body.category);
  if (body.subCategory) raw.push(body.subCategory);

  const ids = [];
  raw.forEach((value) => {
    const id = String(value?._id || value || '').trim();
    if (mongoose.isValidObjectId(id) && !ids.includes(id)) ids.push(id);
  });

  if (!ids.length) {
    throw new AppError('Select at least one category.', 400);
  }

  const found = await Category.find({ _id: { $in: ids } }).select('_id');
  if (found.length !== ids.length) {
    throw new AppError('One or more categories were not found.', 400);
  }

  body.categories = ids;
  body.category = ids[0];
  if (!ids.includes(String(body.subCategory || ''))) {
    body.subCategory = null;
  }
};

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
  await normalizeHamper(req.body);
  await normalizeCategorySelection(req.body);
  const { name, sku, price } = req.body;

  if (!name || !sku || price === undefined) {
    throw new AppError('Name, SKU and selling rate are required.', 400);
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
    'categories',
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
    'isPersonalizedHamper',
    'packaging',
    'slots',
    'displayOrder',
    'status',
    'seoTitle',
    'seoDescription',
  ];

  await normalizeHamper(req.body);

  if (req.body.category !== undefined || req.body.categories !== undefined || req.body.subCategory !== undefined) {
    await normalizeCategorySelection(req.body);
  }

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) {
      if (field === 'images') {
        product[field] = normalizeProductImages(req.body[field]);
      } else {
        product[field] = req.body[field];
      }
    }
  });

  await product.save();
  await product.populate(PRODUCT_POPULATE);

  successResponse(res, {
    message: 'Product updated successfully',
    data: { product },
  });
});

const BULK_PRODUCT_LIMIT = 200;

const parseBulkNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  const amount = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(amount) ? amount : NaN;
};

const parseBulkBoolean = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'y'].includes(normalized);
};

const resolveCategoryRef = (value, categories) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (mongoose.isValidObjectId(raw)) {
    return categories.find((category) => String(category._id) === raw) || null;
  }
  const slug = slugify(raw);
  const lower = raw.toLowerCase();
  return (
    categories.find((category) => category.slug === slug || category.slug === raw.toLowerCase()) ||
    categories.find((category) => category.name.trim().toLowerCase() === lower) ||
    null
  );
};

const buildBulkProduct = (row, categories) => {
  const name = String(row.name || '').trim();
  const sku = String(row.sku || '').trim().toUpperCase();
  const price = parseBulkNumber(row.sellingRate ?? row.price, NaN);
  const compareAtPrice = parseBulkNumber(row.mrp ?? row.compareAtPrice, NaN);

  if (!name) throw new AppError('Product name is required.', 400);
  if (!sku || sku === 'EXAMPLE-SKU') throw new AppError('SKU is required.', 400);
  if (!Number.isFinite(price) || price <= 0) throw new AppError('A valid selling rate is required.', 400);
  if (!Number.isFinite(compareAtPrice) || compareAtPrice <= 0) throw new AppError('A valid MRP is required.', 400);
  if (price > compareAtPrice) throw new AppError('Selling rate cannot be higher than MRP.', 400);

  const category = resolveCategoryRef(row.category, categories);
  if (!category) throw new AppError('Category was not found. Use an existing category name or slug.', 400);

  let subCategory = null;
  if (String(row.subCategory || '').trim()) {
    subCategory = resolveCategoryRef(row.subCategory, categories);
    if (!subCategory) throw new AppError('Sub-category was not found.', 400);
    const parentId = subCategory.parentCategory ? String(subCategory.parentCategory) : '';
    if (parentId && parentId !== String(category._id)) {
      throw new AppError('Sub-category does not belong to the selected category.', 400);
    }
  }

  const status = String(row.status || 'draft').trim().toLowerCase() || 'draft';
  if (!PRODUCT_STATUS.includes(status)) {
    throw new AppError(`Status must be one of: ${PRODUCT_STATUS.join(', ')}.`, 400);
  }

  const numericFields = {
    costPrice: parseBulkNumber(row.costPrice, 0),
    discount: parseBulkNumber(row.discount, 0),
    stock: parseBulkNumber(row.stock, 0),
    lowStockThreshold: parseBulkNumber(row.lowStockThreshold, 5),
    weight: parseBulkNumber(row.weight, 0),
    displayOrder: parseBulkNumber(row.displayOrder, 0),
    length: parseBulkNumber(row.length, 0),
    width: parseBulkNumber(row.width, 0),
    height: parseBulkNumber(row.height, 0),
  };
  for (const [field, value] of Object.entries(numericFields)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new AppError(`${field} must be a number that is zero or greater.`, 400);
    }
  }

  const imageUrl = String(row.imageUrl || '').trim();
  const tags = String(row.tags || '')
    .split(/[|,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);

  return {
    name,
    sku,
    price,
    compareAtPrice,
    costPrice: numericFields.costPrice,
    discount: numericFields.discount,
    category: category._id,
    categories: [category._id, ...(subCategory ? [subCategory._id] : [])],
    subCategory: subCategory?._id || null,
    shortDescription: String(row.shortDescription || '').trim(),
    description: String(row.description || '').trim(),
    brand: String(row.brand || 'ANANT EXOTIKA').trim() || 'ANANT EXOTIKA',
    tags,
    stock: numericFields.stock,
    lowStockThreshold: numericFields.lowStockThreshold,
    weight: numericFields.weight,
    dimensions: {
      length: numericFields.length,
      width: numericFields.width,
      height: numericFields.height,
      unit: String(row.dimensionUnit || 'cm').trim() || 'cm',
    },
    status,
    isFeatured: parseBulkBoolean(row.isFeatured),
    isNewArrival: parseBulkBoolean(row.isNewArrival),
    isBestSeller: parseBulkBoolean(row.isBestSeller),
    displayOrder: numericFields.displayOrder,
    seoTitle: String(row.seoTitle || '').trim(),
    seoDescription: String(row.seoDescription || '').trim(),
    images: imageUrl ? [{ url: imageUrl, altText: name, isPrimary: true }] : [],
  };
};

const bulkCreateProducts = asyncHandler(async (req, res) => {
  const rows = req.body.products;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new AppError('Add at least one product row.', 400);
  }
  if (rows.length > BULK_PRODUCT_LIMIT) {
    throw new AppError(`Import up to ${BULK_PRODUCT_LIMIT} products at a time.`, 400);
  }

  const categories = await Category.find().select('name slug parentCategory').limit(500);
  const requestedSkus = rows
    .map((row) => String(row.sku || '').trim().toUpperCase())
    .filter((sku) => sku && sku !== 'EXAMPLE-SKU');
  const existing = await Product.find({ sku: { $in: requestedSkus } }).select('sku');
  const existingSkus = new Set(existing.map((product) => product.sku));
  const seenSkus = new Set();
  const created = [];
  const errors = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] || {};
    const rowNumber = Number(row.row) || index + 2;
    const sku = String(row.sku || '').trim().toUpperCase();
    if (sku === 'EXAMPLE-SKU') continue;

    try {
      const payload = buildBulkProduct(row, categories);
      if (seenSkus.has(payload.sku)) {
        throw new AppError(`SKU ${payload.sku} is repeated in this file.`, 400);
      }
      if (existingSkus.has(payload.sku)) {
        throw new AppError(`SKU ${payload.sku} already exists.`, 400);
      }
      seenSkus.add(payload.sku);
      if (Array.isArray(payload.images)) {
        payload.images = normalizeProductImages(payload.images);
      }
      const product = await Product.create(payload);
      existingSkus.add(product.sku);
      created.push({ row: rowNumber, sku: product.sku, name: product.name, id: product._id });
    } catch (error) {
      const duplicate = error?.code === 11000;
      errors.push({
        row: rowNumber,
        sku,
        message: duplicate ? `SKU ${sku || 'in this row'} already exists.` : error.message || 'Could not create this product.',
      });
    }
  }

  successResponse(res, {
    message: created.length
      ? `${created.length} product${created.length === 1 ? '' : 's'} created.`
      : 'No products were created.',
    statusCode: created.length ? 201 : 200,
    data: {
      createdCount: created.length,
      errorCount: errors.length,
      created,
      errors,
    },
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
  bulkCreateProducts,
  updateProduct,
  deleteProduct,
};
