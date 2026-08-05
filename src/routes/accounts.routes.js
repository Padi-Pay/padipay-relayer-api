const express = require('express');
const router = express.Router();
const { UserRepository } = require('../repositories/user.repository');
const prisma = require('../clients/prisma.client');
const AppError = require('../errors/AppError');

const userRepository = new UserRepository(prisma);

router.get('/', async (req, res, next) => {
  try {
    const user = await userRepository.findById(req.user.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Return only logical account state
    res.status(200).json({
      success: true,
      message: 'Account status retrieved successfully',
      data: {
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

const { createEscrowRepository } = require('../repositories/escrow.repository');
const escrowRepository = createEscrowRepository({ prisma });

router.get('/escrows', async (req, res, next) => {
  try {
    const escrows = await escrowRepository.findByUserId(req.user.id);
    
    res.status(200).json({
      success: true,
      message: 'Escrows retrieved successfully',
      data: escrows,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/escrows/:id', async (req, res, next) => {
  try {
    const escrow = await escrowRepository.findById(req.params.id);
    if (!escrow) {
      throw new AppError('Escrow not found', 404);
    }
    
    // Verify ownership
    if (escrow.userId !== req.user.id) {
      throw new AppError('Unauthorized', 403);
    }

    res.status(200).json({
      success: true,
      message: 'Escrow details retrieved successfully',
      data: escrow,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
