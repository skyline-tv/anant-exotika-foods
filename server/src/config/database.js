const mongoose = require('mongoose');
const { log } = require('../utils/logger');

const positiveInt = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
};

const connectDatabase = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    log('info', 'mongodb connected');
  });
  mongoose.connection.on('disconnected', () => {
    log('warn', 'mongodb disconnected');
  });
  mongoose.connection.on('reconnected', () => {
    log('info', 'mongodb reconnected');
  });
  mongoose.connection.on('error', (error) => {
    log('error', 'mongodb connection error', {
      name: error.name,
      message: String(error.message || '').replace(/mongodb(\+srv)?:\/\/\S+/gi, '[redacted]').slice(0, 300),
    });
  });

  await mongoose.connect(uri, {
    maxPoolSize: positiveInt('MONGO_MAX_POOL_SIZE', 20),
    minPoolSize: positiveInt('MONGO_MIN_POOL_SIZE', 2),
    serverSelectionTimeoutMS: positiveInt('MONGO_SERVER_SELECTION_TIMEOUT_MS', 5000),
    socketTimeoutMS: positiveInt('MONGO_SOCKET_TIMEOUT_MS', 20000),
    connectTimeoutMS: positiveInt('MONGO_CONNECT_TIMEOUT_MS', 10000),
    heartbeatFrequencyMS: positiveInt('MONGO_HEARTBEAT_FREQUENCY_MS', 10000),
    retryWrites: process.env.MONGO_RETRY_WRITES === 'true',
  });
};

module.exports = connectDatabase;
