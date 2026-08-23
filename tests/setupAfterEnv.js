const prisma = require('../src/clients/prisma.client');

afterEach(async () => {
  const tableNames = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  for (const { tablename } of tableNames) {
    if (tablename !== '_prisma_migrations') {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
      } catch (error) {
        console.error(`Error truncating table ${tablename}:`, error);
      }
    }
  }
});

afterAll(async () => {
  await prisma.$disconnect();
  if (prisma.$pool) {
    await prisma.$pool.end();
  }
});
