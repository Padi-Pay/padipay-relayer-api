const { loadConfig } = require('./config/env.config');
const { createApp } = require('./app.factory');

let config;
try {
  config = loadConfig();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const app = createApp();

// Swagger API Documentation
const swaggerUi = require('swagger-ui-express');
const { generateOpenApiDocument } = require('./docs/openapi');
app.use('/docs', swaggerUi.serve, swaggerUi.setup(generateOpenApiDocument()));

// Start server
app.listen(config.PORT, () => {
  console.log(`Stellar Relayer API is running on port ${config.PORT}`);
});
