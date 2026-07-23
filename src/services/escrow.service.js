const StellarSdk = require('stellar-sdk');

/**
 * Factory function for the Escrow Service.
 * @param {Object} deps - Dependencies
 * @param {Object} deps.transactionBuilder - The injected transaction builder.
 * @param {Object} deps.config - Application configuration.
 * @param {Object} deps.userRepository - User Data Access Repository.
 * @param {Object} deps.walletRepository - Wallet Data Access Repository.
 * @param {Object} deps.escrowIntentRepository - Escrow Intent Data Access Repository.
 */
const createEscrowService = ({ transactionBuilder, config, userRepository, walletRepository, escrowIntentRepository }) => {
  /**
   * Constructs an unsigned contract invocation for creating an escrow.
   * @param {Object} params - Escrow parameters
   * @param {string} params.buyer - Buyer's address
   * @param {string} params.seller - Seller's address
   * @param {string} params.amount - Escrow amount (string to handle large numbers safely)
   * @returns {Promise<string>} Base64 encoded unsigned transaction XDR
   */
  const createEscrow = async (params) => {

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

  return { createEscrow, lockEscrow, releaseEscrow, refundEscrow, userRepository, walletRepository, escrowIntentRepository };
};

module.exports = { createEscrowService };
