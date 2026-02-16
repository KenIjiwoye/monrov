# MOMO-005: Process Refund Appwrite Function

## Ticket Information
- **ID**: MOMO-005
- **Priority**: Medium
- **Dependencies**: MOMO-001
- **Phase**: MTN MoMo Integration
- **Parallel Work**: Can run in parallel with MOMO-003, MOMO-004

## Description
Create the `process-refund` Appwrite Cloud Function that marks a completed payment as refunded and cancels the associated booking. For MVP, this is a database-only operation — actual money disbursement back to the user is handled manually or in a future ticket.

## Context
The MTN MoMo Collection API does not include a direct refund endpoint. Refunding collected funds requires the separate MTN MoMo Disbursement API (a different product/subscription). For MVP, this function records the refund intent in the database so it can be processed manually by an admin.

The frontend calls this via `paymentService.processRefund()` (`mobile/lib/services/paymentService.ts` line 81-89).

## Implementation Requirements

### 1. Function Scaffolding

**Directory**: `functions/process-refund/`

**`package.json`**:
```json
{
  "name": "process-refund",
  "version": "1.0.0",
  "type": "module",
  "main": "src/main.js",
  "dependencies": {
    "node-appwrite": "^14.0.0"
  }
}
```

Note: No `uuid` dependency needed. No `mtn-momo.js` copy needed — this function does not call the MTN API.

### 2. Main Function Logic

**File**: `functions/process-refund/src/main.js`

#### Input Validation
- Parse `req.body` as JSON: `{ paymentId, reason }`
- Return 400 if `paymentId` is missing

#### Fetch & Validate Payment
- Fetch payment document by `paymentId`
- Return 404 if not found
- Return 400 if `paymentStatus` is not `completed` (can only refund completed payments)

#### Update Payment Record
Update the payment document with:
- `paymentStatus`: `'refunded'`
- `refundAmount`: `payment.amount` (full refund)
- `refundedAt`: current ISO timestamp
- `refundReason`: from request `reason` (truncated to 500 chars), default `"No reason provided"`

#### Update Booking
Update the booking document (`payment.bookingId`) with:
- `status`: `'cancelled'`
- `cancelledAt`: current ISO timestamp
- `cancellationReason`: from request `reason` (truncated to 500 chars), default `"Payment refunded"`

If booking update fails, log the error but don't fail the response.

#### Return
```json
{ "success": true }
```

### 3. Environment Variables

Only Appwrite credentials needed (no MTN variables):

| Variable | Description |
|----------|-------------|
| `APPWRITE_ENDPOINT` | `https://fra.cloud.appwrite.io/v1` |
| `APPWRITE_PROJECT_ID` | `695507500015cce944c3` |
| `APPWRITE_API_KEY` | Server API key (databases.read + databases.write) |
| `APPWRITE_DATABASE_ID` | `231booking_db` |

### 4. Error Responses

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Missing paymentId | `{ "message": "Missing paymentId" }` |
| 400 | Payment not in completed state | `{ "message": "Can only refund completed payments" }` |
| 404 | Payment not found | `{ "message": "Payment not found" }` |
| 500 | Unexpected error | `{ "message": "Internal server error" }` |

## Acceptance Criteria

- [ ] Function created at `functions/process-refund/` with correct structure
- [ ] Validates that payment exists and is in `completed` state
- [ ] Updates payment with `refunded` status, refund amount, timestamp, and reason
- [ ] Cancels the associated booking with timestamp and reason
- [ ] Returns `{ success: true }` on success
- [ ] Handles missing/invalid input gracefully

## Files to Create

| File | Action | Description |
|------|--------|-------------|
| `functions/process-refund/package.json` | Create | Function dependencies |
| `functions/process-refund/src/main.js` | Create | Function entry point |

## Notes for AI Agent

- The function ID in Appwrite must be exactly `process-refund`
- This is the simplest of the three functions — no MTN API interaction
- The `refundAmount` field in the payments collection is a `double` type — set it to `payment.amount`
- The `refundedAt` field is a `datetime` type — use `new Date().toISOString()`
- The `cancellationReason` field on bookings is max 500 chars — truncate with `.substring(0, 500)`
- For MVP, partial refunds are not supported — always refund the full `amount`
- Future enhancement: integrate MTN Disbursement API to automatically transfer funds back to the user
