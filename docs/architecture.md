# Relayer Architecture

This document describes the architecture of the **PadiPay Stellar Relayer API**, the middleware layer responsible for bridging Web2 applications with the PadiPay Soroban smart contracts.

The relayer abstracts blockchain complexity by constructing, sponsoring, and submitting Soroban transactions on behalf of users, enabling a seamless gasless experience.

> **Note**
>
> This document reflects the current **v0.1.0 MVP**. Features planned for future milestones are documented separately to distinguish implemented functionality from the long-term vision.



# Overview

The relayer sits between client applications and the Stellar network.

Its responsibilities include:

* Validating incoming requests.
* Building Soroban contract invocation transactions.
* Sponsoring transaction fees.
* Submitting transactions to the Stellar network.
* Querying transaction status.
* Returning responses through a simple HTTP API.

Business logic remains within the Soroban smart contracts.



# Design Principles

The relayer follows several guiding principles.

* Keep request handlers lightweight.
* Separate concerns into dedicated services using **Dependency Injection** (Factory Functions).
* **Functional Composition** over ES6 Classes.
* Validate all external input strictly at the boundary using **Zod**.
* Never expose sensitive credentials.
* Keep the service stateless during the MVP.
* Prefer modular, reusable code.
* Handle errors gracefully by mapping raw implementation details to standardized domain errors.
* Make blockchain interactions transparent to clients.



# System Architecture

The relayer acts as the bridge between the frontend and the blockchain.

```text
Client (WhatsApp Bot / Web UI)
              │
              ▼
        Express API Routes
              │
              ▼
        Request Validation
              │
              ▼
        Escrow Service
              │
              ▼
        Stellar Service
              │
              ▼
          Stellar RPC
              │
              ▼
     Soroban Smart Contract
```
# Data Flow

```text
+--------------+    [1] JSON Intent     +-----------------------+
| WhatsApp Bot | ---------------------> |      Relayer API      |
+--------------+                        +-----------------------+
                                                   |
                                                   v
                                        +-----------------------+
                                        | [2] Construct Txn     |
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

Each layer has a single responsibility, making the application easier to maintain and extend.




# Request Lifecycle

Every request follows the same high-level flow.

```text
Receive Request
       │
       ▼
Validate Payload (Zod)
       │
       ▼
Construct Soroban Transaction
       │
       ▼
Sponsor Transaction Fee
       │
       ▼
Submit to Stellar RPC
       │
       ▼
Receive Transaction Hash
       │ (On Failure: Map to Domain Error)
       ▼
Return API Response
```

The relayer does not execute escrow logic itself. It simply coordinates communication between clients and the blockchain.



# Component Responsibilities

## Routes

Routes expose the public HTTP API.

Responsibilities include:

* Receiving requests.
* Passing validated data to services via Dependency Injection.
* Returning HTTP responses.

Routes should remain thin and avoid business logic.

---

## Validation Middleware

The Validation layer ensures all incoming request payloads conform to strictly typed schemas before reaching the service layer.

Responsibilities include:

* Validating request bodies and parameters using Zod schemas.
* Rejecting malformed requests with `VALIDATION_ERROR` responses.

This ensures services only receive guaranteed valid data structures.

---

## Error Handling Middleware

The Error Handling layer centralizes the mapping of exceptions to HTTP responses.

Responsibilities include:

* Catching standardized domain errors (e.g., `AppError`, `StellarError`).
* Abstracting away raw SDK stack traces and Soroban RPC error payloads.
* Ensuring the client receives curated, safe JSON error envelopes.

---

## Escrow Service

The Escrow Service translates HTTP requests into Soroban contract invocations.

Responsibilities include:

* Selecting contract methods.
* Preparing contract arguments.
* Building invocation transactions.

This service contains no networking logic.

---

## Stellar Service

The Stellar Service manages interaction with the Stellar SDK.

Responsibilities include:

* Creating fee bump transactions.
* Signing transactions.
* Submitting transactions to the network.

Sensitive credentials should never leave this service.

---

## Horizon/RPC Service

The Horizon/RPC Service communicates with the Stellar network.

Responsibilities include:

* Fetching transaction status.
* Parsing network responses.
* Handling blockchain-specific errors.



# Security Model

Security is a core responsibility of the relayer.

Current protections include:

* Environment-based secret management.
* Input validation.
* Separation of signing logic.
* Limited responsibility for fee sponsorship.

Future releases may introduce:

* API authentication.
* Rate limiting.
* Replay protection.
* Audit logging.
* Request signing.



# Current MVP Scope

The v0.1.0 milestone focuses on proving the complete gasless transaction flow.

Implemented responsibilities include:

* Express API foundation.
* Request validation.
* Transaction construction.
* Fee bump sponsorship.
* Transaction submission.
* Transaction status lookup.
* Error handling.
* Unit tests.

The MVP intentionally excludes production infrastructure.



# Future Architecture

## v0.2.0

Planned improvements include:

* Structured logging.
* Retry mechanisms.
* Database persistence.
* Improved error handling.
* Integration tests.

---

## v0.3.0

Planned improvements include:

* API authentication.
* Rate limiting.
* Idempotency.
* Replay protection.
* Audit logging.

---

## v0.4.0

Planned improvements include:

* Queue workers.
* Horizontal scalability.
* Metrics and monitoring.
* High availability.
* Webhook callbacks.



# Repository Documentation
For detailed information on how this architecture works, please see our documentation hub:


- [Setup Guide](./docs/setup-guide.md)
- [Contributing Guidelines](./docs/contributing.md)
