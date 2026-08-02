const request = require('supertest');
const express = require('express');
const walletsRoutes = require('../../src/routes/wallets.routes');
const { WalletRepository } = require('../../src/repositories/wallet.repository');

jest.mock('../../src/clients/prisma.client', () => ({
  wallet: {
    findUnique: jest.fn(),
  },
}));

jest.mock('../../src/middleware/auth.middleware', () => {
  return (req, res, next) => {
    req.user = { id: 'test-user-id' };
    next();
  };
});

jest.mock('../../src/repositories/wallet.repository', () => {
  const findByUserId = jest.fn();
  return {
    WalletRepository: jest.fn().mockImplementation(() => ({
      findByUserId,
    })),
  };
});

const errorHandler = require('../../src/middleware/error.middleware');

const app = express();
app.use(express.json());
// Inject mocked authenticate middleware
app.use('/api/wallets/me', require('../../src/middleware/auth.middleware'), walletsRoutes);
app.use(errorHandler);

describe('Wallets Routes', () => {
  let mockFindByUserId;
  
  beforeEach(() => {
    mockFindByUserId = new WalletRepository().findByUserId;
    mockFindByUserId.mockReset();
    jest.clearAllMocks();
  });

  describe('GET /api/wallets/me', () => {
    it('returns 404 if wallet is not found', async () => {
      mockFindByUserId.mockResolvedValue(null);

      const res = await request(app).get('/api/wallets/me');
      
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Wallet not found');
    });

    it('returns wallet details omitting secret key', async () => {
      mockFindByUserId.mockResolvedValue({
        id: 'w-1',
        userId: 'test-user-id',
        publicKey: 'G_MOCK_123',
        encryptedSecretKey: 'should-not-leak',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      });

      const res = await request(app).get('/api/wallets/me');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('publicKey', 'G_MOCK_123');
      expect(res.body.data).toHaveProperty('id', 'w-1');
      expect(res.body.data).not.toHaveProperty('encryptedSecretKey');
      expect(res.body.data).not.toHaveProperty('userId'); // only requested fields
    });
  });
});
