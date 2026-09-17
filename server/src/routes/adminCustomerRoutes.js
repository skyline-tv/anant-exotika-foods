const express = require('express');
const { listCustomers, getCustomerById } = require('../controllers/customerController');
const { authenticateAdmin } = require('../middleware/adminMiddleware');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();

router.use(authenticateAdmin);

router.get('/', listCustomers);
router.get('/:id', validateObjectId('id'), getCustomerById);

module.exports = router;
