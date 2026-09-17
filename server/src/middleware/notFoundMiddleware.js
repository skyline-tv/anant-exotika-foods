const { errorResponse } = require('../utils/apiResponse');

const notFoundMiddleware = (req, res) => {
  return errorResponse(res, {
    message: `Route ${req.originalUrl} not found`,
    statusCode: 404,
  });
};

module.exports = notFoundMiddleware;
