const express = require('express');
const request = require('supertest');
const { createRelayerRoutes } = require('../../src/routes/relayer.routes');
const errorHandler = require('../../src/middleware/error.middleware');

describe('Relayer Routes', () => {
  let app;
  let mockEscrowService;
  let mockStellarService;
  let mockHorizonService;

  beforeEach(() => {
    mockEscrowService = {
      createEscrow: jest.fn(),
      lockEscrow: jest.fn(),
      releaseEscrow: jest.fn(),
      refundEscrow: jest.fn(),
    };

    mockStellarService = {
      signTransaction: jest.fn(),
      submitTransaction: jest.fn(),
    };

    mockHorizonService = {
      getTransactionStatus: jest.fn(),
    };

    const relayerRoutes = createRelayerRoutes({
      escrowService: mockEscrowService,
      stellarService: mockStellarService,
      horizonService: mockHorizonService,
    });

    app = express();
    app.use(express.json());
    app.use('/api/relayer', relayerRoutes);
    app.use(errorHandler);
  });

  describe('POST /api/relayer/create-escrow', () => {
    it('should fail validation when payload is missing', async () => {
      const res = await request(app).post('/api/relayer/create-escrow').send({});
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('should call services and return 200 on success', async () => {
      const payload = { buyer: 'G_BUYER', seller: 'G_SELLER', amount: '1000' };
      
      mockEscrowService.createEscrow.mockResolvedValue('unsigned_xdr');
      mockStellarService.signTransaction.mockReturnValue('signed_xdr');
      mockStellarService.submitTransaction.mockResolvedValue({ hash: '123' });

      const res = await request(app).post('/api/relayer/create-escrow').send(payload);
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Escrow created successfully');
      expect(res.body.result).toEqual({ hash: '123' });
      expect(mockEscrowService.createEscrow).toHaveBeenCalledWith(payload);
      expect(mockStellarService.signTransaction).toHaveBeenCalledWith('unsigned_xdr');
      expect(mockStellarService.submitTransaction).toHaveBeenCalledWith('signed_xdr');
    });
  });

  describe('POST /api/relayer/submit-escrow', () => {
    it('should fail validation when payload is missing', async () => {
      const res = await request(app).post('/api/relayer/submit-escrow').send({});
      
      expect(res.status).toBe(400); // Validation error
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('should fail if params.id is missing', async () => {
      const payload = { actionType: 'LOCK' };
      
      const res = await request(app)
        .post('/api/relayer/submit-escrow')
        .send(payload);
        
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Escrow ID is required in params');
    });

    it('should call lockEscrow and submit for LOCK action', async () => {
      const payload = { actionType: 'LOCK', params: { id: '1' } };
      
      mockEscrowService.lockEscrow.mockResolvedValue('unsigned_lock');
      mockStellarService.signTransaction.mockReturnValue('signed_lock');
      mockStellarService.submitTransaction.mockResolvedValue({ hash: '456' });

      const res = await request(app)
        .post('/api/relayer/submit-escrow')
        .send(payload);
        
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Escrow LOCK action submitted successfully');
      expect(res.body.result).toEqual({ hash: '456' });
      expect(mockEscrowService.lockEscrow).toHaveBeenCalledWith({ escrowId: '1' });
    });
  });

  describe('GET /api/relayer/status/:txId', () => {
    it('should call horizonService and return status', async () => {
      mockHorizonService.getTransactionStatus.mockResolvedValue({ status: 'SUCCESS' });
      
      const res = await request(app).get('/api/relayer/status/12345');
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Transaction status retrieved');
      expect(res.body.status).toEqual({ status: 'SUCCESS' });
      expect(mockHorizonService.getTransactionStatus).toHaveBeenCalledWith('12345');
    });
  });
});
