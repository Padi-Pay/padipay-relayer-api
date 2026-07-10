const AppError = require('../errors/AppError');

const errorHandler = (err, req, res, _next) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let error = 'INTERNAL_ERROR';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    error = err.code;
  } else {
    // Log unexpected errors
    console.error('[UNEXPECTED ERROR]', err);
  }

  const response = {
    success: false,
    message,
    error,
  };

  // Only include stack traces outside of production
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
