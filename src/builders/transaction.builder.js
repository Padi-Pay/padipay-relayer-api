const StellarSdk = require('stellar-sdk');
const RpcError = require('../errors/RpcError');
const StellarError = require('../errors/StellarError');

/**
 * Factory function to create a dependency-injected transaction builder service.
 * @param {Object} deps - Dependencies required for transaction building.
 * @param {StellarSdk.SorobanRpc.Server} deps.server - The Soroban RPC server instance.
 * @param {StellarSdk.Contract} deps.contract - The initialized Soroban contract instance.
 * @param {Object} deps.config - Application configuration.
 */
const createTransactionBuilder = ({ server, contract, config }) => {
  /**
   * Builds an unsigned Soroban transaction for contract invocation.
   * @param {string} sourceAddress - Address of the transaction initiator/sponsor
   * @param {string} method - Contract method to invoke
   * @param {StellarSdk.xdr.ScVal[]} params - Method arguments
   * @returns {Promise<string>} Base64 encoded transaction XDR
   */
  const buildTransaction = async (sourceAddress, method, params = []) => {
    let account;
    try {
      account = await server.getAccount(sourceAddress);
    } catch (error) {
      throw new RpcError(`Failed to fetch account sequence: ${error.message}`);
    }

    try {
      const operation = contract.call(method, ...params);

      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: config.NETWORK_PASSPHRASE,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      return transaction.toXDR();
    } catch (error) {
      throw new StellarError(`Failed to build transaction: ${error.message}`);
    }
  };

  return { buildTransaction };
};

module.exports = { createTransactionBuilder };
