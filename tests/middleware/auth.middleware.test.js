const { authenticate } = require('../../src/middleware/auth.middleware');
const jwt = require('jsonwebtoken');
const AppError = require('../../src/errors/AppError');

jest.mock('../../src/config/env.config', () => ({
  loadConfig: jest.fn().mockReturnValue({ JWT_SECRET: 'test-secret' }),
}));

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {};
    next = jest.fn();
  });

  it('throws 401 if authorization header is missing', () => {
    authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('No token provided or invalid format');
  });

  it('throws 401 if authorization header format is invalid', () => {
    req.headers.authorization = 'InvalidFormat token123';
    authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(401);
  });

  it('throws 401 if token is expired', () => {
    const expiredToken = jwt.sign({ id: '1' }, 'test-secret', { expiresIn: '-1h' });
    req.headers.authorization = `Bearer ${expiredToken}`;
    
    authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Token expired');
  });

  it('throws 401 if token is invalid (wrong signature)', () => {
    const invalidToken = jwt.sign({ id: '1' }, 'wrong-secret');
    req.headers.authorization = `Bearer ${invalidToken}`;
    
    authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Invalid token');
  });

  it('decodes valid token and attaches user to req', () => {
    const validToken = jwt.sign({ id: '1', role: 'USER' }, 'test-secret');
    req.headers.authorization = `Bearer ${validToken}`;
    
    authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith(); // called with no arguments on success
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe('1');
    expect(req.user.role).toBe('USER');
  });
});
