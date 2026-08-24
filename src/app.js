const { loadConfig } = require('./config/env.config');
const { createApp } = require('./app.factory');
const logger = require('./config/logger');

let config;
try {
  config = loadConfig();
} catch (error) {
  logger.error({ err: error }, 'Failed to load configuration');
  process.exit(1);
}

const app = createApp();

// Swagger API Documentation
const swaggerUi = require('swagger-ui-express');
const { generateOpenApiDocument } = require('./docs/openapi');
app.use('/docs', swaggerUi.serve, swaggerUi.setup(generateOpenApiDocument()));

// Start server
app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, `Stellar Relayer API is running on port ${config.PORT}`);
});
