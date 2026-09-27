const express = require('express');
const {
  getShippingConfig,
  checkPincode,
  quoteCheckoutShipping,
  handleShiprocketWebhook,
} = require('../controllers/shippingController');
const { authenticateUser } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/webhook', handleShiprocketWebhook);
router.get('/config', getShippingConfig);
router.get('/pincode', checkPincode);
router.post('/quote', authenticateUser, quoteCheckoutShipping);

module.exports = router;
