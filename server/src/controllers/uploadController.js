const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { successResponse } = require('../utils/apiResponse');
const { mapUploadedFiles } = require('../services/uploadService');

const uploadProductImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new AppError('Please upload at least one image.', 400);
  }

  const images = mapUploadedFiles(req, req.files);

  successResponse(res, {
    message: 'Images uploaded successfully',
    statusCode: 201,
    data: { images },
  });
});

module.exports = {
  uploadProductImages,
};
