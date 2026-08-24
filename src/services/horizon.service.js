const RpcError = require('../errors/RpcError');
const { parseTransactionStatus } = require('../utils/status.parser');
const logger = require('../config/logger');

/**
 * Factory function for the Network Service (Horizon/RPC) handling network queries.
 * @param {Object} deps - Dependencies
 * @param {StellarSdk.rpc.Server} deps.server - The Soroban RPC server instance
 * @param {StellarSdk.Horizon.Server} deps.horizonServer - The Horizon server instance
 */
const createHorizonService = ({ server, horizonServer }) => {
  /**
   * Retrieves the native XLM balance for a given Stellar account.
   * @param {string} accountId - The Stellar account ID (public key).
   * @returns {Promise<string>} The balance as a string.
   */
  const getAccountBalance = async (accountId) => {
    try {
      const account = await horizonServer.loadAccount(accountId);
      const nativeBalance = account.balances.find((b) => b.asset_type === 'native');
      return nativeBalance ? nativeBalance.balance : '0.0000000';
    } catch (error) {
      if (error.response && error.response.status === 404) {
        // Account not found on the network means it has 0 balance (not funded yet)
        return '0.0000000';
      }
      logger.error({ err: error }, '[BALANCE EXCEPTION] Failed to fetch account balance');
      throw new RpcError('Failed to fetch account balance from Horizon.');
    }
  };

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
      logger.error({ err: error }, '[STATUS EXCEPTION] Failed to fetch transaction status');
      throw new RpcError('Failed to fetch transaction status from RPC.');
    }
  };

  return { getTransactionStatus, getAccountBalance };
};

module.exports = { createHorizonService };
