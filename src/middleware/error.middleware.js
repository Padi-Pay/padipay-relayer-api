const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const error = err.code || 'INTERNAL_ERROR';

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
