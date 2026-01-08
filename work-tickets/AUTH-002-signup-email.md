# AUTH-002: Sign Up Screen (Email OTP)

## Ticket Information
- **ID**: AUTH-002
- **Priority**: Critical
- **Dependencies**: FOUND-001, FOUND-002, FOUND-003, FOUND-004, FOUND-005
- **Phase**: MVP (Phase 1)
- **Parallel Work**: Can run in parallel with AUTH-001, AUTH-003

## Description
Create the email sign up screen for 231Booking that allows new users to create an account using Email OTP verification. This is a passwordless signup flow - users provide their name and email, verify via a 6-digit code sent to their email, and their account is created automatically.

## Context
The signup screen provides passwordless account creation which is more secure and user-friendly than traditional password-based signup. Users enter their email, receive a 6-digit OTP, and upon verification, their account is created. Appwrite handles account creation automatically when verifying an OTP for a new user.

## Implementation Requirements

### 1. Screen Files

**File**: `app/(auth)/signup.tsx` - Email signup screen
**File**: `app/(auth)/verify-signup.tsx` - OTP verification for signup (reuses verify-otp with additional name param)

### 2. Signup Screen Structure

**File**: `app/(auth)/signup.tsx`

```typescript
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, Text, XStack } from 'tamagui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { ID } from 'react-native-appwrite';

import { FormInput } from '@/components/forms';
import { Button } from '@/components/ui';
import { emailSignupSchema, EmailSignupFormData } from '@/lib/validations/auth';
import { account } from '@/lib/appwrite/client';
import { handleAppwriteError } from '@/lib/appwrite/errors';
import { User, Mail } from '@tamagui/lucide-icons';

export default function SignupScreen() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<EmailSignupFormData>({
    resolver: zodResolver(emailSignupSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  const onSubmit = async (data: EmailSignupFormData) => {
    try {
      setError(null);
      setIsLoading(true);

      // Create email token - sends OTP to email
      // For new users, this initiates account creation
      const token = await account.createEmailToken(
        ID.unique(),
        data.email
      );

      // Navigate to OTP verification screen with name for profile setup
      router.push({
        pathname: '/(auth)/verify-otp',
        params: {
          userId: token.userId,
          method: 'email',
          destination: data.email,
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
                Join 231Booking to discover and book amazing services
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

              <FormInput
                control={control}
                name="email"
                label="Email Address"
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                leftIcon={<Mail size={20} color="$gray400" />}
              />

              {/* Info Text */}
              <YStack
                backgroundColor="$primaryLight"
                padding="$3"
                borderRadius="$3"
              >
                <Text fontSize="$3" color="$primary" textAlign="center">
                  We'll send a 6-digit verification code to your email
                </Text>
              </YStack>

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

            {/* Phone Signup Option */}
            <XStack justifyContent="center">
              <Link href="/(auth)/signup-phone" asChild>
                <Text color="$primary" fontWeight="500">
                  Sign up with phone number instead
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

### 3. Updated OTP Verification Screen (handles signup flow)

The OTP verification screen from AUTH-001 needs to be updated to handle the signup flow:

**File**: `app/(auth)/verify-otp.tsx` (updated)

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
  const { userId, method, destination, name, isSignup } = useLocalSearchParams<{
    userId: string;
    method: 'email' | 'phone';
    destination: string;
    name?: string;
    isSignup?: string;
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
      // For new users, this also creates the account
      await account.createSession(userId, otpCode);

      // If this is a signup flow and we have a name, update the user's name
      if (isSignup === 'true' && name) {
        try {
          await account.updateName(name);
        } catch (updateErr) {
          // Non-critical error, user can update name later
          console.warn('Failed to set user name:', updateErr);
        }
      }

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

  const getTitle = () => {
    return isSignup === 'true' ? 'Verify Your Email' : 'Enter Verification Code';
  };

  const getButtonText = () => {
    return isSignup === 'true' ? 'Verify & Create Account' : 'Verify & Log In';
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
                {getTitle()}
              </Text>
              <Text fontSize="$4" color="$gray500" textAlign="center">
                We sent a 6-digit code to{'\n'}
                <Text fontWeight="600" color="$gray700">
                  {maskDestination()}
                </Text>
              </Text>
              {isSignup === 'true' && name && (
                <Text fontSize="$3" color="$gray400" marginTop="$2">
                  Creating account for {name}
                </Text>
              )}
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
              {getButtonText()}
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

### 4. Validation Schema

**File**: `lib/validations/auth.ts` (add)

```typescript
import { z } from 'zod';

