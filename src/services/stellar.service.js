const StellarSdk = require('stellar-sdk');
const StellarError = require('../errors/StellarError');
const ConfigError = require('../errors/ConfigError');
const RpcError = require('../errors/RpcError');

/**
 * Factory function for Stellar Service handling transaction operations like signing and submission.
 * @param {Object} deps - Dependencies
 * @param {Object} deps.config - Application configuration
 * @param {StellarSdk.SorobanRpc.Server} deps.server - The Soroban RPC server instance
 */
const createStellarService = ({ config, server }) => {
  /**
   * Signs a transaction (or fee bump transaction) using the configured sponsor account.
   * @param {string} transactionXdr - Base64 encoded XDR of the unsigned transaction
   * @returns {string} Base64 encoded signed transaction XDR
   */
  const signTransaction = (transactionXdr) => {
    if (!config.FEE_BUMP_SECRET_KEY) {
      throw new ConfigError('FEE_BUMP_SECRET_KEY is missing from configuration');
    }

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
        console.error('[SUBMISSION ERROR]', response.errorResultXdr || response.errorResult);
        throw new RpcError('The transaction was rejected by the network.');
      }

      return {
        success: true,
        hash: response.hash,
        network: config.NETWORK_PASSPHRASE,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof RpcError) {
        throw error; // Re-throw handled errors
      }
      // Log unexpected runtime errors (e.g. network connectivity issues)
      console.error('[SUBMISSION EXCEPTION]', error);
      throw new RpcError('An unexpected error occurred during transaction submission.');
    }
  };

  return { signTransaction, submitTransaction };
};

module.exports = { createStellarService };
