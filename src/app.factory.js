require('dotenv').config();
require('./docs/zod-setup');
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
global.fetch = global.fetch || require('node-fetch');
const StellarSdk = require('@stellar/stellar-sdk');
const helmet = require('helmet');
const { loadConfig } = require('./config/env.config');
const express = require('express');
const cors = require('cors');
const { createRelayerRoutes } = require('./routes/relayer.routes');
const { createHealthRoutes } = require('./routes/health.routes');
const errorHandler = require('./middleware/error.middleware');
const { authenticate } = require('./middleware/auth.middleware');
const { correlationId } = require('./middleware/correlation-id.middleware');

const { createTransactionBuilder } = require('./builders/transaction.builder');
const { createEscrowService } = require('./services/escrow.service');
const { createHorizonService } = require('./services/horizon.service');
const { createStellarService } = require('./services/stellar.service');
const { createWalletProvider } = require('./providers/wallet.provider');

const prisma = require('./clients/prisma.client');

const { WalletRepository } = require('./repositories/wallet.repository');
const { createEscrowRepository } = require('./repositories/escrow.repository');
const { createTransactionRepository } = require('./repositories/transaction.repository');

const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const accountsRoutes = require('./routes/accounts.routes');
const { createWalletsRoutes } = require('./routes/wallets.routes');
const { createAuditLogger } = require('./services/audit-logger.service');

const parseAllowedOrigins = (value) => {
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error('ALLOWED_ORIGINS must include at least one origin');
  }

  if (origins.includes('*')) {
    throw new Error('ALLOWED_ORIGINS cannot contain wildcard origins');
  }

  return origins;
};

const createCorsOriginGuard = (allowedOrigins) => {
  const allowlist = new Set(allowedOrigins);

  return (req, res, next) => {
    const origin = req.get('Origin');

    if (!origin || allowlist.has(origin)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'CORS origin not allowed',
    });
  };
};

const createSecurityHeadersMiddleware = () => helmet({
  contentSecurityPolicy: false,
  frameguard: { action: 'deny' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
    setIf: () => true,
  },
});

const createApiContentSecurityPolicy = () => helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'", 'data:'],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    imgSrc: ["'self'", 'data:'],
    objectSrc: ["'none'"],
    scriptSrc: ["'self'"],
    scriptSrcAttr: ["'none'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    upgradeInsecureRequests: [],
  },
});

const createApp = (overrides = {}) => {
  const config = overrides.config || loadConfig();
  const allowedOrigins = parseAllowedOrigins(config.ALLOWED_ORIGINS);

  const server = overrides.server || new StellarSdk.rpc.Server(config.RPC_URL);
  const horizonServer = overrides.horizonServer || new StellarSdk.Horizon.Server(config.HORIZON_URL);
  const contract = overrides.contract || new StellarSdk.Contract(config.CONTRACT_ID);

  const walletRepository = overrides.walletRepository || new WalletRepository(appPrisma);
  const escrowRepository = overrides.escrowRepository || createEscrowRepository({ prisma: appPrisma });
  const transactionRepository = overrides.transactionRepository || createTransactionRepository({ prisma: appPrisma });

  const auditLogger = overrides.auditLogger || createAuditLogger();

  const transactionBuilder = overrides.transactionBuilder || createTransactionBuilder({ server, contract, config });
  const escrowService = overrides.escrowService || createEscrowService({ transactionBuilder, config, escrowIntentRepository: escrowRepository, transactionRepository, auditLogger });
  const horizonService = overrides.horizonService || createHorizonService({ server, horizonServer });
  const stellarService = overrides.stellarService || createStellarService({ config, server });
  const walletProvider = overrides.walletProvider || createWalletProvider({ config, horizonService, horizonServer });

  const app = express();
  const securityHeaders = createSecurityHeadersMiddleware();
  const apiContentSecurityPolicy = createApiContentSecurityPolicy();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(correlationId);
  app.use(securityHeaders);
  app.use((req, res, next) => {
    if (req.path.startsWith('/docs')) {
      return next();
    }

    return apiContentSecurityPolicy(req, res, next);
  });

  app.use(createCorsOriginGuard(allowedOrigins));
  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
  }));
  app.options('*', cors({
    origin: allowedOrigins,
    credentials: true,
  }));

  app.use(express.json());

  const relayerRoutes = createRelayerRoutes({ escrowService, horizonService, stellarService });
  const walletsRoutes = createWalletsRoutes({ walletProvider, walletRepository, auditLogger });
  const healthRoutes = createHealthRoutes({ prisma: appPrisma, server });

  app.use('/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/users/me', authenticate, usersRoutes);
  app.use('/api/accounts/me', authenticate, accountsRoutes);
  app.use('/api/wallets', authenticate, walletsRoutes);
  app.use('/api/relayer', relayerRoutes);

  app.use(errorHandler);

  return app;
};

module.exports = {
  createApp,
  createCorsOriginGuard,
  createApiContentSecurityPolicy,
  createSecurityHeadersMiddleware,
  parseAllowedOrigins,
};
