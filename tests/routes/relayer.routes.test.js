const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const AppError = require('../../src/errors/AppError');

const JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';

// Mock prisma so repository construction never touches a real database.
jest.mock('../../src/clients/prisma.client', () => ({}));

// Mock config so the route handler's lazy server/contract construction and
// the auth middleware's token verification never need a real .env.
jest.mock('../../src/config/env.config', () => {
  const { StrKey, Keypair } = require('stellar-sdk');
  return {
    loadConfig: jest.fn().mockReturnValue({
      JWT_SECRET: 'test-jwt-secret-at-least-32-characters-long',
      RPC_URL: 'https://soroban-testnet.stellar.org',
      NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
      CONTRACT_ID: StrKey.encodeContract(new Uint8Array(32).fill(1)),
      FEE_BUMP_SECRET_KEY: Keypair.random().secret(),
    }),
  };
});

// Mock the escrow funding orchestration service so route tests never touch
// the database or a real Soroban RPC endpoint.
jest.mock('../../src/services/escrow-funding.service', () => ({
  createEscrowFundingService: jest.fn().mockReturnValue({
    fundEscrow: jest.fn(),
  }),
}));

const { createEscrowFundingService } = require('../../src/services/escrow-funding.service');
const escrowFundingServiceMock = createEscrowFundingService();

const relayerRoutes = require('../../src/routes/relayer.routes');
const errorHandler = require('../../src/middleware/error.middleware');

describe('Relayer Routes', () => {
  let app;
  let authToken;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/relayer', relayerRoutes);
    app.use(errorHandler);

    authToken = jwt.sign({ id: 'buyer-1', role: 'USER' }, JWT_SECRET);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/relayer/submit-escrow', () => {
    it('should fail validation when payload is missing', async () => {
      const res = await request(app).post('/api/relayer/submit-escrow').send({});
      
      expect(res.status).toBe(400); // Validation error
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('should pass validation and hit scaffolded route', async () => {
      const payload = { actionType: 'LOCK' };
      
      const res = await request(app)
        .post('/api/relayer/submit-escrow')
        .send(payload);
        
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('submit-escrow route scaffolded');
    });
  });

  describe('POST /api/relayer/fund', () => {
    it('should route a valid funding request to the provider (202)', async () => {
      const res = await request(app)
        .post('/api/relayer/fund')
        .send({ walletAddress: 'G_WALLET_ADDRESS', amount: '1000' });

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Wallet funding initiated');
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.walletAddress).toBe('G_WALLET_ADDRESS');
      expect(res.body.data.amount).toBe('1000');
    });

    it('should reject a negative amount at the validation layer', async () => {
      const res = await request(app)
        .post('/api/relayer/fund')
        .send({ walletAddress: 'G_WALLET_ADDRESS', amount: '-100' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('should reject a missing amount at the validation layer', async () => {
      const res = await request(app)
        .post('/api/relayer/fund')
        .send({ walletAddress: 'G_WALLET_ADDRESS' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('should reject an unparseable amount at the validation layer', async () => {
      const res = await request(app)
        .post('/api/relayer/fund')
        .send({ walletAddress: 'G_WALLET_ADDRESS', amount: 'not-a-number' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/relayer/escrow/:id/fund', () => {
    it('should reject when no Authorization header is provided', async () => {
      const res = await request(app).post('/api/relayer/escrow/intent-1/fund').send({});

      expect(res.status).toBe(401);
      expect(escrowFundingServiceMock.fundEscrow).not.toHaveBeenCalled();
    });

    it('should construct and sponsor the funding transaction for an authenticated buyer', async () => {
      const serviceResult = {
        escrowIntent: { id: 'intent-1', status: 'FUNDING_SPONSORED' },
        transactionXdr: 'SPONSORED_XDR',
        withdrawal: { reference: 'withdraw_1', status: 'RESERVED' },
      };
      escrowFundingServiceMock.fundEscrow.mockResolvedValue(serviceResult);

      const res = await request(app)
        .post('/api/relayer/escrow/intent-1/fund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(serviceResult);
      expect(escrowFundingServiceMock.fundEscrow).toHaveBeenCalledWith({
        escrowIntentId: 'intent-1',
        buyerId: 'buyer-1',
      });
    });

    it('should propagate service errors through the error handler', async () => {
      escrowFundingServiceMock.fundEscrow.mockRejectedValue(new AppError('Escrow intent not found', 404));

      const res = await request(app)
        .post('/api/relayer/escrow/intent-1/fund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Escrow intent not found');
    });
  });

  describe('GET /api/relayer/status/:txId', () => {
    it('should hit scaffolded route and return txId', async () => {
      const res = await request(app).get('/api/relayer/status/12345');
      
      expect(res.status).toBe(200);
      expect(res.body.txId).toBe('12345');
      expect(res.body.message).toBe('status route scaffolded');
    });
  });
});
