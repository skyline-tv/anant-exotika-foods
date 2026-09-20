const express = require('express');
const {
  getPaymentConfig,
  verifyPayment,
  failPayment,
  handleRazorpayWebhook,
} = require('../controllers/paymentController');
const { authenticateUser } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/config', getPaymentConfig);
router.post('/verify', authenticateUser, verifyPayment);
router.post('/fail', authenticateUser, failPayment);
router.post('/webhook', handleRazorpayWebhook);

module.exports = router;
