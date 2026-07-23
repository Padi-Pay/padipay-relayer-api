jest.mock('../../src/clients/prisma.client', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }
}));

const mockPrismaClient = require('../../src/clients/prisma.client');
const { UserRepository } = require('../../src/repositories/user.repository');describe('UserRepository', () => {
  let repository;
  beforeEach(() => {
    jest.clearAllMocks();
    repository = new UserRepository(mockPrismaClient);
  });

  it('findById calls user.findUnique', async () => {
    mockPrismaClient.user.findUnique.mockResolvedValue({ id: '123' });
    const result = await repository.findById('123');
    expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({ where: { id: '123' } });
    expect(result.id).toBe('123');
  });

  it('findByEmail calls user.findUnique', async () => {
    await repository.findByEmail('test@example.com');
    expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
  });

  it('create calls user.create', async () => {
    const data = { email: 'test@example.com' };
    await repository.create(data);
    expect(mockPrismaClient.user.create).toHaveBeenCalledWith({ data });
  });

  it('update calls user.update', async () => {
    const data = { name: 'New Name' };
    await repository.update('123', data);
    expect(mockPrismaClient.user.update).toHaveBeenCalledWith({ where: { id: '123' }, data });
  });

  it('delete calls user.delete', async () => {
    await repository.delete('123');
    expect(mockPrismaClient.user.delete).toHaveBeenCalledWith({ where: { id: '123' } });
  });
});
