const StellarSdk = require('stellar-sdk');
const { loadConfig } = require('./config/env.config');
const express = require('express');
const { createRelayerRoutes } = require('./routes/relayer.routes');
const healthRoutes = require('./routes/health.routes');
const errorHandler = require('./middleware/error.middleware');
const authenticate = require('./middleware/auth.middleware');

const { createTransactionBuilder } = require('./builders/transaction.builder');
const { createEscrowService } = require('./services/escrow.service');
const { createHorizonService } = require('./services/horizon.service');
const { createStellarService } = require('./services/stellar.service');
const { createEmbeddedWalletProvider } = require('./providers/embedded-wallet.provider');

let config;
try {
  config = loadConfig();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

// Initialize Stellar/Soroban dependencies
const server = new StellarSdk.SorobanRpc.Server(config.RPC_URL);
const horizonServer = new StellarSdk.Horizon.Server(config.HORIZON_URL);
const contract = new StellarSdk.Contract(config.CONTRACT_ID);

// Initialize Prisma
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Initialize Repositories
const { createUserRepository } = require('./repositories/user.repository');
const { createWalletRepository } = require('./repositories/wallet.repository');
const { createEscrowRepository } = require('./repositories/escrow.repository');
const { createTransactionRepository } = require('./repositories/transaction.repository');

createUserRepository({ prisma });
const walletRepository = createWalletRepository({ prisma });
const escrowRepository = createEscrowRepository({ prisma });
const transactionRepository = createTransactionRepository({ prisma });

// Bootstrap Dependency Injection Container
const transactionBuilder = createTransactionBuilder({ server, contract, config });
const escrowService = createEscrowService({ transactionBuilder, config, escrowRepository, transactionRepository });
const horizonService = createHorizonService({ server, horizonServer });
const stellarService = createStellarService({ config, server });

const { createWalletProvider } = require('./providers/wallet.provider');
const walletProvider = createWalletProvider({ config, horizonService });

// eslint-disable-next-line no-unused-vars
const embeddedWalletProvider = createEmbeddedWalletProvider({ config });

const app = express();
const PORT = config.PORT;

// Middleware to parse JSON bodies
app.use(express.json());

const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const accountsRoutes = require('./routes/accounts.routes');
const { createWalletsRoutes } = require('./routes/wallets.routes');

// API Routes
const relayerRoutes = createRelayerRoutes({ escrowService, horizonService, stellarService });
const walletsRoutes = createWalletsRoutes({ walletProvider, walletRepository });

app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users/me', authenticate, usersRoutes);
app.use('/api/accounts/me', authenticate, accountsRoutes);
app.use('/api/wallets', authenticate, walletsRoutes);
app.use('/api/relayer', relayerRoutes);

// Error Handling Middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Stellar Relayer API is running on port ${PORT}`);
});
