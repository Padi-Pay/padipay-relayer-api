const crypto = require('crypto');

/**
 * Factory function for the generic Wallet Provider abstraction.
 *
 * This provider is intentionally provider-agnostic: it exposes a stable
 * interface that can later be backed by an external ramp, a testnet faucet,
 * or a managed wallet funding SDK. Integrating a real fiat on-ramp
 * (e.g. Stripe/MoonPay) is out of scope for this abstraction.
 *
 * @param {Object} [deps] - Dependencies
 * @param {Object} [deps.config] - Application configuration.
 */
const createWalletProvider = ({ config } = {}) => {
  /**
   * Executes a managed wallet top-up through the underlying provider.
   *
   * @param {Object} params - Funding parameters
   * @param {string} params.walletAddress - The managed wallet to credit.
   * @param {string} params.amount - The amount to fund (string to safely
   *   handle large numbers), already validated at the schema layer.
   * @param {string} params.asset - The asset code to fund with (e.g. 'XLM').
   * @returns {Promise<Object>} A funding receipt describing the initiated top-up.
   */
  const fundWallet = async ({ walletAddress, amount, asset }) => {
    // A concrete integration would dispatch to the configured ramp/faucet here.
    // Until then we return a deterministic receipt describing the request.
    return {
      reference: `fund_${crypto.randomUUID()}`,
      status: 'PENDING',
      walletAddress,
      amount,
      asset,
      network: config?.NETWORK_PASSPHRASE ?? 'unknown',
    };
  };

  return { fundWallet };
};

module.exports = { createWalletProvider };
