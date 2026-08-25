# Wallet Provider Adapter Integration Guide

This guide details the wallet provider architecture in the **PadiPay Stellar Relayer API**, explaining the `IWalletProvider` interface contract, how to construct concrete provider adapters (e.g. Turnkey, Privy), and how to inject them into the relayer's Dependency Injection (DI) container.

---

## Architectural Principles

The PadiPay Relayer API abstracts embedded wallet and wallet management infrastructure so that underlying wallet providers can be swapped or updated without affecting route handlers or core escrow logic.

When building or integrating a wallet provider adapter, adhere to the following principles:

1. **Functional Composition**: Use factory functions exportable via CommonJS (`module.exports = { createXProvider }`) rather than ES6 classes, matching the rest of the codebase.
2. **Non-Custodial Focus**: Embedded wallet adapters must manage and expose public Stellar addresses (`G...`) while ensuring private keys remain non-custodial or managed within the external provider.
3. **Dependency Injection**: Accept dependencies (such as `config`, `horizonService`, or HTTP clients) as an options object parameter in factory functions.
4. **Standardized Error Handling**: Catch raw external SDK error payloads and re-throw standardized domain errors (e.g., `AppError`).

---

## Wallet Provider Interfaces

The codebase defines two primary provider abstraction shapes depending on the provider scope: **Embedded Wallet Provider** (`IWalletProvider`) and **Managed Wallet Provider** (`WalletProvider`).

### 1. `IWalletProvider` Interface Specification

Located in `src/providers/embedded-wallet.provider.js`, the `IWalletProvider` interface defines the core contract for user-facing embedded wallet creation and lookup.

```javascript
/**
 * @typedef {Object} IWalletProvider
 * @property {function(string): Promise<{ address: string, secret?: string }>} createWallet - Creates a new embedded wallet for a user.
 * @property {function(string): Promise<{ address: string } | null>} getWallet - Retrieves the embedded wallet address for a user.
 */
```

#### Method Contracts

| Method | Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `createWallet` | `(userId: string)` | `Promise<{ address: string, secret?: string }>` | Generates a new wallet for the given `userId`. `address` must be a valid Stellar public key (starting with `G`). |
| `getWallet` | `(userId: string)` | `Promise<{ address: string } \| null>` | Resolves the public address associated with `userId`, or `null` if no wallet exists. |

---

### 2. Managed `WalletProvider` Specification

Located in `src/providers/wallet.provider.js`, the managed provider interface handles funding, balance inquiries, and account withdrawals.

```javascript
/**
 * Factory function signature for managed wallet operations.
 *
 * @param {Object} [deps] - Dependencies
 * @param {Object} [deps.config] - Application configuration
 * @param {Object} [deps.horizonService] - Horizon service instance
 * @param {Object} [deps.horizonServer] - Horizon SDK server instance
 */
```

#### Method Contracts

| Method | Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `fundWallet` | `({ walletAddress, amount, asset })` | `Promise<Object>` | Initiates account top-up (e.g., testnet Friendbot or fiat on-ramp). Returns receipt `{ reference, status, walletAddress, amount, asset, network, txId }`. |
| `withdrawFromWallet` | `({ walletAddress, amount, asset, destinationAddress, secretKey })` | `Promise<Object>` | Executes on-chain payment or account creation transaction. Returns transaction receipt `{ reference, status, txId, ... }`. |
| `getBalance` | `(walletAddress: string)` | `Promise<string>` | Queries Horizon service for the native/asset balance string of `walletAddress`. |

---

## Step-by-Step: Creating a Concrete Provider Adapter

To create a new provider adapter (e.g., for **Turnkey** or **Privy**):

### Step 1: Create the Adapter File

Place your adapter file in `src/providers/` using the naming convention `<provider-name>.provider.js`.

For example: `src/providers/turnkey.provider.js`

### Step 2: Implement the Factory Function

Implement the adapter using a factory function that accepts injected dependencies and returns an object conforming to `IWalletProvider`.

```javascript
// src/providers/turnkey.provider.js
const AppError = require('../errors/AppError');
const logger = require('../config/logger');

/**
 * Factory function for Turnkey Embedded Wallet Provider.
 *
 * @param {Object} deps - Dependencies
 * @param {Object} deps.config - Application configuration
 * @param {Object} [deps.turnkeyClient] - Pre-configured SDK client instance
 * @returns {IWalletProvider}
 */
const createTurnkeyWalletProvider = ({ config, turnkeyClient } = {}) => {
  /**
   * Creates a new embedded wallet using Turnkey API.
   *
   * @param {string} userId - The unique identifier of the user.
   * @returns {Promise<{ address: string }>}
   */
  const createWallet = async (userId) => {
    if (!userId) {
      throw new AppError('userId is required to create a wallet', 400);
    }

    try {
      // Example call to Turnkey SDK or HTTP API client
      const response = await turnkeyClient.createWallet({
        userIdentifier: userId,
        curve: 'ED25519', // Stellar Ed25519 public key curve
      });

      return {
        address: response.stellarAddress,
      };
    } catch (error) {
      logger.error({ err: error, userId }, '[TURNKEY PROVIDER] Failed to create wallet');
      throw new AppError(`Turnkey wallet creation failed: ${error.message}`, 500);
    }
  };

  /**
   * Retrieves an existing embedded wallet address for a user.
   *
   * @param {string} userId - The unique identifier of the user.
   * @returns {Promise<{ address: string } | null>}
   */
  const getWallet = async (userId) => {
    if (!userId) {
      throw new AppError('userId is required to get a wallet', 400);
    }

    try {
      const wallet = await turnkeyClient.getWalletByUser({ userIdentifier: userId });
      if (!wallet) return null;

      return {
        address: wallet.stellarAddress,
      };
    } catch (error) {
      logger.error({ err: error, userId }, '[TURNKEY PROVIDER] Failed to fetch wallet');
      throw new AppError(`Turnkey wallet retrieval failed: ${error.message}`, 500);
    }
  };

  return {
    createWallet,
    getWallet,
  };
};

module.exports = { createTurnkeyWalletProvider };
```

