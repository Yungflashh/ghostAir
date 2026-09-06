const passwordRegex = {
  minLength: /.{8,}/,
  maxLength: /^.{0,128}$/,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /\d/,
  special: /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/`~;']/,
  whitespace: /\s/,
};

const commonPasswords = new Set([
  'password', 'password1', 'password123', '12345678', '123456789',
  'qwerty', 'qwerty123', 'abc12345', 'iloveyou', 'admin', 'admin123',
  'welcome', 'welcome1', 'letmein', 'monkey', 'dragon', 'football',
  'baseball', 'sunshine', 'princess', 'passw0rd',
]);

const evaluatePassword = (password) => {
  const value = String(password || '');
  const checks = {
    minLength: passwordRegex.minLength.test(value),
    maxLength: passwordRegex.maxLength.test(value),
    uppercase: passwordRegex.uppercase.test(value),
    lowercase: passwordRegex.lowercase.test(value),
    number: passwordRegex.number.test(value),
    special: passwordRegex.special.test(value),
    noSpaces: !passwordRegex.whitespace.test(value),
    notCommon: !commonPasswords.has(value.toLowerCase()),
  };

  const failed = [];
  if (!checks.minLength) failed.push('at least 8 characters');
  if (!checks.maxLength) failed.push('no more than 128 characters');
  if (!checks.uppercase) failed.push('at least one uppercase letter (A-Z)');
  if (!checks.lowercase) failed.push('at least one lowercase letter (a-z)');
  if (!checks.number) failed.push('at least one number (0-9)');
  if (!checks.special) failed.push('at least one special character (e.g. !@#$%)');
  if (!checks.noSpaces) failed.push('no spaces');
  if (!checks.notCommon) failed.push('must not be a commonly used password');

  const strengthPoints = [
    checks.minLength,
    checks.uppercase,
    checks.lowercase,
    checks.number,
    checks.special,
    value.length >= 12,
    value.length >= 16,
    checks.notCommon,
  ].filter(Boolean).length;

  let strength = 'weak';
  if (strengthPoints >= 7) strength = 'very-strong';
  else if (strengthPoints >= 6) strength = 'strong';
  else if (strengthPoints >= 4) strength = 'medium';
  else if (strengthPoints >= 2) strength = 'fair';

  return {
    valid: failed.length === 0,
    strength,
    failed,
    checks,
    suggestions: failed.length
      ? failed.map((f) => `Add ${f}.`)
      : ['Great — your password meets all requirements.'],
  };
};

module.exports = { evaluatePassword, passwordRegex };
