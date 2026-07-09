const StellarSdk = require('stellar-sdk');
const config = require('../config/env.config');
const { contract } = require('./soroban.client');

// Initialize Soroban RPC Server
const server = new StellarSdk.SorobanRpc.Server(config.RPC_URL);

/**
 * Builds an unsigned Soroban transaction for contract invocation.
 * @param {string} sourceAddress - Address of the transaction initiator/sponsor
 * @param {string} method - Contract method to invoke
 * @param {StellarSdk.xdr.ScVal[]} params - Method arguments
 * @returns {Promise<string>} Base64 encoded transaction XDR
 */
const buildTransaction = async (sourceAddress, method, params = []) => {
  try {
    // Fetch account details to get the current sequence number
    const account = await server.getAccount(sourceAddress);

    // Construct the contract invocation operation
    const operation = contract.call(method, ...params);

    // Build the transaction
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: config.NETWORK_PASSPHRASE,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    return transaction.toXDR();
  } catch (error) {
    const err = new Error(`Failed to build transaction: ${error.message}`);
    err.statusCode = 500;
    err.code = 'BUILD_TX_ERROR';
    throw err;
  }
};

module.exports = { buildTransaction };
