const crypto = require('crypto');
const { Keypair } = require('stellar-sdk');

/**
 * @typedef {Object} IWalletProvider
 * @property {function(string): Promise<{ address: string }>} createWallet - Creates a new embedded wallet for a user.
 * @property {function(string): Promise<{ address: string } | null>} getWallet - Retrieves the embedded wallet address for a user.
 */

/**
 * Factory function for the generic Embedded Wallet Provider abstraction.
 *
 * This provider satisfies the IWalletProvider interface. It acts as an adapter
 * to an underlying embedded wallet infrastructure (e.g., Privy, Turnkey).
 * By strictly returning only public addresses (and never private keys), it ensures
 * the backend remains completely non-custodial and safely agnostic to the actual provider.
 *
 * @param {Object} [deps] - Dependencies
 * @param {Object} [deps.config] - Application configuration.
 * @returns {IWalletProvider}
 */
const createEmbeddedWalletProvider = ({ _config } = {}) => {
  // In-memory store for mocked wallet addresses.
  // In a real integration, this would communicate with the provider's API.
  const mockWallets = new Map();

  /**
   * Creates a new embedded wallet for a user.
   *
   * @param {string} userId - The unique identifier of the user.
   * @returns {Promise<{ address: string }>} The public address of the generated wallet.
   */
  const createWallet = async (userId) => {
    if (!userId) {
      throw new Error('userId is required to create a wallet');
    }

    // Generate a structurally valid Stellar public key to avoid Horizon 400 Bad Request errors.
    const keypair = Keypair.random();
    const address = keypair.publicKey();
    mockWallets.set(userId, address);

    return { address };
  };

  /**
   * Retrieves the embedded wallet address for a user.
   *
   * @param {string} userId - The unique identifier of the user.
   * @returns {Promise<{ address: string } | null>} The public address, or null if not found.
   */
  const getWallet = async (userId) => {
    if (!userId) {
      throw new Error('userId is required to get a wallet');
    }

    const address = mockWallets.get(userId) || null;
    return address ? { address } : null;
  };

  return { createWallet, getWallet };
};

module.exports = { createEmbeddedWalletProvider };
