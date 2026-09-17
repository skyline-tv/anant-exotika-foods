const express = require('express');
const { uploadProductImages: handleUpload } = require('../controllers/uploadController');
const { uploadProductImages } = require('../middleware/uploadMiddleware');
const { authenticateAdmin } = require('../middleware/adminMiddleware');

const router = express.Router();

router.post('/product-images', authenticateAdmin, uploadProductImages, handleUpload);

module.exports = router;
