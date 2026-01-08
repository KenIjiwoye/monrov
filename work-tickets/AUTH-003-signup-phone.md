# AUTH-003: Sign Up Screen (Phone SMS)

## Ticket Information
- **ID**: AUTH-003
- **Priority**: High
- **Dependencies**: FOUND-001, FOUND-002, FOUND-003, FOUND-004, FOUND-005
- **Phase**: MVP (Phase 1)
- **Parallel Work**: Can run in parallel with AUTH-001, AUTH-002

## Description
Create the phone number sign up screen for 231Booking that allows new users to create an account using Phone SMS OTP verification. This provides an alternative to email signup for users who prefer phone-based authentication. The app primarily targets Liberian users (+231) but supports international phone numbers.

## Context
In Liberia, many users prefer phone-based authentication over email. This screen allows users to sign up with their phone number using Appwrite's Phone SMS authentication. Users enter their name and phone number, receive a 6-digit OTP via SMS, and upon verification, their account is created automatically.

## Implementation Requirements

### 1. Dependencies (same as AUTH-001)

```bash
# Phone number input with country picker
npx expo install react-native-phone-number-input

# For phone validation in Zod schemas
npm install libphonenumber-js
```

### 2. Screen File

**File**: `app/(auth)/signup-phone.tsx`

### 3. Screen Structure

**File**: `app/(auth)/signup-phone.tsx`

```typescript
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, Text, XStack } from 'tamagui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { ID } from 'react-native-appwrite';

import { FormInput, PhoneInput } from '@/components/forms';
import { Button } from '@/components/ui';
import { phoneSignupSchema, PhoneSignupFormData } from '@/lib/validations/auth';
import { account } from '@/lib/appwrite/client';
import { handleAppwriteError } from '@/lib/appwrite/errors';
import { User, Phone } from '@tamagui/lucide-icons';

export default function SignupPhoneScreen() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<PhoneSignupFormData>({
    resolver: zodResolver(phoneSignupSchema),
    defaultValues: {
      name: '',
      phone: '',
    },
  });

  const onSubmit = async (data: PhoneSignupFormData) => {
    try {
      setError(null);
      setIsLoading(true);

      // Create phone token - sends OTP via SMS
      // For new users, this initiates account creation
      const token = await account.createPhoneToken(
        ID.unique(),
        data.phone
      );

      // Navigate to OTP verification screen with name for profile setup
      router.push({
        pathname: '/(auth)/verify-otp',
        params: {
          userId: token.userId,
          method: 'phone',
          destination: data.phone,
          name: data.name,
          isSignup: 'true',
        },
      });
    } catch (err) {
      const appError = handleAppwriteError(err);
      setError(appError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <YStack flex={1} padding="$4" justifyContent="center" gap="$6">
            {/* Header */}
            <YStack gap="$2" alignItems="center">
              <Text fontSize="$9" fontWeight="700" color="$gray900">
                Create Account
              </Text>
              <Text fontSize="$4" color="$gray500" textAlign="center">
                Sign up with your phone number
              </Text>
            </YStack>

            {/* Error Message */}
            {error && (
              <YStack
                backgroundColor="$errorLight"
                padding="$3"
                borderRadius="$3"
              >
                <Text color="$error" textAlign="center">
                  {error}
                </Text>
              </YStack>
            )}

            {/* Form */}
            <YStack gap="$4">
              <FormInput
                control={control}
                name="name"
                label="Full Name"
                placeholder="Enter your full name"
                autoCapitalize="words"
                autoComplete="name"
                leftIcon={<User size={20} color="$gray400" />}
              />

              <PhoneInput
                control={control}
                name="phone"
                label="Phone Number"
                defaultCountry="LR"
              />

              {/* Info Text */}
              <YStack
                backgroundColor="$primaryLight"
                padding="$3"
                borderRadius="$3"
              >
                <Text fontSize="$3" color="$primary" textAlign="center">
                  We'll send a 6-digit verification code via SMS
                </Text>
              </YStack>

              {/* SMS Rates Notice */}
              <Text fontSize="$2" color="$gray400" textAlign="center">
                Standard SMS rates may apply
              </Text>

              {/* Terms */}
              <Text fontSize="$2" color="$gray500" textAlign="center">
                By signing up, you agree to our{' '}
                <Text color="$primary" fontWeight="500">
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text color="$primary" fontWeight="500">
                  Privacy Policy
                </Text>
              </Text>

              {/* Submit Button */}
              <Button
                onPress={handleSubmit(onSubmit)}
                loading={isLoading}
                disabled={isLoading}
                size="lg"
                fullWidth
              >
                Send Verification Code
              </Button>
            </YStack>

            {/* Email Signup Option */}
            <XStack justifyContent="center">
              <Link href="/(auth)/signup" asChild>
                <Text color="$primary" fontWeight="500">
                  Sign up with email instead
                </Text>
              </Link>
            </XStack>

            {/* Login Link */}
            <XStack justifyContent="center" gap="$2">
              <Text color="$gray500">Already have an account?</Text>
              <Link href="/(auth)/login" asChild>
                <Text color="$primary" fontWeight="600">
                  Log In
                </Text>
              </Link>
            </XStack>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

### 4. Phone Input Component (shared with AUTH-001)

The PhoneInput component is defined in AUTH-001. It uses `react-native-phone-number-input` with:
- Liberia (+231) as the default country
- Country picker with search and filtering
- Preferred countries: Liberia, US, UK, Nigeria, Ghana, Sierra Leone
- Full international E.164 format output

**File**: `components/forms/PhoneInput.tsx`

```typescript
import { useRef } from 'react';
import { Controller, Control, FieldPath, FieldValues } from 'react-hook-form';
import { YStack, Text } from 'tamagui';
import PhoneNumberInput from 'react-native-phone-number-input';

