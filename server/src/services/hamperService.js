const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const AppError = require('../utils/AppError');

const PERSONALIZED_CATEGORY = {
  name: 'Personalized Gift Hampers',
  slug: 'personalized-gift-hampers',
  description: 'Pre-designed hampers you can personalize from the choices in each slot.',
};

const selectionKeyFor = (selections = []) =>
  selections
    .map((selection) => `${selection.slotLabel}:${selection.product?._id || selection.product}`)
    .sort()
    .join('|');

const slotCategoryIds = (slot) => {
  const ids = [];
  const add = (value) => {
    const id = String(value?._id || value || '').trim();
    if (mongoose.isValidObjectId(id) && !ids.includes(id)) ids.push(id);
  };
  if (Array.isArray(slot?.categories)) slot.categories.forEach(add);
  add(slot?.category);
  return ids;
};

const productsInCategories = (categoryIds) =>
  Product.find({
    isPersonalizedHamper: { $ne: true },
    status: { $in: ['active', 'out_of_stock'] },
    $or: [
      { category: { $in: categoryIds } },
      { categories: { $in: categoryIds } },
      { subCategory: { $in: categoryIds } },
    ],
  })
    .select('name slug price stock status images sku')
    .sort({ name: 1 });

const productsInCategory = (categoryId) => productsInCategories([categoryId]);

const hydrateHamperSlots = async (product) => {
  if (!product?.isPersonalizedHamper || !Array.isArray(product.slots)) return product;

  for (const slot of product.slots) {
    const categoryIds = slotCategoryIds(slot);
    if (!categoryIds.length) continue;
    const fromCategories = await productsInCategories(categoryIds);
    const seen = new Set(fromCategories.map((item) => String(item._id)));
    const extras = (slot.products || []).filter((item) => !seen.has(String(item?._id || item)));
    slot.products = [...fromCategories, ...extras];
  }

  return product;
};

const ensurePersonalizedCategory = async () => {
  let category = await Category.findOne({ slug: PERSONALIZED_CATEGORY.slug });
  if (!category) {
    category = await Category.create(PERSONALIZED_CATEGORY);
  }
  return category;
};

const normalizeHamper = async (body) => {
  const enabled = body.isPersonalizedHamper === true || body.isPersonalizedHamper === 'true';
  if (!enabled) {
    if (body.isPersonalizedHamper === false || body.isPersonalizedHamper === 'false') {
      body.isPersonalizedHamper = false;
      body.slots = [];
      body.packaging = '';
    }
    return;
  }

  const slots = Array.isArray(body.slots) ? body.slots : [];
  if (!slots.length) {
    throw new AppError('Add at least one selection slot.', 400);
  }

  const labels = new Set();
  const normalized = [];
  for (const slot of slots) {
    const label = String(slot?.label || '').trim();
    if (!label) throw new AppError('Each slot needs a name.', 400);
    if (labels.has(label.toLowerCase())) throw new AppError('Slot names must be unique.', 400);
    labels.add(label.toLowerCase());

    const categoryIds = slotCategoryIds(slot);
    const manualIds = [];
    for (const value of slot.products || []) {
      const id = String(value?._id || value || '').trim();
      if (mongoose.isValidObjectId(id) && !manualIds.includes(id)) manualIds.push(id);
    }

    const fromCategories = categoryIds.length ? await productsInCategories(categoryIds) : [];
    if (categoryIds.length) {
      const categories = await Category.find({ _id: { $in: categoryIds } }).select('_id');
      if (categories.length !== categoryIds.length) {
        throw new AppError(`A category for ${label} was not found.`, 400);
      }
      if (!fromCategories.length && !manualIds.length) {
        throw new AppError(`Add products to the selected categories for ${label}.`, 400);
      }
    }

    const ids = fromCategories.map((item) => String(item._id));
    manualIds.forEach((id) => {
      if (!ids.includes(id)) ids.push(id);
    });
    if (!ids.length) throw new AppError(`Add a category or at least one product to ${label}.`, 400);

    const found = await Product.find({
      _id: { $in: ids },
      isPersonalizedHamper: { $ne: true },
      status: { $in: ['active', 'out_of_stock'] },
    }).select('_id');
    if (found.length !== ids.length) {
      throw new AppError(`Some products in ${label} cannot be used in a hamper.`, 400);
    }

    normalized.push({
      label,
      required: slot.required !== false && slot.required !== 'false',
      category: categoryIds[0] || null,
      categories: categoryIds,
      products: manualIds,
    });
  }

  body.isPersonalizedHamper = true;
  body.packaging = String(body.packaging || '').trim();
  body.slots = normalized;

  const category = await ensurePersonalizedCategory();
  const categoryIds = [];
  for (const value of [...(body.categories || []), body.category, category._id]) {
    const id = String(value?._id || value || '').trim();
    if (id && !categoryIds.includes(id)) categoryIds.push(id);
  }
  body.categories = categoryIds;
  body.category = categoryIds[0];
};

const resolveHamperLine = async (product, quantity, selections = []) => {
  if (!product?.isPersonalizedHamper) {
    return { selectionKey: '', selections: [] };
  }

  const incoming = Array.isArray(selections) ? selections : [];
  const normalized = [];

  for (const slot of product.slots || []) {
    const match = incoming.find((entry) => String(entry?.slotLabel || '').trim() === slot.label);
    const productId = String(match?.product?._id || match?.product || '').trim();
    if (!productId) {
      if (slot.required !== false) {
        throw new AppError(`Select an option for ${slot.label}.`, 400);
      }
      continue;
    }

    const categoryIds = slotCategoryIds(slot);
    const fromCategories = categoryIds.length ? await productsInCategories(categoryIds) : [];
    const allowedProducts = [...fromCategories, ...(slot.products || [])];
    const allowed = new Set(allowedProducts.map((entry) => String(entry?._id || entry)));
    if (!allowed.has(productId)) {
      throw new AppError(`${slot.label} includes a product that is not allowed.`, 400);
    }

    const chosen = await Product.findById(productId).select('name sku status stock isPersonalizedHamper');
    if (
      !chosen ||
      chosen.isPersonalizedHamper ||
      chosen.status !== 'active' ||
      Number(chosen.stock) < quantity
    ) {
      throw new AppError(`The selected option for ${slot.label} is unavailable.`, 400);
    }

    normalized.push({
      slotLabel: slot.label,
      product: chosen._id,
      name: chosen.name,
      sku: chosen.sku,
    });
  }

  return {
    selectionKey: selectionKeyFor(normalized),
    selections: normalized,
  };
};

module.exports = {
  PERSONALIZED_CATEGORY,
  ensurePersonalizedCategory,
  hydrateHamperSlots,
  normalizeHamper,
  resolveHamperLine,
  selectionKeyFor,
};
