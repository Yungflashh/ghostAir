const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { success } = require('../utils/ApiResponse');
const User = require('../models/User');
const Otp = require('../models/Otp');
const { generateNumericOtp, hashOtp, constantTimeEqual } = require('../utils/otp');
const { evaluatePassword } = require('../utils/password');
const { env } = require('../config/env');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashRefreshToken,
  compareRefreshToken,
} = require('../services/tokenService');
const {
  sendVerificationOtp,
  sendPasswordResetOtp,
  sendPasswordChangedAlert,
} = require('../services/emailService');

const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

const cookieBase = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
  path: '/',
});

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, { ...cookieBase(), maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, {
    ...cookieBase(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  });
};

const clearAuthCookies = (res) => {
  res.clearCookie('accessToken', cookieBase());
  res.clearCookie('refreshToken', { ...cookieBase(), path: '/api/v1/auth' });
};

const issueTokens = async (user) => {
  const accessToken = signAccessToken(user);
  const refresh = signRefreshToken(user);
  user.refreshTokenHash = await hashRefreshToken(refresh.token);
  await user.save({ validateBeforeSave: false });
  return { accessToken, refreshToken: refresh.token };
};

const createOtp = async ({ user, purpose }) => {
  await Otp.deleteMany({ userId: user._id, purpose });
  const otp = generateNumericOtp(env.OTP_LENGTH);
  await Otp.create({
    userId: user._id,
    email: user.email,
    otpHash: hashOtp(otp),
    purpose,
    expiresAt: new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60 * 1000),
  });
  return otp;
};

exports.register = asyncHandler(async (req, res) => {
  const { firstName, lastName, name, email, password } = req.body;
  const normalizedEmail = String(email).toLowerCase().trim();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists', [
      { field: 'email', message: 'This email is already registered. Try logging in instead.' },
    ]);
  }

  const user = await User.create({
    firstName: String(firstName).trim(),
    lastName: String(lastName).trim(),
    name: name ? String(name).trim() : undefined,
    email: normalizedEmail,
    password,
  });

  const otp = await createOtp({ user, purpose: 'email_verification' });
  await sendVerificationOtp({
    to: user.email,
    name: user.firstName,
    otp,
    expiresInMinutes: env.OTP_EXPIRES_MINUTES,
  });

  return success(
    res,
    201,
    'Account created. We sent a verification code to your email.',
    {
      user,
      verification: {
        required: true,
        email: user.email,
        expiresInMinutes: env.OTP_EXPIRES_MINUTES,
      },
    }
  );
});

exports.verifyEmail = asyncHandler(async (req, res) => {
  const email = String(req.body.email).toLowerCase().trim();
  const { otp } = req.body;

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, 'No account is associated with this email');
  if (user.isVerified) {
    return success(res, 200, 'Your email is already verified. You can log in.');
  }

  const record = await Otp.findOne({
    userId: user._id,
    purpose: 'email_verification',
    used: false,
  }).sort({ createdAt: -1 });

  if (!record) throw new ApiError(400, 'No active verification code. Please request a new one.');
  if (record.expiresAt < new Date()) {
    throw new ApiError(400, 'Verification code has expired. Please request a new one.');
  }
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    throw new ApiError(429, 'Too many incorrect attempts. Please request a new code.');
  }

  const providedHash = hashOtp(otp);
  const match = constantTimeEqual(providedHash, record.otpHash);

  if (!match) {
    record.attempts += 1;
    await record.save();
    const remaining = Math.max(0, OTP_MAX_ATTEMPTS - record.attempts);
    throw new ApiError(400, `Incorrect verification code. ${remaining} attempt(s) remaining.`);
  }

  record.used = true;
  await record.save();
  user.isVerified = true;
  await user.save({ validateBeforeSave: false });

  return success(res, 200, 'Email verified successfully. You can now log in.', { user });
});

exports.resendVerificationOtp = asyncHandler(async (req, res) => {
  const email = String(req.body.email).toLowerCase().trim();
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, 'No account is associated with this email');
  if (user.isVerified) {
    return success(res, 200, 'Your email is already verified.');
  }

  const recent = await Otp.findOne({
    userId: user._id,
    purpose: 'email_verification',
  }).sort({ createdAt: -1 });

  if (recent && Date.now() - recent.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    throw new ApiError(429, 'Please wait a moment before requesting another code.');
  }

  const otp = await createOtp({ user, purpose: 'email_verification' });
  await sendVerificationOtp({
    to: user.email,
    name: user.firstName,
    otp,
    expiresInMinutes: env.OTP_EXPIRES_MINUTES,
  });

  return success(res, 200, 'A new verification code has been sent to your email.', {
    expiresInMinutes: env.OTP_EXPIRES_MINUTES,
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email).toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail })
    .select('+password +refreshTokenHash');

  const invalidMessage = 'Invalid email or password';

  if (!user) throw new ApiError(401, invalidMessage);

  if (user.isLocked) {
    const minutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
    throw new ApiError(
      423,
      `Account temporarily locked due to too many failed attempts. Try again in ${minutes} minute(s).`
    );
  }

  const match = await user.comparePassword(password);
  if (!match) {
    await user.registerLoginFailure();
    const remaining = Math.max(0, User.MAX_LOGIN_ATTEMPTS - user.loginAttempts);
    if (remaining === 0) {
      throw new ApiError(
        423,
        'Too many failed attempts. Your account has been locked for 15 minutes.'
      );
    }
    throw new ApiError(401, `${invalidMessage}. ${remaining} attempt(s) remaining before lockout.`);
  }

  if (!user.isVerified) {
    throw new ApiError(403, 'Please verify your email before logging in.', {
      verificationRequired: true,
      email: user.email,
    });
  }

  await user.resetLoginAttempts();
  user.lastLoginAt = new Date();
  user.lastLoginIp = req.ip;

  const { accessToken, refreshToken } = await issueTokens(user);
  setAuthCookies(res, accessToken, refreshToken);

  return success(res, 200, 'Logged in successfully', {
    user,
    tokens: { accessToken, refreshToken },
  });
});