interface PhoneInputProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  defaultCountry?: string; // ISO 3166-1 alpha-2 country code
}

export function PhoneInput<T extends FieldValues>({
  control,
  name,
  label,
  defaultCountry = 'LR', // Liberia as default
}: PhoneInputProps<T>) {
  const phoneInputRef = useRef<PhoneNumberInput>(null);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <YStack gap="$1">
          {label && (
            <Text fontSize="$3" fontWeight="500" color="$gray700">
              {label}
            </Text>
          )}
          <PhoneNumberInput
            ref={phoneInputRef}
            value={value?.replace(/^\+\d+/, '') || ''} // Remove country code for display
            defaultCode={defaultCountry}
            onChangeFormattedText={(text) => {
              // Store full international format (E.164)
              onChange(text);
            }}
            layout="first"
            withDarkTheme={false}
            withShadow={false}
            autoFocus={false}
            containerStyle={{
              width: '100%',
              borderWidth: 1,
              borderColor: error ? '#EF4444' : '#D1D5DB',
              borderRadius: 12,
              backgroundColor: '#FFFFFF',
            }}
            textContainerStyle={{
              backgroundColor: '#FFFFFF',
              borderTopRightRadius: 12,
              borderBottomRightRadius: 12,
              paddingVertical: 0,
            }}
            textInputStyle={{
              height: 48,
              fontSize: 16,
            }}
            codeTextStyle={{
              fontSize: 16,
            }}
            flagButtonStyle={{
              width: 80,
            }}
            countryPickerProps={{
              withFilter: true,
              withFlag: true,
              withCountryNameButton: false,
              withAlphaFilter: true,
              withCallingCode: true,
              preferredCountries: ['LR', 'US', 'GB', 'NG', 'GH', 'SL'], // Liberia + common countries
            }}
            placeholder="Phone number"
          />
          {error && (
            <Text fontSize="$2" color="$error">
              {error.message}
            </Text>
          )}
        </YStack>
      )}
    />
  );
}
```

### 5. Validation Schema

**File**: `lib/validations/auth.ts` (add)

```typescript
import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';

// Phone signup schema
export const phoneSignupSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .refine(
      (value) => {
        try {
          return isValidPhoneNumber(value);
        } catch {
          return false;
        }
      },
      { message: 'Please enter a valid phone number' }
    ),
});

