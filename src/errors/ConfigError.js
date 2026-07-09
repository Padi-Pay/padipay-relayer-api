const AppError = require('./AppError');

class ConfigError extends AppError {
  constructor(message) {
    super(message, 500, 'CONFIG_ERROR');
  }
}

module.exports = ConfigError;