---

## Injecting the Adapter into the DI Container

The application uses factory-based Dependency Injection initialized in `src/app.factory.js`.

### 1. Wire in `src/app.factory.js`

Import your new provider factory and register it as the default or configurable provider option in `createApp`:

```javascript
// src/app.factory.js
const { createTurnkeyWalletProvider } = require('./providers/turnkey.provider');
const { createWalletProvider } = require('./providers/wallet.provider');

const createApp = (overrides = {}) => {
  const config = overrides.config || loadConfig();

  // Instantiate or inject custom wallet provider
  const walletProvider = overrides.walletProvider || createWalletProvider({ config, horizonService, horizonServer });
  
  // Example: Instantiating embedded wallet provider adapter
  const embeddedWalletProvider = overrides.embeddedWalletProvider || createTurnkeyWalletProvider({ config });

  // Pass provider into route factories
  const walletsRoutes = createWalletsRoutes({
    walletProvider,
    walletRepository,
    auditLogger
  });

  app.use('/api/wallets', authenticate, walletsRoutes);
  // ...
};
```

### 2. Consuming Providers in Route Factories (`src/routes/wallets.routes.js`)

Route factories consume the injected provider via dependency parameters:

```javascript
// src/routes/wallets.routes.js
const createWalletsRoutes = ({ walletProvider, walletRepository, auditLogger }) => {
  const router = express.Router();

  router.get('/me/balance', async (req, res, next) => {
    try {
      const wallet = await walletRepository.findByUserId(req.user.id);
      const balanceStr = await walletProvider.getBalance(wallet.publicKey);
      // ...
    } catch (error) {
      next(error);
    }
  });

  return router;
};
```

---

## Unit Testing Concrete Adapters

All new provider adapters must be accompanied by unit tests located in `tests/providers/<provider-name>.provider.test.js`.

Tests must:
- Be fully isolated and avoid live network or third-party API calls.
- Mock external SDK clients or HTTP responses.
- Test missing parameter validations, successful operations, and error handling.

### Unit Test Template

```javascript
// tests/providers/turnkey.provider.test.js
const { createTurnkeyWalletProvider } = require('../../src/providers/turnkey.provider');

describe('TurnkeyWalletProvider', () => {
  let provider;
  let mockTurnkeyClient;

  beforeEach(() => {
    mockTurnkeyClient = {
      createWallet: jest.fn(),
      getWalletByUser: jest.fn(),
    };

    provider = createTurnkeyWalletProvider({
      config: { NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015' },
      turnkeyClient: mockTurnkeyClient,
    });
  });

  describe('createWallet', () => {
    it('creates and returns a public Stellar address', async () => {
      mockTurnkeyClient.createWallet.mockResolvedValue({
        stellarAddress: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFXYCZTM6W3MFSNGWVPXS',
      });

      const result = await provider.createWallet('user-123');

      expect(result).toEqual({
        address: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFXYCZTM6W3MFSNGWVPXS',
      });
      expect(mockTurnkeyClient.createWallet).toHaveBeenCalledWith({
        userIdentifier: 'user-123',
        curve: 'ED25519',
      });
    });

    it('throws error when userId is omitted', async () => {
      await expect(provider.createWallet()).rejects.toThrow('userId is required');
    });
  });

  describe('getWallet', () => {
    it('returns null if wallet is not found', async () => {
      mockTurnkeyClient.getWalletByUser.mockResolvedValue(null);

      const result = await provider.getWallet('unknown-user');
      expect(result).toBeNull();
    });
  });
});
```

---

## Documentation Checklist for Contributors

When submitting a PR for a new wallet provider adapter:

- [ ] File created under `src/providers/<provider-name>.provider.js`.
- [ ] Exported factory function matches standard composition patterns.
- [ ] Interface method signatures (`createWallet`, `getWallet`, `fundWallet`, `withdrawFromWallet`, `getBalance`) strictly match core contracts.
- [ ] Unit tests created under `tests/providers/<provider-name>.provider.test.js` with 100% mocked dependencies.
- [ ] `npm test` and `npm run lint` pass successfully.
