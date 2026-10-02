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

    const ids = [];
    for (const value of slot.products || []) {
      const id = String(value?._id || value || '').trim();
      if (id && !ids.includes(id)) ids.push(id);
    }
    if (!ids.length) throw new AppError(`Add at least one product to ${label}.`, 400);

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
      products: ids,
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

    const allowed = new Set((slot.products || []).map((entry) => String(entry?._id || entry)));
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
  normalizeHamper,
  resolveHamperLine,
  selectionKeyFor,
};
