const request = require('supertest');
const express = require('express');
const errorHandler = require('../../src/middleware/error.middleware');
const AppError = require('../../src/errors/AppError');

// Mock dependencies
jest.mock('../../src/clients/prisma.client', () => ({}));

const mockFindById = jest.fn();
const mockUpdate = jest.fn();

jest.mock('../../src/repositories/user.repository', () => {
  return {
    UserRepository: jest.fn().mockImplementation(() => ({
      findById: mockFindById,
      update: mockUpdate,
    })),
  };
});

const usersRoutes = require('../../src/routes/users.routes');

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
app.use('/api/users/me', usersRoutes);
app.use(errorHandler);

describe('User Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users/me', () => {
    it('returns 200 and sanitized user profile for authenticated user', async () => {
      mockFindById.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
      });

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('user-123');
      expect(res.body.data.name).toBe('Test User');
      expect(res.body.data).not.toHaveProperty('passwordHash');
    });

    it('returns 404 if authenticated user not found in DB', async () => {
      mockFindById.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer valid-token-not-found');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('User not found');
    });

    it('returns 401 if unauthenticated', async () => {
      const res = await request(app).get('/api/users/me');
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/users/me', () => {
    it('returns 200 and updates allowed fields successfully', async () => {
      mockFindById.mockResolvedValue({ id: 'user-123', name: 'Old Name' });
      mockUpdate.mockResolvedValue({ id: 'user-123', name: 'New Name' });

      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'New Name' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('New Name');
      expect(res.body.data).not.toHaveProperty('passwordHash');
      expect(mockUpdate).toHaveBeenCalledWith('user-123', { name: 'New Name' });
    });

    it('returns 400 if user attempts to update unallowed fields like role', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'New Name', role: 'ADMIN' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      // The exact error from zod .strict()
      expect(res.body.message).toContain('Unrecognized key');
    });

    it('returns 400 if validation fails on allowed fields (name too short)', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'A' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Name must be at least 2 characters');
    });

    it('returns 404 if authenticated user not found in DB on patch', async () => {
      mockFindById.mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', 'Bearer valid-token-not-found')
        .send({ name: 'New Name' });

      expect(res.status).toBe(404);
    });
  });
});
