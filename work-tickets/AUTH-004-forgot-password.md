# AUTH-004: Password Reset Flow

## Status: DEPRECATED

> **This ticket is no longer needed.** The authentication system has been updated to use passwordless OTP-based authentication (Email OTP and Phone SMS). Since there are no passwords, there is no password reset flow required.

## Ticket Information
- **ID**: AUTH-004
- **Priority**: ~~High~~ **N/A - Deprecated**
- **Dependencies**: N/A
- **Phase**: N/A
- **Status**: **DEPRECATED**

## Why This Ticket Is Deprecated

### Previous Approach (Password-Based)
The original auth system used email/password and phone/password authentication, which required a "Forgot Password" flow for users who couldn't remember their passwords.

### Current Approach (Passwordless OTP)
The authentication system now uses:
- **Email OTP** (AUTH-001, AUTH-002): Users receive a 6-digit code via email
- **Phone SMS OTP** (AUTH-001, AUTH-003): Users receive a 6-digit code via SMS

With OTP-based authentication:
- Users never create or remember passwords
- Each login/signup generates a fresh OTP sent to their email or phone
- If users can't access their email/phone, they contact support (not a password reset)
- Account recovery is handled through email/phone ownership verification

### Benefits of Passwordless Auth
1. **No passwords to forget** - Users just need access to their email or phone
2. **More secure** - No password database to breach, no weak passwords
3. **Simpler UX** - One less form to fill out, one less thing to remember
4. **Reduced support burden** - No "forgot password" requests

## What To Do Instead

### If User Can't Receive OTP
1. **Email users**: Check spam folder, verify email address is correct
2. **Phone users**: Ensure phone number is correct, check SMS settings
3. **Account locked**: Contact support for manual verification

### If User Needs to Change Email/Phone
This is handled in the profile settings (PROF-002), not through auth flows.

## Related Tickets

- **AUTH-001**: Login Screen (Email OTP & Phone SMS) - Handles login with OTP
- **AUTH-002**: Sign Up (Email OTP) - Handles email signup with OTP
- **AUTH-003**: Sign Up (Phone SMS) - Handles phone signup with OTP
- **AUTH-005**: Logout Functionality - Still required
- **AUTH-006**: Session Management - Still required

## Migration Notes

If you previously implemented AUTH-004 with the old password-based system:

1. Remove the following files if they exist:
   - `app/(auth)/forgot-password.tsx`
   - `app/reset-password.tsx`

2. Remove navigation links to forgot password from login screen

3. Update validation schemas to remove password-related schemas:
   - Remove `forgotPasswordSchema`
   - Remove `resetPasswordSchema`
   - Remove `ForgotPasswordFormData` type
   - Remove `ResetPasswordFormData` type

4. Update AuthContext to remove:
   - `resetPassword` function
   - Any password recovery related methods

## Files That Should NOT Exist

| File | Reason |
|------|--------|
| `app/(auth)/forgot-password.tsx` | No passwords = no forgot password |
| `app/reset-password.tsx` | No passwords = no password reset |
| `lib/validations/auth.ts` (password schemas) | Remove password-related schemas |

---

**Note**: This ticket is kept in the documentation for historical reference and to explain the architectural decision. It should not be implemented.
