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

module.exports = router;
