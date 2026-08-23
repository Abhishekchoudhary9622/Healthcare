const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    logger.warn('[Database] MONGODB_URI is not defined in environment variables. Database operations will be pending until MONGODB_URI is provided.');
    return false;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info('[Database] MongoDB connected successfully: ' + mongoose.connection.host);
    return true;
  } catch (err) {
    logger.error('[Database Error] MongoDB connection failed: ' + err.message);
    setTimeout(connectDB, 5000);
    return false;
  }
};

mongoose.connection.on('error', (err) => logger.error('[Database Error] ' + err.message));
mongoose.connection.on('disconnected', () => logger.warn('[Database] MongoDB disconnected. Will auto-reconnect.'));

module.exports = connectDB;