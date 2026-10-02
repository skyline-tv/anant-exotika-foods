const path = require('path');
const http = require('http');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });

const app = require('./app');
const connectDatabase = require('./config/database');
const seedAdmin = require('./utils/seedAdmin');
const { ensurePersonalizedCategory } = require('./services/hamperService');
const { log } = require('./utils/logger');
const { startShippingWorker, stopShippingWorker } = require('./services/shippingQueue');

const PORT = process.env.PORT || 5000;

let server;
let shuttingDown = false;
let metricsTimer = null;

const positiveInt = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
};

const shutdown = (signal, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  app.set('shuttingDown', true);
  log('warn', 'shutdown started', { signal });
  stopShippingWorker();
  if (metricsTimer) clearInterval(metricsTimer);

  const force = setTimeout(() => {
    log('error', 'forced shutdown after timeout');
    process.exit(1);
  }, positiveInt('SHUTDOWN_TIMEOUT_MS', 15000));
  if (typeof force.unref === 'function') force.unref();

  const closeDatabase = async () => {
    try {
      await mongoose.connection.close();
      log('info', 'mongodb connection closed');
    } catch (error) {
      log('error', 'shutdown database close failed', {
        message: String(error.message || '').slice(0, 300),
      });
      clearTimeout(force);
      process.exit(1);
      return;
    }
    clearTimeout(force);
    process.exit(exitCode);
  };

  if (!server) {
    closeDatabase();
    return;
  }

  server.close(() => {
    closeDatabase();
  });
};

const start = async () => {
  await connectDatabase();
  await seedAdmin();
  await ensurePersonalizedCategory().catch((error) => {
    log('error', 'personalized hamper category was not created', {
      message: String(error.message || '').slice(0, 300),
    });
  });

  server = http.createServer(app);
  const keepAliveTimeout = positiveInt('HTTP_KEEP_ALIVE_TIMEOUT_MS', 65000);
  server.requestTimeout = positiveInt('HTTP_REQUEST_TIMEOUT_MS', 60000);
  server.keepAliveTimeout = keepAliveTimeout;
  server.headersTimeout = Math.max(
    positiveInt('HTTP_HEADERS_TIMEOUT_MS', 66000),
    keepAliveTimeout + 1000
  );

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      log('error', 'port in use', { port: PORT });
      process.exit(1);
    }
    log('error', 'server error', { message: String(error.message || '').slice(0, 300) });
    process.exit(1);
  });

  server.listen(PORT, () => {
    log('info', 'server listening', {
      port: Number(PORT),
      env: process.env.NODE_ENV || 'development',
    });
    startShippingWorker();
  });

  const metricsEvery = positiveInt('METRICS_INTERVAL_MS', 300000);
  metricsTimer = setInterval(() => {
    const memory = process.memoryUsage();
    log('info', 'process', {
      rssMb: Math.round(memory.rss / 1048576),
      heapMb: Math.round(memory.heapUsed / 1048576),
      mongo: mongoose.connection.readyState,
    });
  }, metricsEvery);
  if (typeof metricsTimer.unref === 'function') metricsTimer.unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM', 0));
process.on('SIGINT', () => shutdown('SIGINT', 0));

process.on('unhandledRejection', (error) => {
  log('error', 'unhandled rejection', {
    message: String(error?.message || error || '').slice(0, 500),
  });
  shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (error) => {
  log('error', 'uncaught exception', {
    message: String(error?.message || error || '').slice(0, 500),
  });
  shutdown('uncaughtException', 1);
});

start().catch((error) => {
  log('error', 'failed to start server', {
    message: String(error.message || '').replace(/mongodb(\+srv)?:\/\/\S+/gi, '[redacted]').slice(0, 500),
  });
  process.exit(1);
});
