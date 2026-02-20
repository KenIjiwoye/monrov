# Shared Function Modules

This directory contains canonical versions of modules shared across Appwrite Cloud Functions.

## Why This Exists

Appwrite Cloud Functions are deployed independently — there is no native mechanism to share code between them. This `_shared/` directory holds the **single source of truth** for shared modules. Each function that needs a module gets its own copy.

## Modules

| File | Used By | Description |
|------|---------|-------------|
| `mtn-momo.js` | `initiate-payment`, `check-payment-status` | MTN MoMo Collection API client (auth, request-to-pay, status check) |

## How to Update

1. Edit the file in `_shared/`
2. Copy the updated file into each function's `src/` directory:
   ```bash
   cp functions/_shared/mtn-momo.js functions/initiate-payment/src/mtn-momo.js
   cp functions/_shared/mtn-momo.js functions/check-payment-status/src/mtn-momo.js
   ```
3. Redeploy affected functions

Always edit `_shared/` first — never edit the copies directly, or they will drift out of sync..
