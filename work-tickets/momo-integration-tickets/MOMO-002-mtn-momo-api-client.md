# MOMO-002: MTN MoMo API Client Module

## Ticket Information
- **ID**: MOMO-002
- **Priority**: Critical
- **Dependencies**: None
- **Phase**: MTN MoMo Integration
- **Parallel Work**: Can run in parallel with MOMO-001

## Description
Create a reusable MTN MoMo API client class that handles authentication (token management), initiating Request to Pay transactions, and checking transaction status. This module is used by all payment-related Appwrite Cloud Functions.

## Context
The MTN MoMo Collection API requires a multi-step authentication flow (Basic Auth → Bearer Token) and specific headers for each request. Rather than duplicating this logic across functions, we create a canonical `MtnMomoClient` class in `functions/_shared/` and copy it into each function directory at build time.

Appwrite Cloud Functions are deployed independently with no native code sharing mechanism. The `_shared/` directory serves as the single source of truth.

## Implementation Requirements

### 1. MTN MoMo Client Class

**File**: `functions/_shared/mtn-momo.js`

```javascript
import { v4 as uuidv4 } from 'uuid';

let cachedToken = null;
let tokenExpiresAt = 0;

export class MtnMomoClient {
  constructor({ baseUrl, userId, apiKey, subscriptionKey, targetEnvironment, currency, callbackUrl }) {
    this.baseUrl = baseUrl;
    this.userId = userId;
    this.apiKey = apiKey;
    this.subscriptionKey = subscriptionKey;
    this.targetEnvironment = targetEnvironment;
    this.currency = currency;
    this.callbackUrl = callbackUrl;
  }
```

The class must implement three methods:

#### `getToken()`
- Generates a Bearer token via `POST {baseUrl}/collection/token/`
- Uses Basic Auth: `base64(userId:apiKey)`
- Required header: `Ocp-Apim-Subscription-Key`
- Caches the token in memory with a 60-second buffer before expiry (token valid for 3600s)
- Returns the `access_token` string
- Throws on HTTP error with status + response body

#### `requestToPay({ amount, phone, externalId, payerMessage, payeeNote })`
- Calls `POST {baseUrl}/collection/v1_0/requesttopay`
- Generates a new UUID v4 per transaction (`X-Reference-Id` header)
- Required headers: `Authorization: Bearer`, `Ocp-Apim-Subscription-Key`, `X-Target-Environment`, `X-Reference-Id`, `Content-Type: application/json`
- Optional header: `X-Callback-Url` (only if `callbackUrl` is set)
- Request body:
  ```json
  {
    "amount": "50.00",
    "currency": "EUR",
    "externalId": "payment-doc-id",
    "payer": {
      "partyIdType": "MSISDN",
      "partyId": "231770123456"
    },
    "payerMessage": "Payment for 231Booking",
    "payeeNote": "Booking payment"
  }
  ```
- **Important**: `amount` must be a string, `phone` should have `+` prefix stripped
- Expected response: `202 Accepted` (empty body)
- Returns `{ referenceId }` (the UUID used as `X-Reference-Id`)
- Throws on non-202 status

#### `getTransactionStatus(referenceId)`
- Calls `GET {baseUrl}/collection/v1_0/requesttopay/{referenceId}`
- Required headers: `Authorization: Bearer`, `Ocp-Apim-Subscription-Key`, `X-Target-Environment`
- Returns the parsed JSON response:
  ```json
  {
    "status": "SUCCESSFUL",
    "financialTransactionId": "1432942836",
    "amount": "50.00",
    "currency": "EUR",
    "payer": { "partyIdType": "MSISDN", "partyId": "231770123456" },
    "payerMessage": "...",
    "payeeNote": "..."
  }
  ```
- On failure, response includes `reason: { code, message }`
- Throws on HTTP error

### 2. Shared README

**File**: `functions/_shared/README.md`

Document:
- Purpose of the `_shared/` directory
- How to copy files into function directories
- That `_shared/mtn-momo.js` is the canonical version — edits should be made here first then copied

### 3. Copy to Function Directories

After creating the canonical file, copy `mtn-momo.js` into:
- `functions/initiate-payment/src/mtn-momo.js`
- `functions/check-payment-status/src/mtn-momo.js`

(The `process-refund` function does not need the MTN client for MVP.)

## Technical Notes

### Token Caching
- In-memory cache only — Appwrite functions may cold-start, so the cache only helps within warm instances
- Cache check: `if (cachedToken && Date.now() < tokenExpiresAt - 60000)` (60s safety buffer)
- On successful token fetch: `tokenExpiresAt = Date.now() + (expires_in * 1000)`

### Phone Number Format
- MTN expects MSISDN format: digits only, no `+` prefix
- Frontend sends `+231XXXXXXXXX`, so strip the `+` before calling MTN
- Sandbox test numbers: `46733123450` (success), `46733123451` (fail), `46733123452` (pending)

### No External HTTP Library
- Uses native `fetch` available in Node.js 18+ (Appwrite function runtime)
- `Buffer.from()` for Base64 encoding of Basic Auth credentials

## Acceptance Criteria

- [ ] `MtnMomoClient` class created in `functions/_shared/mtn-momo.js`
- [ ] `getToken()` fetches and caches Bearer tokens with expiry handling
- [ ] `requestToPay()` sends correct headers and body format, returns `{ referenceId }`
- [ ] `getTransactionStatus()` retrieves and returns parsed transaction status
- [ ] All methods throw descriptive errors on failure
- [ ] `_shared/README.md` documents the code-sharing approach
- [ ] Client copied to `functions/initiate-payment/src/` and `functions/check-payment-status/src/`

## Files to Create

| File | Action | Description |
|------|--------|-------------|
| `functions/_shared/mtn-momo.js` | Create | Canonical MTN MoMo API client |
| `functions/_shared/README.md` | Create | Code-sharing documentation |
| `functions/initiate-payment/src/mtn-momo.js` | Create | Copy of shared client |
| `functions/check-payment-status/src/mtn-momo.js` | Create | Copy of shared client |

## Notes for AI Agent

- Use ES module syntax (`import`/`export`) — Appwrite Node.js 18 functions support ESM with `"type": "module"` in package.json
- The `amount` parameter to MTN must be a string (e.g., `"50.00"` not `50.00`) — use `String(amount)`
- Do not add `axios` or other HTTP libraries — `fetch` is sufficient and keeps the bundle small
- The token cache is module-level (not per-instance) so it persists across calls within the same warm function instance
