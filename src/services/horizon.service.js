const RpcError = require('../errors/RpcError');
const { parseTransactionStatus } = require('../utils/status.parser');

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
      return parseTransactionStatus(response, txId);
    } catch (error) {
      console.error('[STATUS EXCEPTION]', error);
      throw new RpcError('Failed to fetch transaction status from RPC.');
    }
  };

  return { getTransactionStatus };
};

module.exports = { createHorizonService };
