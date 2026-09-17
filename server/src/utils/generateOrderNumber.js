const Counter = require('../models/Counter');

const generateOrderNumber = async () => {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { name: `order-${year}` },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  );

  const padded = String(counter.seq).padStart(6, '0');
  return `AE-${year}-${padded}`;
};

module.exports = generateOrderNumber;
