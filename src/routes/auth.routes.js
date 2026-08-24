const express = require('express');
const router = express.Router();
const { validate } = require('../middleware/validate.middleware');
const { registerSchema, loginSchema, googleSchema, recoverSchema, resetPasswordSchema } = require('../validation/schemas/auth.schema');
const { createAuthService } = require('../services/auth.service');
const { UserRepository } = require('../repositories/user.repository');
const { PasswordResetTokenRepository } = require('../repositories/password-reset-token.repository');
const prisma = require('../clients/prisma.client');
const { createAuditLogger } = require('../services/audit-logger.service');

const { WalletRepository } = require('../repositories/wallet.repository');
const { createEmbeddedWalletProvider } = require('../providers/embedded-wallet.provider');

// Initialize dependencies
const userRepository = new UserRepository(prisma);
const passwordResetTokenRepository = new PasswordResetTokenRepository(prisma);
const walletProvider = createEmbeddedWalletProvider();
const auditLogger = createAuditLogger();

const authService = createAuthService({ 
  userRepository, 
  passwordResetTokenRepository,
  walletProvider,
  prisma,
  UserRepository,
  WalletRepository,
  auditLogger,
});

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const user = await authService.register(req.body, { ip: req.ip, correlationId: req.id });
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
    const result = await authService.login(req.body, { ip: req.ip, correlationId: req.id });
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/google', validate(googleSchema), async (req, res, next) => {
  try {
    const result = await authService.googleSignIn(req.body, { ip: req.ip, correlationId: req.id });
    res.status(200).json({
      success: true,
      message: 'Google Sign-In successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/recover', validate(recoverSchema), async (req, res, next) => {
  try {
    const result = await authService.requestPasswordReset(req.body, { ip: req.ip, correlationId: req.id });
    res.status(200).json({
      success: true,
      message: 'If the email exists, a password recovery token has been issued',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/reset', validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const result = await authService.resetPassword(req.body, { ip: req.ip, correlationId: req.id });
    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
