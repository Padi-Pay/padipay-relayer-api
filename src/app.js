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

let config;
try {
  config = loadConfig();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

// Initialize Stellar/Soroban dependencies
const server = new StellarSdk.SorobanRpc.Server(config.RPC_URL);
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
createWalletRepository({ prisma });
const escrowRepository = createEscrowRepository({ prisma });
const transactionRepository = createTransactionRepository({ prisma });

// Bootstrap Dependency Injection Container
const transactionBuilder = createTransactionBuilder({ server, contract, config });
const escrowService = createEscrowService({ transactionBuilder, config, escrowRepository, transactionRepository });
const horizonService = createHorizonService({ server });
const stellarService = createStellarService({ config, server });

const app = express();
const PORT = config.PORT;

// Middleware to parse JSON bodies
app.use(express.json());

const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');

// API Routes
const relayerRoutes = createRelayerRoutes({ escrowService, horizonService, stellarService });
app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users/me', authenticate, usersRoutes);
app.use('/api/relayer', relayerRoutes);

// Error Handling Middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Stellar Relayer API is running on port ${PORT}`);
});
