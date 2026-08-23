const prisma = require('../../src/clients/prisma.client');
const { createAuthService } = require('../../src/services/auth.service');
const { UserRepository } = require('../../src/repositories/user.repository');
const { WalletRepository } = require('../../src/repositories/wallet.repository');
const { PasswordResetTokenRepository } = require('../../src/repositories/password-reset-token.repository');

jest.mock('google-auth-library', () => {
  return {
    OAuth2Client: jest.fn().mockImplementation(() => ({
      verifyIdToken: jest.fn().mockResolvedValue({
        getPayload: () => ({ email: 'google@test.com', name: 'Google User', sub: 'g-123' })
      }),
    })),
  };
});

jest.mock('../../src/config/env.config', () => ({
  loadConfig: jest.fn().mockReturnValue({
    JWT_SECRET: 'test-secret',
    GOOGLE_CLIENT_ID: 'test-google-id',
  }),
}));


describe('Wallet Provider Abstraction - Mock Tests', () => {
  let authService;
  let failingWalletProvider;

  beforeAll(() => {
    // Implement a robust Mock adapter that intentionally returns HTTP 500s or timeouts.
    failingWalletProvider = {
      createWallet: jest.fn().mockImplementation(async () => {
        // Simulate a provider timeout or 500 internal server error
        const error = new Error('Wallet Provider Timeout / 500 Internal Server Error');
        error.status = 500;
        throw error;
      }),
      getWallet: jest.fn().mockImplementation(async () => {
        throw new Error('Wallet Provider Down');
      }),
    };

    const userRepository = new UserRepository(prisma);
    const walletRepository = new WalletRepository(prisma);
    const passwordResetTokenRepository = new PasswordResetTokenRepository(prisma);

    // Inject the failing mock adapter into the DI container specifically for this test suite.
    authService = createAuthService({
      userRepository,
      passwordResetTokenRepository,
      walletProvider: failingWalletProvider,
      prisma,
      UserRepository,
      WalletRepository,
    });
  });

  beforeEach(async () => {
    // Clean up before each test
    await prisma.wallet.deleteMany();
    await prisma.user.deleteMany();
  });

  it('fails safely when provider times out without leaving orphaned database records', async () => {
    const email = 'test_provision_fail@example.com';
    const password = 'Password123!';

    // Attempt to register a new user
    let caughtError;
    try {
      await authService.register({ email, password });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.statusCode).toBe(503);
    expect(caughtError.message).toBe('Wallet provider is currently unavailable. Please try again later.');

    // Assert that provider timeout results in controlled backend error
    // Prove that automated wallet provisioning fails safely (no orphaned database records)
    const usersCount = await prisma.user.count();
    const walletsCount = await prisma.wallet.count();

    expect(usersCount).toBe(0);
    expect(walletsCount).toBe(0);
  });

  it('fails safely for googleSignIn when provider times out without leaving orphaned database records', async () => {
    // Attempt to register a new user via Google
    let caughtError;
    try {
      await authService.googleSignIn({ idToken: 'valid-token' });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.statusCode).toBe(503);
    expect(caughtError.message).toBe('Wallet provider is currently unavailable. Please try again later.');

    // Assert that provider timeout results in controlled backend error
    // Prove that automated wallet provisioning fails safely (no orphaned database records)
    const usersCount = await prisma.user.count();
    const walletsCount = await prisma.wallet.count();

    expect(usersCount).toBe(0);
    expect(walletsCount).toBe(0);
  });
});
