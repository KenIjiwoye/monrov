# AUTH-001: Login Screen (Email OTP & Phone SMS)

## Ticket Information
- **ID**: AUTH-001
- **Priority**: Critical
- **Dependencies**: FOUND-001, FOUND-002, FOUND-003, FOUND-004, FOUND-005
- **Phase**: MVP (Phase 1)
- **Parallel Work**: Can run in parallel with AUTH-002, AUTH-003

## Description
Create the login screen for 231Booking that allows users to authenticate using either Email OTP or Phone SMS verification. The screen uses Appwrite's passwordless authentication methods - users enter their email or phone, receive a 6-digit code, and verify to log in.

## Context
The login screen provides passwordless authentication which is more secure and user-friendly than traditional passwords. Users can choose between email or phone verification. The app primarily targets Liberian users (+231), but supports international phone numbers.

## Implementation Requirements

### 1. Install Phone Number Validation Library

```bash
npx expo install react-native-phone-number-input
```

This library provides:
- Country code picker with flags
- Phone number formatting per country
- Validation based on country rules
- Easy default country configuration

### 2. Screen Files

**File**: `app/(auth)/login.tsx` - Main login screen with email/phone tabs
**File**: `app/(auth)/verify-otp.tsx` - OTP verification screen

### 3. Login Screen Structure

**File**: `app/(auth)/login.tsx`

