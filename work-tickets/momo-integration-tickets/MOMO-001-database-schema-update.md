# MOMO-001: Database Schema Update for Payment Processing

## Ticket Information
- **ID**: MOMO-001
- **Priority**: Critical
- **Dependencies**: None
- **Phase**: MTN MoMo Integration
- **Parallel Work**: None — must be completed before MOMO-003, MOMO-004, MOMO-005

## Description
Update the `payments` collection in Appwrite to support the MTN MoMo payment processing flow. The current schema lacks a `processing` status (needed while waiting for user approval on their phone) and fields to store the payer's phone number and error messages from the provider.

## Context
The frontend `PaymentIntent` type (`mobile/types/payment.ts`) already includes `processing` as a valid status and `phone`/`errorMessage` as optional fields. The database needs to match this contract so the Appwrite Cloud Functions can store and return these values correctly.

## Implementation Requirements

### 1. Update `paymentStatus` Enum

**Collection**: `payments` (ID: `payments`)
**Database**: `231booking_db`

The `paymentStatus` attribute currently has these values:
```
["pending", "completed", "failed", "refunded", "partially_refunded"]
```

It needs to become:
```
["pending", "processing", "completed", "failed", "refunded", "partially_refunded"]
```

**Steps in Appwrite Console**:
1. Navigate to Databases → 231Booking Database → Payments → Attributes
2. Delete the `paymentStatus` attribute (Appwrite does not support modifying enum values in-place)
3. Re-create `paymentStatus` as an enum attribute with the updated values
   - Key: `paymentStatus`
   - Type: Enum
   - Elements: `pending`, `processing`, `completed`, `failed`, `refunded`, `partially_refunded`
   - Default: `pending`
   - Required: No

> **Warning**: Deleting and re-creating the attribute will remove the value from any existing documents. If there is existing data in the `payments` collection, back it up first.

### 2. Add `phone` Attribute

Create a new attribute on the `payments` collection:
- **Key**: `phone`
- **Type**: String
- **Size**: 20
- **Required**: No
- **Default**: null

This stores the MSISDN (phone number) used for the mobile money transaction.

### 3. Add `errorMessage` Attribute

Create a new attribute on the `payments` collection:
- **Key**: `errorMessage`
- **Type**: String
- **Size**: 500
- **Required**: No
- **Default**: null

This stores human-readable error messages from the payment provider when a transaction fails.

### 4. Update `appwrite.config.json`

**File**: `appwrite.config.json`

Update the `payments` collection definition to reflect the new schema. Add the two new attributes and update the `paymentStatus` enum values.

```json
{
    "key": "paymentStatus",
    "type": "string",
    "required": false,
    "array": false,
    "elements": [
        "pending",
        "processing",
        "completed",
        "failed",
        "refunded",
        "partially_refunded"
    ],
    "format": "enum",
    "default": "pending"
},
{
    "key": "phone",
    "type": "string",
    "required": false,
    "array": false,
    "size": 20,
    "default": null,
    "encrypt": false
},
{
    "key": "errorMessage",
    "type": "string",
    "required": false,
    "array": false,
    "size": 500,
    "default": null,
    "encrypt": false
}
```

## Acceptance Criteria

- [ ] `paymentStatus` enum includes `processing` value
- [ ] `phone` attribute exists on `payments` collection (string, size 20, optional)
- [ ] `errorMessage` attribute exists on `payments` collection (string, size 500, optional)
- [ ] `appwrite.config.json` reflects the updated schema
- [ ] Existing payment data is preserved (if any exists)

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `appwrite.config.json` | Modify | Update payments collection schema |

## Notes for AI Agent

- This is partially a manual step (Appwrite Console) and partially a code change (`appwrite.config.json`)
- The `appwrite.config.json` update is to keep the local config in sync with the console — it does not auto-deploy
- If there are existing documents in the `payments` collection, the `paymentStatus` values will be lost when the attribute is deleted — plan accordingly
- The `phone` field stores numbers in MSISDN format (e.g., `231770123456`, no `+` prefix)