export type PhoneSignupFormData = z.infer<typeof phoneSignupSchema>;
```

### 6. Visual Design Guidelines

**Phone Signup Screen:**
```
+--------------------------------------------------+
|                                                  |
|              Create Account                      |
|       Sign up with your phone number            |
|                                                  |
|  Full Name                                       |
|  +------------------------------------------+   |
|  |  [user]  Enter your full name            |   |
|  +------------------------------------------+   |
|                                                  |
|  Phone Number                                    |
|  +--------+--------------------------------+    |
|  | LR +231 |  Enter phone number           |    |
|  +--------+--------------------------------+    |
|                                                  |
|  +------------------------------------------+   |
|  | We'll send a 6-digit verification code  |   |
|  |              via SMS                     |   |
|  +------------------------------------------+   |
|                                                  |
|         Standard SMS rates may apply            |
|                                                  |
|  By signing up, you agree to our Terms of       |
|  Service and Privacy Policy                      |
|                                                  |
|  +------------------------------------------+   |
|  |       SEND VERIFICATION CODE             |   |
|  +------------------------------------------+   |
|                                                  |
|        Sign up with email instead               |
|                                                  |
|        Already have an account? Log In          |
|                                                  |
+--------------------------------------------------+
```

**Country Picker (when tapped):**
```
+--------------------------------------------------+
|  Search countries...                    [X]     |
|                                                  |
|  PREFERRED                                       |
|  +------------------------------------------+   |
|  | LR  Liberia                    +231     |   |
|  | US  United States              +1       |   |
|  | GB  United Kingdom             +44      |   |
|  | NG  Nigeria                    +234     |   |
|  | GH  Ghana                      +233     |   |
|  | SL  Sierra Leone               +232     |   |
|  +------------------------------------------+   |
|                                                  |
|  ALL COUNTRIES                                   |
|  +------------------------------------------+   |
|  | AF  Afghanistan                +93      |   |
|  | AL  Albania                    +355     |   |
|  | ...                                      |   |
|  +------------------------------------------+   |
+--------------------------------------------------+
```

### 7. Phone Number Format

- **Storage format**: E.164 international format (e.g., `+231770123456`)
- **Liberian numbers**: +231 followed by 7-9 digits
- **Validation**: Uses `libphonenumber-js` for country-specific validation
- **Display**: Formatted per country conventions

### 8. Appwrite SMS Configuration

Note: SMS delivery requires configuration in Appwrite:
1. Appwrite Cloud provides 10 free SMS per month on paid plans
2. Additional SMS are charged per message based on destination country
3. Mock phone numbers available for testing (e.g., +15555550100)

## Acceptance Criteria

- [ ] Screen renders at `/(auth)/signup-phone` route
- [ ] Name input validates (2-50 chars, letters/spaces only)
- [ ] Phone input shows country picker with Liberia as default
- [ ] Phone input supports international numbers
- [ ] Country picker shows preferred countries at top
- [ ] Phone validation uses libphonenumber-js
- [ ] "Send Verification Code" calls Appwrite createPhoneToken
- [ ] OTP screen receives userId, destination (phone), name, and isSignup flag
- [ ] OTP verification creates account for new users
- [ ] User's name is set after account creation
- [ ] Error handling for existing phone numbers
- [ ] Link to email signup works
- [ ] Link to login works
- [ ] Successful signup redirects to main app

## Testing Checklist

- [ ] Valid Liberian phone number (+231) creates account
- [ ] Valid US phone number (+1) creates account
- [ ] Invalid phone format shows error
- [ ] Country picker opens and allows selection
- [ ] Preferred countries appear at top of picker
- [ ] Phone number validates per country rules
- [ ] OTP verification creates new account
- [ ] User's name is properly set
- [ ] Existing phone number shows appropriate error
- [ ] Invalid OTP shows error and clears input
- [ ] Resend code works with cooldown
- [ ] Navigation links work correctly
- [ ] Keyboard type is phone-pad

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `app/(auth)/signup-phone.tsx` | Create | Phone signup screen |
| `components/forms/PhoneInput.tsx` | Create/Verify | Phone input with country picker (from AUTH-001) |
| `components/forms/index.ts` | Modify | Export PhoneInput |
| `lib/validations/auth.ts` | Modify | Add phone signup schema |

## Dependencies to Install

```bash
# Phone number input with country picker
npx expo install react-native-phone-number-input

# For phone validation in Zod schemas
npm install libphonenumber-js
```

## Files to Reference

- `lib/appwrite/client.ts` - account.createPhoneToken, updateName (FOUND-003)
- `lib/appwrite/errors.ts` - Error handling (FOUND-003)
- `lib/auth/AuthContext.tsx` - refreshUser function (FOUND-003)
- `components/ui/Button.tsx` - Button component (FOUND-004)
- `components/forms/FormInput.tsx` - Form input (FOUND-005)
- `app/(auth)/verify-otp.tsx` - Shared OTP verification (AUTH-001)

## Notes for AI Agent

- Phone numbers must be in E.164 format for Appwrite (e.g., +231XXXXXXX)
- `react-native-phone-number-input` handles formatting automatically
- Appwrite Phone SMS flow: `createPhoneToken()` -> user gets SMS -> `createSession()` with secret
- For new users, the account is created when verifying the OTP
- After `createSession`, call `account.updateName()` to set the user's name
- The OTP screen is shared between login and signup - use params to differentiate
- Liberian phone numbers are typically 9 digits after +231
- Consider the SMS cost implications - Appwrite charges per SMS after free tier
- Test with mock phone numbers in development (Appwrite provides test numbers)
- The PhoneInput component is shared with AUTH-001 - ensure consistency
