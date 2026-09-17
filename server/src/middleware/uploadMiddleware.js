const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const AppError = require('../utils/AppError');

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

const getUploadRoot = () => {
  const configured = process.env.UPLOAD_PATH || 'uploads';
  if (path.isAbsolute(configured)) {
    return configured;
  }
  return path.join(__dirname, '..', configured);
};

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(getUploadRoot(), 'products');
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    cb(null, `${unique}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = ALLOWED_MIME_TYPES.has(file.mimetype);
  const extOk = ALLOWED_EXTENSIONS.has(ext);

  if (!mimeOk || !extOk) {
    return cb(
      new AppError(
        'Only JPEG, PNG, WebP and GIF image files are allowed.',
        400
      )
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10,
  },
});

const uploadProductImages = upload.array('images', 10);

module.exports = {
  uploadProductImages,
  getUploadRoot,
};
