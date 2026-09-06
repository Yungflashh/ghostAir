const required = [
  'MONGO_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_RESET_SECRET',
];

for (const key of required) {
  if (!process.env[key]) {
    // eslint-disable-next-line no-console
    console.error(`[env] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const secretMinLen = 32;
['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'JWT_RESET_SECRET'].forEach((k) => {
  if (process.env[k].length < secretMinLen && process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.error(`[env] ${k} must be at least ${secretMinLen} characters in production`);
    process.exit(1);
  }
});

if (process.env.NODE_ENV === 'production' && !process.env.RESEND_API_KEY) {
  // eslint-disable-next-line no-console
  console.error('[env] RESEND_API_KEY is required in production');
  process.exit(1);
}

const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  APP_NAME: process.env.APP_NAME || 'GhostAir',
  APP_URL: process.env.APP_URL || 'http://localhost:3000',

  MONGO_URI: process.env.MONGO_URI,

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_RESET_SECRET: process.env.JWT_RESET_SECRET,
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '7d',

  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),

  OTP_LENGTH: parseInt(process.env.OTP_LENGTH || '6', 10),
  OTP_EXPIRES_MINUTES: parseInt(process.env.OTP_EXPIRES_MINUTES || '10', 10),

  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'GhostAir <no-reply@ghostair.io>',
  EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO || '',
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'support@ghostair.io',

  BRAND_COLOR: '#bf2829',
};

module.exports = { env };
