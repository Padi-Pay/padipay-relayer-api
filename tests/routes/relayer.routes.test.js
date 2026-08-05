const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const AppError = require('../../src/errors/AppError');

const JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';

jest.mock('../../src/clients/prisma.client', () => ({}));

jest.mock('../../src/config/env.config', () => {
  const { StrKey, Keypair } = require('@stellar/stellar-sdk');
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

jest.mock('../../src/services/escrow-funding.service', () => ({
  createEscrowFundingService: jest.fn().mockReturnValue({
    fundEscrow: jest.fn(),
  }),
}));

const mockFindByPublicKey = jest.fn();

jest.mock('../../src/repositories/wallet.repository', () => {
  return {
    WalletRepository: jest.fn().mockImplementation(() => ({
      findByPublicKey: mockFindByPublicKey,
    })),
  };
});

const { createEscrowFundingService } = require('../../src/services/escrow-funding.service');
const escrowFundingServiceMock = createEscrowFundingService();

const { createRelayerRoutes } = require('../../src/routes/relayer.routes');
const errorHandler = require('../../src/middleware/error.middleware');

describe('Relayer Routes', () => {
  let app;
  let authToken;
  let mockEscrowService;
  let mockStellarService;
  let mockHorizonService;
  beforeEach(() => {
    mockEscrowService = {
      createEscrow: jest.fn(),
      lockEscrow: jest.fn(),
      releaseEscrow: jest.fn(),
      refundEscrow: jest.fn(),
      recordTransaction: jest.fn(),
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

    authToken = jwt.sign({ id: 'buyer-1', role: 'USER' }, JWT_SECRET);
  });

  beforeEach(() => {
    mockFindByPublicKey.mockReset();
    jest.clearAllMocks();
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
      
      mockEscrowService.createEscrow.mockResolvedValue({ unsignedXdr: 'unsigned_xdr', escrowIntentId: 'intent-123' });
      mockStellarService.signTransaction.mockReturnValue('signed_xdr');
      mockStellarService.submitTransaction.mockResolvedValue({ hash: 'tx-123' });
      mockEscrowService.recordTransaction.mockResolvedValue({});

      const res = await request(app).post('/api/relayer/create-escrow').send(payload);
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Escrow created successfully');
      expect(res.body.result).toEqual({ hash: 'tx-123' });
      
      expect(mockEscrowService.createEscrow).toHaveBeenCalledWith(payload);
      expect(mockStellarService.signTransaction).toHaveBeenCalledWith('unsigned_xdr');
      expect(mockStellarService.submitTransaction).toHaveBeenCalledWith('signed_xdr');
      expect(mockEscrowService.recordTransaction).toHaveBeenCalledWith('intent-123', 'tx-123', 'SUCCESS');
    });
  });

  describe('POST /api/relayer/submit-escrow', () => {
    it('should fail validation when payload is missing', async () => {
      const res = await request(app).post('/api/relayer/submit-escrow').send({});
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('should fail if params.id is missing', async () => {
      const payload = { actionType: 'LOCK' };
      
      const res = await request(app).post('/api/relayer/submit-escrow').send(payload);
        
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Escrow ID is required in params');
    });

    it('should call lockEscrow and submit for LOCK action', async () => {
      const payload = { actionType: 'LOCK', params: { id: 'intent-123' } };
      
      mockEscrowService.lockEscrow.mockResolvedValue({ unsignedXdr: 'unsigned_lock', escrowIntentId: 'intent-123' });
      mockStellarService.signTransaction.mockReturnValue('signed_lock');
      mockStellarService.submitTransaction.mockResolvedValue({ hash: 'tx-456' });

      const res = await request(app).post('/api/relayer/submit-escrow').send(payload);
        
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Escrow LOCK action submitted successfully');
      expect(res.body.result).toEqual({ hash: 'tx-456' });
      
      expect(mockEscrowService.lockEscrow).toHaveBeenCalledWith({ escrowId: 'intent-123' });
      expect(mockEscrowService.recordTransaction).toHaveBeenCalledWith('intent-123', 'tx-456', 'SUCCESS');
    });

    it('should fail CREATE action if buyer is not in DB', async () => {
      mockFindByPublicKey.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/relayer/submit-escrow')
        .send({
          actionType: 'CREATE',
          params: { buyer: 'buyer', seller: 'seller', amount: '10' }
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Buyer wallet not found in database');
    });

    it('should fail CREATE action if params are missing', async () => {
      const payload = { actionType: 'CREATE', params: { buyer: 'G_BUYER' } };
      const res = await request(app).post('/api/relayer/submit-escrow').send(payload);
      
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('buyer, seller, and amount are required for CREATE');
    });

    it('should call createEscrow and submit for CREATE action', async () => {
      const payload = { actionType: 'CREATE', params: { buyer: 'G_BUYER', seller: 'G_SELLER', amount: '100' } };
      
      mockFindByPublicKey.mockResolvedValue({ id: 'w-1', publicKey: 'G_SOMETHING' });
      
      mockEscrowService.createEscrow.mockResolvedValue({ unsignedXdr: 'unsigned_create', escrowIntentId: 'intent-999' });
      mockStellarService.signTransaction.mockReturnValue('signed_create');
      mockStellarService.submitTransaction.mockResolvedValue({ hash: 'tx-789' });

      const res = await request(app).post('/api/relayer/submit-escrow').send(payload);
        
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Escrow CREATE action submitted successfully');
      expect(res.body.result).toEqual({ hash: 'tx-789' });
      
      expect(mockEscrowService.createEscrow).toHaveBeenCalledWith(payload.params);
      expect(mockEscrowService.recordTransaction).toHaveBeenCalledWith('intent-999', 'tx-789', 'SUCCESS');
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
