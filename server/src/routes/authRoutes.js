const express = require('express');
const {
  register,
  login,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { authenticateUser } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateUser, getMe);
router.post('/logout', authenticateUser, logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
