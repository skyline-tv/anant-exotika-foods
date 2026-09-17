const express = require('express');
const {
  getPaymentConfig,
  verifyPayment,
  failPayment,
} = require('../controllers/paymentController');
const { authenticateUser } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/config', getPaymentConfig);
router.post('/verify', authenticateUser, verifyPayment);
router.post('/fail', authenticateUser, failPayment);

module.exports = router;
