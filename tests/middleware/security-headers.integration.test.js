const cors = require('cors');

jest.mock('../../src/config/env.config', () => ({
  loadConfig: jest.fn().mockReturnValue({
    ALLOWED_ORIGINS: 'http://localhost:3000,http://127.0.0.1:3000',
  }),
}));

jest.mock('../../src/clients/prisma.client', () => ({}));

jest.mock('../../src/middleware/auth.middleware', () => ({
  authenticate: (req, res, next) => next(),
}));

jest.mock('../../src/routes/auth.routes', () => require('express').Router());
jest.mock('../../src/routes/users.routes', () => require('express').Router());
jest.mock('../../src/routes/accounts.routes', () => require('express').Router());
jest.mock('../../src/routes/health.routes', () => {
  const router = require('express').Router();
  router.get('/', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'padipay-relayer-api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
});
jest.mock('../../src/routes/relayer.routes', () => ({
  createRelayerRoutes: jest.fn(() => require('express').Router()),
}));
jest.mock('../../src/routes/wallets.routes', () => ({
  createWalletsRoutes: jest.fn(() => require('express').Router()),
}));

jest.mock('../../src/services/audit-logger.service', () => ({
  createAuditLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.mock('../../src/builders/transaction.builder', () => ({
  createTransactionBuilder: jest.fn(() => ({})),
}));

jest.mock('../../src/services/escrow.service', () => ({
  createEscrowService: jest.fn(() => ({})),
}));

jest.mock('../../src/services/horizon.service', () => ({
  createHorizonService: jest.fn(() => ({})),
}));

jest.mock('../../src/services/stellar.service', () => ({
  createStellarService: jest.fn(() => ({})),
}));

jest.mock('../../src/providers/wallet.provider', () => ({
  createWalletProvider: jest.fn(() => ({})),
}));

jest.mock('../../src/repositories/wallet.repository', () => ({
  WalletRepository: jest.fn(),
}));

jest.mock('../../src/repositories/escrow.repository', () => ({
  createEscrowRepository: jest.fn(() => ({})),
}));

jest.mock('../../src/repositories/transaction.repository', () => ({
  createTransactionRepository: jest.fn(() => ({})),
}));

const {
  createApp,
  createApiContentSecurityPolicy,
  createCorsOriginGuard,
  createSecurityHeadersMiddleware,
} = require('../../src/app.factory');

const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];

const app = createApp({
  config: { ALLOWED_ORIGINS: allowedOrigins.join(',') },
  server: {},
  horizonServer: {},
  contract: {},
  walletRepository: {},
  escrowRepository: {},
  transactionRepository: {},
  auditLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  transactionBuilder: {},
  escrowService: {},
  horizonService: {},
  stellarService: {},
  walletProvider: {},
});

function createMockRequest(origin, method = 'GET', path = '/health') {
  const headers = origin ? { origin } : {};

  return {
    method,
    path,
    originalUrl: path,
    headers,
    get(name) {
      return this.headers[name.toLowerCase()];
    },
    header(name) {
      return this.get(name);
    },
  };
}

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    getHeader(name) {
      return this.headers[name.toLowerCase()];
    },
    removeHeader(name) {
      delete this.headers[name.toLowerCase()];
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('Security headers', () => {
  it('disables x-powered-by on the Express app', () => {
    expect(app.get('x-powered-by')).toBe(false);
  });

  it('adds security headers and allows configured origins', () => {
    const req = createMockRequest('http://localhost:3000');
    const res = createMockResponse();
    const next = jest.fn();

    createSecurityHeadersMiddleware()(req, res, next);
    createApiContentSecurityPolicy()(req, res, next);
    createCorsOriginGuard(allowedOrigins)(req, res, next);
    cors({ origin: allowedOrigins, credentials: true })(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toContain('max-age=31536000');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('rejects requests from unauthorized origins', () => {
    const req = createMockRequest('https://evil.example');
    const res = createMockResponse();
    const next = jest.fn();

    createCorsOriginGuard(allowedOrigins)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      success: false,
      message: 'CORS origin not allowed',
    });
  });
});
