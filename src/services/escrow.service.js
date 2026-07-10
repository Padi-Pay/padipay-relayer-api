const StellarSdk = require('stellar-sdk');
const ValidationError = require('../errors/ValidationError');

/**
 * Factory function for the Escrow Service.
 * @param {Object} deps - Dependencies
 * @param {Object} deps.transactionBuilder - The injected transaction builder.
 * @param {Object} deps.config - Application configuration.
 */
const createEscrowService = ({ transactionBuilder, config }) => {
  /**
   * Constructs an unsigned contract invocation for creating an escrow.
   * @param {Object} params - Escrow parameters
   * @param {string} params.buyer - Buyer's address
   * @param {string} params.seller - Seller's address
   * @param {string} params.amount - Escrow amount (string to handle large numbers safely)
   * @returns {Promise<string>} Base64 encoded unsigned transaction XDR
   */
  const createEscrow = async (params) => {
    if (!params || !params.buyer || !params.seller || !params.amount) {
      throw new ValidationError('Missing required parameters for createEscrow: buyer, seller, amount');
    }

    const { buyer, seller, amount } = params;

    const scValParams = [
      StellarSdk.nativeToScVal(buyer, { type: 'address' }),
      StellarSdk.nativeToScVal(seller, { type: 'address' }),
      StellarSdk.nativeToScVal(amount, { type: 'i128' }),
    ];

    // The relayer sponsor account acts as the transaction source
    const sourceAddress = StellarSdk.Keypair.fromSecret(config.FEE_BUMP_SECRET_KEY).publicKey();

    return await transactionBuilder.buildTransaction(
      sourceAddress,
      'create_escrow',
      scValParams
    );
  };

  /**
   * Constructs an unsigned contract invocation for locking funds in an escrow.
   * @param {Object} params - Escrow parameters
   * @param {string} params.escrowId - The unique identifier of the escrow
   * @returns {Promise<string>} Base64 encoded unsigned transaction XDR
   */
  const lockEscrow = async ({ escrowId }) => {
    if (!escrowId) {
      throw new ValidationError('Missing required parameter for lockEscrow: escrowId');
    }

    const scValParams = [
      StellarSdk.nativeToScVal(escrowId, { type: 'u64' }), // Assuming u64 for escrowId
    ];

    const sourceAddress = StellarSdk.Keypair.fromSecret(config.FEE_BUMP_SECRET_KEY).publicKey();

    return await transactionBuilder.buildTransaction(
      sourceAddress,
      'lock_funds', // The presumed contract method
      scValParams
    );
  };

  /**
   * Constructs an unsigned contract invocation for releasing funds to the seller.
   * @param {Object} params - Escrow parameters
   * @param {string} params.escrowId - The unique identifier of the escrow
   * @returns {Promise<string>} Base64 encoded unsigned transaction XDR
   */
  const releaseEscrow = async ({ escrowId }) => {
    if (!escrowId) {
      throw new ValidationError('Missing required parameter for releaseEscrow: escrowId');
    }

    const scValParams = [
      StellarSdk.nativeToScVal(escrowId, { type: 'u64' }),
    ];

    const sourceAddress = StellarSdk.Keypair.fromSecret(config.FEE_BUMP_SECRET_KEY).publicKey();

    return await transactionBuilder.buildTransaction(
      sourceAddress,
      'release', // The presumed contract method
      scValParams
    );
  };

  /**
   * Constructs an unsigned contract invocation for refunding funds to the buyer.
   * @param {Object} params - Escrow parameters
   * @param {string} params.escrowId - The unique identifier of the escrow
   * @returns {Promise<string>} Base64 encoded unsigned transaction XDR
   */
  const refundEscrow = async ({ escrowId }) => {
    if (!escrowId) {
      throw new ValidationError('Missing required parameter for refundEscrow: escrowId');
    }

    const scValParams = [
      StellarSdk.nativeToScVal(escrowId, { type: 'u64' }),
    ];

    const sourceAddress = StellarSdk.Keypair.fromSecret(config.FEE_BUMP_SECRET_KEY).publicKey();

    return await transactionBuilder.buildTransaction(
      sourceAddress,
      'refund', // The presumed contract method
      scValParams
    );
  };

  return { createEscrow, lockEscrow, releaseEscrow, refundEscrow };
};

module.exports = { createEscrowService };
