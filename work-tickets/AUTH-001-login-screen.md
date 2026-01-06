# AUTH-001: Login Screen

## Ticket Information
- **ID**: AUTH-001
- **Priority**: Critical
- **Dependencies**: FOUND-001, FOUND-002, FOUND-003, FOUND-004, FOUND-005
- **Phase**: MVP (Phase 1)
- **Parallel Work**: Can run in parallel with AUTH-002, AUTH-003

## Description
Create the login screen for 231Booking that allows users to authenticate using their email and password. The screen should provide a seamless, secure login experience with proper validation and error handling.

## Context
The login screen is the primary entry point for returning users. It needs to handle email/password authentication through Appwrite, validate input, display meaningful error messages, and provide navigation to signup and password reset flows.

## Implementation Requirements

### 1. Screen File

**File**: `app/(auth)/login.tsx`

### 2. Screen Structure

```typescript
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, Text, XStack } from 'tamagui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';

import { FormInput } from '@/components/forms';
import { Button } from '@/components/ui';
import { loginSchema, LoginFormData } from '@/lib/validations/auth';
import { useAuth } from '@/lib/auth/AuthContext';
import { handleAppwriteError } from '@/lib/appwrite/errors';
import { navigation } from '@/lib/navigation';
import { Mail, Lock, Eye, EyeOff } from '@tamagui/lucide-icons';

export default function LoginScreen() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      await login(data.email, data.password);
      // Navigation handled by auth state change in layout
    } catch (err) {
      const appError = handleAppwriteError(err);
      setError(appError.message);
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
                Log in to access your bookings and more
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
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                leftIcon={<Mail size={20} color="$gray400" />}
              />

              <FormInput
                control={control}
                name="password"
                label="Password"
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
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

              {/* Forgot Password Link */}
              <XStack justifyContent="flex-end">
                <Link href="/(auth)/forgot-password" asChild>
                  <Text color="$primary" fontSize="$3" fontWeight="500">
                    Forgot Password?
                  </Text>
                </Link>
              </XStack>

              {/* Submit Button */}
              <Button
                onPress={handleSubmit(onSubmit)}
                loading={isSubmitting}
                disabled={isSubmitting}
                size="lg"
                fullWidth
              >
                Log In
              </Button>
            </YStack>

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

### 3. Visual Design Guidelines

```
┌─────────────────────────────────────────────────┐
│                                                 │
│           ┌───────────────────────┐             │
│           │     [App Logo]        │             │
│           └───────────────────────┘             │
│                                                 │
│              Welcome Back                       │
│     Log in to access your bookings and more    │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  📧  Enter your email                   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  🔒  Enter your password          👁   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│                        Forgot Password?        │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │              LOG IN                      │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│       Don't have an account? Sign Up           │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 4. Features to Implement

1. **Form Validation**
   - Email format validation
   - Password required validation
   - Real-time validation feedback

2. **Password Visibility Toggle**
   - Eye icon to show/hide password
   - Accessible touch target

3. **Error Handling**
   - Display API errors (invalid credentials, network issues)
   - Clear error on retry
   - User-friendly error messages

4. **Navigation**
   - Link to signup screen
   - Link to forgot password screen
   - Redirect to main app on success

5. **UX Considerations**
   - Keyboard-aware scrolling
   - Loading state on button during submission
   - Disable button while submitting
   - Auto-focus email field on mount

## Acceptance Criteria

- [ ] Screen renders at `/(auth)/login` route
- [ ] Email input with validation (required, valid format)
- [ ] Password input with validation (required)
- [ ] Password visibility toggle works
- [ ] Form submits and authenticates with Appwrite
- [ ] Error messages display for invalid credentials
- [ ] Loading state shown during authentication
- [ ] Navigation to signup screen works
- [ ] Navigation to forgot password screen works
- [ ] Successful login redirects to main app
- [ ] Keyboard doesn't cover input fields

## Testing Checklist

- [ ] Valid email/password logs in successfully
- [ ] Invalid email shows validation error
- [ ] Invalid password shows API error
- [ ] Network error shows appropriate message
- [ ] Password toggle shows/hides password
- [ ] Links navigate to correct screens
- [ ] Button disabled while submitting
- [ ] Keyboard dismisses on outside tap
- [ ] Screen accessible via screen reader

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `app/(auth)/login.tsx` | Create | Login screen component |

## Files to Reference

- `lib/validations/auth.ts` - Login schema (FOUND-005)
- `lib/auth/AuthContext.tsx` - Login function (FOUND-003)
- `lib/appwrite/errors.ts` - Error handling (FOUND-003)
- `components/ui/Button.tsx` - Button component (FOUND-004)
- `components/forms/FormInput.tsx` - Form input (FOUND-005)

## Notes for AI Agent

- Use SafeAreaView for proper iOS notch handling
- KeyboardAvoidingView is critical for mobile UX
- The login function is in AuthContext from FOUND-003
- Error handling should use handleAppwriteError utility
- Test on both iOS and Android for keyboard behavior
- Ensure minimum touch targets of 44x44px for interactive elements
