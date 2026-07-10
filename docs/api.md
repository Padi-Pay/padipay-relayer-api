# PadiPay Relayer API Documentation

This document outlines the public API endpoints exposed by the PadiPay Relayer service (v0.1.0 MVP). 
The Relayer abstracts blockchain complexities, allowing frontend applications (like the WhatsApp Bot) to interact with Soroban Escrow smart contracts securely and gaslessly.

## Environment Requirements
The relayer relies on several environment variables. Make sure these are configured correctly before running:
- `PORT`: Port the API runs on (default: `3000`)
- `STELLAR_RPC_URL`: Soroban RPC endpoint (e.g., testnet)
- `NETWORK_PASSPHRASE`: Stellar network passphrase
- `CONTRACT_ID`: Deployed PadiPay Escrow Soroban contract address
- `FEE_BUMP_SECRET_KEY`: Ed25519 Secret key of the account sponsoring transaction fees

---

## Error Handling
The API follows a standardized error response format using Domain Errors mapped to HTTP status codes.

### Error Response Format
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

### Common Error Codes
| Status | Error Code           | Description |
|--------|----------------------|-------------|
| 400    | `VALIDATION_ERROR`   | The request body or parameters failed schema validation. Check the `issues` array for details. |
| 500    | `RPC_ERROR`          | Network submission to Stellar RPC failed or was rejected. |
| 500    | `STELLAR_ERROR`      | Internal transaction building, signing, or XDR conversion failed. |
| 500    | `INTERNAL_ERROR`     | An unexpected runtime exception occurred. |

---

## Endpoints

### 1. Health Check
Check if the API is running and healthy.

**Endpoint:** `GET /health`

**Success Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2026-07-10T12:00:00.000Z",
  "version": "1.0.0"
}
```

---

### 2. Submit Escrow Action
Submit a new escrow-related action to the blockchain. The relayer builds the Soroban transaction, sponsors the fee using a Fee Bump, and submits it to the Stellar network.

**Endpoint:** `POST /api/relayer/submit-escrow`

**Headers:**
- `Content-Type: application/json`

**Request Payload:**
```json
{
  "actionType": "LOCK", // Enum: ['LOCK', 'RELEASE', 'DISPUTE', 'REFUND']
  "params": {
    "id": "escrow-12345"
  }
}
```

*Note: The exact schema inside `params` depends on the `actionType`. For example, a `CREATE` action might include `buyer`, `seller`, and `amount`.*

**Success Response (200 OK):**
```json
{
  "success": true,
  "hash": "c85... (Transaction Hash)",
  "network": "Test SDF Network ; September 2015",
  "timestamp": "2026-07-10T12:05:00.000Z"
}
```

---

### 3. Get Transaction Status
Query the on-chain status of a previously submitted transaction.

**Endpoint:** `GET /api/relayer/status/:txId`

**Path Parameters:**
- `txId` (string): The Stellar transaction hash returned by the `submit-escrow` endpoint.

**Success Response (200 OK):**
```json
{
  "status": "SUCCESS", // Enum: ['SUCCESS', 'PENDING', 'FAILED']
  "hash": "c85... (Transaction Hash)",
  "errorResult": null
}
```

**Failure Response Example (200 OK with FAILED status):**
```json
{
  "status": "FAILED",
  "hash": "c85... (Transaction Hash)",
  "errorResult": "opINVOKE_HOST_FUNCTION_FAILED" // Raw RPC failure code
}
```
