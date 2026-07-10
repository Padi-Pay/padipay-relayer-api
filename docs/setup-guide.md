# Local Setup Guide

This guide explains how to configure and run the **PadiPay Stellar Relayer API** in a local development environment.

The relayer is designed to communicate with the Stellar Testnet during the current MVP phase.



# Prerequisites

Before getting started, ensure you have the following installed:

* Node.js 20 or later
* npm
* Git

You will also need:

* A funded Stellar Testnet account to act as the Fee Bump sponsor.
* Access to a Stellar RPC endpoint.



# Clone the Repository

Clone the repository and navigate into the project directory.

```bash
git clone <repository-url>

cd padipay-relayer-api
```



# Install Dependencies

Install the project dependencies.

```bash
npm install
```

---

# Configure Environment Variables

Copy the example environment file.

```bash
cp .env.example .env
```

Populate the required configuration values.

Typical configuration includes:

```text
PORT=3000

RPC_URL=https://soroban-testnet.stellar.org

NETWORK_PASSPHRASE=Test SDF Network ; September 2015

CONTRACT_ID=<your-contract-id>

FEE_BUMP_SECRET_KEY=<your-testnet-secret-key>
```

Never commit your `.env` file or expose private keys.



# Funding a Testnet Account

The relayer sponsors transaction fees using a dedicated Stellar account.

Create and fund a Testnet account before starting the application.

This account should only be used for development and testing.



# Configure the Stellar Network

By default, the relayer targets the public Soroban Testnet.

```text
https://soroban-testnet.stellar.org
```

If you are running a local Stellar Quickstart environment, update the RPC endpoint accordingly.

Example:

```text
http://localhost:8000/soroban/rpc
```

---

# Start the Development Server

Run the development server.

```bash
npm run dev
```

The API should now be available locally.

Example:

```text
http://localhost:3000
```

---

# Running with Docker

Alternatively, you can run the API within a Docker container. Ensure Docker is installed and running on your system.

Build the image:

```bash
docker build -t padipay-relayer-api .
```

Run the container, passing the `.env` file:

```bash
docker run -p 3000:3000 --env-file .env padipay-relayer-api
```

---

# Verify the Installation

Once the server is running, verify that it starts successfully before testing contract interactions.

You can also call the configured health endpoint if available.

---

# Testing Requests

Use an API client such as:

* Postman
* Bruno
* Insomnia
* cURL

to send requests to the relayer.

Typical MVP endpoints include:

```text
POST /api/relayer/escrows

POST /api/relayer/escrows/:id/lock

POST /api/relayer/escrows/:id/release

POST /api/relayer/escrows/:id/refund

GET /api/relayer/status/:txHash
```

These endpoints demonstrate the complete gasless transaction flow between client applications and the Soroban smart contracts.

---

# Running Tests

Execute the project's Jest test suite (with coverage reporting).

```bash
npm test
```

Linting is configured, run it before opening a pull request.

```bash
npm run lint
```



# Troubleshooting

## Invalid RPC URL

Verify that the configured `RPC_URL` is reachable and points to the correct Stellar network.

---

## Authentication or Signing Errors

Confirm that:

* `FEE_BUMP_SECRET_KEY` is valid.
* The sponsor account exists.
* The account is funded on the selected network.

---

## Contract Invocation Errors

Ensure that:

* The contract has been deployed.
* `CONTRACT_ID` is correct.
* The selected network matches the deployed contract.



# Next Steps

After successfully running the relayer locally, continue with:

* `README.md` for a project overview.
* `ARCHITECTURE.md` to understand the request lifecycle.
* `ROADMAP.md` to see upcoming milestones.
* `CONTRIBUTING.md` if you plan to contribute.
