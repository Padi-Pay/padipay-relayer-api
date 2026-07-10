const RpcError = require('../errors/RpcError');

/**
 * Factory function for the Network Service (Horizon/RPC) handling network queries.
 * @param {Object} deps - Dependencies
 * @param {StellarSdk.SorobanRpc.Server} deps.server - The Soroban RPC server instance
 */
const createHorizonService = ({ server }) => {
  /**
   * Queries the Stellar RPC network for the status of a specific transaction.
   * @param {string} txId - The transaction ID hash to query.
   * @returns {Promise<Object>} Normalized status object
   */
  const getTransactionStatus = async (txId) => {
    try {
      const response = await server.getTransaction(txId);

      if (response.status === 'NOT_FOUND') {
        return {
          success: false,
          code: 'TX_NOT_FOUND',
          message: 'The transaction could not be found.',
        };
      }

      return {
        success: true,
        status: response.status,
        txId,
        resultXdr: response.resultXdr,
        errorResultXdr: response.errorResultXdr,
      };
    } catch (error) {
      console.error('[STATUS EXCEPTION]', error);
      throw new RpcError('Failed to fetch transaction status from RPC.');
    }
  };

  return { getTransactionStatus };
};

module.exports = { createHorizonService };
