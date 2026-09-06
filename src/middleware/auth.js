const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const { verifyAccessToken } = require('../services/tokenService');

const extractToken = (req) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  if (req.cookies && req.cookies.accessToken) return req.cookies.accessToken;
  return null;
};

const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw new ApiError(401, 'You must be logged in to access this resource');

  const payload = verifyAccessToken(token);
  if (payload.type !== 'access') throw new ApiError(401, 'Invalid token type');

  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(401, 'The account for this session no longer exists');
  if (user.changedPasswordAfter(payload.iat)) {
    throw new ApiError(401, 'Password was recently changed. Please log in again.');
  }

  req.user = user;
  return next();
});

const requireVerified = (req, res, next) => {
  if (!req.user) return next(new ApiError(401, 'Authentication required'));
  if (!req.user.isVerified) {
    return next(new ApiError(403, 'Please verify your email before continuing'));
  }
  return next();
};

const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError(403, 'You do not have permission to perform this action'));
  }
  return next();
};

module.exports = { protect, requireVerified, restrictTo };
