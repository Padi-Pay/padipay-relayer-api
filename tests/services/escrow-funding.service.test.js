const { createEscrowFundingService } = require('../../src/services/escrow-funding.service');
const RpcError = require('../../src/errors/RpcError');

describe('Escrow Funding Service', () => {
  let escrowFundingService;
  let escrowIntentRepositoryMock;
  let walletRepositoryMock;
  let walletProviderMock;
  let transactionBuilderMock;

  const baseEscrowIntent = {
    id: 'intent-1',
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
    amount: 100,
    status: 'PENDING',
    sorobanEscrowId: '42',
  };

  const wallet = { id: 'wallet-1', userId: 'buyer-1', stellarAddress: 'G_BUYER_WALLET' };

  beforeEach(() => {
    escrowIntentRepositoryMock = {
      findById: jest.fn().mockResolvedValue({ ...baseEscrowIntent }),
      update: jest.fn().mockResolvedValue({ ...baseEscrowIntent, status: 'FUNDING_SPONSORED' }),
    };

    walletRepositoryMock = {
      findByUserId: jest.fn().mockResolvedValue(wallet),
    };

    walletProviderMock = {
      withdrawFromWallet: jest.fn().mockResolvedValue({ reference: 'withdraw_1', status: 'RESERVED' }),
      fundWallet: jest.fn().mockResolvedValue({ reference: 'fund_1', status: 'PENDING' }),
    };

    transactionBuilderMock = {
      buildTransaction: jest.fn().mockResolvedValue('UNSIGNED_XDR'),
      buildFeeBumpTransaction: jest.fn().mockReturnValue('SPONSORED_XDR'),
    };

    escrowFundingService = createEscrowFundingService({
      escrowIntentRepository: escrowIntentRepositoryMock,
      walletRepository: walletRepositoryMock,
      walletProvider: walletProviderMock,
      transactionBuilder: transactionBuilderMock,
    });
  });

  it('should withdraw from the managed wallet and construct a sponsored funding transaction', async () => {
    const result = await escrowFundingService.fundEscrow({ escrowIntentId: 'intent-1', buyerId: 'buyer-1' });

    expect(walletRepositoryMock.findByUserId).toHaveBeenCalledWith('buyer-1');
    expect(walletProviderMock.withdrawFromWallet).toHaveBeenCalledWith({
      walletAddress: 'G_BUYER_WALLET',
      amount: '100',
      asset: 'XLM',
    });
    expect(transactionBuilderMock.buildTransaction).toHaveBeenCalledWith(
      'G_BUYER_WALLET',
      'lock_funds',
      expect.any(Array)
    );
    expect(transactionBuilderMock.buildFeeBumpTransaction).toHaveBeenCalledWith('UNSIGNED_XDR');
    expect(escrowIntentRepositoryMock.update).toHaveBeenCalledWith('intent-1', { status: 'FUNDING_SPONSORED' });

    expect(result.transactionXdr).toBe('SPONSORED_XDR');
    expect(result.escrowIntent.status).toBe('FUNDING_SPONSORED');
    expect(result.withdrawal).toEqual({ reference: 'withdraw_1', status: 'RESERVED' });
  });

  it('should throw 404 when the escrow intent does not exist', async () => {
    escrowIntentRepositoryMock.findById.mockResolvedValue(null);

    await expect(
      escrowFundingService.fundEscrow({ escrowIntentId: 'missing', buyerId: 'buyer-1' })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('should throw 403 when the requester is not the buyer', async () => {
    await expect(
      escrowFundingService.fundEscrow({ escrowIntentId: 'intent-1', buyerId: 'someone-else' })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('should throw 409 when the escrow intent is not in a PENDING state', async () => {
    escrowIntentRepositoryMock.findById.mockResolvedValue({ ...baseEscrowIntent, status: 'FUNDING_SPONSORED' });

    await expect(
      escrowFundingService.fundEscrow({ escrowIntentId: 'intent-1', buyerId: 'buyer-1' })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('should throw 409 when the escrow has not been created on-chain yet', async () => {
    escrowIntentRepositoryMock.findById.mockResolvedValue({ ...baseEscrowIntent, sorobanEscrowId: null });

    await expect(
      escrowFundingService.fundEscrow({ escrowIntentId: 'intent-1', buyerId: 'buyer-1' })
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(walletProviderMock.withdrawFromWallet).not.toHaveBeenCalled();
  });

  it('should throw 404 when the buyer has no managed wallet', async () => {
    walletRepositoryMock.findByUserId.mockResolvedValue(null);

    await expect(
      escrowFundingService.fundEscrow({ escrowIntentId: 'intent-1', buyerId: 'buyer-1' })
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(walletProviderMock.withdrawFromWallet).not.toHaveBeenCalled();
  });

  it('should roll back the withdrawal and rethrow when the transaction fails to build', async () => {
    const rpcError = new RpcError('RPC unavailable');
    transactionBuilderMock.buildTransaction.mockRejectedValue(rpcError);

    await expect(
      escrowFundingService.fundEscrow({ escrowIntentId: 'intent-1', buyerId: 'buyer-1' })
    ).rejects.toThrow(rpcError);

    expect(walletProviderMock.fundWallet).toHaveBeenCalledWith({
      walletAddress: 'G_BUYER_WALLET',
      amount: '100',
      asset: 'XLM',
    });
    expect(escrowIntentRepositoryMock.update).not.toHaveBeenCalled();
  });

  it('should roll back the withdrawal and rethrow when the fee bump transaction fails to build', async () => {
    const stellarError = new Error('sponsor sign failed');
    transactionBuilderMock.buildFeeBumpTransaction.mockImplementation(() => {
      throw stellarError;
    });

    await expect(
      escrowFundingService.fundEscrow({ escrowIntentId: 'intent-1', buyerId: 'buyer-1' })
    ).rejects.toThrow(stellarError);

    expect(walletProviderMock.fundWallet).toHaveBeenCalledWith({
      walletAddress: 'G_BUYER_WALLET',
      amount: '100',
      asset: 'XLM',
    });
    expect(escrowIntentRepositoryMock.update).not.toHaveBeenCalled();
  });
});
