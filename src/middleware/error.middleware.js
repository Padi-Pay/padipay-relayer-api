const AppError = require('../errors/AppError');

const errorHandler = (err, req, res, _next) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let error = 'INTERNAL_ERROR';
  const correlationId = req.id;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    error = err.code;
  } else {
    // Log unexpected errors, tagged with the request's correlation ID so it
    // can be matched against the ID returned to the client.
    console.error(`[UNEXPECTED ERROR] [correlationId=${correlationId}]`, err);
  }

  const response = {
    success: false,
    message,
    error,
    correlationId,
  };

  // Only include stack traces outside of production
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
