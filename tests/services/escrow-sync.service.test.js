const { createEscrowSyncService } = require('../../src/services/escrow-sync.service');

describe('Escrow Sync Service', () => {
  let escrowSyncService;
  let escrowIntentRepositoryMock;

  const pendingIntent = {
    id: 'intent-1',
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
    amount: 100,
    status: 'PENDING',
    sorobanEscrowId: null,
  };

  beforeEach(() => {
    escrowIntentRepositoryMock = {
      findById: jest.fn().mockResolvedValue({ ...pendingIntent }),
      update: jest.fn().mockResolvedValue({ ...pendingIntent, status: 'LOCKED', sorobanEscrowId: '42' }),
    };

    escrowSyncService = createEscrowSyncService({ escrowIntentRepository: escrowIntentRepositoryMock });
  });

  it('should transition a PENDING intent to LOCKED and stamp the on-chain escrow id', async () => {
    const result = await escrowSyncService.syncEscrowOnChain({
      escrowIntentId: 'intent-1',
      sorobanEscrowId: '42',
      status: 'SUCCESS',
    });

    expect(escrowIntentRepositoryMock.update).toHaveBeenCalledWith('intent-1', {
      sorobanEscrowId: '42',
      status: 'LOCKED',
    });
    expect(result.synchronized).toBe(true);
    expect(result.escrowIntent.status).toBe('LOCKED');
    expect(result.escrowIntent.sorobanEscrowId).toBe('42');
  });

  it('should throw 404 when the escrow intent does not exist', async () => {
    escrowIntentRepositoryMock.findById.mockResolvedValue(null);

    await expect(
      escrowSyncService.syncEscrowOnChain({ escrowIntentId: 'missing', sorobanEscrowId: '42', status: 'SUCCESS' })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('should not mutate the record and report synchronized:false for a non-SUCCESS status', async () => {
    const result = await escrowSyncService.syncEscrowOnChain({
      escrowIntentId: 'intent-1',
      sorobanEscrowId: '42',
      status: 'FAILED',
    });

    expect(result.synchronized).toBe(false);
    expect(result.escrowIntent.status).toBe('PENDING');
    expect(escrowIntentRepositoryMock.update).not.toHaveBeenCalled();
  });

  it('should be idempotent when the same synchronization event is delivered twice', async () => {
    escrowIntentRepositoryMock.findById.mockResolvedValue({
      ...pendingIntent,
      status: 'LOCKED',
      sorobanEscrowId: '42',
    });

    const result = await escrowSyncService.syncEscrowOnChain({
      escrowIntentId: 'intent-1',
      sorobanEscrowId: '42',
      status: 'SUCCESS',
    });

    expect(result.synchronized).toBe(true);
    expect(escrowIntentRepositoryMock.update).not.toHaveBeenCalled();
  });

  it('should throw 409 when already LOCKED with a different on-chain escrow id', async () => {
    escrowIntentRepositoryMock.findById.mockResolvedValue({
      ...pendingIntent,
      status: 'LOCKED',
      sorobanEscrowId: '42',
    });

    await expect(
      escrowSyncService.syncEscrowOnChain({ escrowIntentId: 'intent-1', sorobanEscrowId: '99', status: 'SUCCESS' })
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(escrowIntentRepositoryMock.update).not.toHaveBeenCalled();
  });

  it('should throw 409 when the intent is in an unexpected lifecycle state', async () => {
    escrowIntentRepositoryMock.findById.mockResolvedValue({ ...pendingIntent, status: 'CANCELLED' });

    await expect(
      escrowSyncService.syncEscrowOnChain({ escrowIntentId: 'intent-1', sorobanEscrowId: '42', status: 'SUCCESS' })
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(escrowIntentRepositoryMock.update).not.toHaveBeenCalled();
  });
});
