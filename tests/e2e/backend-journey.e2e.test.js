const { Keypair } = require('@stellar/stellar-sdk');

// Deterministic test identity (unique per run to avoid collisions)
const TEST_EMAIL = `e2e-journey-${Date.now()}@test.com`;
const TEST_PASSWORD = 'E2eSecure1!';
const JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';

const mockKeypair = Keypair.random();

const mockUsers = new Map();
const mockWallets = new Map();
const mockEscrowIntents = new Map();
const mockTransactions = new Map();

let userSeq = 0;
let walletSeq = 0;
let escrowSeq = 0;
let txSeq = 0;

function createMockTxClient() {
  return {
    user: {
      create: jest.fn(async ({ data }) => {
        const id = `usr-${++userSeq}`;
        const user = { id, ...data, role: 'USER', isActive: true, createdAt: new Date(), updatedAt: new Date() };
        mockUsers.set(id, user);
        return { ...user };
      }),
      findUnique: jest.fn(async ({ where }) => {
        if (where.id) { const u = mockUsers.get(where.id); return u ? { ...u } : null; }
        if (where.email) {
          for (const u of mockUsers.values()) { if (u.email === where.email) return { ...u }; }
        }
        return null;
      }),
      update: jest.fn(async ({ where, data }) => {
        const user = mockUsers.get(where.id);
        if (!user) throw new Error('User not found');
        Object.assign(user, data, { updatedAt: new Date() });
        return { ...user };
      }),
    },
    wallet: {
      create: jest.fn(async ({ data }) => {
        const id = `wlt-${++walletSeq}`;
        const wallet = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        mockWallets.set(id, wallet);
        return { ...wallet };
      }),
      findFirst: jest.fn(async ({ where }) => {
        for (const w of mockWallets.values()) { if (w.userId === where.userId) return { ...w }; }
        return null;
      }),
      findUnique: jest.fn(async ({ where }) => {
        if (where.id) { const w = mockWallets.get(where.id); return w ? { ...w } : null; }
        if (where.publicKey) {
          for (const w of mockWallets.values()) { if (w.publicKey === where.publicKey) return { ...w }; }
        }
        return null;
      }),
    },
    escrowIntent: {
      create: jest.fn(async ({ data }) => {
        const id = `esc-${++escrowSeq}`;
        const intent = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        mockEscrowIntents.set(id, intent);
        return { ...intent };
      }),
      findUnique: jest.fn(async ({ where }) => {
        const i = mockEscrowIntents.get(where.id); return i ? { ...i } : null;
      }),
      update: jest.fn(async ({ where, data }) => {
        const intent = mockEscrowIntents.get(where.id);
        if (!intent) throw new Error('EscrowIntent not found');
        Object.assign(intent, data, { updatedAt: new Date() });
        return { ...intent };
      }),
      findMany: jest.fn(async ({ where }) => {
        return Array.from(mockEscrowIntents.values()).filter(i => i.userId === where.userId).map(i => ({ ...i }));
      }),
    },
    transaction: {
      create: jest.fn(async ({ data }) => {
        const id = `mtx-${++txSeq}`;
        const tx = { id, ...data, createdAt: new Date() };
        mockTransactions.set(id, tx);
        return { ...tx };
      }),
    },
    passwordResetToken: {
      create: jest.fn(async () => ({ id: 'prt-1' })),
      findFirst: jest.fn(async () => null),
      update: jest.fn(async () => ({})),
      deleteMany: jest.fn(async () => ({ count: 0 })),
    },
  };
}

const mockTxClient = createMockTxClient();

jest.mock('../../src/clients/prisma.client', () => ({
  $transaction: jest.fn(async (fn) => fn(mockTxClient)),
  user: mockTxClient.user,
  wallet: mockTxClient.wallet,
  escrowIntent: mockTxClient.escrowIntent,
  transaction: mockTxClient.transaction,
  passwordResetToken: mockTxClient.passwordResetToken,
}));

