const validator = require('validator');
const { evaluatePassword } = require('../utils/password');

const fieldError = (field, message) => ({ field, message });

const nameRegex = /^[A-Za-z][A-Za-z'\-\s]{1,49}$/;
const otpRegex = /^\d{4,8}$/;

const validateRegister = (body) => {
  const errors = [];
  const {
    firstName,
    lastName,
    name,
    email,
    password,
    confirmPassword,
  } = body || {};

  if (!firstName || !nameRegex.test(String(firstName).trim())) {
    errors.push(fieldError('firstName',
      'First name must be 2-50 letters. Letters, spaces, apostrophes and hyphens only.'));
  }
  if (!lastName || !nameRegex.test(String(lastName).trim())) {
    errors.push(fieldError('lastName',
      'Last name must be 2-50 letters. Letters, spaces, apostrophes and hyphens only.'));
  }
  if (name !== undefined && name !== null && String(name).trim().length > 0) {
    const trimmed = String(name).trim();
    if (trimmed.length < 2 || trimmed.length > 120) {
      errors.push(fieldError('name', 'Display name must be between 2 and 120 characters'));
    }
  }
  if (!email || !validator.isEmail(String(email))) {
    errors.push(fieldError('email', 'Please provide a valid email address'));
  }
  if (!password) {
    errors.push(fieldError('password', 'Password is required'));
  } else {
    const evaluation = evaluatePassword(password);
    if (!evaluation.valid) {
      errors.push(fieldError(
        'password',
        `Password is too weak. It must contain: ${evaluation.failed.join(', ')}.`
      ));
    }
  }
  if (!confirmPassword) {
    errors.push(fieldError('confirmPassword', 'Please confirm your password'));
  } else if (password !== confirmPassword) {
    errors.push(fieldError('confirmPassword', 'Passwords do not match'));
  }

  return errors;
};

const validateLogin = (body) => {
  const errors = [];
  const { email, password } = body || {};
  if (!email || !validator.isEmail(String(email))) {
    errors.push(fieldError('email', 'Please provide a valid email address'));
  }
  if (!password) {
    errors.push(fieldError('password', 'Password is required'));
  }
  return errors;
};

const validateEmailOnly = (body) => {
  const errors = [];
  if (!body || !body.email || !validator.isEmail(String(body.email))) {
    errors.push(fieldError('email', 'Please provide a valid email address'));
  }
  return errors;
};

const validateOtp = (body) => {
  const errors = [];
  const { email, otp } = body || {};
  if (!email || !validator.isEmail(String(email))) {
    errors.push(fieldError('email', 'Please provide a valid email address'));
  }
  if (!otp || !otpRegex.test(String(otp))) {
    errors.push(fieldError('otp', 'Enter the numeric code sent to your email'));
  }
  return errors;
};

const validateResetPassword = (body) => {
  const errors = [];
  const { email, otp, password, confirmPassword } = body || {};
  if (!email || !validator.isEmail(String(email))) {
    errors.push(fieldError('email', 'Please provide a valid email address'));
  }
  if (!otp || !otpRegex.test(String(otp))) {
    errors.push(fieldError('otp', 'Enter the numeric code sent to your email'));
  }
  if (!password) {
    errors.push(fieldError('password', 'New password is required'));
  } else {
    const evaluation = evaluatePassword(password);
    if (!evaluation.valid) {
      errors.push(fieldError(
        'password',
        `Password is too weak. It must contain: ${evaluation.failed.join(', ')}.`
      ));
    }
  }
  if (!confirmPassword) {
    errors.push(fieldError('confirmPassword', 'Please confirm your new password'));
  } else if (password !== confirmPassword) {
    errors.push(fieldError('confirmPassword', 'Passwords do not match'));
  }
  return errors;
};

const validateChangePassword = (body) => {
  const errors = [];
  const { currentPassword, newPassword, confirmPassword } = body || {};
  if (!currentPassword) {
    errors.push(fieldError('currentPassword', 'Current password is required'));
  }
  if (!newPassword) {
    errors.push(fieldError('newPassword', 'New password is required'));
  } else {
    const evaluation = evaluatePassword(newPassword);
    if (!evaluation.valid) {
      errors.push(fieldError(
        'newPassword',
        `Password is too weak. It must contain: ${evaluation.failed.join(', ')}.`
      ));
    }
    if (currentPassword && currentPassword === newPassword) {
      errors.push(fieldError('newPassword', 'New password must be different from your current password'));
    }
  }
  if (!confirmPassword) {
    errors.push(fieldError('confirmPassword', 'Please confirm your new password'));
  } else if (newPassword !== confirmPassword) {
    errors.push(fieldError('confirmPassword', 'Passwords do not match'));
  }
  return errors;
};

module.exports = {
  validateRegister,
  validateLogin,
  validateEmailOnly,
  validateOtp,
  validateResetPassword,
  validateChangePassword,
};
