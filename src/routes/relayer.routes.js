const express = require('express');
const router = express.Router();
const { validate } = require('../middleware/validate.middleware');
const { submitEscrowSchema, syncEscrowSchema } = require('../validation/schemas/escrow.schema');
const { fundWalletSchema } = require('../validation/schemas/funding.schema');
const { createWalletProvider } = require('../providers/wallet.provider');
const { createFundingService } = require('../services/funding.service');
const { createEscrowSyncService } = require('../services/escrow-sync.service');
const { EscrowIntentRepository } = require('../repositories/escrow-intent.repository');

// TODO: Import escrow service and horizon service (to be implemented in Phase 4)
// const escrowService = require('../services/escrow.service');
// const horizonService = require('../services/horizon.service');

// Compose the funding service against the generic wallet provider abstraction.
const walletProvider = createWalletProvider();
const fundingService = createFundingService({ walletProvider });

// Compose the on-chain synchronization service against the escrow intent repository.
const escrowIntentRepository = new EscrowIntentRepository();
const escrowSyncService = createEscrowSyncService({ escrowIntentRepository });

/**
 * POST /submit-escrow
 * Endpoint for the WhatsApp bot to request a new escrow action.
 */
router.post('/submit-escrow', validate(submitEscrowSchema), async (req, res) => {
  // TODO: Link this route to escrowService.processEscrowAction()
  res.status(200).json({ message: 'submit-escrow route scaffolded' });
});

/**
 * POST /fund
 * Endpoint to initiate a managed wallet funding (top-up) request.
 * The payload is strictly validated before being routed to the generic
 * wallet provider abstraction to prevent arbitrary amount injections.
 */
router.post('/fund', validate(fundWalletSchema), async (req, res, next) => {
  try {
    const receipt = await fundingService.fundWallet(req.body);
    res.status(202).json({
      success: true,
      message: 'Wallet funding initiated',
      data: receipt,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /escrow/:id/sync
 * Internal/webhook endpoint that bridges an EscrowIntent's off-chain record
 * with the outcome of its on-chain transaction: on a reported SUCCESS it
 * deterministically stamps the intent with the on-chain escrow id and
 * transitions its status from PENDING to LOCKED. Not tied to a specific
 * user session, so it is not gated by the `authenticate` middleware.
 */
router.post('/escrow/:id/sync', validate(syncEscrowSchema), async (req, res, next) => {
  try {
    const result = await escrowSyncService.syncEscrowOnChain({
      escrowIntentId: req.params.id,
      sorobanEscrowId: req.body.sorobanEscrowId,
      status: req.body.status,
    });

    res.status(200).json({
      success: true,
      message: 'Escrow intent synchronization processed',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /status/:txId
 * Endpoint to check the on-chain status of a previously submitted transaction.
 */
router.get('/status/:txId', async (req, res) => {
  const { txId } = req.params;
  // TODO: Link this route to horizonService.getTransactionStatus()
  res.status(200).json({ message: 'status route scaffolded', txId });
});

module.exports = router;
