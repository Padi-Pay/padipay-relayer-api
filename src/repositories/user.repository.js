const prisma = require('../clients/prisma.client');

class UserRepository {
  constructor(dbClient = prisma, rawDbClient = prisma.rawPrisma) {
    this.db = dbClient;
    this.rawDb = rawDbClient;
  }

  async findById(id) {
    return this.db.user.findUnique({ where: { id } });
  }

  async findByEmail(email, options = {}) {
    const client = options.includePasswordHash ? this.rawDb : this.db;
    return client.user.findUnique({ where: { email } });
  }

  async create(data) {
    return this.db.user.create({ data });
  }

  async update(id, data) {
    return this.db.user.update({
      where: { id },
      data,
    });
  }

  async delete(id) {
    return this.db.user.delete({ where: { id } });
  }
}

module.exports = { UserRepository };
