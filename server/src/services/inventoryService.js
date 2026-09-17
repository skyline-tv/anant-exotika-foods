const Product = require('../models/Product');

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
    { new: true }
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
    { new: true }
  );
};

const restoreStockItems = async (items = []) => {
  for (const item of items) {
    await restoreStock(item.product, item.quantity);
  }
};

module.exports = {
  decrementStock,
  restoreStock,
  restoreStockItems,
};
