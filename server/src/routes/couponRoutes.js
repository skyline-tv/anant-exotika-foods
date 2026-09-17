const express = require('express');
const {
  validateCoupon,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} = require('../controllers/couponController');
const { authenticateUser } = require('../middleware/authMiddleware');
const { authenticateAdmin } = require('../middleware/adminMiddleware');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();
const adminRouter = express.Router();

router.post('/validate', authenticateUser, validateCoupon);

adminRouter.get('/', authenticateAdmin, getCoupons);
adminRouter.post('/', authenticateAdmin, createCoupon);
adminRouter.put('/:id', authenticateAdmin, validateObjectId('id'), updateCoupon);
adminRouter.delete('/:id', authenticateAdmin, validateObjectId('id'), deleteCoupon);

module.exports = {
  router,
  adminRouter,
};
