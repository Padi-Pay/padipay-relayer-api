const { createEmbeddedWalletProvider } = require('../../src/providers/embedded-wallet.provider');

describe('EmbeddedWalletProvider', () => {
  let provider;

  beforeEach(() => {
    provider = createEmbeddedWalletProvider({ config: { NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015' } });
  });

  describe('createWallet', () => {
    it('creates a valid Stellar mock wallet address for a user ID', async () => {
      const userId = 'user-123';
      const result = await provider.createWallet(userId);
      
      expect(result).toHaveProperty('address');
      expect(result.address.startsWith('G')).toBe(true);
      expect(result.address.length).toBe(56);
    });

    it('throws an error if userId is missing', async () => {
      await expect(provider.createWallet()).rejects.toThrow('userId is required');
    });
  });

  describe('getWallet', () => {
    it('returns null for a user without a wallet', async () => {
      const result = await provider.getWallet('unknown-user');
      expect(result).toBeNull();
    });

    it('returns the generated wallet for a user', async () => {
      const userId = 'user-789';
      const created = await provider.createWallet(userId);
      
      const retrieved = await provider.getWallet(userId);
      expect(retrieved).not.toBeNull();
      expect(retrieved.address).toBe(created.address);
    });

    it('throws an error if userId is missing', async () => {
      await expect(provider.getWallet()).rejects.toThrow('userId is required');
    });
  });
});
