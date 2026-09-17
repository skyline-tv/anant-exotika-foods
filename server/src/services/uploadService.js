const path = require('path');
const { getUploadRoot } = require('../middleware/uploadMiddleware');
const { toPublicAssetUrl } = require('../utils/assetUrl');

const buildFileUrl = (req, filename) => `/uploads/products/${filename}`;

const mapUploadedFiles = (req, files = []) => {
  return files.map((file) => {
    const url = buildFileUrl(req, file.filename);
    return {
      url,
      publicUrl: toPublicAssetUrl(url, req),
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: path.join(getUploadRoot(), 'products', file.filename),
    };
  });
};

module.exports = {
  buildFileUrl,
  mapUploadedFiles,
};
