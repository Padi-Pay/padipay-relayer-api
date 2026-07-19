const express = require('express');
const router = express.Router();
const { validate } = require('../middleware/validate.middleware');
const { submitEscrowSchema } = require('../validation/schemas/escrow.schema');
const { fundWalletSchema } = require('../validation/schemas/funding.schema');
const { createWalletProvider } = require('../providers/wallet.provider');
const { createFundingService } = require('../services/funding.service');

// TODO: Import escrow service and horizon service (to be implemented in Phase 4)
// const escrowService = require('../services/escrow.service');
// const horizonService = require('../services/horizon.service');

// Compose the funding service against the generic wallet provider abstraction.
const walletProvider = createWalletProvider();
const fundingService = createFundingService({ walletProvider });

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
 * GET /status/:txId
 * Endpoint to check the on-chain status of a previously submitted transaction.
 */
router.get('/status/:txId', async (req, res) => {
  const { txId } = req.params;
  // TODO: Link this route to horizonService.getTransactionStatus()
  res.status(200).json({ message: 'status route scaffolded', txId });
});

module.exports = router;
