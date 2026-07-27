const AppError = require('../errors/AppError');

/**
 * Factory function for the On-Chain Synchronization Service.
 *
 * Bridges the off-chain EscrowIntent record with the on-chain truth: given
 * the outcome of a previously submitted transaction (reported by a webhook
 * or internal callback, never polled directly here), it deterministically
 * stamps the intent with the resulting Soroban escrow id and transitions its
 * status from PENDING to LOCKED.
 *
 * @param {Object} deps - Dependencies
 * @param {Object} deps.escrowIntentRepository - Escrow Intent Data Access Repository.
 */
const createEscrowSyncService = ({ escrowIntentRepository }) => {
  /**
   * Synchronizes an EscrowIntent with the outcome of its on-chain transaction.
   * @param {Object} params - Synchronization parameters
   * @param {string} params.escrowIntentId - The EscrowIntent to synchronize.
   * @param {string} params.sorobanEscrowId - The on-chain escrow id to stamp.
   * @param {string} params.status - The reported transaction status (e.g. 'SUCCESS').
   * @returns {Promise<Object>} `{ escrowIntent, synchronized }`
   */
  const syncEscrowOnChain = async ({ escrowIntentId, sorobanEscrowId, status }) => {
    const escrowIntent = await escrowIntentRepository.findById(escrowIntentId);
    if (!escrowIntent) {
      throw new AppError('Escrow intent not found', 404);
    }

    if (status !== 'SUCCESS') {
      // Not a caller error: the reported transaction simply didn't succeed,
      // so there is nothing to synchronize.
      return { escrowIntent, synchronized: false };
    }

    if (escrowIntent.status === 'LOCKED') {
      if (escrowIntent.sorobanEscrowId === sorobanEscrowId) {
        // Duplicate delivery of the same synchronization event: idempotent no-op.
        return { escrowIntent, synchronized: true };
      }
      throw new AppError('Escrow intent already locked with a different on-chain escrow id', 409);
    }

    if (escrowIntent.status !== 'PENDING') {
      throw new AppError(`Escrow intent is not awaiting synchronization in its current state: ${escrowIntent.status}`, 409);
    }

    const updatedEscrowIntent = await escrowIntentRepository.update(escrowIntentId, {
      sorobanEscrowId,
      status: 'LOCKED',
    });

    return { escrowIntent: updatedEscrowIntent, synchronized: true };
  };

  return { syncEscrowOnChain };
};

module.exports = { createEscrowSyncService };
