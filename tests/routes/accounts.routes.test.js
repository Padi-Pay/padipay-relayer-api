const request = require('supertest');
const express = require('express');
const errorHandler = require('../../src/middleware/error.middleware');
const AppError = require('../../src/errors/AppError');

// Mock dependencies
jest.mock('../../src/clients/prisma.client', () => ({}));

const mockFindById = jest.fn();

jest.mock('../../src/repositories/user.repository', () => {
  return {
    UserRepository: jest.fn().mockImplementation(() => ({
      findById: mockFindById,
    })),
  };
});

const accountsRoutes = require('../../src/routes/accounts.routes');

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  // Mock authenticate middleware behavior
  if (req.headers.authorization === 'Bearer valid-token') {
    req.user = { id: 'user-123' };
    next();
  } else if (req.headers.authorization === 'Bearer valid-token-not-found') {
    req.user = { id: 'not-found' };
    next();
  } else {
    next(new AppError('Unauthorized', 401));
  }
});
app.use('/api/accounts/me', accountsRoutes);
app.use(errorHandler);

describe('Accounts Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/accounts/me', () => {
    it('returns 200 and logical account status for authenticated user', async () => {
      mockFindById.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        passwordHash: 'secret-hash',
        isActive: true,
        createdAt: '2023-01-01T00:00:00.000Z',
      });

      const res = await request(app)
        .get('/api/accounts/me')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(true);
      expect(res.body.data.createdAt).toBe('2023-01-01T00:00:00.000Z');
      expect(res.body.data).not.toHaveProperty('email');
      expect(res.body.data).not.toHaveProperty('passwordHash');
    });

    it('returns 404 if authenticated user not found in DB', async () => {
      mockFindById.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/accounts/me')
        .set('Authorization', 'Bearer valid-token-not-found');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('User not found');
    });

    it('returns 401 if unauthenticated', async () => {
      const res = await request(app).get('/api/accounts/me');
      expect(res.status).toBe(401);
    });
  });
});
