const AppError = require('./AppError');

class RpcError extends AppError {
  constructor(message, statusCode = 502, code = 'RPC_ERROR') {
    super(message, statusCode, code);
  }
}

module.exports = RpcError;
