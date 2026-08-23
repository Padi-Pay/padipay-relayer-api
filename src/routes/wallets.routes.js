const express = require('express');
const AppError = require('../errors/AppError');
const { validate } = require('../middleware/validate.middleware');
const { withdrawSchema } = require('../validation/schemas/wallet.schema');
const { StrKey } = require('@stellar/stellar-sdk');
const { AUDIT_ACTIONS } = require('../services/audit-logger.service');

const NO_OP_LOGGER = { log: () => {} };

/**
 * Factory function for Wallets API routes.
 * @param {Object} deps - Dependencies
 * @param {Object} deps.walletProvider - The wallet provider instance
 * @param {Object} deps.walletRepository - The wallet repository instance
 * @param {Object} [deps.auditLogger] - Structured audit logger (optional, defaults to no-op)
 */
const createWalletsRoutes = ({ walletProvider, walletRepository, auditLogger = NO_OP_LOGGER }) => {
  const router = express.Router();

  router.get('/me', async (req, res, next) => {
    try {
      const userId = req.user.id;
      const wallet = await walletRepository.findByUserId(userId);

      if (!wallet) {
        throw new AppError('Wallet not found', 404);
      }

      res.status(200).json({
        success: true,
        message: 'Wallet retrieved successfully',
        data: {
          id: wallet.id,
          publicKey: wallet.publicKey,
          createdAt: wallet.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/me/balance', async (req, res, next) => {
    try {
      const userId = req.user.id;
      const wallet = await walletRepository.findByUserId(userId);

      if (!wallet) {
        throw new AppError('Wallet not found', 404);
      }

      const balanceStr = await walletProvider.getBalance(wallet.publicKey);

      res.status(200).json({
        success: true,
        message: 'Wallet balance retrieved successfully',
        data: {
          balance: balanceStr,
          asset: 'XLM',
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/withdraw', validate(withdrawSchema), async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { destinationAddress, amount, asset } = req.body;
      const auditCtx = { userId, ip: req.ip, correlationId: req.id };

      if (!StrKey.isValidEd25519PublicKey(destinationAddress)) {
        auditLogger.log({
          action: AUDIT_ACTIONS.WALLET_WITHDRAWAL_FAILED,
          ...auditCtx,
          meta: { reason: 'Invalid destination address', destinationAddress },
        });
        throw new AppError('Invalid Stellar destination address', 400);
      }

      const wallet = await walletRepository.findByUserId(userId);
      if (!wallet) {
        throw new AppError('Wallet not found', 404);
      }

      const balanceStr = await walletProvider.getBalance(wallet.publicKey);
      const balance = Number(balanceStr);
      const withdrawAmount = Number(amount);

      if (withdrawAmount > balance) {
        auditLogger.log({
          action: AUDIT_ACTIONS.WALLET_WITHDRAWAL_FAILED,
          ...auditCtx,
          meta: { reason: 'Insufficient balance', amount, balance: balanceStr, asset },
        });
        throw new AppError('Withdrawal amount exceeds available balance', 400);
      }

      const receipt = await walletProvider.withdrawFromWallet({
        walletAddress: wallet.publicKey,
        amount,
        asset,
        destinationAddress,
        secretKey: wallet.encryptedSecretKey,
      });

      auditLogger.log({
        action: AUDIT_ACTIONS.WALLET_WITHDRAWAL_INITIATED,
        ...auditCtx,
        meta: { destinationAddress, amount, asset, reference: receipt.reference },
      });

      res.status(200).json({
        success: true,
        message: 'Withdrawal initiated successfully',
        data: receipt,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};

module.exports = { createWalletsRoutes };
