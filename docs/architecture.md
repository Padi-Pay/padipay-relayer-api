# Relayer Architecture

This document describes the architecture of the **PadiPay Stellar Relayer API**, the middleware layer responsible for bridging Web2 applications with the PadiPay Soroban smart contracts.

The relayer abstracts blockchain complexity by constructing, sponsoring, and submitting Soroban transactions on behalf of users, enabling a seamless gasless experience.

> **Note**
>
> This document reflects the current implementation, including the Phase 2 contract state model. Historical MVP notes remain where they are still useful, but the contract semantics below match the Rust codebase.



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



# Phase 2 State Model

Phase 2 adds governance, timeout control, and protocol-fee accounting to the shared escrow model. The state model is no longer just "create, release, refund"; it now includes an explicit admin role, a timed atomic-transition context, and fee deductions that are calculated at release time.

## Escrow Status

The shared escrow state machine remains intentionally small and explicit:

* `Pending -> Active`
* `Active -> Released`
* `Active -> Disputed`
* `Disputed -> Resolved`
* `Disputed -> Refunded`
* `Active -> Refunded`
* `Pending -> Refunded`

The contract stores the canonical escrow record in `EscrowRecord` / `Escrow`. Phase 2 keeps the escrow fields for:

* `status`
* `platform_fee`
* `net_amount`
* `session_end_time`
* `auto_release_delay`
* `usd_amount`
* `quoted_token_amount`
* `send_asset`
* `dest_asset`
* `total_sessions`
* `sessions_completed`

There is no standalone `timeout_ledger` field in the escrow record. The timeout behavior is split into two distinct mechanisms:

* `EscrowRecord.session_end_time + auto_release_delay` governs when permissionless auto-release may start.
* `StateTransitionContext.timeout_at` governs atomic state-transition locks and is stored under `DataKey::StateTransitionContext(escrow_id)` together with `DataKey::StateTransitionLock(escrow_id)`.

The atomic transition timeout is ledger-based, not business-state-based:

* `timeout_at = now + STATE_TRANSITION_TIMEOUT_SECS`
* `STATE_TRANSITION_TIMEOUT_SECS = 5 * 60` seconds

This means the escrow record describes the business event timeline, while the transition context protects concurrent state changes during execution.

## Admin Role

`DataKey::Admin` stores the active admin address and is initialized once during contract setup. The stored admin can:

* Update the platform fee with `update_fee`
* Update the treasury with `update_treasury`
* Approve or reject tokens with `set_approved_token`
* Configure the fee schedule with `set_fee_schedule`
* Configure the staking, reputation, insurance, and interface-registry links
* Configure the liquidity pool and dynamic fee toggle
* Force-release an active escrow with `admin_release`
* Force-refund an escrow where the contract permits admin intervention
* Propose and accept admin rotation through `propose_admin_change` and `accept_admin_role`
* Grant a time-bound emergency-admin role

The admin cannot:

* Bypass the stored-auth checks on admin-gated methods
* Raise the flat fee above `MAX_FEE_BPS` (`1_000` bps, or 10%)
* Skip the admin rotation timelock (`MIN_ADMIN_TIMELOCK_SECS`)
* Skip the admin cooling-off window (`ADMIN_COOLING_OFF_SECS`)
* Execute emergency release alone
* Replace the multisig-backed emergency path with a direct admin call

Emergency power is deliberately split away from the normal admin key:

* `revoke_admin_emergency` can only be called by the configured `DataKey::MultisigAdmin` contract.
* `emergency_release` still requires the emergency multisig flow to pass, plus an active emergency-admin role scoped to `emergency_release`.

That separation is the main guardrail against over-centralized administrative power.

## Protocol Fee Formula

On each release, the protocol fee is derived from the amount being released in that step:

```text
platform_fee = floor(release_amount * fee_bps / 10_000)
net_amount = release_amount - platform_fee
```

The fee is deducted before the mentor payout is transferred:

* `platform_fee` is sent to `Treasury`
* `net_amount` is sent to the mentor

Important constraints:

* The flat fee rate is capped at `1_000` bps.
* If a `FeeSchedule` is present, graduated pricing overrides the flat `FeeBps` value.
* The division is integer-based, so the result is truncated toward zero rather than rounded up.

This keeps the fee logic deterministic and auditable on-chain.



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
* Including the request's correlation ID in both the JSON error body and the server log line, so a client-reported issue can be matched to its exact server-side log entry.

---

## Correlation ID Middleware

The Correlation ID layer assigns every request a unique identifier before any other middleware runs.

Responsibilities include:

* Reusing a client-supplied `X-Correlation-ID` request header when it is a safe token, or generating a new UUID otherwise.
* Attaching the ID to `req.id` so downstream middleware, routes, and the error handler can reference it.
* Returning the same ID on the `X-Correlation-ID` response header for every request, success or failure.

This gives every request a stable identifier that ties together its client-visible response and its server-side log line, without introducing full distributed tracing.

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


- [Database Schema and ERD](./database-schema.md)
- [Setup Guide](./setup-guide.md)
- [Contributing Guidelines](./contributing.md)
