const success = (res, statusCode, message, data = null) =>
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });

const fail = (res, statusCode, message, details = null) =>
  res.status(statusCode).json({
    success: false,
    message,
    details,
  });

module.exports = { success, fail };
