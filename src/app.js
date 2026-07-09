const { loadConfig } = require('./config/env.config');
const express = require('express');
const relayerRoutes = require('./routes/relayer.routes');

const errorHandler = require('./middleware/error.middleware');

let config;
try {
  config = loadConfig();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
const app = express();
const PORT = config.PORT;

// Middleware to parse JSON bodies
app.use(express.json());

// API Routes
app.use('/api/relayer', relayerRoutes);

// Error Handling Middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Stellar Relayer API is running on port ${PORT}`);
});
