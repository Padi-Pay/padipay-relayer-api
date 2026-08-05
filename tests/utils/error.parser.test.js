const { parseTransactionError } = require('../../src/utils/error.parser');
const RpcError = require('../../src/errors/RpcError');
const StellarError = require('../../src/errors/StellarError');
const StellarSdk = require('@stellar/stellar-sdk');

describe('Transaction Error Parser', () => {
  it('should parse network connection refused errors', () => {
    const err = new Error('Connection refused');
    err.code = 'ECONNREFUSED';

    const result = parseTransactionError(err);
    expect(result).toBeInstanceOf(StellarError);
    expect(result.code).toBe('NETWORK_FAILURE');
    expect(result.statusCode).toBe(503);
  });

  it('should parse unknown errors as unknown transaction error', () => {
    const err = new Error('Something weird');

    const result = parseTransactionError(err);
    expect(result).toBeInstanceOf(RpcError);
    expect(result.code).toBe('UNKNOWN_TRANSACTION_ERROR');
    expect(result.statusCode).toBe(500);
  });

  it('should handle rejected transactions without XDR', () => {
    const response = { status: 'ERROR' };

    const result = parseTransactionError(response);
    expect(result).toBeInstanceOf(RpcError);
    expect(result.code).toBe('TRANSACTION_REJECTED');
  });

  it('should fallback to UNKNOWN_TRANSACTION for unknown response shapes', () => {
    const response = { status: 'UNKNOWN' };

    const result = parseTransactionError(response);
    expect(result).toBeInstanceOf(RpcError);
    expect(result.code).toBe('UNKNOWN_TRANSACTION');
  });

  it('should parse specific XDR failure cases', () => {
    const response = { status: 'ERROR', errorResultXdr: 'dummy_xdr' };
    
    const mockSwitch = jest.fn().mockReturnValue({ name: 'txFAILED' });
    jest.spyOn(StellarSdk.xdr.TransactionResult, 'fromXDR').mockReturnValue({
      result: () => ({ switch: mockSwitch })
    });

    const result1 = parseTransactionError(response);
    expect(result1.code).toBe('CONTRACT_EXECUTION_FAILURE');

    mockSwitch.mockReturnValue({ name: 'txBAD_SEQ' });
    const result2 = parseTransactionError(response);
    expect(result2.code).toBe('INVALID_TRANSACTION');

    mockSwitch.mockReturnValue({ name: 'txUNKNOWN' });
    const result3 = parseTransactionError(response);
    expect(result3.code).toBe('TRANSACTION_REJECTED');
    
    jest.restoreAllMocks();
  });

  // In a more exhaustive test suite we could mock StellarSdk.xdr.TransactionResult.fromXDR
  // to return a mocked result that switches to 'txFAILED', 'txBAD_SEQ', etc.
});
