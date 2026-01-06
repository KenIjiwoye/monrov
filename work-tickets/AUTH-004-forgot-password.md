# AUTH-004: Password Reset Flow

## Ticket Information
- **ID**: AUTH-004
- **Priority**: High
- **Dependencies**: FOUND-001, FOUND-002, FOUND-003, FOUND-004, FOUND-005
- **Phase**: MVP (Phase 1)
- **Parallel Work**: Can run in parallel with AUTH-005, AUTH-006

## Description
Create the password reset flow for 231Booking that allows users to recover their accounts when they forget their passwords. This includes the email input screen and success confirmation.

## Context
Users need a way to recover access to their accounts. This flow sends a password reset email through Appwrite. The actual password reset happens via a link in the email that opens the app or web page with a reset token.

## Implementation Requirements

### 1. Forgot Password Screen

**File**: `app/(auth)/forgot-password.tsx`

```typescript
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, Text, XStack } from 'tamagui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';

import { FormInput } from '@/components/forms';
import { Button } from '@/components/ui';
import { forgotPasswordSchema, ForgotPasswordFormData } from '@/lib/validations/auth';
import { useAuth } from '@/lib/auth/AuthContext';
import { handleAppwriteError } from '@/lib/appwrite/errors';
import { Mail, ArrowLeft, CheckCircle } from '@tamagui/lucide-icons';

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const { email: prefilledEmail } = useLocalSearchParams<{ email?: string }>();
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: prefilledEmail || '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setError(null);
      await resetPassword(data.email);
      setIsSuccess(true);
    } catch (err) {
      const appError = handleAppwriteError(err);
      setError(appError.message);
    }
  };

  if (isSuccess) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <YStack flex={1} padding="$4" justifyContent="center" alignItems="center" gap="$6">
          <YStack
            backgroundColor="$successLight"
            padding="$6"
            borderRadius={1000}
          >
            <CheckCircle size={64} color="$success" />
          </YStack>

          <YStack gap="$2" alignItems="center">
            <Text fontSize="$8" fontWeight="700" color="$gray900">
              Check Your Email
            </Text>
            <Text fontSize="$4" color="$gray500" textAlign="center" paddingHorizontal="$4">
              We've sent a password reset link to{' '}
              <Text fontWeight="600" color="$gray700">
                {getValues('email')}
              </Text>
            </Text>
          </YStack>

          <YStack gap="$3" width="100%">
            <Text fontSize="$3" color="$gray500" textAlign="center">
              Didn't receive the email? Check your spam folder or try again.
            </Text>

            <Button
              variant="outline"
              onPress={() => setIsSuccess(false)}
              fullWidth
            >
              Try Another Email
            </Button>

            <Button
              variant="ghost"
              onPress={() => router.back()}
              fullWidth
            >
              Back to Login
            </Button>
          </YStack>
        </YStack>
      </SafeAreaView>
    );
  }

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
            {/* Header */}
            <YStack gap="$2">
              <Text fontSize="$9" fontWeight="700" color="$gray900">
                Forgot Password?
              </Text>
              <Text fontSize="$4" color="$gray500">
                No worries! Enter your email and we'll send you a reset link.
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
                name="email"
                label="Email"
                placeholder="Enter your email address"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoFocus
                leftIcon={<Mail size={20} color="$gray400" />}
              />

              <Button
                onPress={handleSubmit(onSubmit)}
                loading={isSubmitting}
                disabled={isSubmitting}
                size="lg"
                fullWidth
              >
                Send Reset Link
              </Button>
            </YStack>

            {/* Help Text */}
            <YStack gap="$2">
              <Text fontSize="$3" color="$gray400" textAlign="center">
                Remember your password?{' '}
                <Text
                  color="$primary"
                  fontWeight="500"
                  onPress={() => router.push('/(auth)/login')}
                >
                  Log In
                </Text>
              </Text>
            </YStack>
          </YStack>
        </YStack>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

### 2. Deep Link Handler (for reset link)

**File**: `app/reset-password.tsx`

```typescript
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, Text, XStack } from 'tamagui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';

import { FormInput } from '@/components/forms';
import { Button, LoadingScreen } from '@/components/ui';
import { resetPasswordSchema, ResetPasswordFormData } from '@/lib/validations/auth';
import { account } from '@/lib/appwrite/client';
import { handleAppwriteError } from '@/lib/appwrite/errors';
import { Lock, Eye, EyeOff, CheckCircle } from '@tamagui/lucide-icons';

