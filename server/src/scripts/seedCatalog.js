const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env'), quiet: true });

const mongoose = require('mongoose');
const connectDatabase = require('../config/database');
const Category = require('../models/Category');
const Product = require('../models/Product');

const CATEGORIES = [
  {
    name: 'Almond',
    slug: 'almond',
    description: 'Premium almonds, including rose-flavoured and classic selections.',
    displayOrder: 1,
  },
  {
    name: 'Cashew',
    slug: 'cashew',
    description: 'Handpicked cashews in classic and flavoured packs.',
    displayOrder: 2,
  },
];

const PRODUCTS = [
  {
    name: 'Rose Almond 100g',
    sku: 'ALM-ROSE-100',
    categorySlug: 'almond',
    shortDescription: 'Delicate rose-scented almonds in a 100g gift pack.',
    description:
      'Premium almonds infused with natural rose flavour. A refined 100g pack, ideal for gifting and everyday indulgence.',
    price: 499,
    compareAtPrice: 599,
    stock: 40,
    isFeatured: true,
    isNewArrival: true,
    tags: ['almond', 'rose', '100g'],
    weight: 100,
  },
  {
    name: 'Almond 100g',
    sku: 'ALM-PLN-100',
    categorySlug: 'almond',
    shortDescription: 'Classic premium almonds in a 100g pack.',
    description: 'Carefully selected almonds, packed fresh in a convenient 100g pouch.',
    price: 399,
    compareAtPrice: 449,
    stock: 50,
    isFeatured: false,
    isNewArrival: false,
    tags: ['almond', '100g'],
    weight: 100,
  },
  {
    name: 'Salted Almond 100g',
    sku: 'ALM-SLT-100',
    categorySlug: 'almond',
    shortDescription: 'Lightly salted premium almonds, 100g.',
    description: 'Crunchy almonds with a light salt finish, packed in 100g.',
    price: 429,
    compareAtPrice: 499,
    stock: 35,
    isBestSeller: true,
    tags: ['almond', 'salted', '100g'],
    weight: 100,
  },
  {
    name: 'Cashew 100g',
    sku: 'CSH-PLN-100',
    categorySlug: 'cashew',
    shortDescription: 'Whole premium cashews in a 100g pack.',
    description: 'Naturally sweet, whole cashews selected for quality and packed in 100g.',
    price: 449,
    compareAtPrice: 529,
    stock: 45,
    isFeatured: true,
    tags: ['cashew', '100g'],
    weight: 100,
  },
  {
    name: 'Salted Cashew 100g',
    sku: 'CSH-SLT-100',
    categorySlug: 'cashew',
    shortDescription: 'Roasted salted cashews, 100g.',
    description: 'Roasted cashews with a balanced salt finish, packed in 100g.',
    price: 469,
    compareAtPrice: 549,
    stock: 40,
    isNewArrival: true,
    tags: ['cashew', 'salted', '100g'],
    weight: 100,
  },
  {
    name: 'Honey Cashew 100g',
    sku: 'CSH-HNY-100',
    categorySlug: 'cashew',
    shortDescription: 'Honey-glazed cashews in a 100g pack.',
    description: 'Premium cashews glazed with honey for a rich, festive flavour. 100g pack.',
    price: 529,
    compareAtPrice: 629,
    stock: 30,
    isBestSeller: true,
    tags: ['cashew', 'honey', '100g'],
    weight: 100,
  },
];

const seed = async () => {
  await connectDatabase();

  await Product.deleteMany({ sku: /^FLOW/i });
  await Product.deleteMany({ slug: null });
  await Category.deleteMany({ slug: /^flow-category-/i });

  const categoryMap = {};

  for (const item of CATEGORIES) {
    let category = await Category.findOne({ slug: item.slug });
    if (category) {
      Object.assign(category, item, { isActive: true, image: category.image || item.image || '' });
      await category.save();
    } else {
      category = await Category.create({ ...item, isActive: true });
    }
    categoryMap[item.slug] = category;
    console.log(`Category ready: ${category.name}`);
  }

  for (const item of PRODUCTS) {
    const category = categoryMap[item.categorySlug];
    const { categorySlug, ...fields } = item;
    const payload = {
      ...fields,
      category: category._id,
      brand: 'ANANT EXOTIKA',
      status: 'active',
      dimensions: { unit: 'g' },
    };

    let product = await Product.findOne({ sku: item.sku });
    if (product) {
      Object.assign(product, payload);
      await product.save();
    } else {
      product = await Product.create(payload);
    }

    console.log(`Product ready: ${product.name}`);
  }

  await mongoose.connection.close();
  console.log('Catalog seeded.');
};

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
