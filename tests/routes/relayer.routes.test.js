const express = require('express');
const request = require('supertest');
const AppError = require('../../src/errors/AppError');

// Mock prisma so repository construction never touches a real database.
jest.mock('../../src/clients/prisma.client', () => ({}));

// Mock the escrow sync service so route tests never touch the database.
jest.mock('../../src/services/escrow-sync.service', () => ({
  createEscrowSyncService: jest.fn().mockReturnValue({
    syncEscrowOnChain: jest.fn(),
  }),
}));

const { createEscrowSyncService } = require('../../src/services/escrow-sync.service');
const escrowSyncServiceMock = createEscrowSyncService();

const relayerRoutes = require('../../src/routes/relayer.routes');
const errorHandler = require('../../src/middleware/error.middleware');

describe('Relayer Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/relayer', relayerRoutes);
    app.use(errorHandler);
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

  describe('POST /api/relayer/escrow/:id/sync', () => {
    it('should reject an invalid payload at the validation layer', async () => {
      const res = await request(app)
        .post('/api/relayer/escrow/intent-1/sync')
        .send({ status: 'SUCCESS' }); // missing sorobanEscrowId

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
      expect(escrowSyncServiceMock.syncEscrowOnChain).not.toHaveBeenCalled();
    });

    it('should synchronize a valid payload and return 200', async () => {
      const serviceResult = {
        escrowIntent: { id: 'intent-1', status: 'LOCKED', sorobanEscrowId: '42' },
        synchronized: true,
      };
      escrowSyncServiceMock.syncEscrowOnChain.mockResolvedValue(serviceResult);

      const res = await request(app)
        .post('/api/relayer/escrow/intent-1/sync')
        .send({ sorobanEscrowId: '42', status: 'SUCCESS' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(serviceResult);
      expect(escrowSyncServiceMock.syncEscrowOnChain).toHaveBeenCalledWith({
        escrowIntentId: 'intent-1',
        sorobanEscrowId: '42',
        status: 'SUCCESS',
      });
    });

    it('should propagate service errors through the error handler', async () => {
      escrowSyncServiceMock.syncEscrowOnChain.mockRejectedValue(new AppError('Escrow intent not found', 404));

      const res = await request(app)
        .post('/api/relayer/escrow/intent-1/sync')
        .send({ sorobanEscrowId: '42', status: 'SUCCESS' });

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
