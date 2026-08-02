const { createEscrowService } = require('../../src/services/escrow.service');
const StellarSdk = require('stellar-sdk');

describe('Escrow Service', () => {
  let escrowService;
  let transactionBuilderMock;
  let mockEscrowRepository;
  let mockTransactionRepository;

  const mockConfig = {
    // Valid Ed25519 Secret Seed for testing purposes only
    FEE_BUMP_SECRET_KEY: StellarSdk.Keypair.random().secret()
  };
  const mockSponsorPublicKey = StellarSdk.Keypair.fromSecret(mockConfig.FEE_BUMP_SECRET_KEY).publicKey();

  beforeEach(() => {
    transactionBuilderMock = {
      buildTransaction: jest.fn().mockResolvedValue('MOCK_XDR')
    };

    mockEscrowRepository = {
      create: jest.fn().mockResolvedValue({ id: 'intent-123' }),
      findById: jest.fn().mockResolvedValue({ id: 'intent-123', onChainEscrowId: '123' })
    };

    mockTransactionRepository = {
      create: jest.fn().mockResolvedValue({ id: 'tx-123' })
    };

    escrowService = createEscrowService({
      transactionBuilder: transactionBuilderMock,
      config: mockConfig,
      escrowRepository: mockEscrowRepository,
      transactionRepository: mockTransactionRepository
    });
  });

  it('should construct create escrow transaction and save intent', async () => {
    const validBuyer = StellarSdk.Keypair.random().publicKey();
    const validSeller = StellarSdk.Keypair.random().publicKey();
    
    const params = {
      buyer: validBuyer,
      seller: validSeller,
      amount: '100'
    };

    const { unsignedXdr, escrowIntentId } = await escrowService.createEscrow(params);
    
    expect(unsignedXdr).toBe('MOCK_XDR');
    expect(escrowIntentId).toBe('intent-123');
    
    expect(mockEscrowRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      buyerAddress: validBuyer,
      sellerAddress: validSeller,
      amount: '100',
      actionType: 'CREATE',
      status: 'PENDING'
    }));

    expect(transactionBuilderMock.buildTransaction).toHaveBeenCalledWith(
      mockSponsorPublicKey, // source address
      'create_escrow',
      expect.any(Array) // scVal parameters
    );
  });

  it('should construct lock escrow transaction', async () => {
    const { unsignedXdr, escrowIntentId } = await escrowService.lockEscrow({ escrowId: 'intent-123' });
    expect(unsignedXdr).toBe('MOCK_XDR');
    expect(escrowIntentId).toBe('intent-123');
    
    expect(mockEscrowRepository.findById).toHaveBeenCalledWith('intent-123');
    
    expect(transactionBuilderMock.buildTransaction).toHaveBeenCalledWith(
      mockSponsorPublicKey,
      'lock_funds',
      expect.any(Array)
    );
  });

  it('should construct release escrow transaction', async () => {
    const { unsignedXdr, escrowIntentId } = await escrowService.releaseEscrow({ escrowId: 'intent-123' });
    expect(unsignedXdr).toBe('MOCK_XDR');
    expect(escrowIntentId).toBe('intent-123');
    expect(transactionBuilderMock.buildTransaction).toHaveBeenCalledWith(
      mockSponsorPublicKey,
      'release',
      expect.any(Array)
    );
  });

  it('should construct refund escrow transaction', async () => {
    const { unsignedXdr, escrowIntentId } = await escrowService.refundEscrow({ escrowId: 'intent-123' });
    expect(unsignedXdr).toBe('MOCK_XDR');
    expect(escrowIntentId).toBe('intent-123');
    expect(transactionBuilderMock.buildTransaction).toHaveBeenCalledWith(
      mockSponsorPublicKey,
      'refund',
      expect.any(Array)
    );
  });

  it('should record transaction', async () => {
    await escrowService.recordTransaction('intent-123', 'txhash', 'SUCCESS');
    expect(mockTransactionRepository.create).toHaveBeenCalledWith({
      escrowIntentId: 'intent-123',
      txHash: 'txhash',
      status: 'SUCCESS'
    });
  });
});
