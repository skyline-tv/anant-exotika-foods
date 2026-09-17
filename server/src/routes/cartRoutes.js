const express = require('express');
const {
  getCart,
  addToCart,
  mergeCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require('../controllers/cartController');
const { authenticateUser } = require('../middleware/authMiddleware');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();

router.use(authenticateUser);

router.get('/', getCart);
router.post('/', addToCart);
router.post('/merge', mergeCart);
router.delete('/', clearCart);
router.put('/:productId', validateObjectId('productId'), updateCartItem);
router.delete('/:productId', validateObjectId('productId'), removeCartItem);

module.exports = router;
