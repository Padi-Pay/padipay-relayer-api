const { createTransactionBuilder } = require('../../src/builders/transaction.builder');
const StellarSdk = require('stellar-sdk');
const RpcError = require('../../src/errors/RpcError');

describe('Transaction Builder', () => {
  let transactionBuilder;
  let mockServer;
  let mockContract;
  
  const mockConfig = {
    NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
    FEE_BUMP_SECRET_KEY: StellarSdk.Keypair.random().secret()
  };

  const validPubKey = StellarSdk.Keypair.random().publicKey();

  beforeEach(() => {
    mockServer = {
      getAccount: jest.fn().mockResolvedValue(new StellarSdk.Account(validPubKey, '1')),
      prepareTransaction: jest.fn().mockImplementation((tx) => Promise.resolve(tx))
    };
    
    mockContract = {
      call: jest.fn().mockReturnValue(StellarSdk.Operation.payment({
        destination: validPubKey,
        asset: StellarSdk.Asset.native(),
        amount: '10'
      })) 
    };

    transactionBuilder = createTransactionBuilder({
      server: mockServer,
      contract: mockContract,
      config: mockConfig
    });
  });

  describe('buildTransaction', () => {
    it('should fetch account sequence and build transaction', async () => {
      const sourceAddress = validPubKey;
      const method = 'create_escrow';
      const params = [];
      
      const result = await transactionBuilder.buildTransaction(sourceAddress, method, params);
      
      expect(mockServer.getAccount).toHaveBeenCalledWith(sourceAddress);
      expect(mockContract.call).toHaveBeenCalledWith(method, ...params);
      
      expect(typeof result).toBe('string');
      const tx = new StellarSdk.Transaction(result, mockConfig.NETWORK_PASSPHRASE);
      expect(tx.operations).toHaveLength(1);
    });

    it('should throw RpcError when getAccount fails', async () => {
      mockServer.getAccount.mockRejectedValue(new Error('Network error'));
      
      await expect(transactionBuilder.buildTransaction('G123', 'method')).rejects.toThrow(RpcError);
    });
  });

  describe('buildFeeBumpTransaction', () => {
    it('should wrap an inner transaction with fee bump', async () => {
      const innerTx = await transactionBuilder.buildTransaction(validPubKey, 'method');
      
      const feeBumpXdr = transactionBuilder.buildFeeBumpTransaction(innerTx);
      
      const feeBumpTx = StellarSdk.TransactionBuilder.fromXDR(feeBumpXdr, mockConfig.NETWORK_PASSPHRASE);
      expect(feeBumpTx).toBeInstanceOf(StellarSdk.FeeBumpTransaction);
      
      const sponsorKeypair = StellarSdk.Keypair.fromSecret(mockConfig.FEE_BUMP_SECRET_KEY);
      expect(feeBumpTx.feeSource).toBe(sponsorKeypair.publicKey());
    });
  });
});
