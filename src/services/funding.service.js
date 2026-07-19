/**
 * Factory function for the Funding Service.
 *
 * Orchestrates managed wallet funding by delegating the top-up to the generic
 * wallet provider abstraction, keeping the transport/provider details out of
 * the route layer.
 *
 * @param {Object} deps - Dependencies
 * @param {Object} deps.walletProvider - The injected generic wallet provider.
 */
const createFundingService = ({ walletProvider }) => {
  /**
   * Routes a validated funding request to the wallet provider abstraction.
   *
   * @param {Object} params - Funding parameters (already schema-validated).
   * @param {string} params.walletAddress - The managed wallet to credit.
   * @param {string} params.amount - The amount to fund.
   * @param {string} [params.asset] - The asset code to fund with.
   * @returns {Promise<Object>} The funding receipt returned by the provider.
   */
  const fundWallet = async ({ walletAddress, amount, asset = 'XLM' }) => {
    return walletProvider.fundWallet({ walletAddress, amount, asset });
  };

  return { fundWallet };
};

module.exports = { createFundingService };
