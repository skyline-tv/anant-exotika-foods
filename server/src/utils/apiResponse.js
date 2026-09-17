const successResponse = (
  res,
  { message = 'Operation successful', data = {}, statusCode = 200 } = {}
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const errorResponse = (
  res,
  { message = 'An error occurred', errors = [], statusCode = 500 } = {}
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};

module.exports = {
  successResponse,
  errorResponse,
};
