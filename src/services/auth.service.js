const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const AppError = require('../errors/AppError');
const { loadConfig } = require('../config/env.config');

const createAuthService = ({ userRepository, passwordResetTokenRepository, walletProvider, prisma, UserRepository, WalletRepository }) => {
  const register = async ({ email, password }) => {
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError('Email already in use', 409);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Atomically provision user and wallet
    const user = await prisma.$transaction(async (tx) => {
      const txUserRepository = new UserRepository(tx);
      const txWalletRepository = new WalletRepository(tx);

      const newUser = await txUserRepository.create({
        email,
        passwordHash: hashedPassword,
      });

      let address, secret;
      try {
        const result = await walletProvider.createWallet(newUser.id);
        address = result.address;
        secret = result.secret;
      } catch {
        throw new AppError('Wallet provider is currently unavailable. Please try again later.', 503);
      }
      
      await txWalletRepository.create({
        userId: newUser.id,
        publicKey: address,
        encryptedSecretKey: secret,
      });

      return newUser;
    });

    return user;
  };

  const login = async ({ email, password }) => {
    const user = await userRepository.findByEmail(email, { includePasswordHash: true });
    
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const { JWT_SECRET } = loadConfig();
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    delete user.passwordHash;
    return { user, token };
  };

  const googleSignIn = async ({ idToken }) => {
    const { GOOGLE_CLIENT_ID, JWT_SECRET } = loadConfig();
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);

    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      const { email, name, sub: googleId } = payload;

      let user = await userRepository.findByEmail(email);

      if (user) {
        if (!user.googleId) {
          user = await userRepository.update(user.id, { googleId, name: user.name || name });
        } else if (user.googleId !== googleId) {
          throw new AppError('Google account mismatch', 401);
        }
      } else {
        // New user: atomically provision user and wallet
        user = await prisma.$transaction(async (tx) => {
          const txUserRepository = new UserRepository(tx);
          const txWalletRepository = new WalletRepository(tx);

          const newUser = await txUserRepository.create({
            email,
            name,
            googleId,
            passwordHash: '', // Placeholder since Google users do not have a password
          });

          let address, secret;
          try {
            const result = await walletProvider.createWallet(newUser.id);
            address = result.address;
            secret = result.secret;
          } catch {
            throw new AppError('Wallet provider is currently unavailable. Please try again later.', 503);
          }
          
          await txWalletRepository.create({
            userId: newUser.id,
            publicKey: address,
            encryptedSecretKey: secret,
          });

          return newUser;
        });
      }

      const token = jwt.sign(
        { id: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: '1d' }
      );

      return { user, token };
    } catch (error) {
      if (error instanceof AppError || error.statusCode) throw error;
      throw new AppError('Invalid Google token', 401);
    }
  };

  const requestPasswordReset = async ({ email }) => {
    const user = await userRepository.findByEmail(email);
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

      if (passwordResetTokenRepository.deleteExpiredByUserId) {
        await passwordResetTokenRepository.deleteExpiredByUserId(user.id);
      }

      await passwordResetTokenRepository.create({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      // Log raw token for MVP testing (since no email service is hooked up)
      console.log(`[PASSWORD RECOVERY] Reset token for ${email}: ${rawToken}`);
    }

    // Always return success to prevent email enumeration
    return { success: true };
  };

  const resetPassword = async ({ token, newPassword }) => {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resetRecord = await passwordResetTokenRepository.findByTokenHash(tokenHash);

    if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await userRepository.update(resetRecord.userId, { passwordHash: hashedPassword });
    
    // Mark token as used
    await passwordResetTokenRepository.markUsed(resetRecord.id);

    return { success: true };
  };

  return { register, login, googleSignIn, requestPasswordReset, resetPassword };
};

module.exports = { createAuthService };
