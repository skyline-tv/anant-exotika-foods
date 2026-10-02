const express = require('express');
const { createLead } = require('../controllers/leadController');
const { leadLimiter } = require('../middleware/rateLimits');

const router = express.Router();

router.post('/', leadLimiter, createLead);

module.exports = router;
