const express = require('express');
const {
  createOrder,
  getMyOrders,
  getMyOrderById,
  getAdminOrders,
  getAdminOrderById,
  updateOrderStatus,
} = require('../controllers/orderController');
const { authenticateUser } = require('../middleware/authMiddleware');
const { authenticateAdmin } = require('../middleware/adminMiddleware');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();
const adminRouter = express.Router();

router.post('/', authenticateUser, createOrder);
router.get('/my-orders', authenticateUser, getMyOrders);
router.get('/:id', authenticateUser, validateObjectId('id'), getMyOrderById);

adminRouter.get('/', authenticateAdmin, getAdminOrders);
adminRouter.get('/:id', authenticateAdmin, validateObjectId('id'), getAdminOrderById);
adminRouter.put(
  '/:id/status',
  authenticateAdmin,
  validateObjectId('id'),
  updateOrderStatus
);

module.exports = {
  router,
  adminRouter,
};
