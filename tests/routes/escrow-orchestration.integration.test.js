const express = require('express');
const request = require('supertest');
const StellarSdk = require('@stellar/stellar-sdk');
const errorHandler = require('../../src/middleware/error.middleware');

const TEST_BUYER = StellarSdk.Keypair.random().publicKey();
const TEST_SELLER = StellarSdk.Keypair.random().publicKey();
const MOCK_ON_CHAIN_ESCROW_ID = '98765';
const MOCK_TX_HASH = 'a1b2c3d4e5f6';

jest.mock('../../src/clients/prisma.client', () => ({
  escrowIntent: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  transaction: {
    create: jest.fn(),
  },
}));

jest.mock('../../src/config/env.config', () => {
  const { StrKey, Keypair } = require('@stellar/stellar-sdk');
  return {
    loadConfig: jest.fn().mockReturnValue({
      JWT_SECRET: 'test-jwt-secret-at-least-32-characters-long',
      RPC_URL: 'https://soroban-testnet.stellar.org',
      HORIZON_URL: 'https://horizon-testnet.stellar.org',
      NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
      CONTRACT_ID: StrKey.encodeContract(new Uint8Array(32).fill(1)),
      FEE_BUMP_SECRET_KEY: Keypair.random().secret(),
      ALLOWED_ORIGINS: 'http://localhost:3000,http://127.0.0.1:3000',
    }),
  };
});

jest.mock('../../src/middleware/auth.middleware', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'test-user-id', role: 'USER' };
    next();
  },
}));

jest.mock('../../src/providers/wallet.provider', () => ({
  createWalletProvider: jest.fn().mockReturnValue({
    fundWallet: jest.fn(),
    withdrawFromWallet: jest.fn(),
    getBalance: jest.fn(),
  }),
}));

jest.mock('../../src/services/escrow-funding.service', () => ({
  createEscrowFundingService: jest.fn().mockReturnValue({
    fundEscrow: jest.fn(),
  }),
}));

const mockFindByPublicKey = jest.fn();

jest.mock('../../src/repositories/wallet.repository', () => ({
  WalletRepository: jest.fn().mockImplementation(() => ({
    findByPublicKey: mockFindByPublicKey,
    findByUserId: jest.fn(),
  })),
}));

const { createRelayerRoutes } = require('../../src/routes/relayer.routes');
const { createEscrowService } = require('../../src/services/escrow.service');
const { EscrowIntentRepository } = require('../../src/repositories/escrow-intent.repository');
const prisma = require('../../src/clients/prisma.client');
const { loadConfig } = require('../../src/config/env.config');

const mockTransactionBuilder = {
  buildTransaction: jest.fn().mockResolvedValue('MOCK_UNSIGNED_XDR'),
  buildFeeBumpTransaction: jest.fn().mockReturnValue('MOCK_FEE_BUMP_XDR'),
};

const mockStellarService = {
  signTransaction: jest.fn().mockReturnValue('MOCK_SIGNED_XDR'),
  submitTransaction: jest.fn().mockResolvedValue({
    success: true,
    hash: MOCK_TX_HASH,
    network: 'Test SDF Network ; September 2015',
    timestamp: new Date().toISOString(),
  }),
};

