const prisma = require('../clients/prisma.client');

class EscrowIntentRepository {
  constructor(dbClient = prisma) {
    this.db = dbClient;
  }

  async findById(id) {
    return this.db.escrowIntent.findUnique({ where: { id } });
  }

  async create(data) {
    return this.db.escrowIntent.create({ data });
  }

  async update(id, data) {
    return this.db.escrowIntent.update({
      where: { id },
      data,
    });
  }

  async delete(id) {
    return this.db.escrowIntent.delete({ where: { id } });
  }

  async findByBuyer(buyerId) {
    return this.db.escrowIntent.findMany({ where: { buyerId } });
  }

  async findBySeller(sellerId) {
    return this.db.escrowIntent.findMany({ where: { sellerId } });
  }
}

module.exports = { EscrowIntentRepository };
