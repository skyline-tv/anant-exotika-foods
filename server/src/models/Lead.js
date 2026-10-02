const mongoose = require('mongoose');

const OCCASIONS = [
  'Corporate Gifting',
  'Weddings',
  'Birthdays & Anniversaries',
  'Festivals & Celebrations',
  'Return Gifts',
  'Housewarming',
  'Baby Celebrations',
  'Special Moments',
];

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    occasion: { type: String, required: true, enum: OCCASIONS },
    message: { type: String, trim: true, maxlength: 400, default: '' },
  },
  { timestamps: true }
);

leadSchema.statics.OCCASIONS = OCCASIONS;

module.exports = mongoose.model('Lead', leadSchema);
