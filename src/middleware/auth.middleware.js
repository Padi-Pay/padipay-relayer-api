const jwt = require('jsonwebtoken');
const AppError = require('../errors/AppError');
const { loadConfig } = require('../config/env.config');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('No token provided or invalid format', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const { JWT_SECRET } = loadConfig();
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach user identity to request
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401));
    }
    return next(new AppError('Invalid token', 401));
  }
};

module.exports = { authenticate };
