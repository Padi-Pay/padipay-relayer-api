# PadiPay Stellar Relayer API

The **PadiPay Stellar Relayer API** is the middleware layer that bridges Web2 applications with the PadiPay Soroban smart contracts on the Stellar network.

Its primary responsibility is to abstract blockchain complexity by constructing, sponsoring, and submitting Soroban contract transactions on behalf of users. This enables gasless interactions for clients such as the PadiPay WhatsApp Bot without requiring users to manage XLM for network fees.

The relayer is one of the core services within the PadiPay platform and works alongside the smart contracts and frontend to deliver a seamless Web2.5 escrow experience.

## Repository Role

Within the PadiPay architecture, this repository is responsible for:

* Validating incoming escrow requests.
* Constructing Soroban contract invocation transactions.
* Sponsoring transaction fees using Stellar Fee Bump transactions.
* Submitting transactions to the Stellar network.
* Querying transaction status.
* Returning blockchain responses through a simple HTTP API.

The relayer does not implement escrow business logic. That responsibility belongs to the Soroban smart contracts.

## System Architecture

The request flow is illustrated below.

```text
Client (WhatsApp Bot / Web UI)
              │
              ▼
      PadiPay Relayer API
              │
              ▼
     Soroban Transaction Builder
              │
              ▼
      Fee Bump Transaction
              │
              ▼
         Stellar RPC
              │
              ▼
   PadiPay Smart Contracts
```

For a more detailed explanation of the architecture, see:

* `ARCHITECTURE.md`

## Current MVP Scope

The current development milestone focuses on proving the complete happy path for gasless escrow transactions.

The v0.1.0 MVP includes:

* Express API foundation.
* Request validation.
* Soroban transaction construction.
* Fee bump transaction sponsorship.
* Transaction submission.
* Transaction status lookup.
* Error handling.
* Unit tests (Jest).
* Continuous Integration.

Advanced capabilities such as persistence, authentication, retry queues, metrics, and rate limiting are intentionally deferred to future milestones.

## Project Structure

```text
src/
├── app.js
├── routes/
├── services/
│   ├── escrow.service.js
│   ├── stellar.service.js
│   └── horizon.service.js
├── middleware/
├── errors/
├── validation/
├── utils/
└── config/
```

Each layer has a single responsibility.

* **Routes** expose the public API.
* **Services** contain business logic.
* **Middleware** handles request processing.
* **Validation** ensures input integrity using Zod schemas.
* **Errors** map raw implementation details to standardized domain errors.
* **Utilities** contain shared helper functions.
* **Configuration** manages application settings.

## API Overview

The API exposes endpoints used by the PadiPay frontend and WhatsApp bot to interact with the blockchain.

The MVP focuses on:

* Creating escrow transactions.
* Locking escrow funds.
* Releasing escrow funds.
* Refunding escrow funds.
* Checking transaction status.

The exact API surface may evolve as the project progresses.

## Local Development

### Prerequisites

* Node.js 20 or later
* npm
* Access to a Stellar Testnet RPC endpoint

### Installation

Clone the repository.

```bash
git clone <repository-url>

cd padipay-relayer-api
```

Install dependencies.

```bash
npm install
```

Create an environment file.

```bash
cp .env.example .env
```

Configure the required environment variables before starting the server.

Run the development server.

```bash
npm run dev
```

### Running with Docker

Alternatively, you can run the API within a Docker container. Ensure Docker is installed and running on your system.

Build the image:

```bash
docker build -t padipay-relayer-api .
```

Run the container, passing the `.env` file:

```bash
docker run -p 3000:3000 --env-file .env padipay-relayer-api
```

## Environment Variables

Typical configuration includes:

```text
PORT=
STELLAR_RPC_URL=
NETWORK_PASSPHRASE=
CONTRACT_ID=
FEE_BUMP_SECRET_KEY=
```

Additional configuration options may be introduced in future releases.

## Testing

Run the Jest test suite with coverage reporting:

```bash
npm test
```

Linting and formatting commands should also pass before opening a pull request.

```bash
npm run lint
```

## Related Repositories

The PadiPay platform consists of multiple repositories.

* **padipay-contracts** — Soroban escrow smart contracts.
* **padipay-frontend** — Web portal and WhatsApp integration.
* **padipay-relayer-api** — Gasless transaction relayer.

Each repository has a clearly defined responsibility within the overall platform architecture.

## Documentation

For detailed information on how this architecture works, please see our documentation hub:

- [Architecture & The Relayer Pattern](./docs/architecture.md)
- [API Documentation](./docs/api.md)
- [Setup Guide](./docs/setup-guide.md)
- [Contributing Guidelines](./docs/contributing.md)
- [Roadmap](./docs/roadmap.md)


## Contributing

Contributions are welcome.

Please read [Contributing Guidelines](./docs/contributing.md) before opening an issue or submitting a pull request.

All work is tracked through GitHub Issues, and contributors are encouraged to keep pull requests focused on a single issue.

## License

This project is licensed under the license included in this repository.


