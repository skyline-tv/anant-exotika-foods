const Cart = require('../models/Cart');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { successResponse } = require('../utils/apiResponse');
const { roundMoney } = require('../services/pricingService');

const CART_POPULATE = {
  path: 'items.product',
  select: 'name slug images price stock status sku',
  populate: { path: 'category', select: 'name slug image' },
};

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

const formatCart = (cart) => {
  const items = cart.items
    .filter((item) => item.product)
    .map((item) => {
      const currentPrice = item.product.price;
      return {
        product: item.product,
        quantity: item.quantity,
        price: currentPrice,
        lineTotal: roundMoney(currentPrice * item.quantity),
      };
    });

  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));

  return {
    _id: cart._id,
    user: cart.user,
    items,
    subtotal,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    updatedAt: cart.updatedAt,
    createdAt: cart.createdAt,
  };
};

const getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  await cart.populate(CART_POPULATE);

  successResponse(res, {
    message: 'Cart retrieved successfully',
    data: { cart: formatCart(cart) },
  });
});

const addToCartItem = async (cart, productId, quantity) => {
  const qty = Number(quantity);

  if (!productId) {
    throw new AppError('Product ID is required.', 400);
  }

  if (!Number.isInteger(qty) || qty < 1) {
    throw new AppError('Quantity must be a positive integer.', 400);
  }

  const product = await Product.findById(productId);
  if (!product || !['active', 'out_of_stock'].includes(product.status)) {
    throw new AppError('Product not found.', 404);
  }

  if (product.status === 'out_of_stock' || product.stock < qty) {
    throw new AppError(`Insufficient stock for ${product.name}.`, 400);
  }

  const existing = cart.items.find(
    (item) => String(item.product) === String(product._id)
  );

  const nextQty = existing ? existing.quantity + qty : qty;
  if (nextQty > product.stock) {
    throw new AppError(`Insufficient stock for ${product.name}.`, 400);
  }

  if (existing) {
    existing.quantity = nextQty;
    existing.price = product.price;
  } else {
    cart.items.push({
      product: product._id,
      quantity: qty,
      price: product.price,
    });
  }

  return cart;
};

const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  const cart = await getOrCreateCart(req.user._id);
  await addToCartItem(cart, productId, quantity);
  await cart.save();
  await cart.populate(CART_POPULATE);

  successResponse(res, {
    message: 'Item added to cart',
    data: { cart: formatCart(cart) },
  });
});

const mergeCart = asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const cart = await getOrCreateCart(req.user._id);

  for (const item of items) {
    const productId = item.productId || item.product;
    const quantity = Number(item.quantity) || 1;
    if (!productId) continue;
    try {
      await addToCartItem(cart, productId, quantity);
    } catch {
      // Skip unavailable guest-cart items so login never destroys a valid server cart.
    }
  }

  await cart.save();
  await cart.populate(CART_POPULATE);

  successResponse(res, {
    message: 'Cart merged successfully',
    data: { cart: formatCart(cart) },
  });
});

const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const qty = Number(quantity);

  if (!Number.isInteger(qty) || qty < 0) {
    throw new AppError('Quantity must be a non-negative integer.', 400);
  }

  const cart = await getOrCreateCart(req.user._id);
  const item = cart.items.find(
    (entry) => String(entry.product) === String(req.params.productId)
  );

  if (!item) {
    throw new AppError('Item not found in cart.', 404);
  }

  if (qty === 0) {
    cart.items = cart.items.filter(
      (entry) => String(entry.product) !== String(req.params.productId)
    );
  } else {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      throw new AppError('Product not found.', 404);
    }
    if (qty > product.stock) {
      throw new AppError('Insufficient stock for this product.', 400);
    }
    item.quantity = qty;
    item.price = product.price;
  }

  await cart.save();
  await cart.populate(CART_POPULATE);

  successResponse(res, {
    message: 'Cart updated successfully',
    data: { cart: formatCart(cart) },
  });
});

const removeCartItem = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  const before = cart.items.length;

  cart.items = cart.items.filter(
    (item) => String(item.product) !== String(req.params.productId)
  );

  if (cart.items.length === before) {
    throw new AppError('Item not found in cart.', 404);
  }

  await cart.save();
  await cart.populate(CART_POPULATE);

  successResponse(res, {
    message: 'Item removed from cart',
    data: { cart: formatCart(cart) },
  });
});

const clearCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  cart.items = [];
  await cart.save();

  successResponse(res, {
    message: 'Cart cleared successfully',
    data: { cart: formatCart(cart) },
  });
});

module.exports = {
  getCart,
  addToCart,
  mergeCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};
