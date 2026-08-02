jest.mock('../../src/clients/prisma.client', () => ({
  passwordResetToken: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  }
}));

const mockPrismaClient = require('../../src/clients/prisma.client');
const { PasswordResetTokenRepository } = require('../../src/repositories/password-reset-token.repository');

describe('PasswordResetTokenRepository', () => {
  let repository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new PasswordResetTokenRepository(mockPrismaClient);
  });

  describe('create', () => {
    it('creates a token record', async () => {
      const data = { userId: '1', tokenHash: 'hash', expiresAt: new Date() };
      mockPrismaClient.passwordResetToken.create.mockResolvedValue({ id: 't1', ...data });
      
      const result = await repository.create(data);
      
      expect(mockPrismaClient.passwordResetToken.create).toHaveBeenCalledWith({ data });
      expect(result.id).toBe('t1');
    });
  });

  describe('findByTokenHash', () => {
    it('finds a token by its hash', async () => {
      const record = { id: 't1', tokenHash: 'hash' };
      mockPrismaClient.passwordResetToken.findFirst.mockResolvedValue(record);
      
      const result = await repository.findByTokenHash('hash');
      
      expect(mockPrismaClient.passwordResetToken.findFirst).toHaveBeenCalledWith({
        where: { tokenHash: 'hash' },
      });
      expect(result).toEqual(record);
    });
  });

  describe('markUsed', () => {
    it('sets usedAt for a token', async () => {
      mockPrismaClient.passwordResetToken.update.mockResolvedValue({ id: 't1', usedAt: new Date() });
      
      await repository.markUsed('t1');
      
      expect(mockPrismaClient.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { usedAt: expect.any(Date) },
      });
    });
  });

  describe('deleteExpiredByUserId', () => {
    it('deletes expired and used tokens', async () => {
      mockPrismaClient.passwordResetToken.deleteMany.mockResolvedValue({ count: 2 });
      
      await repository.deleteExpiredByUserId('u1');
      
      expect(mockPrismaClient.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'u1',
          OR: [
            { expiresAt: { lt: expect.any(Date) } },
            { usedAt: { not: null } },
          ],
        },
      });
    });
  });
});
