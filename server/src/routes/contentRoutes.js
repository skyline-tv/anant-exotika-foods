const express = require('express');
const { getPublicContent, updateContent } = require('../controllers/contentController');
const { authenticateAdmin } = require('../middleware/adminMiddleware');

const router = express.Router();
const adminRouter = express.Router();

router.get('/', getPublicContent);
adminRouter.get('/', authenticateAdmin, getPublicContent);
adminRouter.put('/', authenticateAdmin, updateContent);

module.exports = {
  router,
  adminRouter,
};
