const { createFundingService } = require('../../src/services/funding.service');

describe('Funding Service', () => {
  let fundingService;
  let walletProviderMock;

  beforeEach(() => {
    walletProviderMock = {
      fundWallet: jest.fn().mockResolvedValue({ status: 'PENDING', reference: 'ref_1' }),
    };

    fundingService = createFundingService({ walletProvider: walletProviderMock });
  });

  it('should route a funding request to the wallet provider abstraction', async () => {
    const params = { walletAddress: 'G_WALLET', amount: '500', asset: 'USDC' };

    const receipt = await fundingService.fundWallet(params);

    expect(receipt).toEqual({ status: 'PENDING', reference: 'ref_1' });
    expect(walletProviderMock.fundWallet).toHaveBeenCalledWith({
      walletAddress: 'G_WALLET',
      amount: '500',
      asset: 'USDC',
    });
  });

  it('should default the asset to XLM when not provided', async () => {
    await fundingService.fundWallet({ walletAddress: 'G_WALLET', amount: '500' });

    expect(walletProviderMock.fundWallet).toHaveBeenCalledWith({
      walletAddress: 'G_WALLET',
      amount: '500',
      asset: 'XLM',
    });
  });

  it('should propagate errors thrown by the provider', async () => {
    walletProviderMock.fundWallet.mockRejectedValue(new Error('provider down'));

    await expect(
      fundingService.fundWallet({ walletAddress: 'G_WALLET', amount: '500' })
    ).rejects.toThrow('provider down');
  });
});
