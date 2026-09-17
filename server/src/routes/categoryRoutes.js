const express = require('express');
const {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { authenticateAdmin } = require('../middleware/adminMiddleware');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();

router.get('/', getCategories);
router.get('/:slug', getCategoryBySlug);

router.post('/', authenticateAdmin, createCategory);
router.put('/:id', authenticateAdmin, validateObjectId('id'), updateCategory);
router.delete('/:id', authenticateAdmin, validateObjectId('id'), deleteCategory);

module.exports = router;
