const express = require('express');
const { listLeads } = require('../controllers/leadController');
const { authenticateAdmin } = require('../middleware/adminMiddleware');

const router = express.Router();

router.use(authenticateAdmin);
router.get('/', listLeads);

module.exports = router;
