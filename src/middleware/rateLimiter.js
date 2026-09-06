const rateLimit = require('express-rate-limit');
const { fail } = require('../utils/ApiResponse');

const buildLimiter = ({ windowMs, max, message, keyGenerator }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    handler: (req, res) =>
      fail(res, 429, message || 'Too many requests. Please slow down and try again shortly.'),
  });

const emailAwareKey = (req) => {
  const email = (req.body && req.body.email && String(req.body.email).toLowerCase().trim()) || '';
  return `${req.ip}:${email}`;
};

module.exports = {
  globalLimiter: buildLimiter({
    windowMs: 15 * 60 * 1000,
    max: 300,
  }),
  authLimiter: buildLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Too many attempts on this endpoint. Please wait a few minutes and try again.',
  }),
  loginLimiter: buildLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many login attempts. Please wait a few minutes before trying again.',
    keyGenerator: emailAwareKey,
  }),
  otpLimiter: buildLimiter({
    windowMs: 60 * 60 * 1000,
    max: 6,
    message: 'You have requested too many codes. Please wait an hour before requesting another.',
    keyGenerator: emailAwareKey,
  }),
  resetLimiter: buildLimiter({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: 'Too many password reset attempts. Please try again later.',
    keyGenerator: emailAwareKey,
  }),
};
