const AppError = require('./AppError');

class StellarError extends AppError {
  constructor(message) {
    super(message, 502, 'STELLAR_ERROR'); // Bad Gateway / external service error
  }
}

module.exports = StellarError;
