const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { fail } = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { env } = require('../config/env');

const notFound = (req, res) => fail(res, 404, `Route not found: ${req.originalUrl}`);

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details || null;

  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `An account with this ${field} already exists`;
    details = [{ field, message: `This ${field} is already in use` }];
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired. Please log in again.';
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON in request body';
  }

  if (statusCode >= 500) {
    logger.error(err);
  } else if (!(err instanceof ApiError)) {
    logger.warn(`${statusCode} ${message}`);
  }

  const payload = { success: false, message, details };
  if (env.NODE_ENV !== 'production' && statusCode >= 500) {
    payload.stack = err.stack;
  }
  return res.status(statusCode).json(payload);
};

module.exports = { notFound, errorHandler };
