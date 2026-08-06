const crypto = require('crypto');
const axios = require('axios');

/**
 * Factory function for the generic Wallet Provider abstraction.
 *
 * This provider is intentionally provider-agnostic: it exposes a stable
 * interface that can later be backed by an external ramp, a testnet faucet,
 * or a managed wallet funding SDK. Integrating a real fiat on-ramp
 * (e.g. Stripe/MoonPay) is out of scope for this abstraction.
 *
 * @param {Object} [deps] - Dependencies
 * @param {Object} [deps.config] - Application configuration.
 * @param {Object} [deps.horizonService] - The horizon network service
 */
const createWalletProvider = ({ config, horizonService, horizonServer } = {}) => {
  /**
   * Executes a managed wallet top-up through the underlying provider.
   *
   * @param {Object} params - Funding parameters
   * @param {string} params.walletAddress - The managed wallet to credit.
   * @param {string} params.amount - The amount to fund (string to safely
   *   handle large numbers), already validated at the schema layer.
   * @param {string} params.asset - The asset code to fund with (e.g. 'XLM').
   * @returns {Promise<Object>} A funding receipt describing the initiated top-up.
   */
  const fundWallet = async ({ walletAddress, amount, asset }) => {
    try {
      // In a real production system, this would call a fiat on-ramp or a managed liquidity pool.
      // For the testnet environment, we interface with Stellar's Friendbot directly to fund the wallet.
      const response = await axios.get(`https://friendbot.stellar.org/?addr=${walletAddress}`);
      
      return {
        reference: `fund_${crypto.randomUUID()}`,
        status: 'SUCCESS',
        walletAddress,
        amount: '10000', // Friendbot always gives 10,000 XLM
        asset: 'XLM',
        network: config?.NETWORK_PASSPHRASE ?? 'unknown',
        txId: response.data?.hash
      };
    } catch (error) {
      console.error('[FRIENDBOT ERROR]', error.response?.data || error.message);
      // If the account is already funded, Friendbot might throw an error depending on the network.
      // But we still return a stub receipt if it fails, so it doesn't crash the API.
      return {
        reference: `fund_${crypto.randomUUID()}`,
        status: 'FAILED',
        walletAddress,
        amount,
        asset,
        network: config?.NETWORK_PASSPHRASE ?? 'unknown',
      };
    }
  };

  /**
   * Executes a managed wallet withdrawal through the underlying provider.
   *
   * Used to debit/reserve funds from a user's managed balance so they can be
   * committed to an on-chain operation (e.g. funding an escrow). Mirrors
   * `fundWallet`'s stub shape until a real provider is integrated.
   *
   * @param {Object} params - Withdrawal parameters
   * @param {string} params.walletAddress - The managed wallet to debit.
   * @param {string} params.amount - The amount to withdraw (string to safely
   *   handle large numbers), already validated/derived server-side.
   * @param {string} params.asset - The asset code to withdraw (e.g. 'XLM').
   * @returns {Promise<Object>} A withdrawal receipt describing the reservation.
   */
  const withdrawFromWallet = async ({ walletAddress, amount, asset, destinationAddress, secretKey }) => {
    if (secretKey === 'managed-by-provider') {
      throw new Error('Withdrawal is not supported for legacy accounts without secret keys.');
    }

    if (!horizonServer) {
      throw new Error('horizonServer is required to execute real withdrawals');
    }

    const { Keypair, TransactionBuilder, Networks, Asset, Operation } = require('@stellar/stellar-sdk');
    const sourceKeypair = Keypair.fromSecret(secretKey);

    // Load account sequence number
    const account = await horizonServer.loadAccount(walletAddress);

    let destinationExists = true;
    try {
      await horizonServer.loadAccount(destinationAddress);
    } catch (e) {
      if (e.response && e.response.status === 404) {
        destinationExists = false;
      } else {
        throw e;
      }
    }

    const operation = destinationExists
      ? Operation.payment({
          destination: destinationAddress,
          asset: Asset.native(),
          amount: String(amount),
        })
      : Operation.createAccount({
          destination: destinationAddress,
          startingBalance: String(amount),
        });

    // Build the transaction
    const transaction = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: config?.NETWORK_PASSPHRASE || Networks.TESTNET,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    // Sign the transaction
    transaction.sign(sourceKeypair);

    // Submit to Horizon
    let response;
    try {
      response = await horizonServer.submitTransaction(transaction);
    } catch (error) {
      const resultCodes = error.response?.data?.extras?.result_codes;
      console.error('[HORIZON SUBMIT ERROR]', resultCodes || error.message);
      throw new Error(`Transaction failed: ${JSON.stringify(resultCodes || error.message)}`);
    }

    return {
      reference: `withdraw_${crypto.randomUUID()}`,
      status: 'SUCCESS',
      walletAddress,
      destinationAddress,
      amount,
      asset,
      network: config?.NETWORK_PASSPHRASE ?? 'unknown',
      txId: response.hash,
    };
  };

  /**
   * Retrieves the real on-chain native balance of the wallet from the network.
   *
   * @param {string} walletAddress - The managed wallet address.
   * @returns {Promise<string>} The balance as a string.
   */
  const getBalance = async (walletAddress) => {
    if (!horizonService) {
      throw new Error('horizonService is required to fetch real balances');
    }
    return horizonService.getAccountBalance(walletAddress);
  };

  return { fundWallet, withdrawFromWallet, getBalance };
};

module.exports = { createWalletProvider };
