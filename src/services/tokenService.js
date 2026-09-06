const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { env } = require('../config/env');

const signAccessToken = (user) =>
  jwt.sign(
    { sub: user._id.toString(), role: user.role, type: 'access' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES }
  );

const signRefreshToken = (user) => {
  const jti = crypto.randomBytes(24).toString('hex');
  const token = jwt.sign(
    { sub: user._id.toString(), type: 'refresh', jti },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES }
  );
  return { token, jti };
};

const verifyAccessToken = (token) => jwt.verify(token, env.JWT_ACCESS_SECRET);
const verifyRefreshToken = (token) => jwt.verify(token, env.JWT_REFRESH_SECRET);

const hashRefreshToken = (token) => bcrypt.hash(token, 10);
const compareRefreshToken = (token, hash) => bcrypt.compare(token, hash);

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashRefreshToken,
  compareRefreshToken,
};
