const express = require('express');
const {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} = require('../controllers/addressController');
const { authenticateUser } = require('../middleware/authMiddleware');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();

router.use(authenticateUser);

router.get('/', getAddresses);
router.post('/', createAddress);
router.put('/:id/default', validateObjectId('id'), setDefaultAddress);
router.put('/:id', validateObjectId('id'), updateAddress);
router.delete('/:id', validateObjectId('id'), deleteAddress);

module.exports = router;
