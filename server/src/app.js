const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoose = require('mongoose');

const { successResponse } = require('./utils/apiResponse');
const AppError = require('./utils/AppError');
const { getUploadRoot } = require('./middleware/uploadMiddleware');
const notFoundMiddleware = require('./middleware/notFoundMiddleware');
const errorMiddleware = require('./middleware/errorMiddleware');
const requestContext = require('./middleware/requestContext');
const { publicLimiter, authLimiter } = require('./middleware/rateLimits');

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
const { router: contentRoutes, adminRouter: adminContentRoutes } = require('./routes/contentRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const shippingRoutes = require('./routes/shippingRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const adminCustomerRoutes = require('./routes/adminCustomerRoutes');
const leadRoutes = require('./routes/leadRoutes');

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(compression());
app.use(requestContext);

app.use((req, res, next) => {
  if (!app.get('shuttingDown') || req.path === '/health') return next();
  res.set('Connection', 'close');
  return res.status(503).json({
    success: false,
    message: 'Server is shutting down.',
    errors: [],
  });
});

const allowedOrigins = [process.env.CLIENT_URL, process.env.ADMIN_URL].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      return callback(new AppError('Not allowed by CORS', 403));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Razorpay-Signature',
      'X-Request-Id',
      'X-Idempotency-Key',
    ],
  })
);

const jsonLimit = process.env.JSON_BODY_LIMIT || '2mb';

app.use(
  express.json({
    limit: jsonLimit,
    verify: (req, res, buf) => {
      if (req.originalUrl?.includes('/payments/webhook')) {
        req.rawBody = buf;
      }
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: jsonLimit }));

app.use('/uploads', express.static(getUploadRoot(), { maxAge: '1d' }));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/ready', (req, res) => {
  const ready = !app.get('shuttingDown') && mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready' });
});

app.get('/api/v1/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  successResponse(res, {
    message: 'ANANT EXOTIKA API is running',
    data: {
      status: dbConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
    },
  });
});

app.use('/api/v1', publicLimiter);
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
app.use('/api/v1/content', contentRoutes);
app.use('/api/v1/admin/content', adminContentRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/shipping', shippingRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/leads', leadRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
