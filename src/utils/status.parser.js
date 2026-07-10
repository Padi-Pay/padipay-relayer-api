/**
 * Parses raw Stellar RPC transaction status responses into a normalized format.
 *
 * @param {Object} response - Raw response from Soroban RPC getTransaction
 * @param {string} [txId] - Optional transaction ID for context
 * @returns {Object} Normalized status response
 */
const parseTransactionStatus = (response, txId) => {
  if (!response) {
    return {
      success: false,
      status: 'UNKNOWN',
      code: 'UNKNOWN_ERROR',
      message: 'No response received from the network.',
    };
  }

  const { status, resultXdr, errorResultXdr } = response;
  const hash = txId || response.hash;

  switch (status) {
    case 'SUCCESS':
      return {
        success: true,
        status: 'SUCCESS',
        txId: hash,
        resultXdr,
        message: 'The transaction was successfully executed.',
      };

    case 'NOT_FOUND':
      return {
        success: false,
        status: 'NOT_FOUND',
        txId: hash,
        code: 'TX_NOT_FOUND',
        message: 'The transaction could not be found.',
      };

    case 'FAILED':
      return {
        success: false,
        status: 'FAILED',
        txId: hash,
        errorResultXdr,
        code: 'TX_FAILED',
        message: 'The transaction failed to execute.',
      };
      
    case 'PENDING':
      return {
        success: true,
        status: 'PENDING',
        txId: hash,
        message: 'The transaction is currently pending.',
      };

    default:
      return {
        success: false,
        status: status || 'UNKNOWN',
        txId: hash,
        code: 'UNKNOWN_STATUS',
        message: `An unknown transaction status was received: ${status}`,
      };
  }
};

module.exports = { parseTransactionStatus };
