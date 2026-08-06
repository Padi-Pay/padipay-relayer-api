const { createWalletProvider } = require('../../src/providers/wallet.provider');
const axios = require('axios');

jest.mock('axios');

describe('Wallet Provider', () => {
  it('should return a funding receipt for a top-up request', async () => {
    axios.get.mockResolvedValue({ data: { hash: 'tx_hash_123' } });
    const provider = createWalletProvider({ config: { NETWORK_PASSPHRASE: 'Test SDF Network' } });

    const receipt = await provider.fundWallet({
      walletAddress: 'G_WALLET',
      amount: '1000',
      asset: 'XLM',
    });

    expect(receipt).toMatchObject({
      status: 'SUCCESS',
      walletAddress: 'G_WALLET',
      amount: '10000',
      asset: 'XLM',
      network: 'Test SDF Network',
    });
    expect(receipt.reference).toMatch(/^fund_/);
  });

  it('should generate a unique reference per request', async () => {
    axios.get.mockResolvedValue({ data: { hash: 'tx_hash_123' } });
    const provider = createWalletProvider();

    const first = await provider.fundWallet({ walletAddress: 'G_A', amount: '1', asset: 'XLM' });
    const second = await provider.fundWallet({ walletAddress: 'G_A', amount: '1', asset: 'XLM' });

    expect(first.reference).not.toBe(second.reference);
  });

  it('should fall back to an unknown network when config is absent', async () => {
    axios.get.mockResolvedValue({ data: { hash: 'tx_hash_123' } });
    const provider = createWalletProvider();

    const receipt = await provider.fundWallet({ walletAddress: 'G_A', amount: '1', asset: 'XLM' });

    expect(receipt.network).toBe('unknown');
  });

  it('should return a FAILED receipt if friendbot errors', async () => {
    axios.get.mockRejectedValue(new Error('Friendbot error'));
    const provider = createWalletProvider({ config: { NETWORK_PASSPHRASE: 'Test SDF Network' } });

    const receipt = await provider.fundWallet({ walletAddress: 'G_A', amount: '1000', asset: 'XLM' });

    expect(receipt.status).toBe('FAILED');
    expect(receipt.reference).toMatch(/^fund_/);
  });

  describe('withdrawFromWallet', () => {
    it('should return a withdrawal receipt for a successful withdrawal', async () => {
      const { Keypair, Account } = require('@stellar/stellar-sdk');
      const secret = Keypair.random().secret();
      const mockHorizonServer = {
        loadAccount: jest.fn().mockResolvedValue(new Account('G_WALLET', '1')),
        submitTransaction: jest.fn().mockResolvedValue({ hash: 'mock_tx_hash' }),
      };
      const provider = createWalletProvider({ config: { NETWORK_PASSPHRASE: 'Test SDF Network' }, horizonServer: mockHorizonServer });

      const receipt = await provider.withdrawFromWallet({
        walletAddress: 'G_WALLET',
        amount: '1000',
        asset: 'XLM',
        destinationAddress: Keypair.random().publicKey(),
        secretKey: secret,
      });

      expect(receipt).toMatchObject({
        status: 'SUCCESS',
        walletAddress: 'G_WALLET',
        amount: '1000',
        asset: 'XLM',
        network: 'Test SDF Network',
        txId: 'mock_tx_hash',
      });
      expect(receipt.reference).toMatch(/^withdraw_/);
    });

    it('should throw an error for legacy accounts without secret keys', async () => {
      const provider = createWalletProvider();
      await expect(provider.withdrawFromWallet({
        walletAddress: 'G_A', amount: '1', asset: 'XLM', secretKey: 'managed-by-provider'
      })).rejects.toThrow('Withdrawal is not supported for legacy accounts without secret keys.');
    });

    it('should throw an error if horizonServer is not provided', async () => {
      const provider = createWalletProvider();
      await expect(provider.withdrawFromWallet({
        walletAddress: 'G_A', amount: '1', asset: 'XLM', secretKey: 'S_VALID_MOCK'
      })).rejects.toThrow('horizonServer is required to execute real withdrawals');
    });
  });

  describe('getBalance', () => {
    it('should fetch real balance from horizonService', async () => {
      const mockHorizonService = {
        getAccountBalance: jest.fn().mockResolvedValue('500.1234567'),
      };
      const provider = createWalletProvider({ horizonService: mockHorizonService });

      const balance = await provider.getBalance('G_WALLET_ADDRESS');
      
      expect(mockHorizonService.getAccountBalance).toHaveBeenCalledWith('G_WALLET_ADDRESS');
      expect(balance).toBe('500.1234567');
    });

    it('should throw an error if horizonService is not provided', async () => {
      const provider = createWalletProvider();
      await expect(provider.getBalance('G_WALLET_ADDRESS')).rejects.toThrow('horizonService is required to fetch real balances');
    });
  });
});
