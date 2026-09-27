const express = require('express');
const {
  getPaymentConfig,
  verifyPayment,
  failPayment,
  handleRazorpayWebhook,
} = require('../controllers/paymentController');
const { authenticateUser } = require('../middleware/authMiddleware');
const { paymentLimiter } = require('../middleware/rateLimits');

const router = express.Router();

router.get('/config', getPaymentConfig);
router.post('/verify', authenticateUser, paymentLimiter, verifyPayment);
router.post('/fail', authenticateUser, paymentLimiter, failPayment);
router.post('/webhook', handleRazorpayWebhook);

module.exports = router;
