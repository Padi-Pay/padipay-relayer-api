require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

let basePrisma;

if (process.env.NODE_ENV === 'production') {
  basePrisma = new PrismaClient({ adapter });
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient({ adapter });
  }
  basePrisma = global.prisma;
}

const prisma = basePrisma.$extends({
  query: {
    user: {
      async $allOperations({ args, query }) {
        const result = await query(args);

        if (result && typeof result === 'object' && 'passwordHash' in result) {
          delete result.passwordHash;
          return result;
        }

        if (Array.isArray(result)) {
          return result.map((item) => {
            if (item && typeof item === 'object' && 'passwordHash' in item) {
              delete item.passwordHash;
            }
            return item;
          });
        }

        return result;
      },
    },
  },
});

prisma.$pool = pool;
module.exports = prisma;
module.exports.rawPrisma = basePrisma;
