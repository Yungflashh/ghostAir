const express = require('express');
const {
  authLimiter,
  loginLimiter,
  otpLimiter,
  resetLimiter,
} = require('../middleware/rateLimiter');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  validateRegister,
  validateLogin,
  validateEmailOnly,
  validateOtp,
  validateResetPassword,
  validateChangePassword,
} = require('../validators/authValidator');
const {
  register,
  verifyEmail,
  resendVerificationOtp,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  me,
  checkPasswordStrength,
} = require('../controllers/authController');

const router = express.Router();

router.post('/register', authLimiter, validate(validateRegister), register);
router.post('/verify-email', authLimiter, validate(validateOtp), verifyEmail);
router.post('/resend-verification', otpLimiter, validate(validateEmailOnly), resendVerificationOtp);

router.post('/login', loginLimiter, validate(validateLogin), login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', protect, logout);

router.post('/forgot-password', resetLimiter, validate(validateEmailOnly), forgotPassword);
router.post('/reset-password', resetLimiter, validate(validateResetPassword), resetPassword);
router.post('/change-password', protect, validate(validateChangePassword), changePassword);

router.get('/me', protect, me);
router.post('/password-strength', checkPasswordStrength);

module.exports = router;
