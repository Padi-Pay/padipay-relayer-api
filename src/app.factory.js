require('dotenv').config();
require('./docs/zod-setup');
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
global.fetch = global.fetch || require('node-fetch');
const StellarSdk = require('@stellar/stellar-sdk');
const { loadConfig } = require('./config/env.config');
const express = require('express');
const cors = require('cors');
const { createRelayerRoutes } = require('./routes/relayer.routes');
const healthRoutes = require('./routes/health.routes');
const errorHandler = require('./middleware/error.middleware');
const { authenticate } = require('./middleware/auth.middleware');
const { correlationId } = require('./middleware/correlation-id.middleware');

const { createTransactionBuilder } = require('./builders/transaction.builder');
const { createEscrowService } = require('./services/escrow.service');
const { createHorizonService } = require('./services/horizon.service');
const { createStellarService } = require('./services/stellar.service');
const { createEmbeddedWalletProvider } = require('./providers/embedded-wallet.provider');
const { createWalletProvider } = require('./providers/wallet.provider');

const prisma = require('./clients/prisma.client');

const { WalletRepository } = require('./repositories/wallet.repository');
const { createEscrowRepository } = require('./repositories/escrow.repository');
const { createTransactionRepository } = require('./repositories/transaction.repository');

const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const accountsRoutes = require('./routes/accounts.routes');
const { createWalletsRoutes } = require('./routes/wallets.routes');

const createApp = (overrides = {}) => {
  const config = overrides.config || loadConfig();

  const server = overrides.server || new StellarSdk.rpc.Server(config.RPC_URL);
  const horizonServer = overrides.horizonServer || new StellarSdk.Horizon.Server(config.HORIZON_URL);
  const contract = overrides.contract || new StellarSdk.Contract(config.CONTRACT_ID);

  const walletRepository = overrides.walletRepository || new WalletRepository(prisma);
  const escrowRepository = overrides.escrowRepository || createEscrowRepository({ prisma });
  const transactionRepository = overrides.transactionRepository || createTransactionRepository({ prisma });

  const transactionBuilder = overrides.transactionBuilder || createTransactionBuilder({ server, contract, config });
  const escrowService = overrides.escrowService || createEscrowService({ transactionBuilder, config, escrowIntentRepository: escrowRepository, transactionRepository });
  const horizonService = overrides.horizonService || createHorizonService({ server, horizonServer });
  const stellarService = overrides.stellarService || createStellarService({ config, server });
  const walletProvider = overrides.walletProvider || createWalletProvider({ config, horizonService, horizonServer });

  const app = express();

  app.use(correlationId);

  const allowedOrigins = config.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim());
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (config.ALLOWED_ORIGINS === '*') return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }));

  app.use(express.json());

  const relayerRoutes = createRelayerRoutes({ escrowService, horizonService, stellarService });
  const walletsRoutes = createWalletsRoutes({ walletProvider, walletRepository });

  app.use('/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/users/me', authenticate, usersRoutes);
  app.use('/api/accounts/me', authenticate, accountsRoutes);
  app.use('/api/wallets', authenticate, walletsRoutes);
  app.use('/api/relayer', relayerRoutes);

  app.use(errorHandler);

  return app;
};

module.exports = { createApp };
