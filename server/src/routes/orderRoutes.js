const express = require('express');
const {
  createOrder,
  getMyOrders,
  getMyOrderById,
  getAdminOrders,
  getAdminOrderById,
  updateOrderStatus,
  retryOrderShipment,
  syncOrderTracking,
} = require('../controllers/orderController');
const { refundOrderPayment } = require('../controllers/paymentController');
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
adminRouter.post(
  '/:id/shipment/retry',
  authenticateAdmin,
  validateObjectId('id'),
  retryOrderShipment
);
adminRouter.post(
  '/:id/shipment/sync',
  authenticateAdmin,
  validateObjectId('id'),
  syncOrderTracking
);
adminRouter.post(
  '/:id/refund',
  authenticateAdmin,
  validateObjectId('id'),
  refundOrderPayment
);

module.exports = {
  router,
  adminRouter,
};
