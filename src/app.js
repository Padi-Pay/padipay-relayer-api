const StellarSdk = require('stellar-sdk');
const { loadConfig } = require('./config/env.config');
const express = require('express');
const { createRelayerRoutes } = require('./routes/relayer.routes');
const healthRoutes = require('./routes/health.routes');
const errorHandler = require('./middleware/error.middleware');

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

// Bootstrap Dependency Injection Container
const transactionBuilder = createTransactionBuilder({ server, contract, config });
const escrowService = createEscrowService({ transactionBuilder, config });
const horizonService = createHorizonService({ server });
const stellarService = createStellarService({ config, server });

const app = express();
const PORT = config.PORT;

// Middleware to parse JSON bodies
app.use(express.json());

// API Routes
const relayerRoutes = createRelayerRoutes({ escrowService, horizonService, stellarService });
app.use('/health', healthRoutes);
app.use('/api/relayer', relayerRoutes);

// Error Handling Middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Stellar Relayer API is running on port ${PORT}`);
});
