const express = require('express');
const {
  getShippingConfig,
  checkPincode,
  quoteCheckoutShipping,
  handleShiprocketWebhook,
} = require('../controllers/shippingController');
const { authenticateUser } = require('../middleware/authMiddleware');
const { shippingLimiter } = require('../middleware/rateLimits');

const router = express.Router();

router.post('/webhook', handleShiprocketWebhook);
router.get('/config', getShippingConfig);
router.get('/pincode', shippingLimiter, checkPincode);
router.post('/quote', authenticateUser, shippingLimiter, quoteCheckoutShipping);

module.exports = router;
