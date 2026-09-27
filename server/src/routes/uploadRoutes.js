const express = require('express');
const { uploadProductImages: handleUpload } = require('../controllers/uploadController');
const { uploadProductImages } = require('../middleware/uploadMiddleware');
const { authenticateAdmin } = require('../middleware/adminMiddleware');
const { uploadLimiter } = require('../middleware/rateLimits');

const router = express.Router();

router.post('/product-images', authenticateAdmin, uploadLimiter, uploadProductImages, handleUpload);

module.exports = router;
