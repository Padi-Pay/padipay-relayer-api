const prisma = require('../src/clients/prisma.client');

afterEach(async () => {
  const tableNames = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  const validTables = tableNames
    .map((t) => t.tablename)
    .filter((tablename) => tablename !== '_prisma_migrations');

  if (validTables.length > 0) {
    const formattedTables = validTables.map((t) => `"public"."${t}"`).join(', ');
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${formattedTables} CASCADE;`);
    } catch (error) {
      console.error('Error truncating tables:', error);
    }
  }
}, 30000);

afterAll(async () => {
  await prisma.$disconnect();
  if (prisma.$pool) {
    await prisma.$pool.end();
  }
});

