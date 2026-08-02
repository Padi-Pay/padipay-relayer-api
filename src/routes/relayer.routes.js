const express = require('express');
const StellarSdk = require('stellar-sdk');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { submitEscrowSchema, createEscrowSchema, escrowActionSchema } = require('../validation/schemas/escrow.schema');
const { fundWalletSchema } = require('../validation/schemas/funding.schema');
const { createWalletProvider } = require('../providers/wallet.provider');
const { createFundingService } = require('../services/funding.service');
const { createEscrowFundingService } = require('../services/escrow-funding.service');
const { createTransactionBuilder } = require('../builders/transaction.builder');
const { createSorobanClient } = require('../clients/soroban.client');
const { loadConfig } = require('../config/env.config');
const { EscrowIntentRepository } = require('../repositories/escrow-intent.repository');
const { WalletRepository } = require('../repositories/wallet.repository');

const walletProvider = createWalletProvider();
const fundingService = createFundingService({ walletProvider });

const escrowIntentRepository = new EscrowIntentRepository();
const walletRepository = new WalletRepository();

const createRelayerRoutes = ({ escrowService, stellarService, horizonService }) => {
  const router = express.Router();

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

  router.post('/escrow/:id/fund', authenticate, validate(escrowActionSchema), async (req, res, next) => {
    try {
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

  router.post('/create-escrow', validate(createEscrowSchema), async (req, res, next) => {
    try {
      const { unsignedXdr, escrowIntentId } = await escrowService.createEscrow(req.body);
      const signedXdr = stellarService.signTransaction(unsignedXdr);
      const result = await stellarService.submitTransaction(signedXdr);
      
      await escrowService.recordTransaction(escrowIntentId, result.hash, 'SUCCESS'); // Assuming success for now

      res.status(200).json({
        message: 'Escrow created successfully',
        result,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/submit-escrow', validate(submitEscrowSchema), async (req, res, next) => {
    try {
      const { actionType, params } = req.body;
      
      if (!params || !params.id) {
        return res.status(400).json({ message: 'Escrow ID is required in params' });
      }

      let unsignedXdr;
      let escrowIntentId;
      const escrowId = params.id;

      switch (actionType) {
        case 'LOCK':
          ({ unsignedXdr, escrowIntentId } = await escrowService.lockEscrow({ escrowId }));
          break;
        case 'RELEASE':
          ({ unsignedXdr, escrowIntentId } = await escrowService.releaseEscrow({ escrowId }));
          break;
        case 'REFUND':
          ({ unsignedXdr, escrowIntentId } = await escrowService.refundEscrow({ escrowId }));
          break;
        case 'DISPUTE':
          throw new Error('DISPUTE action not yet implemented in service layer.');
        default:
          throw new Error(`Unsupported actionType: ${actionType}`);
      }

      const signedXdr = stellarService.signTransaction(unsignedXdr);
      const result = await stellarService.submitTransaction(signedXdr);
      
      await escrowService.recordTransaction(escrowIntentId, result.hash, 'SUCCESS');

      res.status(200).json({
        message: `Escrow ${actionType} action submitted successfully`,
        result,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/status/:txId', async (req, res, next) => {
    try {
      const { txId } = req.params;
      const status = await horizonService.getTransactionStatus(txId);
      
      res.status(200).json({
        message: 'Transaction status retrieved',
        status,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};

module.exports = { createRelayerRoutes };
