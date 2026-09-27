const express = require('express');
const {
  createOrder,
  getMyOrders,
  getMyOrderById,
  getAdminOrders,
  getAdminOrderById,
  updateOrderStatus,
  retryOrderShipment,
  generateShipmentAwb,
  requestShipmentPickup,
  generateShipmentLabel,
  cancelShipment,
  syncOrderTracking,
} = require('../controllers/orderController');
const { refundOrderPayment } = require('../controllers/paymentController');
const { authenticateUser } = require('../middleware/authMiddleware');
const { authenticateAdmin } = require('../middleware/adminMiddleware');
const validateObjectId = require('../middleware/validateObjectId');
const { orderLimiter, limitSearch } = require('../middleware/rateLimits');

const router = express.Router();
const adminRouter = express.Router();

router.post('/', authenticateUser, orderLimiter, createOrder);
router.get('/my-orders', authenticateUser, getMyOrders);
router.get('/:id', authenticateUser, validateObjectId('id'), getMyOrderById);

adminRouter.get('/', authenticateAdmin, limitSearch, getAdminOrders);
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
  '/:id/shipment/awb',
  authenticateAdmin,
  validateObjectId('id'),
  generateShipmentAwb
);
adminRouter.post(
  '/:id/shipment/pickup',
  authenticateAdmin,
  validateObjectId('id'),
  requestShipmentPickup
);
adminRouter.post(
  '/:id/shipment/label',
  authenticateAdmin,
  validateObjectId('id'),
  generateShipmentLabel
);
adminRouter.post(
  '/:id/shipment/cancel',
  authenticateAdmin,
  validateObjectId('id'),
  cancelShipment
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
