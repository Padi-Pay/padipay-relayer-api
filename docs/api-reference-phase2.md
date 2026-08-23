# PadiPay Relayer API — Phase 2 Reference

> **Scope:** This document covers all Phase 2 endpoints introduced under the `/api/auth`, `/api/users`, `/api/wallets`, and `/api/accounts` route groups. For Phase 1 (relayer / escrow) endpoints, see [`api.md`](./api.md).

---

## Table of Contents

1. [Overview](#1-overview)
2. [Base URL & Versioning](#2-base-url--versioning)
3. [Authentication](#3-authentication)
4. [Standard Response Envelopes](#4-standard-response-envelopes)
5. [Error Reference](#5-error-reference)
6. [Endpoints](#6-endpoints)
   - [6.1 Auth — `POST /api/auth/register`](#61-post-apiauthregister)
   - [6.2 Auth — `POST /api/auth/login`](#62-post-apiauthlogin)
   - [6.3 Auth — `POST /api/auth/google`](#63-post-apiauthgoogle)
   - [6.4 Auth — `POST /api/auth/recover`](#64-post-apiauthrecover)
   - [6.5 Auth — `POST /api/auth/reset`](#65-post-apiauthreset)
   - [6.6 Users — `GET /api/users/me`](#66-get-apiusersme)
   - [6.7 Users — `PATCH /api/users/me`](#67-patch-apiusersme)
   - [6.8 Wallets — `GET /api/wallets/me`](#68-get-apiwalletsme)
   - [6.9 Wallets — `GET /api/wallets/me/balance`](#69-get-apiwalletsmbalance)
   - [6.10 Wallets — `POST /api/wallets/withdraw`](#610-post-apiwalletswithdraw)
   - [6.11 Accounts — `GET /api/accounts/me`](#611-get-apiaccountsme)
   - [6.12 Accounts — `GET /api/accounts/me/escrows`](#612-get-apiaccountsmeescrows)
   - [6.13 Accounts — `GET /api/accounts/me/escrows/:id`](#613-get-apiaccountsmeescrowsid)

---

## 1. Overview

The Phase 2 routes introduce user identity, embedded custodial wallets, and account-level escrow inspection. They complement the Phase 1 relayer routes by giving authenticated users a self-service interface for their on-chain assets and transaction history.

---

## 2. Base URL & Versioning

| Environment | Base URL |
|---|---|
| Local development | `http://localhost:3000` |
| Testnet deployment | *(to be added post-deployment)* |
| Production | *(to be added post-deployment)* |

All Phase 2 routes are prefixed with `/api`.

---

## 3. Authentication

Protected routes require a **JWT Bearer token** obtained from [`/api/auth/login`](#62-post-apiauthlogin) or [`/api/auth/google`](#63-post-apiauthgoogle).

```
Authorization: Bearer <token>
```

The following route groups require this header:

| Route group | Auth required |
|---|---|
| `/api/auth/*` | ❌ No |
| `/api/users/me` | ✅ Yes |
| `/api/wallets/*` | ✅ Yes |
| `/api/accounts/me*` | ✅ Yes |

---

## 4. Standard Response Envelopes

### Success

```json
{
  "success": true,
  "message": "Human-readable confirmation",
  "data": { }
}
```

### Error

```json
{
  "success": false,
  "message": "Human-readable error description",
  "correlationId": "b3b3c1de-7e2a-4c1a-9f0e-2a6a8f9d1c4e",
  "issues": [
    { "path": "body.email", "message": "Invalid email address" }
  ]
}
```

> `issues` is only present on `400 VALIDATION_ERROR` responses. `correlationId` is always present on error responses and is also echoed in the `X-Correlation-ID` response header.

---

## 5. Error Reference

| HTTP Status | When it occurs |
|---|---|
| `400 Bad Request` | Request payload failed schema validation, or a business rule was violated (e.g. insufficient balance, invalid Stellar address). |
| `401 Unauthorized` | No token provided, token is expired/invalid, or credentials are wrong. |
| `403 Forbidden` | Authenticated user does not own the requested resource. |
| `404 Not Found` | Resource (user, wallet, escrow) does not exist. |
| `409 Conflict` | A uniqueness constraint was violated (e.g. email already registered). |
| `500 Internal Server Error` | Unexpected runtime exception. |

---

## 6. Endpoints

---

### 6.1 `POST /api/auth/register`

Register a new user account. An embedded custodial Stellar wallet is created automatically for the new user.

**Authentication:** None

**Request Headers:**

```
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `email` | `string` | ✅ | Valid email format |
| `password` | `string` | ✅ | Min 8 chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit, ≥1 special character |

```json
{
  "email": "alice@example.com",
  "password": "Secret1!"
}
```

**Success Response — `201 Created`:**

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "alice@example.com",
    "name": null,
    "role": "USER",
    "isActive": true,
    "createdAt": "2026-08-23T17:00:00.000Z",
    "updatedAt": "2026-08-23T17:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| `400` | Missing field, invalid email format, or password does not meet complexity rules |
| `409` | Email address is already registered |

---

### 6.2 `POST /api/auth/login`

Authenticate with email and password and receive a JWT.

**Authentication:** None

**Request Headers:**

```
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `email` | `string` | ✅ | Valid email format |
| `password` | `string` | ✅ | Non-empty |

```json
{
  "email": "alice@example.com",
  "password": "Secret1!"
}
```

**Success Response — `200 OK`:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "alice@example.com",
      "name": "Alice",
      "googleId": null,
      "role": "USER",
      "createdAt": "2026-08-23T17:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| `400` | Missing or invalid field |
| `401` | Email not found or password is incorrect |

---

### 6.3 `POST /api/auth/google`

Authenticate (or register) via a Google ID token. If the Google account does not yet exist in the system a new user is created automatically.

**Authentication:** None

**Request Headers:**

```
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `idToken` | `string` | ✅ | A valid Google-issued ID token |

```json
{
  "idToken": "eyJhbGci..."
}
```

**Success Response — `200 OK`:**

```json
{
  "success": true,
  "message": "Google Sign-In successful",
  "data": {
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "alice@gmail.com",
      "name": "Alice",
      "googleId": "117265498123456789012",
      "role": "USER",
      "createdAt": "2026-08-23T17:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| `400` | `idToken` field is missing or empty |
| `401` | Google token could not be verified, or account mismatch |

---

### 6.4 `POST /api/auth/recover`

Request a password-reset token to be issued for a given email address. For security, the response is identical regardless of whether the email exists in the system (i.e. the endpoint never confirms or denies account existence).

**Authentication:** None

**Request Headers:**

```
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `email` | `string` | ✅ | Valid email format |

```json
{
  "email": "alice@example.com"
}
```

**Success Response — `200 OK`:**

```json
{
  "success": true,
  "message": "If the email exists, a password recovery token has been issued",
  "data": {
    "success": true
  }
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| `400` | Missing field or value is not a valid email format |

---

### 6.5 `POST /api/auth/reset`

Consume a password-reset token (issued by [`/api/auth/recover`](#64-post-apiauthrecover)) and set a new password.

**Authentication:** None

**Request Headers:**

```
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `token` | `string` | ✅ | Non-empty; the opaque reset token issued by `/recover` |
| `newPassword` | `string` | ✅ | Min 8 chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit, ≥1 special character |

```json
{
  "token": "a3f8bc12-4d7e-4c1a-9b2f-0e5d7f8a1c3e",
  "newPassword": "NewSecret1!"
}
```

**Success Response — `200 OK`:**

```json
{
  "success": true,
  "message": "Password reset successful",
  "data": {
    "success": true
  }
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| `400` | Missing field, `newPassword` fails complexity rules, or token is invalid/expired |

---

### 6.6 `GET /api/users/me`

Retrieve the profile of the currently authenticated user. The `passwordHash` field is never included in the response.

**Authentication:** ✅ Bearer token required

**Request Headers:**

```
Authorization: Bearer <token>
```

**Request Body:** None

**Success Response — `200 OK`:**

```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "alice@example.com",
    "name": "Alice",
    "googleId": null,
    "role": "USER",
    "isActive": true,
    "createdAt": "2026-08-23T17:00:00.000Z",
    "updatedAt": "2026-08-23T17:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| `401` | Token missing, malformed, or expired |
| `404` | Authenticated user no longer exists in the database |

---

### 6.7 `PATCH /api/users/me`

Update mutable profile fields for the currently authenticated user. Only the fields listed below are accepted; any additional fields will cause a `400` error.

**Authentication:** ✅ Bearer token required

**Request Headers:**

```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | `string` | ❌ | Min 2 characters |

```json
{
  "name": "Alice Wonderland"
}
```

**Success Response — `200 OK`:**

```json
{
  "success": true,
  "message": "User profile updated successfully",
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "alice@example.com",
    "name": "Alice Wonderland",
    "googleId": null,
    "role": "USER",
    "isActive": true,
    "createdAt": "2026-08-23T17:00:00.000Z",
    "updatedAt": "2026-08-23T17:01:00.000Z"
  }
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| `400` | `name` is shorter than 2 characters, or unrecognised fields are present in the body |
| `401` | Token missing, malformed, or expired |
| `404` | Authenticated user no longer exists in the database |

---

### 6.8 `GET /api/wallets/me`

Retrieve the embedded custodial Stellar wallet linked to the authenticated user. The encrypted secret key is **never** returned.

**Authentication:** ✅ Bearer token required

**Request Headers:**

```
Authorization: Bearer <token>
```

**Request Body:** None

**Success Response — `200 OK`:**

```json
{
  "success": true,
  "message": "Wallet retrieved successfully",
  "data": {
    "id": "w-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "publicKey": "GCTAAYPBHPVJNN6F7IXZT6TRMMGS6GYBZJIOWRTP7HUHIZ5W2K6FR4CI",
    "createdAt": "2026-08-23T17:00:00.000Z"
  }
}
```

> **Note:** `encryptedSecretKey` and `userId` are intentionally omitted from the response.

**Error Responses:**

| Status | Condition |
|---|---|
| `401` | Token missing, malformed, or expired |
| `404` | No wallet is associated with this user |

---

### 6.9 `GET /api/wallets/me/balance`

Retrieve the current XLM balance of the authenticated user's embedded wallet.

**Authentication:** ✅ Bearer token required

**Request Headers:**

```
Authorization: Bearer <token>
```

**Request Body:** None

**Success Response — `200 OK`:**

```json
{
  "success": true,
  "message": "Wallet balance retrieved successfully",
  "data": {
    "balance": "150.0000000",
    "asset": "XLM"
  }
}
```

> `balance` is a `string` formatted to 7 decimal places as returned by the Stellar Horizon API.

**Error Responses:**

| Status | Condition |
|---|---|
| `401` | Token missing, malformed, or expired |
| `404` | No wallet is associated with this user |
| `500` | Horizon API call to fetch balance failed |

---

### 6.10 `POST /api/wallets/withdraw`

Initiate a withdrawal from the authenticated user's embedded wallet to an external Stellar address.

**Authentication:** ✅ Bearer token required

**Request Headers:**

```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**

| Field | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `destinationAddress` | `string` | ✅ | — | Must be a valid Ed25519 Stellar public key (starts with `G`) |
| `amount` | `string` | ✅ | — | Positive decimal number (e.g. `"50.00"`); must not exceed available balance |
| `asset` | `string` | ❌ | `"USDC"` | Non-empty asset code |

```json
{
  "destinationAddress": "GCTAAYPBHPVJNN6F7IXZT6TRMMGS6GYBZJIOWRTP7HUHIZ5W2K6FR4CI",
  "amount": "50.00",
  "asset": "USDC"
}
```

**Success Response — `200 OK`:**

```json
{
  "success": true,
  "message": "Withdrawal initiated successfully",
  "data": {
    "reference": "withdraw_a1b2c3d4",
    "status": "RESERVED",
    "walletAddress": "GCTAAYPBHPVJNN6F7IXZT6TRMMGS6GYBZJIOWRTP7HUHIZ5W2K6FR4CI",
    "amount": "50.00",
    "asset": "USDC",
    "network": "TESTNET"
  }
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| `400` | `destinationAddress` is not a valid Stellar public key |
| `400` | `amount` is missing, zero, negative, or non-numeric |
| `400` | Withdrawal `amount` exceeds current wallet balance |
| `401` | Token missing, malformed, or expired |
| `404` | No wallet is associated with this user |
| `500` | Horizon/Stellar network error during withdrawal submission |

---

### 6.11 `GET /api/accounts/me`

Retrieve the logical account status (active/inactive flag and creation date) for the authenticated user.

**Authentication:** ✅ Bearer token required

**Request Headers:**

```
Authorization: Bearer <token>
```

**Request Body:** None

**Success Response — `200 OK`:**

```json
{
  "success": true,
  "message": "Account status retrieved successfully",
  "data": {
    "isActive": true,
    "createdAt": "2026-08-23T17:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| `401` | Token missing, malformed, or expired |
| `404` | Authenticated user no longer exists in the database |

---

### 6.12 `GET /api/accounts/me/escrows`

List all escrow intents associated with the authenticated user.

**Authentication:** ✅ Bearer token required

**Request Headers:**

```
Authorization: Bearer <token>
```

**Request Body:** None

**Success Response — `200 OK`:**

```json
{
  "success": true,
  "message": "Escrows retrieved successfully",
  "data": [
    {
      "id": "escrow-a1b2c3d4",
      "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "actionType": "LOCK",
      "status": "COMPLETED",
      "txHash": "c85d3f...a9f2e",
      "createdAt": "2026-08-23T17:00:00.000Z",
      "updatedAt": "2026-08-23T17:01:00.000Z"
    }
  ]
}
```

> Returns an empty array `[]` when the user has no escrow records.

**Error Responses:**

| Status | Condition |
|---|---|
| `401` | Token missing, malformed, or expired |
| `500` | Database query error |

---

### 6.13 `GET /api/accounts/me/escrows/:id`

Retrieve a single escrow intent by its ID. The endpoint enforces ownership — a user may only fetch their own escrows.

**Authentication:** ✅ Bearer token required

**Request Headers:**

```
Authorization: Bearer <token>
```

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | The escrow intent ID returned by the relayer or the list endpoint |

**Request Body:** None

**Success Response — `200 OK`:**

```json
{
  "success": true,
  "message": "Escrow details retrieved successfully",
  "data": {
    "id": "escrow-a1b2c3d4",
    "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "actionType": "LOCK",
    "status": "COMPLETED",
    "txHash": "c85d3f...a9f2e",
    "createdAt": "2026-08-23T17:00:00.000Z",
    "updatedAt": "2026-08-23T17:01:00.000Z"
  }
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| `401` | Token missing, malformed, or expired |
| `403` | Escrow exists but belongs to a different user |
| `404` | No escrow found with the provided ID |
| `500` | Database query error |

---

## Appendix: Password Complexity Rules

All endpoints that accept a password field (`/register`, `/reset`) enforce the following rules:

| Rule | Constraint |
|---|---|
| Minimum length | 8 characters |
| Uppercase letter | At least one (`A-Z`) |
| Lowercase letter | At least one (`a-z`) |
| Digit | At least one (`0-9`) |
| Special character | At least one (any non-alphanumeric character) |

A password that does not meet any of these rules returns a `400 Bad Request` response with a `message` field describing which rule was violated.

---

## Appendix: Correlation IDs

Every request is assigned a `correlationId` which is:
- Returned as the `X-Correlation-ID` **response header** on every request.
- Included in the `correlationId` field of all **error response bodies**.
- Written alongside the matching server log line for that request.

Callers may supply their own ID via the `X-Correlation-ID` **request header** (must be ≤64 characters consisting only of letters, digits, and hyphens). If omitted, or if the supplied value is invalid, the server generates a new UUID.
