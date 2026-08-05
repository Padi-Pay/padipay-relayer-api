const express = require('express');
const AppError = require('../errors/AppError');
const { validate } = require('../middleware/validate.middleware');
const { withdrawSchema } = require('../validation/schemas/wallet.schema');
const { StrKey } = require('stellar-sdk');

/**
 * Factory function for Wallets API routes.
 * @param {Object} deps - Dependencies
 * @param {Object} deps.walletProvider - The wallet provider instance
 * @param {Object} deps.walletRepository - The wallet repository instance
 */
const createWalletsRoutes = ({ walletProvider, walletRepository }) => {
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

      if (!StrKey.isValidEd25519PublicKey(destinationAddress)) {
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
        throw new AppError('Withdrawal amount exceeds available balance', 400);
      }

      const receipt = await walletProvider.withdrawFromWallet({
        walletAddress: wallet.publicKey,
        amount,
        asset,
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
