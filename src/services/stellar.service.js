const StellarSdk = require('@stellar/stellar-sdk');
const RpcError = require('../errors/RpcError');
const StellarError = require('../errors/StellarError');
const { parseTransactionError } = require('../utils/error.parser');
const logger = require('../config/logger');

/**
 * Factory function for Stellar Service handling transaction operations like signing and submission.
 * @param {Object} deps - Dependencies
 * @param {Object} deps.config - Application configuration
 * @param {StellarSdk.rpc.Server} deps.server - The Soroban RPC server instance
 */
const createStellarService = ({ config, server }) => {
  /**
   * Signs a transaction (or fee bump transaction) using the configured sponsor account.
   * @param {string} transactionXdr - Base64 encoded XDR of the unsigned transaction
   * @returns {string} Base64 encoded signed transaction XDR
   */
  const signTransaction = (transactionXdr) => {

    try {
      const sponsorKeypair = StellarSdk.Keypair.fromSecret(config.FEE_BUMP_SECRET_KEY);
      const transaction = StellarSdk.TransactionBuilder.fromXDR(transactionXdr, config.NETWORK_PASSPHRASE);
      
      transaction.sign(sponsorKeypair);
      
      return transaction.toXDR();
    } catch (error) {
      throw new StellarError(`Failed to sign transaction: ${error.message}`);
    }
  };

  /**
   * Submits a signed transaction to the Stellar RPC network.
   * @param {string} signedTransactionXdr - Base64 encoded XDR of the signed transaction
   * @returns {Promise<Object>} Normalized submission result containing success status, hash, network, and timestamp.
   */
  const submitTransaction = async (signedTransactionXdr) => {
    try {
      const transaction = StellarSdk.TransactionBuilder.fromXDR(signedTransactionXdr, config.NETWORK_PASSPHRASE);
      const response = await server.sendTransaction(transaction);

      if (response.status === 'ERROR') {
        // Log the raw error internally to avoid leaking it to the client
        logger.error({ errorResultXdr: response.errorResultXdr, errorResult: response.errorResult }, '[SUBMISSION ERROR] Transaction returned error status');
        throw parseTransactionError(response);
      }

      return {
        success: true,
        hash: response.hash,
        network: config.NETWORK_PASSPHRASE,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof RpcError || error instanceof StellarError) {
        throw error; // Re-throw handled errors
      }
      // Log unexpected runtime errors (e.g. network connectivity issues)
      logger.error({ err: error }, '[SUBMISSION EXCEPTION] Unexpected error during transaction submission');
      throw parseTransactionError(error);
    }
  };

  return { signTransaction, submitTransaction };
};

module.exports = { createStellarService };
