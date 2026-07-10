# PadiPay Stellar Relayer API Roadmap

> Living roadmap for the **PadiPay Stellar Relayer API**.
>
> This document outlines the project's current progress, upcoming milestones, and future contributor opportunities. It should evolve alongside the project as milestones are completed.



# Vision

The PadiPay Stellar Relayer API exists to abstract blockchain complexity from end users.

Its long-term goal is to provide a secure, reliable, and scalable middleware layer that enables Web2 applications such as the PadiPay Web Portal and WhatsApp Bot to interact with Soroban smart contracts without requiring users to understand wallets, XLM fees, or transaction construction.

The relayer is responsible for delivering a seamless gasless transaction experience while remaining modular, secure, and easy to extend.



# Project Status

| Milestone                                   | Status         |
| ------------------------------------------- | -------------- |
| v0.1.0 — Functional Relayer MVP             | 🚧 In Progress |
| v0.2.0 — Reliability & Developer Experience | 📋 Planned     |
| v0.3.0 — Security & Operations              | 📋 Planned     |
| v0.4.0 — Production Readiness               | 📋 Planned     |



# v0.1.0 — Functional Relayer MVP

## Goal

Deliver a working middleware service capable of constructing, sponsoring, submitting, and tracking Soroban transactions for the PadiPay escrow contracts.

This milestone proves the complete Web2.5 transaction flow.

---

## API Foundation

* [x] Express application structure
* [x] Environment configuration
* [x] Request validation
* [x] Centralized error handling
* [x] Health endpoint

---

## Escrow Service

* [x] Build Soroban contract invocation
* [x] Support escrow creation
* [x] Support fund locking
* [x] Support fund release
* [x] Support refunds

---

## Stellar Service

* [x] Configure Stellar SDK
* [x] Build transaction
* [x] Create Fee Bump transaction
* [x] Sign sponsored transaction
* [x] Submit transaction to Stellar RPC

---

## Transaction Status

* [x] Query Stellar RPC
* [x] Return transaction status
* [x] Handle failed transactions
* [x] Normalize network responses

---

## Developer Experience

* [x] Unit tests
* [x] API documentation
* [x] Docker support
* [x] GitHub Actions CI
* [x] Improved documentation



# v0.2.0 — Reliability & Developer Experience

Focus on making the relayer more reliable and easier to operate.

## Planned Features

* Structured logging
* Retry mechanism
* Database persistence
* Request tracing
* Improved configuration
* Better error reporting
* Integration tests
* Improved developer tooling



# v0.3.0 — Security & Operations

Focus on protecting the relayer in production environments.

## Planned Features

* API authentication
* API keys
* Rate limiting
* Idempotency keys
* Replay protection
* Audit logging
* Secret rotation support
* Request signing


# v0.4.0 — Production Readiness

Prepare the relayer for larger deployments.

## Planned Features

* Queue workers
* Background processing
* Horizontal scaling
* Metrics collection
* Monitoring
* Alerting
* Webhook callbacks
* Performance optimization



# Future Ideas

These ideas are intentionally deferred beyond the MVP.

* Batch transaction submission
* Transaction scheduling
* Multi-network support
* Multi-contract support
* Relayer dashboard
* Transaction analytics
* Usage reporting
* Distributed relayer nodes
* Automatic failover
* Plugin architecture



# Contribution Opportunities

New contributors are encouraged to start with issues labeled:

* `good first issue`
* `help wanted`
* `mvp`

More experienced contributors may explore:

* Stellar SDK integration
* Fee bump transactions
* Request validation
* Error handling
* Testing
* CI/CD
* Security improvements
* Documentation

See:

* [Contributing Guidelines](./docs/contributing.md)
* [GitHub Issues](https://github.com/Padi-Pay/padipay-relayer-api/issues)



# Definition of Success

The project reaches **v0.1.0** when:

* The API starts successfully.
* Incoming requests are validated.
* Soroban transactions can be constructed.
* Fee bump transactions are created successfully.
* Transactions are submitted to Stellar Testnet.
* Transaction status can be queried.
* Tests pass successfully.
* Documentation is complete.
* CI passes successfully.


# Guiding Principles

As the project evolves, we aim to:

* Keep pull requests small and reviewable.
* Maintain a modular service architecture.
* Separate routing from business logic.
* Prioritize security.
* Write comprehensive tests.
* Build incrementally without overengineering.
* Welcome community contributions through well-defined GitHub Issues.


*Last Updated: v0.1.0 Development*
