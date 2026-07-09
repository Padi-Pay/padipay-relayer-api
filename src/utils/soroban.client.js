const StellarSdk = require('stellar-sdk');
const config = require('../config/env.config');

if (!config.CONTRACT_ID) {
  throw new Error('Invalid Configuration: CONTRACT_ID is missing');
}

// Create a reusable contract client
const contract = new StellarSdk.Contract(config.CONTRACT_ID);

module.exports = {
  contract,
};
