const mongoose = require('mongoose');

const connectDatabase = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri);

  const { host, name } = mongoose.connection;
  console.log(`MongoDB connected: ${host}/${name}`);
};

module.exports = connectDatabase;
