const express = require('express');
const {
  listProducts,
  searchProducts,
  getProductBySlug,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { authenticateAdmin, optionalAuthenticateAdmin } = require('../middleware/adminMiddleware');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();

router.get('/', optionalAuthenticateAdmin, listProducts);
router.get('/search', optionalAuthenticateAdmin, searchProducts);
router.get('/id/:id', authenticateAdmin, validateObjectId('id'), getProductById);
router.get('/:slug', getProductBySlug);

router.post('/', authenticateAdmin, createProduct);
router.put('/:id', authenticateAdmin, validateObjectId('id'), updateProduct);
router.delete('/:id', authenticateAdmin, validateObjectId('id'), deleteProduct);

module.exports = router;
