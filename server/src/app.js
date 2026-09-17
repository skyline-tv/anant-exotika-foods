const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const { successResponse } = require('./utils/apiResponse');
const AppError = require('./utils/AppError');
const { getUploadRoot } = require('./middleware/uploadMiddleware');
const notFoundMiddleware = require('./middleware/notFoundMiddleware');
const errorMiddleware = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const cartRoutes = require('./routes/cartRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const addressRoutes = require('./routes/addressRoutes');
const { router: orderRoutes, adminRouter: adminOrderRoutes } = require('./routes/orderRoutes');
const { router: couponRoutes, adminRouter: adminCouponRoutes } = require('./routes/couponRoutes');
const { router: reviewRoutes, adminRouter: adminReviewRoutes } = require('./routes/reviewRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const adminCustomerRoutes = require('./routes/adminCustomerRoutes');

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const allowedOrigins = [process.env.CLIENT_URL, process.env.ADMIN_URL].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new AppError('Not allowed by CORS', 403));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    errors: [],
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    errors: [],
  },
});

app.use('/uploads', express.static(getUploadRoot()));

app.get('/api/v1/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;

  successResponse(res, {
    message: 'ANANT EXOTIKA API is running',
    data: {
      status: dbConnected ? 'ok' : 'degraded',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    },
  });
});

app.use('/api/v1', apiLimiter);
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/admin/auth', authLimiter, adminAuthRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/addresses', addressRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/admin/orders', adminOrderRoutes);
app.use('/api/v1/admin/customers', adminCustomerRoutes);
app.use('/api/v1/coupons', couponRoutes);
app.use('/api/v1/admin/coupons', adminCouponRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/admin/reviews', adminReviewRoutes);
app.use('/api/v1/upload', uploadRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
