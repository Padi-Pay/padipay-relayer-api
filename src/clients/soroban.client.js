const StellarSdk = require('stellar-sdk');
const ConfigError = require('../errors/ConfigError');

/**
 * Factory function to create a reusable Soroban contract client.
 * @param {Object} config - The application configuration object.
 * @param {string} config.CONTRACT_ID - The Soroban contract ID.
 * @returns {StellarSdk.Contract} The Stellar SDK contract instance.
 */
const createSorobanClient = (config) => {
  if (!config || !config.CONTRACT_ID) {
    throw new ConfigError('CONTRACT_ID is missing from configuration');
  }

  return new StellarSdk.Contract(config.CONTRACT_ID);
};

module.exports = { createSorobanClient };
