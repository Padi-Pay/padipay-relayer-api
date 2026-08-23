const express = require('express');
const router = express.Router();
const { validate } = require('../middleware/validate.middleware');
const { updateProfileSchema } = require('../validation/schemas/users.schema');
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
    
    res.status(200).json({
      success: true,
      message: 'User profile retrieved successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/', validate(updateProfileSchema), async (req, res, next) => {
  try {
    const user = await userRepository.findById(req.user.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const updatedUser = await userRepository.update(req.user.id, req.body);
    
    res.status(200).json({
      success: true,
      message: 'User profile updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
