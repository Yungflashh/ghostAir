require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./src/app');
const { env } = require('./src/config/env');
const logger = require('./src/utils/logger');

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION — shutting down');
  logger.error(err);
  process.exit(1);
});

mongoose.set('strictQuery', true);

mongoose
  .connect(env.MONGO_URI)
  .then(() => logger.info('MongoDB connected'))
  .catch((err) => {
    logger.error('MongoDB connection failed');
    logger.error(err);
    process.exit(1);
  });

const server = app.listen(env.PORT, () => {
  logger.info(`GhostAir API listening on port ${env.PORT} [${env.NODE_ENV}]`);
});

process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION — shutting down');
  logger.error(err);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  server.close(() => process.exit(0));
});