```typescript
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, Text, XStack, Tabs } from 'tamagui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { ID } from 'react-native-appwrite';

import { FormInput, PhoneInput } from '@/components/forms';
import { Button } from '@/components/ui';
import { emailLoginSchema, phoneLoginSchema, EmailLoginFormData, PhoneLoginFormData } from '@/lib/validations/auth';
import { account } from '@/lib/appwrite/client';
import { handleAppwriteError } from '@/lib/appwrite/errors';
import { Mail, Phone } from '@tamagui/lucide-icons';

type AuthMethod = 'email' | 'phone';

export default function LoginScreen() {
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Email form
  const emailForm = useForm<EmailLoginFormData>({
    resolver: zodResolver(emailLoginSchema),
    defaultValues: { email: '' },
  });

  // Phone form
  const phoneForm = useForm<PhoneLoginFormData>({
    resolver: zodResolver(phoneLoginSchema),
    defaultValues: { phone: '' },
  });

  const onEmailSubmit = async (data: EmailLoginFormData) => {
    try {
      setError(null);
      setIsLoading(true);

      // Create email token - sends OTP to email
      const token = await account.createEmailToken(
        ID.unique(),
        data.email
      );

      // Navigate to OTP verification screen
      router.push({
        pathname: '/(auth)/verify-otp',
        params: {
          userId: token.userId,
          method: 'email',
          destination: data.email,
        },
      });
    } catch (err) {
      const appError = handleAppwriteError(err);
      setError(appError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const onPhoneSubmit = async (data: PhoneLoginFormData) => {
    try {
      setError(null);
      setIsLoading(true);

      // Create phone token - sends OTP via SMS
      const token = await account.createPhoneToken(
        ID.unique(),
        data.phone
      );

      // Navigate to OTP verification screen
      router.push({
        pathname: '/(auth)/verify-otp',
        params: {
          userId: token.userId,
          method: 'phone',
          destination: data.phone,
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
                Welcome Back
              </Text>
              <Text fontSize="$4" color="$gray500" textAlign="center">
                Log in with your email or phone number
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

            {/* Auth Method Tabs */}
            <Tabs
              value={authMethod}
              onValueChange={(value) => setAuthMethod(value as AuthMethod)}
              orientation="horizontal"
              flexDirection="column"
            >
              <Tabs.List
                backgroundColor="$gray100"
                borderRadius="$4"
                padding="$1"
              >
                <Tabs.Tab
                  value="email"
                  flex={1}
                  backgroundColor={authMethod === 'email' ? '$white' : 'transparent'}
                  borderRadius="$3"
                >
                  <XStack gap="$2" alignItems="center" justifyContent="center">
                    <Mail size={16} color={authMethod === 'email' ? '$primary' : '$gray500'} />
                    <Text
                      color={authMethod === 'email' ? '$primary' : '$gray500'}
                      fontWeight="500"
                    >
                      Email
                    </Text>
                  </XStack>
                </Tabs.Tab>
                <Tabs.Tab
                  value="phone"
                  flex={1}
                  backgroundColor={authMethod === 'phone' ? '$white' : 'transparent'}
                  borderRadius="$3"
                >
                  <XStack gap="$2" alignItems="center" justifyContent="center">
                    <Phone size={16} color={authMethod === 'phone' ? '$primary' : '$gray500'} />
                    <Text
                      color={authMethod === 'phone' ? '$primary' : '$gray500'}
                      fontWeight="500"
                    >
                      Phone
                    </Text>
                  </XStack>
                </Tabs.Tab>
              </Tabs.List>

              {/* Email Tab Content */}
              <Tabs.Content value="email">
                <YStack gap="$4" marginTop="$4">
                  <FormInput
                    control={emailForm.control}
                    name="email"
                    label="Email Address"
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    leftIcon={<Mail size={20} color="$gray400" />}
                  />

                  <Button
                    onPress={emailForm.handleSubmit(onEmailSubmit)}
                    loading={isLoading}
                    disabled={isLoading}
                    size="lg"
                    fullWidth
                  >
                    Send Verification Code
                  </Button>
                </YStack>
              </Tabs.Content>

              {/* Phone Tab Content */}
              <Tabs.Content value="phone">
                <YStack gap="$4" marginTop="$4">
                  <PhoneInput
                    control={phoneForm.control}
                    name="phone"
                    label="Phone Number"
                    defaultCountry="LR"
                  />

                  <Button
                    onPress={phoneForm.handleSubmit(onPhoneSubmit)}
                    loading={isLoading}
                    disabled={isLoading}
                    size="lg"
                    fullWidth
                  >
                    Send Verification Code
                  </Button>
                </YStack>
              </Tabs.Content>
            </Tabs>

            {/* Sign Up Link */}
            <XStack justifyContent="center" gap="$2">
              <Text color="$gray500">Don't have an account?</Text>
              <Link href="/(auth)/signup" asChild>
                <Text color="$primary" fontWeight="600">
                  Sign Up
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

### 4. OTP Verification Screen

**File**: `app/(auth)/verify-otp.tsx`

```typescript
import { useState, useRef, useEffect } from 'react';
import { TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, Text, XStack, Input } from 'tamagui';
import { router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/ui';
import { account } from '@/lib/appwrite/client';
import { handleAppwriteError } from '@/lib/appwrite/errors';
import { useAuth } from '@/lib/auth/AuthContext';
import { ArrowLeft, Mail, Phone } from '@tamagui/lucide-icons';
import { ID } from 'react-native-appwrite';

const OTP_LENGTH = 6;

export default function VerifyOTPScreen() {
  const { userId, method, destination } = useLocalSearchParams<{
    userId: string;
    method: 'email' | 'phone';
    destination: string;
  }>();

  const { refreshUser } = useAuth();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleOtpChange = (text: string, index: number) => {
    // Only allow digits
    const digit = text.replace(/\D/g, '').slice(-1);

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-focus next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (newOtp.every((d) => d !== '') && newOtp.join('').length === OTP_LENGTH) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace - focus previous input
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpCode: string) => {
    if (!userId || otpCode.length !== OTP_LENGTH) return;

    try {
      setError(null);
      setIsLoading(true);

      // Create session with OTP
      await account.createSession(userId, otpCode);

      // Refresh user data
      await refreshUser();

      // Navigation handled by auth state change in layout
    } catch (err) {
      const appError = handleAppwriteError(err);
      setError(appError.message);
      // Clear OTP on error
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!destination || resendCooldown > 0) return;

    try {
      setError(null);
      setIsResending(true);

      if (method === 'email') {
        await account.createEmailToken(ID.unique(), destination);
      } else {
        await account.createPhoneToken(ID.unique(), destination);
      }

      // Start 60-second cooldown
      setResendCooldown(60);
    } catch (err) {
      const appError = handleAppwriteError(err);
      setError(appError.message);
    } finally {
      setIsResending(false);
    }
  };

  const maskDestination = () => {
    if (!destination) return '';

    if (method === 'email') {
      const [local, domain] = destination.split('@');
      const masked = local.slice(0, 2) + '***' + local.slice(-1);
      return `${masked}@${domain}`;
    } else {
      // Mask phone: show first 4 and last 2 digits
      return destination.slice(0, 4) + '****' + destination.slice(-2);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <YStack flex={1} padding="$4">
          {/* Back Button */}
          <XStack>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => router.back()}
              icon={<ArrowLeft size={20} />}
            >
              Back
            </Button>
          </XStack>

          <YStack flex={1} justifyContent="center" gap="$6">
            {/* Icon */}
            <YStack alignItems="center">
              <YStack
                backgroundColor="$primaryLight"
                padding="$4"
                borderRadius={1000}
              >
                {method === 'email' ? (
                  <Mail size={40} color="$primary" />
                ) : (
                  <Phone size={40} color="$primary" />
                )}
              </YStack>
            </YStack>

            {/* Header */}
            <YStack gap="$2" alignItems="center">
              <Text fontSize="$8" fontWeight="700" color="$gray900">
                Enter Verification Code
              </Text>
              <Text fontSize="$4" color="$gray500" textAlign="center">
                We sent a 6-digit code to{'\n'}
                <Text fontWeight="600" color="$gray700">
                  {maskDestination()}
                </Text>
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

            {/* OTP Input */}
            <XStack justifyContent="center" gap="$2">
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                  fontSize="$7"
                  fontWeight="700"
                  width={48}
                  height={56}
                  borderRadius="$3"
                  borderWidth={2}
                  borderColor={digit ? '$primary' : '$gray300'}
                  focusStyle={{
                    borderColor: '$primary',
                  }}
                  editable={!isLoading}
                />
              ))}
            </XStack>

            {/* Verify Button */}
            <Button
              onPress={() => handleVerify(otp.join(''))}
              loading={isLoading}
              disabled={isLoading || otp.join('').length !== OTP_LENGTH}
              size="lg"
              fullWidth
            >
              Verify & Log In
            </Button>

            {/* Resend Code */}
            <YStack alignItems="center" gap="$2">
              <Text color="$gray500">Didn't receive the code?</Text>
              {resendCooldown > 0 ? (
                <Text color="$gray400">
                  Resend in {resendCooldown}s
                </Text>
              ) : (
                <Button
                  variant="ghost"
                  onPress={handleResend}
                  loading={isResending}
                  disabled={isResending}
                >
                  <Text color="$primary" fontWeight="600">
                    Resend Code
                  </Text>
                </Button>
              )}
            </YStack>
          </YStack>
        </YStack>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

