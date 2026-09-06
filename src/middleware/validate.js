const ApiError = require('../utils/ApiError');

const validate = (schemaFn) => (req, res, next) => {
  const errors = schemaFn(req.body);
  if (errors && errors.length) {
    return next(new ApiError(400, 'Validation failed', errors));
  }
  return next();
};

module.exports = validate;
