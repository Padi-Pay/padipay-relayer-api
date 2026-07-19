const { createWalletProvider } = require('../../src/providers/wallet.provider');

describe('Wallet Provider', () => {
  it('should return a funding receipt for a top-up request', async () => {
    const provider = createWalletProvider({ config: { NETWORK_PASSPHRASE: 'Test SDF Network' } });

    const receipt = await provider.fundWallet({
      walletAddress: 'G_WALLET',
      amount: '1000',
      asset: 'XLM',
    });

    expect(receipt).toMatchObject({
      status: 'PENDING',
      walletAddress: 'G_WALLET',
      amount: '1000',
      asset: 'XLM',
      network: 'Test SDF Network',
    });
    expect(receipt.reference).toMatch(/^fund_/);
  });

  it('should generate a unique reference per request', async () => {
    const provider = createWalletProvider();

    const first = await provider.fundWallet({ walletAddress: 'G_A', amount: '1', asset: 'XLM' });
    const second = await provider.fundWallet({ walletAddress: 'G_A', amount: '1', asset: 'XLM' });

    expect(first.reference).not.toBe(second.reference);
  });

  it('should fall back to an unknown network when config is absent', async () => {
    const provider = createWalletProvider();

    const receipt = await provider.fundWallet({ walletAddress: 'G_A', amount: '1', asset: 'XLM' });

    expect(receipt.network).toBe('unknown');
  });
});
