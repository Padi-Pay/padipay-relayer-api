jest.mock('../../src/clients/prisma.client', () => ({
  escrowIntent: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  }
}));

const mockPrismaClient = require('../../src/clients/prisma.client');
const { EscrowIntentRepository } = require('../../src/repositories/escrow-intent.repository');describe('EscrowIntentRepository', () => {
  let repository;
  beforeEach(() => {
    jest.clearAllMocks();
    repository = new EscrowIntentRepository(mockPrismaClient);
  });

  it('findById calls escrowIntent.findUnique', async () => {
    mockPrismaClient.escrowIntent.findUnique.mockResolvedValue({ id: '123' });
    const result = await repository.findById('123');
    expect(mockPrismaClient.escrowIntent.findUnique).toHaveBeenCalledWith({ where: { id: '123' } });
    expect(result.id).toBe('123');
  });

  it('create calls escrowIntent.create', async () => {
    const data = { amount: 100 };
    await repository.create(data);
    expect(mockPrismaClient.escrowIntent.create).toHaveBeenCalledWith({ data });
  });

  it('update calls escrowIntent.update', async () => {
    const data = { status: 'FUNDED' };
    await repository.update('123', data);
    expect(mockPrismaClient.escrowIntent.update).toHaveBeenCalledWith({ where: { id: '123' }, data });
  });

  it('delete calls escrowIntent.delete', async () => {
    await repository.delete('123');
    expect(mockPrismaClient.escrowIntent.delete).toHaveBeenCalledWith({ where: { id: '123' } });
  });

  it('findByBuyer calls escrowIntent.findMany', async () => {
    await repository.findByBuyer('buyer-1');
    expect(mockPrismaClient.escrowIntent.findMany).toHaveBeenCalledWith({ where: { buyerId: 'buyer-1' } });
  });

  it('findBySeller calls escrowIntent.findMany', async () => {
    await repository.findBySeller('seller-1');
    expect(mockPrismaClient.escrowIntent.findMany).toHaveBeenCalledWith({ where: { sellerId: 'seller-1' } });
  });
});
