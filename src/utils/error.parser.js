const RpcError = require('../errors/RpcError');
const StellarError = require('../errors/StellarError');
const StellarSdk = require('stellar-sdk');

/**
 * Maps raw Stellar network errors and transaction submission responses to standardized domain errors.
 * 
 * @param {Object|Error} errorOrResponse - The raw error caught or the response from sendTransaction
 * @returns {Error} A standardized domain error (RpcError or StellarError)
 */
const parseTransactionError = (errorOrResponse) => {
  if (errorOrResponse instanceof Error) {
    if (errorOrResponse.response || errorOrResponse.code === 'ECONNREFUSED' || errorOrResponse.code === 'ENOTFOUND') {
      return new StellarError('Network failure when submitting transaction.', 503, 'NETWORK_FAILURE');
    }
    return new RpcError('An unknown transaction error occurred.', 500, 'UNKNOWN_TRANSACTION_ERROR');
  }

  const response = errorOrResponse;

  if (response && response.status === 'ERROR') {
    if (response.errorResultXdr) {
      try {
        const result = StellarSdk.xdr.TransactionResult.fromXDR(response.errorResultXdr, 'base64');
        const resultCode = result.result().switch().name;

        switch (resultCode) {
          case 'txFAILED':
            return new RpcError('Contract execution failure.', 400, 'CONTRACT_EXECUTION_FAILURE');
          case 'txBAD_SEQ':
          case 'txBAD_AUTH':
          case 'txBAD_AUTH_EXTRA':
          case 'txINSUFFICIENT_BALANCE':
            return new RpcError('Invalid transaction.', 400, 'INVALID_TRANSACTION');
          default:
            return new RpcError('Transaction rejected by the network.', 400, 'TRANSACTION_REJECTED');
        }
      } catch (e) {
        console.error('[ERROR PARSER] Failed to parse errorResultXdr:', e);
        return new RpcError('Transaction rejected with unparseable result.', 400, 'TRANSACTION_REJECTED');
      }
    }
    
    return new RpcError('Transaction rejected.', 400, 'TRANSACTION_REJECTED');
  }

  return new RpcError('Unknown transaction state.', 500, 'UNKNOWN_TRANSACTION');
};

module.exports = { parseTransactionError };
