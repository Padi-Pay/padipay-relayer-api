const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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

  return { register, login };
};

module.exports = { createAuthService };
