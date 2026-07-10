const { createStellarService } = require('../../src/services/stellar.service');
const StellarSdk = require('stellar-sdk');
const RpcError = require('../../src/errors/RpcError');
const ConfigError = require('../../src/errors/ConfigError');
const StellarError = require('../../src/errors/StellarError');

describe('Stellar Service', () => {
  let stellarService;
  let mockServer;
  const mockKeypair = StellarSdk.Keypair.random();
  
  const mockConfig = {
    NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
    FEE_BUMP_SECRET_KEY: mockKeypair.secret()
  };
  
  beforeEach(() => {
    mockServer = {
      sendTransaction: jest.fn().mockResolvedValue({ status: 'PENDING', hash: 'dummyhash' })
    };
    
    stellarService = createStellarService({
      server: mockServer,
      config: mockConfig
    });
  });

  describe('signTransaction', () => {
    it('should throw StellarError if signing fails (e.g., invalid secret)', () => {
      stellarService = createStellarService({
        server: mockServer,
        config: { ...mockConfig, FEE_BUMP_SECRET_KEY: 'invalid' }
      });
      expect(() => stellarService.signTransaction('xdr')).toThrow(StellarError);
    });

    it('should sign the transaction XDR', () => {
      const tx = new StellarSdk.TransactionBuilder(new StellarSdk.Account(mockKeypair.publicKey(), '1'), {
        fee: '100',
        networkPassphrase: mockConfig.NETWORK_PASSPHRASE
      })
      .addOperation(StellarSdk.Operation.payment({
        destination: mockKeypair.publicKey(),
        asset: StellarSdk.Asset.native(),
        amount: '10'
      }))
      .setTimeout(30)
      .build();

      const unsignedXdr = tx.toXDR();

      const signedXdr = stellarService.signTransaction(unsignedXdr);
      
      const signedTx = new StellarSdk.Transaction(signedXdr, mockConfig.NETWORK_PASSPHRASE);
      expect(signedTx.signatures).toHaveLength(1);
    });
  });

  describe('submitTransaction', () => {
    let unsignedXdr;

    beforeEach(() => {
      const tx = new StellarSdk.TransactionBuilder(new StellarSdk.Account(mockKeypair.publicKey(), '1'), { fee: '100', networkPassphrase: mockConfig.NETWORK_PASSPHRASE }).addOperation(StellarSdk.Operation.payment({destination: mockKeypair.publicKey(), asset: StellarSdk.Asset.native(), amount: '10'})).setTimeout(30).build();
      unsignedXdr = tx.toXDR();
    });

    it('should submit transaction and return success result', async () => {
      const result = await stellarService.submitTransaction(unsignedXdr);
      expect(result.success).toBe(true);
      expect(result.hash).toBe('dummyhash');
      expect(mockServer.sendTransaction).toHaveBeenCalled();
    });

    it('should throw RpcError if transaction is rejected', async () => {
      mockServer.sendTransaction.mockResolvedValue({ status: 'ERROR' });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await expect(stellarService.submitTransaction(unsignedXdr)).rejects.toThrow(RpcError);
      consoleSpy.mockRestore();
    });

    it('should throw StellarError on network failure', async () => {
      const err = new Error('Connection refused');
      err.code = 'ECONNREFUSED';
      mockServer.sendTransaction.mockRejectedValue(err);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await expect(stellarService.submitTransaction(unsignedXdr)).rejects.toThrow(StellarError);
      consoleSpy.mockRestore();
    });
  });
});
