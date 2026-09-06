const crypto = require('crypto');

const generateNumericOtp = (length = 6) => {
  let otp = '';
  for (let i = 0; i < length; i += 1) {
    otp += crypto.randomInt(0, 10).toString();
  }
  return otp;
};

const hashOtp = (otp) =>
  crypto.createHash('sha256').update(String(otp)).digest('hex');

const constantTimeEqual = (aHex, bHex) => {
  const a = Buffer.from(aHex, 'hex');
  const b = Buffer.from(bHex, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

module.exports = { generateNumericOtp, hashOtp, constantTimeEqual };
