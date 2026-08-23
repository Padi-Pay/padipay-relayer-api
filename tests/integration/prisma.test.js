const prisma = require('../../src/clients/prisma.client');

describe('Prisma Integration Test Framework', () => {
  it('should create a record in the database', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: 'hashed_password',
      },
    });

    expect(user.email).toBe('test@example.com');

    const count = await prisma.user.count();
    expect(count).toBe(1);
  });

  it('should assert the database is empty', async () => {
    // This test proves that the teardown logic truncated the table
    // after the previous test execution.
    const count = await prisma.user.count();
    expect(count).toBe(0);
  });
});
