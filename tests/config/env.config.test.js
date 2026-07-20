const { loadConfig } = require('../../src/config/env.config');
const ConfigError = require('../../src/errors/ConfigError');

describe('Environment Configuration', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('should load configuration when all required variables are present', () => {
    process.env.RPC_URL = 'https://rpc-testnet.stellar.org';
    process.env.NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
    process.env.CONTRACT_ID = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2QD';
    process.env.FEE_BUMP_SECRET_KEY = 'SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABUQQQ';
    process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/mydb';

    const config = loadConfig();

    expect(config).toBeDefined();
    expect(config.PORT).toBe('3000'); // Default
    expect(config.RPC_URL).toBe(process.env.RPC_URL);
  });

  it('should throw ConfigError if required variables are missing', () => {
    // Clear out env
    process.env = {};

    expect(() => loadConfig()).toThrow(ConfigError);
    expect(() => loadConfig()).toThrow('Invalid environment configuration');
  });

  it('should throw ConfigError if variables are invalid (e.g., bad URL)', () => {
    process.env.RPC_URL = 'not-a-url';
    process.env.NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
    process.env.CONTRACT_ID = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2QD';
    process.env.FEE_BUMP_SECRET_KEY = 'SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABUQQQ';
    process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/mydb';

    expect(() => loadConfig()).toThrow(ConfigError);
  });

  it('should throw ConfigError if DATABASE_URL is missing', () => {
    process.env.RPC_URL = 'https://rpc-testnet.stellar.org';
    process.env.NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
    process.env.CONTRACT_ID = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2QD';
    process.env.FEE_BUMP_SECRET_KEY = 'SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABUQQQ';
    delete process.env.DATABASE_URL;

    expect(() => loadConfig()).toThrow(ConfigError);
    expect(() => loadConfig()).toThrow('Invalid environment configuration');
  });
});
