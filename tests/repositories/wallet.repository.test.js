jest.mock('../../src/clients/prisma.client', () => ({
  wallet: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }
}));

const mockPrismaClient = require('../../src/clients/prisma.client');
const { WalletRepository } = require('../../src/repositories/wallet.repository');describe('WalletRepository', () => {
  let repository;
  beforeEach(() => {
    jest.clearAllMocks();
    repository = new WalletRepository(mockPrismaClient);
  });

  it('findById calls wallet.findUnique', async () => {
    mockPrismaClient.wallet.findUnique.mockResolvedValue({ id: '123' });
    const result = await repository.findById('123');
    expect(mockPrismaClient.wallet.findUnique).toHaveBeenCalledWith({ where: { id: '123' } });
    expect(result.id).toBe('123');
  });

  it('findByUserId calls wallet.findUnique', async () => {
    await repository.findByUserId('user-1');
    expect(mockPrismaClient.wallet.findUnique).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
  });

  it('create calls wallet.create', async () => {
    const data = { userId: 'user-1' };
    await repository.create(data);
    expect(mockPrismaClient.wallet.create).toHaveBeenCalledWith({ data });
  });

  it('update calls wallet.update', async () => {
    const data = { providerId: 'prov-1' };
    await repository.update('123', data);
    expect(mockPrismaClient.wallet.update).toHaveBeenCalledWith({ where: { id: '123' }, data });
  });

  it('delete calls wallet.delete', async () => {
    await repository.delete('123');
    expect(mockPrismaClient.wallet.delete).toHaveBeenCalledWith({ where: { id: '123' } });
  });
});