// Email signup schema
export const emailSignupSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

export type EmailSignupFormData = z.infer<typeof emailSignupSchema>;
```

### 5. Visual Design Guidelines

**Email Signup Screen:**
```
+--------------------------------------------------+
|                                                  |
|              Create Account                      |
|    Join 231Booking to discover and book         |
|           amazing services                       |
|                                                  |
|  Full Name                                       |
|  +------------------------------------------+   |
|  |  [user]  Enter your full name            |   |
|  +------------------------------------------+   |
|                                                  |
|  Email Address                                   |
|  +------------------------------------------+   |
|  |  [mail]  Enter your email                |   |
|  +------------------------------------------+   |
|                                                  |
|  +------------------------------------------+   |
|  | We'll send a 6-digit verification code  |   |
|  |           to your email                  |   |
|  +------------------------------------------+   |
|                                                  |
|  By signing up, you agree to our Terms of       |
|  Service and Privacy Policy                      |
|                                                  |
|  +------------------------------------------+   |
|  |       SEND VERIFICATION CODE             |   |
|  +------------------------------------------+   |
|                                                  |
|      Sign up with phone number instead          |
|                                                  |
|        Already have an account? Log In          |
|                                                  |
+--------------------------------------------------+
```

**OTP Verification (Signup Flow):**
```
+--------------------------------------------------+
|  <- Back                                         |
|                                                  |
|                   [mail]                         |
|                  (icon)                          |
|                                                  |
|            Verify Your Email                     |
|                                                  |
|          We sent a 6-digit code to              |
|               jo***n@email.com                   |
|                                                  |
|          Creating account for John Doe           |
|                                                  |
|     +---+ +---+ +---+ +---+ +---+ +---+         |
|     | 1 | | 2 | | 3 | | 4 | | 5 | | 6 |         |
|     +---+ +---+ +---+ +---+ +---+ +---+         |
|                                                  |
|  +------------------------------------------+   |
|  |       VERIFY & CREATE ACCOUNT            |   |
|  +------------------------------------------+   |
|                                                  |
|        Didn't receive the code?                 |
|              Resend Code                        |
|                                                  |
+--------------------------------------------------+
```

## Acceptance Criteria

- [ ] Screen renders at `/(auth)/signup` route
- [ ] Name input validates (2-50 chars, letters/spaces only)
- [ ] Email input validates format
- [ ] "Send Verification Code" calls Appwrite createEmailToken
- [ ] OTP screen receives userId, destination, name, and isSignup flag
- [ ] OTP verification creates account for new users
- [ ] User's name is set after account creation
- [ ] Successful verification creates session and navigates to app
- [ ] Error messages display for invalid OTP or existing accounts
- [ ] Link to phone signup works
- [ ] Link to login screen works
- [ ] Terms and privacy policy text displays

## Testing Checklist

- [ ] Valid name and email sends OTP
- [ ] Invalid name shows validation error
- [ ] Invalid email shows validation error
- [ ] OTP verification creates new account
- [ ] User's name is properly set
- [ ] Existing email redirects to login (or shows appropriate message)
- [ ] Invalid OTP shows error and clears input
- [ ] Resend code works correctly
- [ ] Navigation links work correctly
- [ ] Screen accessible via screen reader

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `app/(auth)/signup.tsx` | Create | Email signup screen |
| `app/(auth)/verify-otp.tsx` | Modify | Add signup flow handling |
| `lib/validations/auth.ts` | Modify | Add email signup schema |

## Files to Reference

- `lib/appwrite/client.ts` - account.createEmailToken, updateName (FOUND-003)
- `lib/appwrite/errors.ts` - Error handling (FOUND-003)
- `lib/auth/AuthContext.tsx` - refreshUser function (FOUND-003)
- `components/ui/Button.tsx` - Button component (FOUND-004)
- `components/forms/FormInput.tsx` - Form input (FOUND-005)
- `app/(auth)/verify-otp.tsx` - Shared OTP verification (AUTH-001)

## Notes for AI Agent

- Appwrite OTP flow automatically creates accounts for new email addresses
- The `userId` returned from `createEmailToken` is the new user's ID
- After `createSession`, call `account.updateName()` to set the user's name
- The name update is non-critical - if it fails, user can update later in profile
- Consider showing a different title/button text for signup vs login OTP flows
- The OTP screen is shared between login (AUTH-001) and signup - use params to differentiate
- No password is needed - this is fully passwordless authentication
