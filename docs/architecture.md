# Relayer Architecture

The PadiPay Stellar Relayer API employs the "Relayer" or "Fee Bump" pattern.

## The Relayer Pattern

In a decentralized system designed for everyday users (Web2.5), expecting users to hold native blockchain tokens (like XLM) to pay for transaction fees creates immense friction.

Instead, the Relayer API handles this flow:

```text
+--------------+    [1] JSON Intent     +-----------------------+
| WhatsApp Bot | ---------------------> |      Relayer API      |
+--------------+                        +-----------------------+
                                                   |
                                                   v
                                        +-----------------------+
                                        | [2] Construct Transac |
                                        |   (Soroban XDR)       |
                                        +-----------------------+
                                                   |
                                                   v
                                        +-----------------------+
                                        | [3] Sign with Fee Key |
                                        |   (Sponsors gas fee)  |
                                        +-----------------------+
                                                   |
    +--------------+    [5] Return TX Hash         |
    | WhatsApp Bot | <-----------------------------+
    +--------------+                               |
                                                   v
                                        +-----------------------+
                                        | [4] Submit to Horizon |
                                        |   (RPC Endpoint)      |
                                        +-----------------------+
```

1. **Request Reception**: The WhatsApp bot sends an authenticated HTTP request to the Relayer containing the user's intent.
2. **Transaction Construction**: The Relayer constructs the Soroban contract invocation transaction.
3. **Fee Sponsoring**: The Relayer uses a backend-held account (the "Fee Bump Account") to sign the transaction, explicitly agreeing to pay the network fees on behalf of the user.
4. **Network Submission**: The fully signed transaction is submitted to the Stellar network via a Horizon or RPC node.
5. **Status Polling**: The Relayer monitors the transaction and returns the finalized status to the bot.

This ensures PadiPay users can interact with smart contracts seamlessly via WhatsApp without ever needing a crypto wallet.
