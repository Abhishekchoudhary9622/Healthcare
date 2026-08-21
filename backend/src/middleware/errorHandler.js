const logger = require('../config/logger');
const { error } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Prisma errors
  if (err.code === 'P2002') {
    return error(res, 'A record with this data already exists', 409);
  }
  if (err.code === 'P2025') {
    return error(res, 'Record not found', 404);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.expose ? err.message : 'Internal Server Error';

  return error(res, message, statusCode);
};

module.exports = errorHandler;