exports.refresh = asyncHandler(async (req, res) => {
  const token = (req.cookies && req.cookies.refreshToken) || req.body.refreshToken;
  if (!token) throw new ApiError(401, 'Refresh token missing. Please log in again.');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token. Please log in again.');
  }
  if (payload.type !== 'refresh') throw new ApiError(401, 'Invalid token type');

  const user = await User.findById(payload.sub).select('+refreshTokenHash');
  if (!user || !user.refreshTokenHash) {
    throw new ApiError(401, 'Session no longer valid. Please log in again.');
  }

  const stillValid = await compareRefreshToken(token, user.refreshTokenHash);
  if (!stillValid) {
    user.refreshTokenHash = null;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(401, 'Refresh token has been revoked. Please log in again.');
  }

  const { accessToken, refreshToken: newRefresh } = await issueTokens(user);
  setAuthCookies(res, accessToken, newRefresh);

  return success(res, 200, 'Session refreshed', {
    tokens: { accessToken, refreshToken: newRefresh },
  });
});

exports.logout = asyncHandler(async (req, res) => {
  if (req.user) {
    req.user.refreshTokenHash = null;
    await req.user.save({ validateBeforeSave: false });
  }
  clearAuthCookies(res);
  return success(res, 200, 'Logged out successfully');
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email).toLowerCase().trim();
  const user = await User.findOne({ email });

  const genericMessage =
    'If an account exists with that email, a password reset code has been sent.';

  if (!user) {
    return success(res, 200, genericMessage);
  }

  const recent = await Otp.findOne({
    userId: user._id,
    purpose: 'password_reset',
  }).sort({ createdAt: -1 });

  if (recent && Date.now() - recent.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    return success(res, 200, genericMessage);
  }

  const otp = await createOtp({ user, purpose: 'password_reset' });
  await sendPasswordResetOtp({
    to: user.email,
    name: user.firstName,
    otp,
    expiresInMinutes: env.OTP_EXPIRES_MINUTES,
  });

  return success(res, 200, genericMessage, {
    expiresInMinutes: env.OTP_EXPIRES_MINUTES,
  });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email).toLowerCase().trim();
  const { otp, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) throw new ApiError(400, 'Invalid or expired reset request. Please start again.');

  const record = await Otp.findOne({
    userId: user._id,
    purpose: 'password_reset',
    used: false,
  }).sort({ createdAt: -1 });

  if (!record) throw new ApiError(400, 'No active reset code. Please request a new one.');
  if (record.expiresAt < new Date()) {
    throw new ApiError(400, 'Reset code has expired. Please request a new one.');
  }
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    throw new ApiError(429, 'Too many incorrect attempts. Please request a new code.');
  }

  const providedHash = hashOtp(otp);
  const match = constantTimeEqual(providedHash, record.otpHash);

  if (!match) {
    record.attempts += 1;
    await record.save();
    const remaining = Math.max(0, OTP_MAX_ATTEMPTS - record.attempts);
    throw new ApiError(400, `Incorrect reset code. ${remaining} attempt(s) remaining.`);
  }

  const sameAsCurrent = await user.comparePassword(password);
  if (sameAsCurrent) {
    throw new ApiError(400, 'New password must be different from your current password');
  }

  record.used = true;
  await record.save();

  user.password = password;
  user.refreshTokenHash = null;
  user.loginAttempts = 0;
  user.lockUntil = null;
  await user.save();

  await sendPasswordChangedAlert({
    to: user.email,
    name: user.firstName,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  return success(
    res,
    200,
    'Password reset successfully. You can now log in with your new password.'
  );
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!user) throw new ApiError(404, 'Account not found');

  const match = await user.comparePassword(currentPassword);
  if (!match) throw new ApiError(400, 'Current password is incorrect');

  user.password = newPassword;
  user.refreshTokenHash = null;
  await user.save();

  clearAuthCookies(res);
  await sendPasswordChangedAlert({
    to: user.email,
    name: user.firstName,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  return success(res, 200, 'Password changed successfully. Please log in again.');
});

exports.me = asyncHandler(async (req, res) =>
  success(res, 200, 'Authenticated user profile', { user: req.user })
);

exports.checkPasswordStrength = asyncHandler(async (req, res) => {
  const { password } = req.body || {};
  if (!password) throw new ApiError(400, 'Password is required');
  const evaluation = evaluatePassword(password);
  return success(res, 200, 'Password evaluation', evaluation);
});
