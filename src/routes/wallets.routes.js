const express = require('express');
const router = express.Router();
const AppError = require('../errors/AppError');
const prisma = require('../clients/prisma.client');
const { WalletRepository } = require('../repositories/wallet.repository');

const walletRepository = new WalletRepository(prisma);

router.get('/', async (req, res, next) => {
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

module.exports = router;
