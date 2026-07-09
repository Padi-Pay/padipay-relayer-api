const { z } = require('zod');
const ConfigError = require('../errors/ConfigError');
require('dotenv').config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  RPC_URL: z.string().url(),
  NETWORK_PASSPHRASE: z.string().min(1),
  CONTRACT_ID: z.string().min(1),
  FEE_BUMP_SECRET_KEY: z.string().min(1),
});

const loadConfig = () => {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errorMessages = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new ConfigError(`Invalid environment configuration: ${errorMessages}`);
  }

  return parsed.data;
};

module.exports = { loadConfig };
