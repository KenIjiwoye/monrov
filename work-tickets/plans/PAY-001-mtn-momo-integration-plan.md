# PAY-001: MTN MoMo Payment Integration Plan

## Context

The 231Booking mobile app needs functioning payment processing via MTN Mobile Money. The **frontend is already built** (payment types, service layer, hooks, payment screen UI). What's missing is the **backend**: Appwrite Cloud Functions that connect to the MTN MoMo Collection API to actually process payments.

The MTN MoMo Collection API uses a "Request to Pay" flow: the backend sends a payment request to MTN, the user approves on their phone, and the backend polls MTN for the result.

## Scope

- MTN MoMo only (Orange Money deferred)
- Sandbox-first, production-ready structure
- 3 Appwrite Cloud Functions + shared MTN API client
- Minor DB schema update (add `processing` status + 2 new fields)

---

## Implementation Steps

### Step 1: Database Schema Update

**Manual step in Appwrite Console** (cannot be done via code):

The `payments` collection (`appwrite.config.json` line 1060) needs:

1. **Update `paymentStatus` enum**: Add `processing` to the existing values
   - Current: `["pending", "completed", "failed", "refunded", "partially_refunded"]`
   - New: `["pending", "processing", "completed", "failed", "refunded", "partially_refunded"]`
   - Note: Appwrite requires deleting and re-creating the attribute to change enum values
2. **Add `phone` attribute**: string, size 20, not required
3. **Add `errorMessage` attribute**: string, size 500, not required

Then update `appwrite.config.json` to reflect the changes.

### Step 2: Create Shared MTN MoMo Client

**File**: `functions/_shared/mtn-momo.js`

A reusable HTTP client class (`MtnMomoClient`) that handles:
- **Token management**: `POST /collection/token/` with Basic Auth (userId:apiKey), caches token in memory (expires in 3600s, refreshes with 60s buffer)
- **Request to Pay**: `POST /collection/v1_0/requesttopay` — sends payment request, returns `{ referenceId }` (UUID)
- **Get Transaction Status**: `GET /collection/v1_0/requesttopay/{referenceId}` — returns status (`SUCCESSFUL`, `FAILED`, `PENDING`)

Required headers for all calls: `Ocp-Apim-Subscription-Key`, `X-Target-Environment`, `Authorization: Bearer {token}`

Uses native `fetch` (Node.js 18+) — no external HTTP library needed.

### Step 3: Create `initiate-payment` Function

**Dir**: `functions/initiate-payment/`
- `package.json` — deps: `node-appwrite`, `uuid`
- `src/main.js` — Appwrite function entry point
- `src/mtn-momo.js` — copy from `_shared/`

**Flow**:
1. Parse request: `{ bookingId, amount, method, phone }`
2. Validate fields, reject if `method !== 'mtn_money'`
3. Verify booking exists in DB
4. **Idempotency**: check for existing `pending`/`processing` payment for this booking — return it if found
5. Check for already `completed` payment — return 409 conflict
6. Create payment doc in `payments` collection with status `pending`
7. Call `MtnMomoClient.requestToPay()` — on failure, mark payment as `failed` and return 502
8. Update payment: set `transactionId` to MTN referenceId, set status to `processing`
9. Return `PaymentIntent` shape matching `mobile/types/payment.ts`

### Step 4: Create `check-payment-status` Function

**Dir**: `functions/check-payment-status/`
- Same structure as initiate-payment

**Flow**:
1. Parse request: `{ paymentId }`
2. Fetch payment doc from DB
3. If terminal state (`completed`, `failed`, `refunded`), return immediately — no API call
4. Call `MtnMomoClient.getTransactionStatus(transactionId)`
5. Map MTN status: `SUCCESSFUL` → `completed`, `FAILED`/`REJECTED`/`EXPIRED` → `failed`, `PENDING` → `processing`
6. Update payment doc with new status + full MTN response in `paymentProviderResponse`
7. **If completed**: also update booking status to `confirmed` + set `confirmedAt`
8. **Timeout safety**: if payment has been `processing` for >5 minutes, auto-fail it
9. Return updated `PaymentIntent`

### Step 5: Create `process-refund` Function

**Dir**: `functions/process-refund/`
- Deps: `node-appwrite` only (no MTN API call — refunds require Disbursement API, out of scope for MVP)

**Flow**:
1. Parse request: `{ paymentId, reason }`
2. Verify payment exists and status is `completed`
3. Update payment: status → `refunded`, set `refundAmount`, `refundedAt`, `refundReason`
4. Update booking: status → `cancelled`, set `cancelledAt`, `cancellationReason`
5. Return success (actual money transfer is a manual/admin process for MVP)

