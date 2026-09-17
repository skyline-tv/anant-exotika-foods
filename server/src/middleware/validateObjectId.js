const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

const validateObjectId = (param = 'id') => (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params[param])) {
    return next(new AppError('Invalid ID', 400));
  }
  next();
};

module.exports = validateObjectId;
