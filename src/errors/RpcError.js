const AppError = require('./AppError');

class RpcError extends AppError {
  constructor(message) {
    super(message, 502, 'RPC_ERROR');
  }
}

module.exports = RpcError;
