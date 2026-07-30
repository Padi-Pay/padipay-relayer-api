const express = require('express');
const StellarSdk = require('stellar-sdk');
const router = express.Router();
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { submitEscrowSchema, escrowActionSchema } = require('../validation/schemas/escrow.schema');
const { fundWalletSchema } = require('../validation/schemas/funding.schema');
const { createWalletProvider } = require('../providers/wallet.provider');
const { createFundingService } = require('../services/funding.service');
const { createEscrowFundingService } = require('../services/escrow-funding.service');
const { createTransactionBuilder } = require('../builders/transaction.builder');
const { createSorobanClient } = require('../clients/soroban.client');
const { loadConfig } = require('../config/env.config');
const { EscrowIntentRepository } = require('../repositories/escrow-intent.repository');
const { WalletRepository } = require('../repositories/wallet.repository');

// TODO: Import escrow service and horizon service (to be implemented in Phase 4)
// const escrowService = require('../services/escrow.service');
// const horizonService = require('../services/horizon.service');

// Compose the funding service against the generic wallet provider abstraction.
const walletProvider = createWalletProvider();
const fundingService = createFundingService({ walletProvider });

// Data access dependencies for the escrow funding orchestration route.
const escrowIntentRepository = new EscrowIntentRepository();
const walletRepository = new WalletRepository();

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
 * POST /escrow/:id/fund
 * Endpoint to fund a specific EscrowIntent from the authenticated buyer's
 * managed wallet. Coordinates the generic wallet provider withdrawal with
 * the Soroban transaction builder, and returns a sponsored (fee-bumped)
 * unsigned transaction XDR for the buyer's embedded wallet to sign.
 */
router.post('/escrow/:id/fund', authenticate, validate(escrowActionSchema), async (req, res, next) => {
  try {
    // Built lazily per-request: relayer.routes.js is required directly in
    // tests without RPC/contract env vars set, so config/server/contract
    // construction cannot happen at module load time.
    const config = loadConfig();
    const server = new StellarSdk.SorobanRpc.Server(config.RPC_URL);
    const contract = createSorobanClient(config);
    const transactionBuilder = createTransactionBuilder({ server, contract, config });
    const escrowFundingService = createEscrowFundingService({
      escrowIntentRepository,
      walletRepository,
      walletProvider,
      transactionBuilder,
    });

    const result = await escrowFundingService.fundEscrow({
      escrowIntentId: req.params.id,
      buyerId: req.user.id,
    });

    res.status(200).json({
      success: true,
      message: 'Escrow funding transaction constructed and sponsored',
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
