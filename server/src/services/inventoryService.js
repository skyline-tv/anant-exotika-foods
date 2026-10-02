const Product = require('../models/Product');
const AppError = require('../utils/AppError');

const decrementStock = async (productId, quantity) => {
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) return null;

  return Product.findOneAndUpdate(
    {
      _id: productId,
      status: { $in: ['active'] },
      stock: { $gte: qty },
    },
    [
      {
        $set: {
          stock: { $subtract: ['$stock', qty] },
          status: {
            $cond: [{ $lte: [{ $subtract: ['$stock', qty] }, 0] }, 'out_of_stock', '$status'],
          },
        },
      },
    ],
    { returnDocument: 'after', updatePipeline: true }
  );
};

const restoreStock = async (productId, quantity) => {
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) return null;

  return Product.findOneAndUpdate(
    { _id: productId },
    [
      {
        $set: {
          stock: { $add: ['$stock', qty] },
          status: {
            $cond: [
              { $and: [{ $eq: ['$status', 'out_of_stock'] }, { $gt: [{ $add: ['$stock', qty] }, 0] }] },
              'active',
              '$status',
            ],
          },
        },
      },
    ],
    { returnDocument: 'after', updatePipeline: true }
  );
};

const restoreStockItems = async (items = []) => {
  for (const item of items) {
    await restoreStock(item.product, item.quantity);
  }
};

const stockMovesForItem = (item) => {
  const moves = [{ product: item.product, quantity: item.quantity, name: item.name }];
  for (const selection of item.selections || []) {
    if (!selection?.product) continue;
    moves.push({
      product: selection.product?._id || selection.product,
      quantity: item.quantity,
      name: selection.name || item.name,
    });
  }
  return moves;
};

const decrementOrderStock = async (items = []) => {
  const decremented = [];
  try {
    for (const item of items) {
      for (const move of stockMovesForItem(item)) {
        const updated = await decrementStock(move.product, move.quantity);
        if (!updated) {
          throw new AppError(`Insufficient stock for ${move.name}.`, 409);
        }
        decremented.push(move);
      }
    }
    return decremented;
  } catch (error) {
    await restoreStockItems(decremented);
    throw error;
  }
};

const restoreOrderStock = async (items = []) => {
  for (const item of items) {
    for (const move of stockMovesForItem(item)) {
      await restoreStock(move.product, move.quantity);
    }
  }
};

module.exports = {
  decrementStock,
  restoreStock,
  restoreStockItems,
  decrementOrderStock,
  restoreOrderStock,
};
