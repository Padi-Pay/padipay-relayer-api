const StellarSdk = require('stellar-sdk');
const AppError = require('../errors/AppError');

/**
 * Factory function for the Escrow Funding Orchestration Service.
 *
 * Coordinates a generic wallet provider withdrawal with the Soroban
 * transaction builder to fund a specific EscrowIntent from a buyer's managed
 * wallet. Only constructs and sponsors the on-chain transaction; signing and
 * submission happen client-side with the buyer's embedded wallet.
 *
 * @param {Object} deps - Dependencies
 * @param {Object} deps.escrowIntentRepository - Escrow Intent Data Access Repository.
 * @param {Object} deps.walletRepository - Wallet Data Access Repository.
 * @param {Object} deps.walletProvider - The injected generic wallet provider.
 * @param {Object} deps.transactionBuilder - The injected Soroban transaction builder.
 */
const createEscrowFundingService = ({ escrowIntentRepository, walletRepository, walletProvider, transactionBuilder }) => {
  /**
   * Funds a specific escrow intent from the buyer's managed wallet.
   * @param {Object} params - Funding parameters
   * @param {string} params.escrowIntentId - The EscrowIntent to fund.
   * @param {string} params.buyerId - The authenticated buyer's user id.
   * @returns {Promise<Object>} The updated escrow intent, sponsored transaction XDR, and withdrawal receipt.
   */
  const fundEscrow = async ({ escrowIntentId, buyerId }) => {
    const escrowIntent = await escrowIntentRepository.findById(escrowIntentId);
    if (!escrowIntent) {
      throw new AppError('Escrow intent not found', 404);
    }

    if (escrowIntent.buyerId !== buyerId) {
      throw new AppError('You are not authorized to fund this escrow', 403);
    }

    if (escrowIntent.status !== 'PENDING') {
      throw new AppError(`Escrow intent is not fundable in its current state: ${escrowIntent.status}`, 409);
    }

    if (!escrowIntent.sorobanEscrowId) {
      throw new AppError('Escrow has not been created on-chain yet', 409);
    }

    const wallet = await walletRepository.findByUserId(buyerId);
    if (!wallet) {
      throw new AppError('Managed wallet not found for buyer', 404);
    }

    const amount = String(escrowIntent.amount);
    const asset = 'XLM';

    const withdrawal = await walletProvider.withdrawFromWallet({
      walletAddress: wallet.stellarAddress,
      amount,
      asset,
    });

    let sponsoredXdr;
    try {
      const scValParams = [
        StellarSdk.nativeToScVal(escrowIntent.sorobanEscrowId, { type: 'u64' }),
      ];

      const xdr = await transactionBuilder.buildTransaction(wallet.stellarAddress, 'lock_funds', scValParams);
      sponsoredXdr = transactionBuilder.buildFeeBumpTransaction(xdr);
    } catch (error) {
      // Roll back the reserved managed-wallet balance since the on-chain
      // transaction could not be constructed/sponsored.
      await walletProvider.fundWallet({ walletAddress: wallet.stellarAddress, amount, asset });
      throw error;
    }

    const updatedEscrowIntent = await escrowIntentRepository.update(escrowIntent.id, { status: 'FUNDING_SPONSORED' });

    return {
      escrowIntent: updatedEscrowIntent,
      transactionXdr: sponsoredXdr,
      withdrawal,
    };
  };

  return { fundEscrow };
};

module.exports = { createEscrowFundingService };
