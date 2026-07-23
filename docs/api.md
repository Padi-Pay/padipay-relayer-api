# PadiPay Relayer API Reference

## 1. API Overview

The PadiPay Relayer API acts as the bridge between frontend clients (such as the WhatsApp Bot) and the Soroban smart contracts on the Stellar network. It abstracts blockchain complexities by securely constructing, sponsoring, and submitting transactions gaslessly on behalf of users.

## 2. Version Information

* **Current version:** v0.1.0
* **Current status:** MVP (Minimum Viable Product)
* **Current network:** Stellar Testnet

## 3. Base URLs

The API is accessible at the following base URLs depending on the environment:

* **Local Development:** `http://localhost:3000`
* **Testnet Deployment:** `[To be added post-deployment]`
* **Production:** `[To be added post-deployment]`

## 4. Authentication

* The API uses JWT Bearer token authentication for protected routes.
* Clients must include the token in the `Authorization: Bearer <token>` header.
* Tokens are issued via the `/api/auth/login` or `/api/auth/google` endpoints.

## 5. Response Format

All successful API responses are returned as JSON objects containing the relevant data and a `success` or `status` indicator.

**Standard Success Response Envelope:**
```json
{
  "success": true,
  "data": { ... }
}
```
*(Note: Some endpoints like health check may return slightly different top-level keys like `{"status": "ok"}`)*

**Standard Error Response Envelope:**
In the event of an error, the API returns a structured JSON payload detailing the error domain, message, and optionally, specific issues.

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid request payload",
  "issues": [
    {
      "path": "body.actionType",
      "message": "Required"
    }
  ]
}
```

## 6. Error Handling

The API uses standardized domain error codes mapped to standard HTTP status codes. We abstract away underlying raw Stellar SDK or Soroban RPC implementation details to provide curated domain errors.

| HTTP Status | Error Code           | Description |
|-------------|----------------------|-------------|
| 400         | `VALIDATION_ERROR`   | The request payload or parameters failed schema validation. Details are provided in the `issues` array. |
| 500         | `RPC_ERROR`          | Network submission to the Soroban RPC server failed or was rejected. |
| 500         | `STELLAR_ERROR`      | Internal transaction building, signing, or XDR conversion failed. |
| 500         | `INTERNAL_ERROR`     | An unexpected runtime exception occurred within the Relayer. |

## 7. API Endpoints

### 7.1. Health Check

**Purpose:** Check if the API service is running and healthy.

* **HTTP Method:** `GET`
* **Route:** `/health`
* **Request Headers:** None
* **Path Parameters:** None
* **Query Parameters:** None
* **Request Body:** None

**Successful Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2026-07-10T12:00:00.000Z",
  "version": "1.0.0"
}
```

**Expected HTTP Status Codes:**
* `200 OK`: Service is healthy.

---

### 7.2. Authentication

**Purpose:** Register users, authenticate via email/password, or sign in via Google.

* **HTTP Method:** `POST`
* **Routes:** 
  * `/api/auth/register` (Body: `{ "email": "...", "password": "..." }`)
  * `/api/auth/login` (Body: `{ "email": "...", "password": "..." }`)
  * `/api/auth/google` (Body: `{ "idToken": "..." }`)
* **Request Headers:**
  * `Content-Type: application/json`

**Successful Login/Google Sign-In Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "googleId": "...",
      "name": "User Name",
      "role": "USER",
      "createdAt": "..."
    },
    "token": "eyJhbGci..."
  }
}
```

**Expected HTTP Status Codes:**
* `201 Created`: Registration successful.
* `200 OK`: Login or Google Sign-In successful.
* `400 Bad Request`: Validation failure (e.g. invalid email format, weak password, missing token).
* `401 Unauthorized`: Invalid credentials or Google account mismatch.
* `409 Conflict`: Email already in use.

---

### 7.3. Submit Escrow Action

**Purpose:** Submit a new escrow-related action to the blockchain. The relayer builds the Soroban transaction, sponsors the fee using a Fee Bump, and submits it to the Stellar network.

* **HTTP Method:** `POST`
* **Route:** `/api/relayer/submit-escrow`
* **Request Headers:**
  * `Content-Type: application/json`
* **Path Parameters:** None
* **Query Parameters:** None
* **Request Body:**
```json
{
  "actionType": "LOCK",
  "params": {
    "id": "escrow-12345"
  }
}
```
*(Note: `actionType` accepts `LOCK`, `RELEASE`, `DISPUTE`, `REFUND`. The exact schema inside `params` is dependent on the `actionType`.)*

**Successful Response (200 OK):**
```json
{
  "success": true,
  "hash": "c85... (Transaction Hash)",
  "network": "Test SDF Network ; September 2015",
  "timestamp": "2026-07-10T12:05:00.000Z"
}
```

**Possible Error Responses:**
* `400 Bad Request`: `VALIDATION_ERROR` (e.g. invalid `actionType`)
* `500 Internal Server Error`: `RPC_ERROR` or `STELLAR_ERROR`

**Expected HTTP Status Codes:**
* `200 OK`: Transaction submitted successfully.
* `400 Bad Request`: Validation failure.
* `500 Internal Server Error`: Network or signing failure.

---

### 7.4. Get Transaction Status

**Purpose:** Query the on-chain status of a previously submitted transaction.

* **HTTP Method:** `GET`
* **Route:** `/api/relayer/status/:txId`
* **Request Headers:** None
* **Path Parameters:** 
  * `txId` (string): The Stellar transaction hash returned by the `submit-escrow` endpoint.
* **Query Parameters:** None
* **Request Body:** None

**Successful Response (200 OK):**
```json
{
  "status": "SUCCESS",
  "hash": "c85... (Transaction Hash)",
  "errorResult": null
}
```

**Possible Error Responses:**
* `400 Bad Request`: `VALIDATION_ERROR` (if `txId` is malformed)
* `500 Internal Server Error`: `RPC_ERROR` (if fetching the status from the network fails)

**Expected HTTP Status Codes:**
* `200 OK`: Status retrieved successfully (note that a successful HTTP 200 response may contain a `status: "FAILED"` or `status: "PENDING"` payload).
* `400 Bad Request`: Invalid transaction hash parameter.
* `500 Internal Server Error`: Network communication failure.

## 8. Version Notes

The v0.1.0 MVP scope is limited to enabling core escrow interactions (submitting transactions and fetching status) without user-facing fees, targeting the Stellar Testnet. This foundation prioritizes deterministic error handling and seamless frontend integration.

Additional endpoints (e.g. for creating escrows explicitly, or administrative actions) and request authentication will be introduced in future releases.
