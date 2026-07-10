const StellarSdk = require('stellar-sdk');

/**
 * Factory function to create a reusable Soroban contract client.
 * @param {Object} config - The application configuration object.
 * @param {string} config.CONTRACT_ID - The Soroban contract ID.
 * @returns {StellarSdk.Contract} The Stellar SDK contract instance.
 */
const createSorobanClient = (config) => {
  return new StellarSdk.Contract(config.CONTRACT_ID);
};

module.exports = { createSorobanClient };
