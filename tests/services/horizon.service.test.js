const { createHorizonService } = require('../../src/services/horizon.service');
const RpcError = require('../../src/errors/RpcError');
const { parseTransactionStatus } = require('../../src/utils/status.parser');

jest.mock('../../src/utils/status.parser');

describe('Horizon Service', () => {
  let horizonService;
  let mockServer;
  let mockHorizonServer;

  beforeEach(() => {
    mockServer = {
      getTransaction: jest.fn().mockResolvedValue({ status: 'SUCCESS' })
    };
    
    mockHorizonServer = {
      loadAccount: jest.fn()
    };
    
    horizonService = createHorizonService({ server: mockServer, horizonServer: mockHorizonServer });
    
    parseTransactionStatus.mockReset();
    parseTransactionStatus.mockReturnValue({ status: 'SUCCESS' });
  });

  describe('getTransactionStatus', () => {
    it('should query transaction and parse status', async () => {
      const txId = 'dummy_tx_id';
      
      const result = await horizonService.getTransactionStatus(txId);
      
      expect(mockServer.getTransaction).toHaveBeenCalledWith(txId);
      expect(parseTransactionStatus).toHaveBeenCalledWith({ status: 'SUCCESS' }, txId);
      expect(result).toEqual({ status: 'SUCCESS' });
    });

    it('should throw RpcError when getTransaction fails', async () => {
      mockServer.getTransaction.mockRejectedValue(new Error('Network failure'));
      
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(horizonService.getTransactionStatus('dummy')).rejects.toThrow(RpcError);

      consoleSpy.mockRestore();
    });
  });

  describe('getAccountBalance', () => {
    it('should return native balance if account is found', async () => {
      mockHorizonServer.loadAccount.mockResolvedValue({
        balances: [
          { asset_type: 'credit_alphanum4', balance: '10.0000000' },
          { asset_type: 'native', balance: '500.1234567' }
        ]
      });

      const balance = await horizonService.getAccountBalance('dummy_account');
      
      expect(mockHorizonServer.loadAccount).toHaveBeenCalledWith('dummy_account');
      expect(balance).toBe('500.1234567');
    });

    it('should return 0.0000000 if account is not found (404)', async () => {
      const error404 = new Error('Not found');
      error404.response = { status: 404 };
      mockHorizonServer.loadAccount.mockRejectedValue(error404);

      const balance = await horizonService.getAccountBalance('unfunded_account');
      
      expect(balance).toBe('0.0000000');
    });

    it('should throw RpcError on network failure', async () => {
      mockHorizonServer.loadAccount.mockRejectedValue(new Error('Network failure'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(horizonService.getAccountBalance('dummy')).rejects.toThrow(RpcError);

      consoleSpy.mockRestore();
    });
  });
});