describe('Escrow Orchestration Integration', () => {
  let app;
  let escrowService;
  const config = loadConfig();

  beforeEach(() => {
    jest.clearAllMocks();

    const escrowIntentRepository = new EscrowIntentRepository(prisma);

    const transactionRepository = {
      create: prisma.transaction.create,
    };

    escrowService = createEscrowService({
      transactionBuilder: mockTransactionBuilder,
      config,
      escrowIntentRepository,
      transactionRepository,
    });

    const relayerRoutes = createRelayerRoutes({
      escrowService,
      stellarService: mockStellarService,
      horizonService: { getTransactionStatus: jest.fn() },
    });

    app = express();
    app.use(express.json());
    app.use('/api/relayer', relayerRoutes);
    app.use(errorHandler);
  });

  describe('POST /api/relayer/submit-escrow (CREATE)', () => {
    it('should create an EscrowIntent with PENDING status and no onChainEscrowId', async () => {
      mockFindByPublicKey.mockResolvedValue({ id: 'wallet-1', publicKey: TEST_BUYER });

      const createdIntent = {
        id: 'intent-created-001',
        userId: 'test-user-id',
        buyerAddress: TEST_BUYER,
        sellerAddress: TEST_SELLER,
        amount: '100',
        asset: 'XLM',
        actionType: 'CREATE',
        status: 'PENDING',
        onChainEscrowId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.escrowIntent.create.mockResolvedValue(createdIntent);
      prisma.transaction.create.mockResolvedValue({ id: 'tx-record-1', txHash: MOCK_TX_HASH, status: 'SUCCESS' });

      const res = await request(app)
        .post('/api/relayer/submit-escrow')
        .send({ actionType: 'CREATE', params: { buyer: TEST_BUYER, seller: TEST_SELLER, amount: '100' } });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Escrow CREATE action submitted successfully');

      expect(prisma.escrowIntent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          buyerAddress: TEST_BUYER,
          sellerAddress: TEST_SELLER,
          amount: '100',
          actionType: 'CREATE',
          status: 'PENDING',
        }),
      });

      const createCallData = prisma.escrowIntent.create.mock.calls[0][0].data;
      expect(createCallData.status).toBe('PENDING');
      expect(createCallData.onChainEscrowId).toBeUndefined();
    });
  });

  describe('On-chain synchronization', () => {
    it('should transition EscrowIntent from PENDING to LOCKED with a valid onChainEscrowId', async () => {
      const intentId = 'intent-sync-001';
      const createdIntent = {
        id: intentId,
        userId: 'test-user-id',
        buyerAddress: TEST_BUYER,
        sellerAddress: TEST_SELLER,
        amount: '250',
        asset: 'XLM',
        actionType: 'CREATE',
        status: 'PENDING',
        onChainEscrowId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedIntent = {
        ...createdIntent,
        status: 'LOCKED',
        onChainEscrowId: MOCK_ON_CHAIN_ESCROW_ID,
      };

      prisma.escrowIntent.findUnique.mockResolvedValue(createdIntent);
      prisma.escrowIntent.update.mockResolvedValue(updatedIntent);

      const result = await escrowService.syncEscrowStatus(intentId, {
        status: 'LOCKED',
        onChainEscrowId: MOCK_ON_CHAIN_ESCROW_ID,
      });

      expect(prisma.escrowIntent.findUnique).toHaveBeenCalledWith({ where: { id: intentId } });

      expect(prisma.escrowIntent.update).toHaveBeenCalledWith({
        where: { id: intentId },
        data: {
          status: 'LOCKED',
          onChainEscrowId: MOCK_ON_CHAIN_ESCROW_ID,
        },
      });

      expect(result.status).toBe('LOCKED');
      expect(result.onChainEscrowId).toBe(MOCK_ON_CHAIN_ESCROW_ID);
    });

    it('should update the same EscrowIntent rather than creating a new one', async () => {
      const intentId = 'intent-same-001';
      const createdIntent = {
        id: intentId,
        userId: 'test-user-id',
        buyerAddress: TEST_BUYER,
        sellerAddress: TEST_SELLER,
        amount: '500',
        asset: 'XLM',
        actionType: 'CREATE',
        status: 'PENDING',
        onChainEscrowId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.escrowIntent.findUnique.mockResolvedValue(createdIntent);
      prisma.escrowIntent.update.mockResolvedValue({
        ...createdIntent,
        status: 'LOCKED',
        onChainEscrowId: MOCK_ON_CHAIN_ESCROW_ID,
      });

      await escrowService.syncEscrowStatus(intentId, {
        status: 'LOCKED',
        onChainEscrowId: MOCK_ON_CHAIN_ESCROW_ID,
      });

      expect(prisma.escrowIntent.update).toHaveBeenCalledTimes(1);
      expect(prisma.escrowIntent.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: intentId } })
      );
    });

    it('should not crash or corrupt state when synchronization is triggered twice', async () => {
      const intentId = 'intent-dup-001';
      const createdIntent = {
        id: intentId,
        userId: 'test-user-id',
        buyerAddress: TEST_BUYER,
        sellerAddress: TEST_SELLER,
        amount: '100',
        asset: 'XLM',
        actionType: 'CREATE',
        status: 'PENDING',
        onChainEscrowId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const lockedIntent = {
        ...createdIntent,
        status: 'LOCKED',
        onChainEscrowId: MOCK_ON_CHAIN_ESCROW_ID,
      };

      prisma.escrowIntent.findUnique.mockResolvedValue(createdIntent);
      prisma.escrowIntent.update.mockResolvedValue(lockedIntent);

      const firstResult = await escrowService.syncEscrowStatus(intentId, {
        status: 'LOCKED',
        onChainEscrowId: MOCK_ON_CHAIN_ESCROW_ID,
      });

      const secondResult = await escrowService.syncEscrowStatus(intentId, {
        status: 'LOCKED',
        onChainEscrowId: MOCK_ON_CHAIN_ESCROW_ID,
      });

      expect(firstResult.status).toBe('LOCKED');
      expect(firstResult.onChainEscrowId).toBe(MOCK_ON_CHAIN_ESCROW_ID);

      expect(secondResult.status).toBe('LOCKED');
      expect(secondResult.onChainEscrowId).toBe(MOCK_ON_CHAIN_ESCROW_ID);

      expect(prisma.escrowIntent.update).toHaveBeenCalledTimes(2);
      expect(prisma.escrowIntent.update).toHaveBeenNthCalledWith(1, {
        where: { id: intentId },
        data: { status: 'LOCKED', onChainEscrowId: MOCK_ON_CHAIN_ESCROW_ID },
      });
      expect(prisma.escrowIntent.update).toHaveBeenNthCalledWith(2, {
        where: { id: intentId },
        data: { status: 'LOCKED', onChainEscrowId: MOCK_ON_CHAIN_ESCROW_ID },
      });
    });
  });
});
