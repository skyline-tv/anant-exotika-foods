const express = require('express');
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} = require('../controllers/wishlistController');
const { authenticateUser } = require('../middleware/authMiddleware');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();

router.use(authenticateUser);

router.get('/', getWishlist);
router.post('/:productId', validateObjectId('productId'), addToWishlist);
router.delete('/:productId', validateObjectId('productId'), removeFromWishlist);

module.exports = router;
