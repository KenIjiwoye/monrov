# MOMO-003: Initiate Payment Appwrite Function

## Ticket Information
- **ID**: MOMO-003
- **Priority**: Critical
- **Dependencies**: MOMO-001, MOMO-002
- **Phase**: MTN MoMo Integration
- **Parallel Work**: Can run in parallel with MOMO-004, MOMO-005

## Description
Create the `initiate-payment` Appwrite Cloud Function that accepts a payment request from the mobile app, creates a payment record in the database, and initiates an MTN MoMo "Request to Pay" transaction. This is the core function that kicks off the payment flow.

## Context
The mobile app's `paymentService.initiatePayment()` (`mobile/lib/services/paymentService.ts`) calls `functions.createExecution('initiate-payment', ...)`. This function must exist as an Appwrite Cloud Function with the exact ID `initiate-payment`. It receives the request body as a JSON string and returns a `PaymentIntent` object matching the type defined in `mobile/types/payment.ts`.

## Implementation Requirements

### 1. Function Scaffolding

**Directory**: `functions/initiate-payment/`

**`package.json`**:
```json
{
  "name": "initiate-payment",
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

**File**: `functions/initiate-payment/src/main.js`

The function receives the Appwrite function context `({ req, res, log, error })` and must:

#### Input Validation
- Parse `req.body` as JSON: `{ bookingId, amount, method, phone }`
- Return 400 if any required field is missing
- Return 400 if `method !== 'mtn_money'` (only MTN supported for now)

#### Booking Verification
- Initialize Appwrite server client using env vars (`APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`)
- Fetch the booking document from `bookings` collection using `bookingId`
- Return 404 if booking not found

#### Idempotency Check
- Query `payments` collection for documents where `bookingId` matches AND `paymentStatus` is `pending` or `processing`
- If found, return the existing payment as a `PaymentIntent` (prevents duplicate charges from retries)
- Also check for `completed` payments — return 409 conflict if payment already succeeded

#### Create Payment Record
- Create a document in the `payments` collection with:
  - `bookingId`: from request
  - `userId`: from the booking document
  - `amount`: from request
  - `totalAmount`: same as amount
  - `paymentMethod`: `'mtn_money'`
  - `currency`: from env var `MTN_MOMO_CURRENCY` (default `'EUR'`)
  - `paymentStatus`: `'pending'`
  - `phone`: from request

#### Call MTN MoMo API
- Instantiate `MtnMomoClient` with env vars
- Call `requestToPay()` with:
  - `amount`: the payment amount
  - `phone`: strip `+` prefix from the phone number
  - `externalId`: the payment document `$id`
  - `payerMessage`: `"Payment for booking {bookingId}"`
  - `payeeNote`: `"231Booking payment {paymentDocId}"`
- **On MTN failure**: Update payment status to `failed`, set `errorMessage`, store error in `paymentProviderResponse`, return 502

#### Update Payment & Return
- Update the payment document: set `transactionId` to the MTN `referenceId`, set `paymentStatus` to `'processing'`
- Return the `PaymentIntent` response:
  ```json
  {
    "id": "<payment $id>",
    "bookingId": "...",
    "amount": 50.00,
    "currency": "EUR",
    "method": "mtn_money",
    "status": "processing",
    "phone": "+231770123456",
    "transactionId": "<mtn-reference-uuid>",
    "createdAt": "2026-02-16T..."
  }
  ```

### 3. Environment Variables

These must be set on the function in the Appwrite Console:

| Variable | Description |
|----------|-------------|
| `MTN_MOMO_BASE_URL` | `https://sandbox.momodeveloper.mtn.com` |
| `MTN_MOMO_USER_ID` | Sandbox API user ID |
| `MTN_MOMO_API_KEY` | Sandbox API key |
| `MTN_MOMO_SUBSCRIPTION_KEY` | Ocp-Apim-Subscription-Key |
| `MTN_MOMO_TARGET_ENVIRONMENT` | `sandbox` |
| `MTN_MOMO_CURRENCY` | `EUR` (sandbox) |
| `MTN_MOMO_CALLBACK_URL` | Empty for sandbox |
| `APPWRITE_ENDPOINT` | `https://fra.cloud.appwrite.io/v1` |
| `APPWRITE_PROJECT_ID` | `695507500015cce944c3` |
| `APPWRITE_API_KEY` | Server API key (databases.read + databases.write) |
| `APPWRITE_DATABASE_ID` | `231booking_db` |

### 4. Error Responses

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Missing required fields | `{ "message": "Missing required fields: bookingId, amount, method, phone" }` |
| 400 | Unsupported method | `{ "message": "Only mtn_money is currently supported" }` |
| 404 | Booking not found | `{ "message": "Booking not found" }` |
| 409 | Payment already completed | `{ "message": "Payment already completed for this booking" }` |
| 502 | MTN API failure | `{ "message": "Payment provider error. Please try again." }` |
| 500 | Unexpected error | `{ "message": "Internal server error" }` |

## Acceptance Criteria

- [ ] Function created at `functions/initiate-payment/` with correct structure
- [ ] Validates required input fields and returns appropriate errors
- [ ] Verifies booking exists before creating payment
- [ ] Handles idempotency — returns existing pending/processing payment instead of creating duplicate
- [ ] Returns 409 if payment already completed for the booking
- [ ] Creates payment document with status `pending` before calling MTN
- [ ] Successfully calls MTN `requestToPay` API
- [ ] Updates payment to `processing` with MTN `transactionId` on success
- [ ] Marks payment as `failed` with `errorMessage` on MTN API failure
- [ ] Returns `PaymentIntent` shape matching `mobile/types/payment.ts`
- [ ] Logs key events using `log()` and errors using `error()`

## Files to Create

| File | Action | Description |
|------|--------|-------------|
| `functions/initiate-payment/package.json` | Create | Function dependencies |
| `functions/initiate-payment/src/main.js` | Create | Function entry point |
| `functions/initiate-payment/src/mtn-momo.js` | Create | Copy from `_shared/` |

## Notes for AI Agent

- The function ID in Appwrite must be exactly `initiate-payment` — this matches what the frontend calls in `paymentService.ts`
- The frontend calls `functions.createExecution('initiate-payment', JSON.stringify(request))` — the request body is in `req.body`
- Use `res.json(data, statusCode)` for responses (Appwrite function response format)
- The `bookings` collection ID is `bookings` and the `payments` collection ID is `payments`
- The `bookingId_idx` on the payments collection is a **unique** index — there can only be one payment per booking
- The phone number from the frontend includes the `+` prefix — strip it with `.replace('+', '')` before sending to MTN
- Use `ID.unique()` from `node-appwrite` to generate the payment document ID
- The `totalAmount` field is required in the payments collection — set it equal to `amount`
