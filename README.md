# PadiPay Stellar Relayer API

Welcome to the **PadiPay Stellar Relayer API** repository!

## About This Service
This Node.js/Express service acts as the **"Relayer"** bridge between the PadiPay conversational WhatsApp bot and the core Stellar/Soroban smart contracts.

Its primary responsibility is to accept contract invocation requests from the bot, sponsor the transaction fees using a backend-held account (the Fee Bump account), and submit the signed transactions securely to the Stellar network (Horizon/RPC). 

For detailed information on how this architecture works, please see our documentation hub:

- [Architecture & The Relayer Pattern](./docs/architecture.md)
- [Setup Guide](./docs/setup-guide.md)
- [Contributing Guidelines](./docs/contributing.md)