### Step 6: Deploy & Configure Functions

**Environment variables** (set per function in Appwrite Console):
```
MTN_MOMO_BASE_URL=https://sandbox.momodeveloper.mtn.com
MTN_MOMO_USER_ID=<your sandbox user id>
MTN_MOMO_API_KEY=<your sandbox api key>
MTN_MOMO_SUBSCRIPTION_KEY=<your Ocp-Apim-Subscription-Key>
MTN_MOMO_TARGET_ENVIRONMENT=sandbox
MTN_MOMO_CURRENCY=EUR
MTN_MOMO_CALLBACK_URL=
APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=695507500015cce944c3
APPWRITE_API_KEY=<server API key with databases.read + databases.write>
APPWRITE_DATABASE_ID=231booking_db
```

**Function IDs** must exactly match what the frontend calls:
- `initiate-payment`
- `check-payment-status`
- `process-refund`

**Runtime**: Node.js 18.0 | **Entrypoint**: `src/main.js`

---

## Files to Create

| File | Purpose |
|------|---------|
| `functions/_shared/mtn-momo.js` | Canonical MTN MoMo API client (reference copy) |
| `functions/_shared/README.md` | Documents the code-sharing approach |
| `functions/initiate-payment/package.json` | Dependencies: node-appwrite, uuid |
| `functions/initiate-payment/src/main.js` | Payment initiation logic |
| `functions/initiate-payment/src/mtn-momo.js` | MTN client (copy from _shared) |
| `functions/check-payment-status/package.json` | Dependencies: node-appwrite, uuid |
| `functions/check-payment-status/src/main.js` | Status polling logic |
| `functions/check-payment-status/src/mtn-momo.js` | MTN client (copy from _shared) |
| `functions/process-refund/package.json` | Dependencies: node-appwrite |
| `functions/process-refund/src/main.js` | Refund logic |

## Files to Modify

| File | Change |
|------|--------|
| `appwrite.config.json` | Add `processing` to paymentStatus enum, add `phone` + `errorMessage` attributes |

## Key Design Decisions

- **Direct HTTP via `fetch`** instead of `mtn-momo-api` npm package — the Collection API only needs 3 endpoints, and direct calls give full control over error handling
- **Code duplication** across functions (copy `mtn-momo.js` into each) — Appwrite functions deploy independently with no native code sharing. The shared file is ~100 lines, and `_shared/` holds the canonical copy
- **Polling over webhooks** — MTN sandbox doesn't support callbacks, and the frontend already implements 3-second polling via `usePaymentStatus`
- **Refunds are DB-only for MVP** — actual money disbursement requires MTN's Disbursement API (separate product/subscription)
- **5-minute timeout** on processing payments — prevents indefinitely stuck payments

## MTN MoMo API Reference

### Authentication Flow
1. Combine `userId` + `apiKey` as Basic Auth credentials
2. `POST /collection/token/` → returns `{ access_token, token_type, expires_in: 3600 }`
3. Use `Bearer {access_token}` for all subsequent calls

### Request to Pay
```
POST /collection/v1_0/requesttopay
Headers:
  Authorization: Bearer {token}
  X-Reference-Id: {new UUID v4 per transaction}
  X-Target-Environment: sandbox | <country-code>
  Ocp-Apim-Subscription-Key: {subscription key}
  Content-Type: application/json

Body:
{
  "amount": "50.00",          // string
  "currency": "EUR",          // sandbox: EUR, production: USD/LRD
  "externalId": "payment-doc-id",
  "payer": {
    "partyIdType": "MSISDN",
    "partyId": "231770123456" // no + prefix
  },
  "payerMessage": "Payment for booking",
  "payeeNote": "231Booking payment"
}

Response: 202 Accepted (empty body)
```

### Check Transaction Status
```
GET /collection/v1_0/requesttopay/{referenceId}
Response: {
  "status": "SUCCESSFUL" | "FAILED" | "PENDING",
  "financialTransactionId": "...",
  "amount": "50.00",
  "currency": "EUR",
  "payer": { "partyIdType": "MSISDN", "partyId": "..." },
  "reason": { "code": "...", "message": "..." }  // if failed
}
```

### Sandbox Test Numbers
- `46733123450` → SUCCESSFUL
- `46733123451` → FAILED
- `46733123452` → PENDING (then resolves)

## Verification

1. Deploy all 3 functions to Appwrite
2. Set env vars with sandbox credentials
3. Test initiate-payment with MTN sandbox test numbers
4. Verify polling picks up status changes
5. Test idempotency (call initiate twice for same booking)
6. Test refund flow on a completed payment
7. Verify booking status updates to `confirmed` on successful payment
