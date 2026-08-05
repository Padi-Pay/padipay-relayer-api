const StellarSdk = require('stellar-sdk');

/**
 * Factory function for the Escrow Service.
 * @param {Object} deps - Dependencies
 * @param {Object} deps.transactionBuilder - The injected transaction builder.
 * @param {Object} deps.config - Application configuration.
 * @param {Object} deps.userRepository - User Data Access Repository.
 * @param {Object} deps.walletRepository - Wallet Data Access Repository.
 * @param {Object} deps.escrowIntentRepository - Escrow Intent Data Access Repository.
 * @param {Object} deps.transactionRepository - Transaction persistence.
 */
const createEscrowService = ({ transactionBuilder, config, userRepository, walletRepository, escrowIntentRepository, transactionRepository }) => {
  /**
   * Constructs an unsigned contract invocation for creating an escrow.
   * @param {Object} params - Escrow parameters
   * @param {string} params.buyer - Buyer's address
   * @param {string} params.seller - Seller's address
   * @param {string} params.amount - Escrow amount (string to handle large numbers safely)
   * @returns {Promise<Object>} Base64 encoded unsigned transaction XDR and the intent ID
   */
  const createEscrow = async (params) => {
    const { buyer, seller, amount, asset } = params;

    // Persist intent to DB (graceful degradation if repo not provided in tests)
    const escrowIntent = escrowIntentRepository ? await escrowIntentRepository.create({
      buyerAddress: buyer,
      sellerAddress: seller,
      amount: amount,
      asset: asset || 'XLM',
      actionType: 'CREATE',
      status: 'PENDING',
    }) : { id: 'mock-id' };

    // Hardcoded Testnet XLM address for now
    const tokenAddress = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

    const scValParams = [
      StellarSdk.nativeToScVal(buyer, { type: 'address' }),
      StellarSdk.nativeToScVal(seller, { type: 'address' }),
      StellarSdk.nativeToScVal(tokenAddress, { type: 'address' }),
      StellarSdk.nativeToScVal(amount, { type: 'i128' }),
    ];

    const sourceAddress = StellarSdk.Keypair.fromSecret(config.FEE_BUMP_SECRET_KEY).publicKey();

    const unsignedXdr = await transactionBuilder.buildTransaction(
      sourceAddress,
      'create_escrow',
      scValParams
    );

    return { unsignedXdr, escrowIntentId: escrowIntent.id };
  };

  /**
   * Constructs an unsigned contract invocation for locking funds in an escrow.
   * @param {Object} params - Escrow parameters
   * @param {string} params.escrowId - The unique identifier of the escrow intent
   * @returns {Promise<Object>} Base64 encoded unsigned transaction XDR and intent ID
   */
  const lockEscrow = async ({ escrowId }) => {
    // Assuming escrowId here refers to the EscrowIntent ID (off-chain DB ID)
    const intent = escrowIntentRepository ? await escrowIntentRepository.findById(escrowId) : { onChainEscrowId: escrowId, id: escrowId };
    if (!intent) {
      throw new Error('Escrow Intent not found');
    }

    const scValParams = [
      StellarSdk.nativeToScVal(intent.onChainEscrowId || escrowId, { type: 'u64' }), // Fallback for now
    ];

    const sourceAddress = StellarSdk.Keypair.fromSecret(config.FEE_BUMP_SECRET_KEY).publicKey();

    const unsignedXdr = await transactionBuilder.buildTransaction(
      sourceAddress,
      'lock_funds', 
      scValParams
    );
    
    return { unsignedXdr, escrowIntentId: intent.id };
  };

  /**
   * Constructs an unsigned contract invocation for releasing funds to the seller.
   */
  const releaseEscrow = async ({ escrowId }) => {
    const intent = escrowIntentRepository ? await escrowIntentRepository.findById(escrowId) : { onChainEscrowId: escrowId, id: escrowId };
    if (!intent) throw new Error('Escrow Intent not found');

    const scValParams = [
      StellarSdk.nativeToScVal(intent.onChainEscrowId || escrowId, { type: 'u64' }),
    ];

    const sourceAddress = StellarSdk.Keypair.fromSecret(config.FEE_BUMP_SECRET_KEY).publicKey();

    const unsignedXdr = await transactionBuilder.buildTransaction(
      sourceAddress,
      'release', 
      scValParams
    );

    return { unsignedXdr, escrowIntentId: intent.id };
  };

  /**
   * Constructs an unsigned contract invocation for refunding funds to the buyer.
   */
  const refundEscrow = async ({ escrowId }) => {
    const intent = escrowIntentRepository ? await escrowIntentRepository.findById(escrowId) : { onChainEscrowId: escrowId, id: escrowId };
    if (!intent) throw new Error('Escrow Intent not found');

    const scValParams = [
      StellarSdk.nativeToScVal(intent.onChainEscrowId || escrowId, { type: 'u64' }),
    ];

    const sourceAddress = StellarSdk.Keypair.fromSecret(config.FEE_BUMP_SECRET_KEY).publicKey();

    const unsignedXdr = await transactionBuilder.buildTransaction(
      sourceAddress,
      'refund', 
      scValParams
    );

    return { unsignedXdr, escrowIntentId: intent.id };
  };

  /**
   * Records a transaction submission for a specific intent.
   */
  const recordTransaction = async (escrowIntentId, txHash, status = 'SUBMITTED') => {
    if (!transactionRepository) return null; // Defensive check for Phase 4 tests
    return transactionRepository.create({
      escrowIntentId,
      txHash,
      status
    });
  };

  return { createEscrow, lockEscrow, releaseEscrow, refundEscrow, recordTransaction, userRepository, walletRepository, escrowIntentRepository };
};

module.exports = { createEscrowService };
