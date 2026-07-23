const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const AppError = require('../errors/AppError');
const { loadConfig } = require('../config/env.config');

const createAuthService = ({ userRepository }) => {
  const register = async ({ email, password }) => {
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError('Email already in use', 409);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await userRepository.create({
      email,
      password: hashedPassword,
    });

    const userWithoutPassword = { ...user };
    delete userWithoutPassword.password;
    return userWithoutPassword;
  };

  const login = async ({ email, password }) => {
    const user = await userRepository.findByEmail(email);
    
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const userWithoutPassword = { ...user };
    delete userWithoutPassword.password;

    const { JWT_SECRET } = loadConfig();
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    return { user: userWithoutPassword, token };
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
        user = await userRepository.create({
          email,
          name,
          googleId,
        });
      }

      const userWithoutPassword = { ...user };
      delete userWithoutPassword.password;

      const token = jwt.sign(
        { id: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: '1d' }
      );

      return { user: userWithoutPassword, token };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Invalid Google token', 401);
    }
  };

  return { register, login, googleSignIn };
};

module.exports = { createAuthService };
