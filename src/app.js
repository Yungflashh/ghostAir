const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const xss = require('xss-clean');
const { env } = require('./config/env');
const { globalLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const { success } = require('./utils/ApiResponse');

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));

const allowedOrigins = env.CORS_ORIGIN === '*'
  ? true
  : env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

app.use(globalLimiter);

app.get('/', (req, res) =>
  success(res, 200, 'GhostAir API is running', {
    name: env.APP_NAME,
    version: '1.0.0',
    docs: '/api/v1/health',
  })
);

app.get('/api/v1/health', (req, res) =>
  success(res, 200, 'ok', {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
  })
);

app.use('/api/v1/auth', authRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