process.env.PORT = '0';
process.env.RPC_URL = 'https://soroban-testnet.stellar.org';
process.env.HORIZON_URL = 'https://horizon-testnet.stellar.org';
process.env.NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
process.env.CONTRACT_ID = 'CCFMUFNSMI5HMRPBPF2R7TP5GX3BC6PBSC4JP72YLTJQTGTXO2I3R74K';
process.env.FEE_BUMP_SECRET_KEY = mockKeypair.secret();
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/padipay_e2e_test';
process.env.JWT_SECRET = JWT_SECRET;
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id.apps.googleusercontent.com';
process.env.ALLOWED_ORIGINS = '*';

const request = require('supertest');
const jwt = require('jsonwebtoken');

const mockTxBuilder = {
  buildTransaction: jest.fn(),
  buildFeeBumpTransaction: jest.fn(),
};

const mockStellarService = {
  signTransaction: jest.fn(),
  submitTransaction: jest.fn(),
};

const mockHorizonService = {
  getTransactionStatus: jest.fn(),
  getAccountBalance: jest.fn(),
};

jest.mock('../../src/config/env.config', () => ({
  loadConfig: jest.fn().mockReturnValue({
    PORT: '0',
    RPC_URL: 'https://soroban-testnet.stellar.org',
    HORIZON_URL: 'https://horizon-testnet.stellar.org',
    NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
    CONTRACT_ID: 'CCFMUFNSMI5HMRPBPF2R7TP5GX3BC6PBSC4JP72YLTJQTGTXO2I3R74K',
    FEE_BUMP_SECRET_KEY: process.env.FEE_BUMP_SECRET_KEY,
    DATABASE_URL: 'postgresql://test:test@localhost:5432/padipay_e2e_test',
    JWT_SECRET,
    GOOGLE_CLIENT_ID: 'test-google-client-id.apps.googleusercontent.com',
    ALLOWED_ORIGINS: '*',
  }),
}));

const { createApp } = require('../../src/app.factory');

const app = createApp({
  transactionBuilder: mockTxBuilder,
  stellarService: mockStellarService,
  horizonService: mockHorizonService,
});

function resetDatabase() {
  mockUsers.clear();
  mockWallets.clear();
  mockEscrowIntents.clear();
  mockTransactions.clear();
  userSeq = 0;
  walletSeq = 0;
  escrowSeq = 0;
  txSeq = 0;
  jest.clearAllMocks();
}

