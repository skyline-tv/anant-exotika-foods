const path = require('path');
const http = require('http');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });

const app = require('./app');
const connectDatabase = require('./config/database');
const seedAdmin = require('./utils/seedAdmin');

const PORT = process.env.PORT || 5000;

let server;

const start = async () => {
  await connectDatabase();
  await seedAdmin();

  server = http.createServer(app);

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(
        `Port ${PORT} is already in use. Set a different PORT in .env (macOS AirPlay often occupies 5000).`
      );
      process.exit(1);
    }

    console.error('Server error:', error);
    process.exit(1);
  });

  server.listen(PORT, () => {
    console.log(
      `ANANT EXOTIKA server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`
    );
  });
};

const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down gracefully...`);

  if (!server) {
    process.exit(0);
    return;
  }

  server.close(async () => {
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error.message);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  shutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  shutdown('uncaughtException');
});

start().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
