const AppError = require('./AppError');

class StellarError extends AppError {
  constructor(message, statusCode = 502, code = 'STELLAR_ERROR') {
    super(message, statusCode, code); // Bad Gateway / external service error
  }
}

module.exports = StellarError;
