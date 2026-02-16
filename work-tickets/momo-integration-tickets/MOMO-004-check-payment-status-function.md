# MOMO-004: Check Payment Status Appwrite Function

## Ticket Information
- **ID**: MOMO-004
- **Priority**: Critical
- **Dependencies**: MOMO-001, MOMO-002
- **Phase**: MTN MoMo Integration
- **Parallel Work**: Can run in parallel with MOMO-003, MOMO-005

## Description
Create the `check-payment-status` Appwrite Cloud Function that polls the MTN MoMo API for a transaction's current status, updates the payment record in the database, and returns the result. The mobile app calls this function every 3 seconds while a payment is processing.

## Context
After `initiate-payment` starts a transaction, the user must approve it on their phone. The mobile app polls this function via `usePaymentStatus` hook (`mobile/hooks/api/usePayment.ts` line 116-129) with a 3-second `refetchInterval` while the status is `pending` or `processing`. This function checks with MTN, maps their status to our app status, and updates the database accordingly.

When a payment succeeds, this function also updates the booking status to `confirmed`.

## Implementation Requirements

### 1. Function Scaffolding

**Directory**: `functions/check-payment-status/`

**`package.json`**:
```json
{
  "name": "check-payment-status",
  "version": "1.0.0",
  "type": "module",
  "main": "src/main.js",
  "dependencies": {
    "node-appwrite": "^14.0.0",
    "uuid": "^10.0.0"
  }
}
```

**`src/mtn-momo.js`**: Copy from `functions/_shared/mtn-momo.js` (created in MOMO-002)

### 2. Main Function Logic

**File**: `functions/check-payment-status/src/main.js`

#### Input
- Parse `req.body` as JSON: `{ paymentId }`
- Return 400 if `paymentId` is missing

#### Fetch Payment
- Initialize Appwrite server client
- Fetch payment document by `paymentId`
- Return 404 if not found

#### Short-Circuit for Terminal States
If `paymentStatus` is already `completed`, `failed`, or `refunded`:
- Return the current `PaymentIntent` immediately — no MTN API call needed
- This saves API calls since the frontend may keep polling briefly after completion

#### Validate Transaction Reference
- If `transactionId` is null/empty, return 400 (payment was never sent to MTN)

#### Check MTN Status
- Instantiate `MtnMomoClient` with env vars
- Call `getTransactionStatus(transactionId)`
- **On MTN API error**: Don't fail the request — return the current payment status so the frontend continues polling. Log the error for debugging.

#### Map MTN Status to App Status
```javascript
const MTN_STATUS_MAP = {
  'SUCCESSFUL': 'completed',
  'FAILED': 'failed',
  'PENDING': 'processing',
  'EXPIRED': 'failed',
  'REJECTED': 'failed',
};
```

#### Timeout Safety
Before calling MTN, check if the payment has been `processing` for too long:
- Compare `$createdAt` to current time
- If more than 5 minutes have elapsed, mark as `failed` with `errorMessage: "Payment timed out — user did not approve within 5 minutes"`
- Return immediately without calling MTN

#### Update Payment Record
Update the payment document with:
- `paymentStatus`: mapped status
- `paymentProviderResponse`: full MTN response JSON (truncated to 5000 chars)
- `errorMessage`: if failed, extract from `reason.code: reason.message` in MTN response

#### Update Booking on Success
If the new status is `completed`:
- Update the booking document (`payment.bookingId`):
  - `status`: `'confirmed'`
  - `confirmedAt`: current ISO timestamp
- Log the confirmation
- If booking update fails, log the error but don't fail the response (payment is still valid)

#### Return PaymentIntent
```json
{
  "id": "<payment $id>",
  "bookingId": "...",
  "amount": 50.00,
  "currency": "EUR",
  "method": "mtn_money",
  "status": "completed",
  "phone": "+231770123456",
  "transactionId": "<mtn-reference-uuid>",
  "errorMessage": null,
  "createdAt": "2026-02-16T..."
}
```

### 3. Environment Variables

Same as MOMO-003 — all MTN and Appwrite credentials.

### 4. Error Responses

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Missing paymentId | `{ "message": "Missing paymentId" }` |
| 400 | No transaction reference | `{ "message": "Payment has no transaction reference" }` |
| 404 | Payment not found | `{ "message": "Payment not found" }` |
| 500 | Unexpected error | `{ "message": "Internal server error" }` |

## Acceptance Criteria

- [ ] Function created at `functions/check-payment-status/` with correct structure
- [ ] Returns current status immediately for terminal states (no unnecessary MTN API calls)
- [ ] Calls MTN `getTransactionStatus` for `pending`/`processing` payments
- [ ] Correctly maps MTN statuses: `SUCCESSFUL` → `completed`, `FAILED`/`REJECTED`/`EXPIRED` → `failed`, `PENDING` → `processing`
- [ ] Updates payment document with new status and full provider response
- [ ] Stores error message from MTN when payment fails
- [ ] Updates booking to `confirmed` when payment completes
- [ ] Handles 5-minute timeout for stale processing payments
- [ ] Gracefully handles MTN API errors (returns current status, doesn't break polling)
- [ ] Returns `PaymentIntent` shape matching `mobile/types/payment.ts`

## Files to Create

| File | Action | Description |
|------|--------|-------------|
| `functions/check-payment-status/package.json` | Create | Function dependencies |
| `functions/check-payment-status/src/main.js` | Create | Function entry point |
| `functions/check-payment-status/src/mtn-momo.js` | Create | Copy from `_shared/` |

## Notes for AI Agent

- The function ID in Appwrite must be exactly `check-payment-status`
- This function is called very frequently (every 3 seconds per active payment) — keep it lightweight
- The short-circuit for terminal states is important for performance
- When MTN's API fails, do NOT throw — return the current status so the frontend keeps polling
- The 5-minute timeout prevents payments from being stuck in `processing` forever if the user never approves on their phone
- The `paymentProviderResponse` field is 5000 chars max — truncate the JSON string with `.substring(0, 5000)`
- Booking update failure should not cause the function to return an error — the payment itself succeeded
