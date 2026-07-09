class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // indicates it's an expected application error

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
