const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set in .env');
  await mongoose.connect(uri);
  logger.info('MongoDB connected: ' + mongoose.connection.host);
};

mongoose.connection.on('error',       (err) => logger.error('MongoDB error: '        + err));
mongoose.connection.on('disconnected',()    => logger.warn ('MongoDB disconnected'));

module.exports = connectDB;