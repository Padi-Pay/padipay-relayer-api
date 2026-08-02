const request = require('supertest');
const express = require('express');
const authRoutes = require('../../src/routes/auth.routes');
const errorHandler = require('../../src/middleware/error.middleware');
const AppError = require('../../src/errors/AppError');

// Mock prisma client
jest.mock('../../src/clients/prisma.client', () => ({}));

// Mock the authService
jest.mock('../../src/services/auth.service', () => ({
  createAuthService: jest.fn().mockReturnValue({
    register: jest.fn(),
    login: jest.fn(),
    googleSignIn: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
  })
}));

const { createAuthService } = require('../../src/services/auth.service');
const authServiceMock = createAuthService();

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use(errorHandler);

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('returns 201 on successful registration', async () => {
      authServiceMock.register.mockResolvedValue({ id: '1', email: 'test@test.com' });
      
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com', password: 'Password1!' });
        
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('1');
    });

    it('returns 400 for invalid password validation', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com', password: 'weak' });
        
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Password must'); // Depends on exact validation message
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns 200 on successful login', async () => {
      authServiceMock.login.mockResolvedValue({ user: { id: '1', email: 'test@test.com' }, token: 'mock-jwt-token' });
      
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'Password1!' });
        
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.id).toBe('1');
      expect(res.body.data.token).toBe('mock-jwt-token');
    });

    it('handles service AppError correctly (e.g. invalid credentials)', async () => {
      authServiceMock.login.mockRejectedValue(new AppError('Invalid email or password', 401));
      
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'WrongPassword1!' });
        
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });
  });

  describe('POST /api/auth/google', () => {
    it('returns 200 on successful google sign in', async () => {
      authServiceMock.googleSignIn.mockResolvedValue({ user: { id: '1', email: 'google@test.com' }, token: 'mock-jwt-token' });
      
      const res = await request(app)
        .post('/api/auth/google')
        .send({ idToken: 'valid-google-id-token' });
        
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.id).toBe('1');
      expect(res.body.data.token).toBe('mock-jwt-token');
    });

    it('returns 400 for missing idToken', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({}); // missing idToken
        
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('body.idToken');
    });
  });
  describe('POST /api/auth/recover', () => {
    it('returns 200 with success message on valid email payload', async () => {
      authServiceMock.requestPasswordReset.mockResolvedValue({ success: true });
      
      const res = await request(app)
        .post('/api/auth/recover')
        .send({ email: 'test@test.com' });
        
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('password recovery token has been issued');
    });

    it('returns 400 for invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/recover')
        .send({ email: 'not-an-email' });
        
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('body.email');
    });
  });

  describe('POST /api/auth/reset', () => {
    it('returns 200 on successful password reset', async () => {
      authServiceMock.resetPassword.mockResolvedValue({ success: true });
      
      const res = await request(app)
        .post('/api/auth/reset')
        .send({ token: 'valid-token', newPassword: 'Password1!' });
        
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Password reset successful');
    });

    it('returns 400 for weak newPassword', async () => {
      const res = await request(app)
        .post('/api/auth/reset')
        .send({ token: 'valid-token', newPassword: 'weak' });
        
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Password must');
    });

    it('handles service AppError for invalid/expired tokens', async () => {
      authServiceMock.resetPassword.mockRejectedValue(new AppError('Invalid or expired reset token', 400));
      
      const res = await request(app)
        .post('/api/auth/reset')
        .send({ token: 'invalid-token', newPassword: 'Password1!' });
        
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid or expired reset token');
    });
  });
});
