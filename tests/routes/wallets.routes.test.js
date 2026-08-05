const request = require('supertest');
const express = require('express');
const { createWalletsRoutes } = require('../../src/routes/wallets.routes');
const errorHandler = require('../../src/middleware/error.middleware');

jest.mock('../../src/middleware/auth.middleware', () => {
  return (req, res, next) => {
    req.user = { id: 'test-user-id' };
    next();
  };
});

describe('Wallets Routes', () => {
  let mockWalletRepository;
  let mockWalletProvider;
  let app;

  beforeEach(() => {
    mockWalletRepository = {
      findByUserId: jest.fn(),
    };

    mockWalletProvider = {
      getBalance: jest.fn(),
      withdrawFromWallet: jest.fn(),
    };

    const walletsRoutes = createWalletsRoutes({
      walletRepository: mockWalletRepository,
      walletProvider: mockWalletProvider,
    });

    app = express();
    app.use(express.json());
    app.use('/api/wallets', require('../../src/middleware/auth.middleware'), walletsRoutes);
    app.use(errorHandler);
    
    jest.clearAllMocks();
  });

  describe('GET /api/wallets/me', () => {
    it('returns 404 if wallet is not found', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(null);

      const res = await request(app).get('/api/wallets/me');
      
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Wallet not found');
    });

    it('returns wallet details omitting secret key', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue({
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
      expect(res.body.data).not.toHaveProperty('userId');
    });
  });

  describe('GET /api/wallets/me/balance', () => {
    it('returns 404 if wallet is not found', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(null);

      const res = await request(app).get('/api/wallets/me/balance');
      
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Wallet not found');
    });

    it('returns wallet balance', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue({
        id: 'w-1',
        publicKey: 'G_MOCK_123',
      });
      mockWalletProvider.getBalance.mockResolvedValue('150.00');

      const res = await request(app).get('/api/wallets/me/balance');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('balance', '150.00');
      expect(res.body.data).toHaveProperty('asset', 'XLM');
    });
  });

  describe('POST /api/wallets/withdraw', () => {
    const validAddress = 'GCTAAYPBHPVJNN6F7IXZT6TRMMGS6GYBZJIOWRTP7HUHIZ5W2K6FR4CI';
    const invalidAddress = 'invalid-address';

    it('returns 400 if destination address is invalid', async () => {
      const res = await request(app).post('/api/wallets/withdraw').send({
        destinationAddress: invalidAddress,
        amount: '50.00',
        asset: 'USDC'
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid Stellar destination address');
    });

    it('returns 404 if wallet is not found', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(null);

      const res = await request(app).post('/api/wallets/withdraw').send({
        destinationAddress: validAddress,
        amount: '50.00',
        asset: 'USDC'
      });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Wallet not found');
    });

    it('returns 400 if withdrawal amount exceeds balance', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue({
        id: 'w-1',
        publicKey: 'G_MOCK_123',
      });
      mockWalletProvider.getBalance.mockResolvedValue('10.00');

      const res = await request(app).post('/api/wallets/withdraw').send({
        destinationAddress: validAddress,
        amount: '50.00',
        asset: 'USDC'
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Withdrawal amount exceeds available balance');
    });

    it('returns 200 and initiates withdrawal successfully', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue({
        id: 'w-1',
        publicKey: 'G_MOCK_123',
      });
      mockWalletProvider.getBalance.mockResolvedValue('100.00');
      mockWalletProvider.withdrawFromWallet.mockResolvedValue({
        reference: 'withdraw_123',
        status: 'RESERVED',
        walletAddress: 'G_MOCK_123',
        amount: '50.00',
        asset: 'USDC',
        network: 'TESTNET',
      });

      const res = await request(app).post('/api/wallets/withdraw').send({
        destinationAddress: validAddress,
        amount: '50.00',
        asset: 'USDC'
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Withdrawal initiated successfully');
      expect(res.body.data).toHaveProperty('reference', 'withdraw_123');
      expect(res.body.data).toHaveProperty('status', 'RESERVED');
    });
  });
});
