const express = require('express');
const router = express.Router();
const { validate } = require('../middleware/validate.middleware');
const { registerSchema, loginSchema } = require('../validation/schemas/auth.schema');
const { createAuthService } = require('../services/auth.service');
const { UserRepository } = require('../repositories/user.repository');
const prisma = require('../clients/prisma.client');

// Initialize dependencies
const userRepository = new UserRepository(prisma);
const authService = createAuthService({ userRepository });

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
