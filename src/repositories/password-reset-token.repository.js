const prisma = require('../clients/prisma.client');

class PasswordResetTokenRepository {
  constructor(dbClient = prisma) {
    this.db = dbClient;
  }

  async create(data) {
    return this.db.passwordResetToken.create({ data });
  }

  async findByTokenHash(tokenHash) {
    return this.db.passwordResetToken.findFirst({
      where: { tokenHash },
    });
  }

  async markUsed(id) {
    return this.db.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async deleteExpiredByUserId(userId) {
    return this.db.passwordResetToken.deleteMany({
      where: {
        userId,
        OR: [
          { expiresAt: { lt: new Date() } },
          { usedAt: { not: null } },
        ],
      },
    });
  }
}

module.exports = { PasswordResetTokenRepository };
