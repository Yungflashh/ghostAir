const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const { env } = require('../config/env');

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000;

const nameRegex = /^[A-Za-z][A-Za-z'\-\s]*$/;

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [2, 'First name must be at least 2 characters'],
      maxlength: [50, 'First name cannot exceed 50 characters'],
      match: [nameRegex, 'First name contains invalid characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [2, 'Last name must be at least 2 characters'],
      maxlength: [50, 'Last name cannot exceed 50 characters'],
      match: [nameRegex, 'Last name contains invalid characters'],
    },
    name: {
      type: String,
      trim: true,
      maxlength: [120, 'Display name cannot exceed 120 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      validate: {
        validator: (v) => validator.isEmail(v),
        message: 'Please provide a valid email address',
      },
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    passwordChangedAt: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    refreshTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    lastLoginAt: Date,
    lastLoginIp: String,
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

userSchema.virtual('isLocked').get(function isLocked() {
  return !!(this.lockUntil && this.lockUntil.getTime() > Date.now());
});

userSchema.virtual('fullName').get(function fullName() {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

userSchema.pre('save', function setDisplayName(next) {
  if (!this.name) {
    this.name = `${this.firstName} ${this.lastName}`.trim();
  }
  next();
});

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, env.BCRYPT_ROUNDS);
  if (!this.isNew) {
    this.passwordChangedAt = new Date(Date.now() - 1000);
  }
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.registerLoginFailure = async function registerLoginFailure() {
  if (this.lockUntil && this.lockUntil.getTime() < Date.now()) {
    this.loginAttempts = 1;
    this.lockUntil = null;
  } else {
    this.loginAttempts += 1;
    if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      this.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
    }
  }
  await this.save({ validateBeforeSave: false });
};

userSchema.methods.resetLoginAttempts = async function resetLoginAttempts() {
  this.loginAttempts = 0;
  this.lockUntil = null;
  await this.save({ validateBeforeSave: false });
};

userSchema.methods.changedPasswordAfter = function changedPasswordAfter(jwtIat) {
  if (!this.passwordChangedAt) return false;
  const changedTs = Math.floor(this.passwordChangedAt.getTime() / 1000);
  return jwtIat < changedTs;
};

userSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject({ virtuals: true });
  delete obj.password;
  delete obj.refreshTokenHash;
  delete obj.loginAttempts;
  delete obj.lockUntil;
  delete obj.__v;
  return obj;
};

const User = mongoose.model('User', userSchema);
User.MAX_LOGIN_ATTEMPTS = MAX_LOGIN_ATTEMPTS;
User.LOCK_TIME_MS = LOCK_TIME_MS;

module.exports = User;
