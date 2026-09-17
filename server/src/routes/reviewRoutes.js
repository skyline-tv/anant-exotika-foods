const express = require('express');
const {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  getAdminReviews,
  moderateReview,
  adminDeleteReview,
} = require('../controllers/reviewController');
const { authenticateUser } = require('../middleware/authMiddleware');
const { authenticateAdmin } = require('../middleware/adminMiddleware');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();
const adminRouter = express.Router();

router.get(
  '/product/:productId',
  validateObjectId('productId'),
  getProductReviews
);
router.post('/', authenticateUser, createReview);
router.put('/:id', authenticateUser, validateObjectId('id'), updateReview);
router.delete('/:id', authenticateUser, validateObjectId('id'), deleteReview);

adminRouter.get('/', authenticateAdmin, getAdminReviews);
adminRouter.put('/:id', authenticateAdmin, validateObjectId('id'), moderateReview);
adminRouter.delete('/:id', authenticateAdmin, validateObjectId('id'), adminDeleteReview);

module.exports = {
  router,
  adminRouter,
};