describe('E2E Backend Journey', () => {
  let token;
  let registeredUserId;
  let buyerPublicKey;

  beforeAll(() => {
    resetDatabase();

    const unsignedXdr = 'AAAAAgAAAADk1rZJpLmW6gH3gEcYJ6Y1zZBSYJ1KHoNyYaUD2dOheQAAAAAAAAAAJAAAAABAAAAAAAAB3AAAAALdmVyaWZpZWQ=';
    mockTxBuilder.buildTransaction.mockResolvedValue(unsignedXdr);

    mockStellarService.signTransaction.mockImplementation((xdr) => `signed_${xdr}`);

    mockStellarService.submitTransaction.mockResolvedValue({
      success: true,
      hash: 'e2e-test-tx-hash-001',
      network: 'Test SDF Network ; September 2015',
      timestamp: new Date().toISOString(),
    });
  });

  afterAll(() => {
    resetDatabase();
  });

  it('should complete the full backend journey: Register → JWT → Profile → Wallet → Submit Escrow', async () => {
    // ── Step 1: Register ──────────────────────────────────────────────
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.success).toBe(true);
    expect(registerRes.body.message).toBe('Registration successful');
    expect(registerRes.body.data).toHaveProperty('id');
    expect(registerRes.body.data.email).toBe(TEST_EMAIL);
    expect(registerRes.body.data).not.toHaveProperty('passwordHash');

    registeredUserId = registerRes.body.data.id;

    // Verify user is persisted in the database
    const persistedUser = mockUsers.get(registeredUserId);
    expect(persistedUser).toBeDefined();
    expect(persistedUser.email).toBe(TEST_EMAIL);

    // Verify wallet was created during registration
    let registeredWallet = null;
    for (const w of mockWallets.values()) {
      if (w.userId === registeredUserId) { registeredWallet = w; break; }
    }
    expect(registeredWallet).toBeDefined();
    expect(registeredWallet.publicKey).toBeDefined();
    expect(registeredWallet.encryptedSecretKey).toBeDefined();
    buyerPublicKey = registeredWallet.publicKey;

    // ── Step 2: Login → Extract JWT ──────────────────────────────────
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.message).toBe('Login successful');
    expect(loginRes.body.data).toHaveProperty('token');
    expect(loginRes.body.data.user.email).toBe(TEST_EMAIL);

    token = loginRes.body.data.token;
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    // ── Step 3: Fetch Profile (authenticated) ────────────────────────
    const profileRes = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.success).toBe(true);
    expect(profileRes.body.data.id).toBe(registeredUserId);
    expect(profileRes.body.data.email).toBe(TEST_EMAIL);
    expect(profileRes.body.data).not.toHaveProperty('passwordHash');

    // Verify state propagation: the JWT carries the registered user's identity
    const decoded = jwt.verify(token, JWT_SECRET);
    expect(decoded.id).toBe(registeredUserId);
    expect(decoded.role).toBe('USER');

    // ── Step 4: Fetch Wallet (authenticated) ─────────────────────────
    const walletRes = await request(app)
      .get('/api/wallets/me')
      .set('Authorization', `Bearer ${token}`);

    expect(walletRes.status).toBe(200);
    expect(walletRes.body.success).toBe(true);
    expect(walletRes.body.data).toHaveProperty('id');
    expect(walletRes.body.data).toHaveProperty('publicKey');
    expect(walletRes.body.data.publicKey).toBe(buyerPublicKey);
    expect(walletRes.body.data).not.toHaveProperty('encryptedSecretKey');

    // Verify state propagation: wallet belongs to the same authenticated user
    const walletInDb = mockWallets.get(walletRes.body.data.id);
    expect(walletInDb.userId).toBe(registeredUserId);

    // Verify no secret key leakage in HTTP response
    expect(walletRes.body.data).not.toHaveProperty('encryptedSecretKey');
    expect(walletRes.body.data).not.toHaveProperty('userId');

    // ── Step 5: Submit Escrow (authenticated) ────────────────────────
    const sellerKeypair = Keypair.random();
    const sellerPublicKey = sellerKeypair.publicKey();

    const escrowRes = await request(app)
      .post('/api/relayer/submit-escrow')
      .set('Authorization', `Bearer ${token}`)
      .send({
        actionType: 'CREATE',
        params: {
          buyer: buyerPublicKey,
          seller: sellerPublicKey,
          amount: '100',
        },
      });

    expect(escrowRes.status).toBe(200);
    expect(escrowRes.body.message).toBe('Escrow CREATE action submitted successfully');
    expect(escrowRes.body.result).toBeDefined();
    expect(escrowRes.body.result.hash).toBe('e2e-test-tx-hash-001');

    // Verify escrow intent was persisted
    expect(mockTxClient.escrowIntent.create).toHaveBeenCalledTimes(1);
    const createdIntent = mockTxClient.escrowIntent.create.mock.calls[0][0].data;
    expect(createdIntent.buyerAddress).toBe(buyerPublicKey);
    expect(createdIntent.sellerAddress).toBe(sellerPublicKey);
    expect(createdIntent.amount).toBe('100');
    expect(createdIntent.actionType).toBe('CREATE');
    expect(createdIntent.status).toBe('PENDING');
    expect(createdIntent.userId).toBe(registeredUserId);

    // Verify transaction was recorded against the escrow intent
    expect(mockTxClient.transaction.create).toHaveBeenCalledTimes(1);
    const recordedTx = mockTxClient.transaction.create.mock.calls[0][0].data;
    expect(recordedTx.txHash).toBe('e2e-test-tx-hash-001');
    expect(recordedTx.status).toBe('SUCCESS');
    expect(recordedTx.escrowIntentId).toBeDefined();
  });

  it('should reject unauthenticated requests to protected endpoints', async () => {
    const profileRes = await request(app).get('/api/users/me');
    expect(profileRes.status).toBe(401);

    const walletRes = await request(app).get('/api/wallets/me');
    expect(walletRes.status).toBe(401);

    const escrowRes = await request(app)
      .post('/api/relayer/submit-escrow')
      .send({ actionType: 'CREATE', params: { buyer: 'G_BUYER', seller: 'G_SELLER', amount: '10' } });
    expect(escrowRes.status).toBe(401);
  });

  it('should reject requests with invalid JWT', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
  });
});
