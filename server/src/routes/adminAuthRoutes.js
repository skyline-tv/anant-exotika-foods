const express = require('express');
const { login, getMe, logout } = require('../controllers/adminAuthController');
const { authenticateAdmin } = require('../middleware/adminMiddleware');

const router = express.Router();

router.post('/login', login);
router.get('/me', authenticateAdmin, getMe);
router.post('/logout', authenticateAdmin, logout);

module.exports = router;