### 5. Phone Input Component with International Support

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
              // Store full international format
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

### 6. Validation Schemas

**File**: `lib/validations/auth.ts` (add/update)

```typescript
import { z } from 'zod';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

// Email login schema
export const emailLoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

export type EmailLoginFormData = z.infer<typeof emailLoginSchema>;

// Phone login schema
export const phoneLoginSchema = z.object({
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

export type PhoneLoginFormData = z.infer<typeof phoneLoginSchema>;

// OTP verification schema
export const otpSchema = z.object({
  otp: z
    .string()
    .length(6, 'Please enter all 6 digits')
    .regex(/^\d+$/, 'OTP must contain only numbers'),
});

export type OTPFormData = z.infer<typeof otpSchema>;
```

### 7. Visual Design Guidelines

**Login Screen:**
```
+--------------------------------------------------+
|                                                  |
|               Welcome Back                       |
|     Log in with your email or phone number      |
|                                                  |
|  +--------------------+--------------------+     |
|  |    [x] Email       |      Phone        |     |
|  +--------------------+--------------------+     |
|                                                  |
|  Email Address                                   |
|  +------------------------------------------+   |
|  |  [mail]  Enter your email                |   |
|  +------------------------------------------+   |
|                                                  |
|  +------------------------------------------+   |
|  |       SEND VERIFICATION CODE             |   |
|  +------------------------------------------+   |
|                                                  |
|        Don't have an account? Sign Up           |
|                                                  |
+--------------------------------------------------+
```

