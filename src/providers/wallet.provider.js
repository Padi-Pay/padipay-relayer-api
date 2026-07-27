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

  /**
   * Executes a managed wallet withdrawal through the underlying provider.
   *
   * Used to debit/reserve funds from a user's managed balance so they can be
   * committed to an on-chain operation (e.g. funding an escrow). Mirrors
   * `fundWallet`'s stub shape until a real provider is integrated.
   *
   * @param {Object} params - Withdrawal parameters
   * @param {string} params.walletAddress - The managed wallet to debit.
   * @param {string} params.amount - The amount to withdraw (string to safely
   *   handle large numbers), already validated/derived server-side.
   * @param {string} params.asset - The asset code to withdraw (e.g. 'XLM').
   * @returns {Promise<Object>} A withdrawal receipt describing the reservation.
   */
  const withdrawFromWallet = async ({ walletAddress, amount, asset }) => {
    return {
      reference: `withdraw_${crypto.randomUUID()}`,
      status: 'RESERVED',
      walletAddress,
      amount,
      asset,
      network: config?.NETWORK_PASSPHRASE ?? 'unknown',
    };
  };

  return { fundWallet, withdrawFromWallet };
};

module.exports = { createWalletProvider };