export default function ResetPasswordScreen() {
  const { userId, secret } = useLocalSearchParams<{ userId: string; secret: string }>();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidating, setIsValidating] = useState(true);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    // Validate that we have the required params
    if (!userId || !secret) {
      setError('Invalid reset link. Please request a new password reset.');
    }
    setIsValidating(false);
  }, [userId, secret]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!userId || !secret) return;

    try {
      setError(null);
      await account.updateRecovery(userId, secret, data.password);
      setIsSuccess(true);
    } catch (err) {
      const appError = handleAppwriteError(err);
      setError(appError.message);
    }
  };

  if (isValidating) {
    return <LoadingScreen message="Validating reset link..." />;
  }

  if (isSuccess) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <YStack flex={1} padding="$4" justifyContent="center" alignItems="center" gap="$6">
          <YStack
            backgroundColor="$successLight"
            padding="$6"
            borderRadius={1000}
          >
            <CheckCircle size={64} color="$success" />
          </YStack>

          <YStack gap="$2" alignItems="center">
            <Text fontSize="$8" fontWeight="700" color="$gray900">
              Password Reset!
            </Text>
            <Text fontSize="$4" color="$gray500" textAlign="center">
              Your password has been successfully reset. You can now log in with your new password.
            </Text>
          </YStack>

          <Button
            onPress={() => router.replace('/(auth)/login')}
            size="lg"
            fullWidth
          >
            Go to Login
          </Button>
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <YStack flex={1} padding="$4" justifyContent="center" gap="$6">
        {/* Header */}
        <YStack gap="$2">
          <Text fontSize="$9" fontWeight="700" color="$gray900">
            Set New Password
          </Text>
          <Text fontSize="$4" color="$gray500">
            Enter your new password below.
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
            name="password"
            label="New Password"
            placeholder="Enter new password"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            leftIcon={<Lock size={20} color="$gray400" />}
            rightIcon={
              <XStack
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showPassword ? (
                  <EyeOff size={20} color="$gray400" />
                ) : (
                  <Eye size={20} color="$gray400" />
                )}
              </XStack>
            }
          />

          <FormInput
            control={control}
            name="confirmPassword"
            label="Confirm New Password"
            placeholder="Confirm new password"
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            leftIcon={<Lock size={20} color="$gray400" />}
            rightIcon={
              <XStack
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} color="$gray400" />
                ) : (
                  <Eye size={20} color="$gray400" />
                )}
              </XStack>
            }
          />

          <Button
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            disabled={isSubmitting || !userId || !secret}
            size="lg"
            fullWidth
          >
            Reset Password
          </Button>
        </YStack>
      </YStack>
    </SafeAreaView>
  );
}
```

### 3. App Config for Deep Links

**File**: `app.json` (add to existing)

```json
{
  "expo": {
    "scheme": "booking231",
    "web": {
      "bundler": "metro"
    },
    "plugins": [
      [
        "expo-router",
        {
          "origin": "https://231booking.com"
        }
      ]
    ]
  }
}
```

### 4. Visual Design Guidelines

**Forgot Password Screen:**
```
┌─────────────────────────────────────────────────┐
│  ← Back                                         │
│                                                 │
│                                                 │
│          Forgot Password?                       │
│                                                 │
│  No worries! Enter your email and we'll        │
│  send you a reset link.                        │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  📧  Enter your email address           │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │          SEND RESET LINK                │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│       Remember your password? Log In           │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Success State:**
```
┌─────────────────────────────────────────────────┐
│                                                 │
│                    ✓                            │
│                 (circle)                        │
│                                                 │
│           Check Your Email                      │
│                                                 │
│   We've sent a password reset link to          │
│   user@example.com                             │
│                                                 │
│   Didn't receive the email? Check your spam    │
│   folder or try again.                         │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │        Try Another Email                │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│             Back to Login                       │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Acceptance Criteria

- [ ] Forgot password screen renders at `/(auth)/forgot-password`
- [ ] Email input validates format
- [ ] Reset link sent successfully via Appwrite
- [ ] Success state shows after sending email
- [ ] Can retry with different email
- [ ] Back navigation works
- [ ] Reset password screen handles deep link params
- [ ] New password validated (requirements met)
- [ ] Passwords must match
- [ ] Success confirmation after password reset
- [ ] Navigation to login after reset

## Testing Checklist

- [ ] Valid email sends reset link
- [ ] Invalid email shows validation error
- [ ] Unknown email shows appropriate message
- [ ] Success screen shows correct email
- [ ] "Try Another Email" returns to form
- [ ] Deep link opens reset password screen
- [ ] Invalid/expired link shows error
- [ ] New password validated correctly
- [ ] Successful reset redirects to login

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `app/(auth)/forgot-password.tsx` | Create | Forgot password screen |
| `app/reset-password.tsx` | Create | Password reset deep link handler |
| `app.json` | Modify | Add scheme for deep links |

## Files to Reference

- `lib/validations/auth.ts` - Forgot password and reset schemas (FOUND-005)
- `lib/auth/AuthContext.tsx` - resetPassword function (FOUND-003)
- `lib/appwrite/client.ts` - account.updateRecovery (FOUND-003)

## Notes for AI Agent

- The reset email URL should be configured in Appwrite console
- Deep link format: `booking231://reset-password?userId=X&secret=Y`
- Consider handling expired reset links gracefully
- The success state should clearly show which email was used
- Users should be able to request another reset email easily
- Appwrite's recovery flow requires userId and secret parameters