**OTP Verification Screen:**
```
+--------------------------------------------------+
|  <- Back                                         |
|                                                  |
|                   [mail/phone]                   |
|                    (icon)                        |
|                                                  |
|          Enter Verification Code                 |
|                                                  |
|          We sent a 6-digit code to              |
|               jo***n@email.com                   |
|                                                  |
|     +---+ +---+ +---+ +---+ +---+ +---+         |
|     | 1 | | 2 | | 3 | | 4 | | 5 | | 6 |         |
|     +---+ +---+ +---+ +---+ +---+ +---+         |
|                                                  |
|  +------------------------------------------+   |
|  |           VERIFY & LOG IN                |   |
|  +------------------------------------------+   |
|                                                  |
|        Didn't receive the code?                 |
|              Resend Code                        |
|                                                  |
+--------------------------------------------------+
```

## Acceptance Criteria

- [ ] Screen renders at `/(auth)/login` route
- [ ] Tab navigation between Email and Phone methods works
- [ ] Email input validates format
- [ ] Phone input shows country picker with Liberia (+231) as default
- [ ] Phone input supports international numbers
- [ ] "Send Verification Code" calls appropriate Appwrite method
- [ ] OTP screen receives userId and destination
- [ ] OTP input auto-focuses and auto-advances
- [ ] OTP auto-submits when 6 digits entered
- [ ] Successful verification creates session and navigates to app
- [ ] Error messages display for invalid OTP
- [ ] Resend code works with 60-second cooldown
- [ ] Loading states shown during API calls
- [ ] Navigation to signup screen works

## Testing Checklist

- [ ] Email tab sends OTP to email
- [ ] Phone tab sends OTP via SMS
- [ ] OTP verification creates valid session
- [ ] Invalid OTP shows error and clears input
- [ ] Expired OTP shows appropriate message
- [ ] Resend cooldown prevents spam
- [ ] Country picker defaults to Liberia
- [ ] International phone numbers validate correctly
- [ ] Back navigation works from OTP screen
- [ ] Keyboard navigates correctly between OTP inputs

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `app/(auth)/login.tsx` | Create | Login screen with email/phone tabs |
| `app/(auth)/verify-otp.tsx` | Create | OTP verification screen |
| `components/forms/PhoneInput.tsx` | Create | Phone input with country picker |
| `components/forms/index.ts` | Modify | Export PhoneInput |
| `lib/validations/auth.ts` | Modify | Add email/phone login schemas |

## Dependencies to Install

```bash
# Phone number input with country picker
npx expo install react-native-phone-number-input

# For phone validation in Zod schemas
npm install libphonenumber-js
```

## Files to Reference

- `lib/appwrite/client.ts` - account.createEmailToken, createPhoneToken, createSession (FOUND-003)
- `lib/appwrite/errors.ts` - Error handling (FOUND-003)
- `lib/auth/AuthContext.tsx` - refreshUser function (FOUND-003)
- `components/ui/Button.tsx` - Button component (FOUND-004)
- `components/forms/FormInput.tsx` - Form input (FOUND-005)

## Notes for AI Agent

- Appwrite Email OTP flow: `createEmailToken()` -> user gets email -> `createSession()` with secret
- Appwrite Phone SMS flow: `createPhoneToken()` -> user gets SMS -> `createSession()` with secret
- The `userId` from token response is used in `createSession()`, NOT `ID.unique()` again
- For existing users, the userId from their existing account is returned
- Phone numbers must be in E.164 format (e.g., +231XXXXXXXXX)
- react-native-phone-number-input handles formatting automatically
- OTP codes expire quickly - implement resend with cooldown
- Consider adding haptic feedback on OTP input
- Auto-submit improves UX but ensure error handling is robust
