const { execSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.test') });

module.exports = async () => {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL is not defined in .env.test');
  }

  // Set the database url to test DB for Prisma
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

  console.log('\\nPushing Prisma schema to test database...');
  execSync('npx prisma db push --accept-data-loss', {
    env: {
      ...process.env,
      PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'yes',
    },
    stdio: 'inherit',
  });
};
