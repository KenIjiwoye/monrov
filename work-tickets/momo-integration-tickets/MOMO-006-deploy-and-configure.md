# MOMO-006: Deploy & Configure Appwrite Functions

## Ticket Information
- **ID**: MOMO-006
- **Priority**: Critical
- **Dependencies**: MOMO-001, MOMO-003, MOMO-004, MOMO-005
- **Phase**: MTN MoMo Integration
- **Parallel Work**: None — this is the final integration step

## Description
Deploy all three Appwrite Cloud Functions to the 231Booking Appwrite project, configure environment variables with MTN sandbox credentials, set execution permissions, and verify the end-to-end payment flow works with the mobile app.

## Context
The functions have been created locally but need to be deployed to the Appwrite Cloud instance at `https://fra.cloud.appwrite.io`. Each function must be created with a specific function ID that matches what the mobile app's `paymentService.ts` expects. Environment variables with MTN sandbox credentials and Appwrite server API keys must be set on each function.

## Implementation Requirements

### 1. Install Dependencies

Run `npm install` in each function directory:

```bash
cd functions/initiate-payment && npm install
cd functions/check-payment-status && npm install
cd functions/process-refund && npm install
```

### 2. Create Functions in Appwrite

Either via Appwrite Console or Appwrite CLI:

#### Option A: Appwrite Console (Manual)

For each function:
1. Navigate to Functions in the Appwrite Console
2. Click "Create Function"
3. Set the **Function ID** (must match exactly):
   - `initiate-payment`
   - `check-payment-status`
   - `process-refund`
4. Set **Runtime**: Node.js 18.0
5. Set **Entrypoint**: `src/main.js`
6. Upload the function code (zip of the function directory contents)

#### Option B: Appwrite CLI

```bash
# Install CLI if needed
npm install -g appwrite-cli

# Login
appwrite login

# Create functions
appwrite functions create \
  --functionId "initiate-payment" \
  --name "Initiate Payment" \
  --runtime "node-18.0" \
  --entrypoint "src/main.js"

appwrite functions create \
  --functionId "check-payment-status" \
  --name "Check Payment Status" \
  --runtime "node-18.0" \
  --entrypoint "src/main.js"

appwrite functions create \
  --functionId "process-refund" \
  --name "Process Refund" \
  --runtime "node-18.0" \
  --entrypoint "src/main.js"
```

### 3. Set Environment Variables

Configure these variables on **each** function in the Appwrite Console (Settings → Variables):

#### All Three Functions Need:
| Variable | Value |
|----------|-------|
| `APPWRITE_ENDPOINT` | `https://fra.cloud.appwrite.io/v1` |
| `APPWRITE_PROJECT_ID` | `695507500015cce944c3` |
| `APPWRITE_API_KEY` | *Your server API key with `databases.read` + `databases.write` scopes* |
| `APPWRITE_DATABASE_ID` | `231booking_db` |

#### `initiate-payment` and `check-payment-status` Also Need:
| Variable | Sandbox Value |
|----------|---------------|
| `MTN_MOMO_BASE_URL` | `https://sandbox.momodeveloper.mtn.com` |
| `MTN_MOMO_USER_ID` | *Your sandbox API user ID* |
| `MTN_MOMO_API_KEY` | *Your sandbox API key* |
| `MTN_MOMO_SUBSCRIPTION_KEY` | *Your Ocp-Apim-Subscription-Key from MTN developer portal* |
| `MTN_MOMO_TARGET_ENVIRONMENT` | `sandbox` |
| `MTN_MOMO_CURRENCY` | `EUR` |
| `MTN_MOMO_CALLBACK_URL` | *(leave empty for sandbox)* |

#### `process-refund` Only Needs:
The Appwrite variables above (no MTN variables).

### 4. Set Execution Permissions

For each function, set execution permissions to `users` (authenticated users only):
- Navigate to Function → Settings → Execute Access
- Add permission: `Any authenticated user` (role: `users`)

