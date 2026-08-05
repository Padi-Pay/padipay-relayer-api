const prisma = require('../clients/prisma.client');

class WalletRepository {
  constructor(dbClient = prisma) {
    this.db = dbClient;
  }

  async findById(id) {
    return this.db.wallet.findUnique({ where: { id } });
  }

  async findByUserId(userId) {
    return this.db.wallet.findFirst({ where: { userId } });
  }

  async findByPublicKey(publicKey) {
    return this.db.wallet.findUnique({ where: { publicKey } });
  }

  async create(data) {
    return this.db.wallet.create({ data });
  }

  async update(id, data) {
    return this.db.wallet.update({
      where: { id },
      data,
    });
  }

  async delete(id) {
    return this.db.wallet.delete({ where: { id } });
  }
}

module.exports = { WalletRepository };
