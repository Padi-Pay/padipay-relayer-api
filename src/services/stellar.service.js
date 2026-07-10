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
   * @returns {Promise<string>} The transaction hash returned by the network
   */
  const submitTransaction = async (signedTransactionXdr) => {
    try {
      const transaction = StellarSdk.TransactionBuilder.fromXDR(signedTransactionXdr, config.NETWORK_PASSPHRASE);
      const response = await server.sendTransaction(transaction);

      if (response.status === 'ERROR') {
        throw new Error(JSON.stringify(response.errorResultXdr || response.errorResult));
      }

      return response.hash;
    } catch (error) {
      throw new RpcError(`Transaction submission failed: ${error.message}`);
    }
  };

  return { signTransaction, submitTransaction };
};

module.exports = { createStellarService };