This ensures only logged-in users from the mobile app can trigger payments.

### 5. Deploy Function Code

Upload the code for each function:
- Via Console: Zip each function directory and upload
- Via CLI: `appwrite functions createDeployment --functionId "initiate-payment" --entrypoint "src/main.js" --code "./functions/initiate-payment"`

### 6. Sandbox Testing

Test the complete flow using MTN sandbox test numbers:

#### Test 1: Successful Payment
1. Create a booking in the app
2. Navigate to payment screen, select MTN Money
3. Enter phone: `46733123450` (sandbox success number)
4. Tap "Pay Now"
5. Verify: Processing screen appears → status changes to completed → redirects to confirmation
6. Verify: Payment document in DB has `paymentStatus: "completed"`
7. Verify: Booking document has `status: "confirmed"`

#### Test 2: Failed Payment
1. Enter phone: `46733123451` (sandbox failure number)
2. Tap "Pay Now"
3. Verify: Processing screen appears → failure screen shows with error message
4. Verify: Payment document has `paymentStatus: "failed"` and `errorMessage` is set

#### Test 3: Pending → Success
1. Enter phone: `46733123452` (sandbox pending number)
2. Tap "Pay Now"
3. Verify: Processing screen shows, polling continues
4. Verify: Eventually resolves to success or failure

#### Test 4: Idempotency
1. Start a payment, then navigate back before it completes
2. Try to pay again for the same booking
3. Verify: Returns the existing payment instead of creating a duplicate

#### Test 5: Refund
1. After a successful payment, trigger a refund
2. Verify: Payment status changes to `refunded`
3. Verify: Booking status changes to `cancelled`

#### Test 6: Timeout
1. Start a payment but don't approve it (use any non-test number)
2. Wait 5+ minutes
3. Verify: `check-payment-status` marks it as `failed` with timeout message

## Acceptance Criteria

- [ ] All 3 functions deployed to Appwrite with correct function IDs
- [ ] Environment variables set on each function
- [ ] Execution permissions set to authenticated users
- [ ] Successful payment flow works end-to-end (sandbox)
- [ ] Failed payment displays error correctly
- [ ] Polling continues while payment is processing
- [ ] Idempotency prevents duplicate payments
- [ ] Refund updates both payment and booking status
- [ ] Payment timeout works after 5 minutes
- [ ] Function logs are visible in Appwrite Console for debugging

## Production Checklist (Future)

When moving from sandbox to production:

- [ ] Update `MTN_MOMO_BASE_URL` to `https://proxy.momoapi.mtn.com` (or country-specific URL)
- [ ] Update `MTN_MOMO_USER_ID` and `MTN_MOMO_API_KEY` to production credentials from MTN OVA dashboard
- [ ] Update `MTN_MOMO_SUBSCRIPTION_KEY` to production subscription key
- [ ] Update `MTN_MOMO_TARGET_ENVIRONMENT` to country code (e.g., `liberia`)
- [ ] Update `MTN_MOMO_CURRENCY` to `USD` or `LRD`
- [ ] Set `MTN_MOMO_CALLBACK_URL` to an HTTPS endpoint (create `payment-webhook` function)
- [ ] Complete MTN KYC requirements
- [ ] Test with real phone numbers and small amounts

## Notes for AI Agent

- Function IDs are case-sensitive and must match exactly: `initiate-payment`, `check-payment-status`, `process-refund`
- The `APPWRITE_API_KEY` needs `databases.read` and `databases.write` scopes at minimum
- Sandbox test numbers are European format — they won't match Liberian phone validation on the frontend. For sandbox testing, you may need to temporarily relax phone validation or enter test numbers directly
- Function execution logs are viewable in Appwrite Console → Functions → [function] → Executions
- If functions fail silently, check that the `node-appwrite` version is compatible with the Appwrite Cloud instance version
