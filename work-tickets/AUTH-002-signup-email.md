# AUTH-002: Sign Up Screen (Email/Password)

## Ticket Information
- **ID**: AUTH-002
- **Priority**: Critical
- **Dependencies**: FOUND-001, FOUND-002, FOUND-003, FOUND-004, FOUND-005
- **Phase**: MVP (Phase 1)
- **Parallel Work**: Can run in parallel with AUTH-001, AUTH-003

## Description
Create the email/password sign up screen for 231Booking that allows new users to create an account. The screen should collect user information, validate input, and create the account through Appwrite.

## Context
The signup screen is the entry point for new users. It collects essential information (name, email, password) and creates a new account. The screen must provide clear feedback on password requirements and handle all potential error cases gracefully.

## Implementation Requirements

### 1. Screen File

**File**: `app/(auth)/signup.tsx`

### 2. Screen Structure

```typescript
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, Text, XStack } from 'tamagui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';

import { FormInput } from '@/components/forms';
import { Button } from '@/components/ui';
import { signupSchema, SignupFormData } from '@/lib/validations/auth';
import { useAuth } from '@/lib/auth/AuthContext';
import { handleAppwriteError } from '@/lib/appwrite/errors';
import { User, Mail, Lock, Eye, EyeOff, Check, X } from '@tamagui/lucide-icons';

export default function SignupScreen() {
  const { signup } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  const onSubmit = async (data: SignupFormData) => {
    try {
      setError(null);
      await signup(data.email, data.password, data.name);
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
          <YStack flex={1} padding="$4" justifyContent="center" gap="$5">
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
                placeholder="Create a password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
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

              {/* Password Requirements */}
              <PasswordRequirements password={password} />

              <FormInput
                control={control}
                name="confirmPassword"
                label="Confirm Password"
                placeholder="Confirm your password"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoComplete="new-password"
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
                loading={isSubmitting}
                disabled={isSubmitting}
                size="lg"
                fullWidth
              >
                Create Account
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

// Password Requirements Component
function PasswordRequirements({ password }: { password: string }) {
  const requirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
  ];

  return (
    <YStack gap="$1" paddingLeft="$2">
      {requirements.map((req) => (
        <XStack key={req.label} gap="$2" alignItems="center">
          {req.met ? (
            <Check size={14} color="$success" />
          ) : (
            <X size={14} color="$gray400" />
          )}
          <Text
            fontSize="$2"
            color={req.met ? '$success' : '$gray400'}
          >
            {req.label}
          </Text>
        </XStack>
      ))}
    </YStack>
  );
}
```

### 3. Visual Design Guidelines

```
┌─────────────────────────────────────────────────┐
│                                                 │
│              Create Account                     │
│    Join 231Booking to discover and book        │
│           amazing services                      │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  👤  Enter your full name               │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  📧  Enter your email                   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  🔒  Create a password            👁   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│    ✓ At least 8 characters                     │
│    ✓ One uppercase letter                      │
│    ✗ One lowercase letter                      │
│    ✗ One number                                │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  🔒  Confirm your password        👁   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  By signing up, you agree to our Terms of      │
│  Service and Privacy Policy                    │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │          CREATE ACCOUNT                 │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│      Sign up with phone number instead         │
│                                                 │
│        Already have an account? Log In         │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 4. Features to Implement

1. **Form Fields**
   - Full name input
   - Email input
   - Password input with visibility toggle
   - Confirm password input with visibility toggle

2. **Password Requirements Display**
   - Visual checklist showing password requirements
   - Real-time updates as user types
   - Green checkmarks for met requirements
   - Gray X for unmet requirements

3. **Form Validation**
   - Name: min 2 chars, max 50 chars
   - Email: valid format
   - Password: min 8 chars, uppercase, lowercase, number
   - Confirm password: must match

4. **Error Handling**
   - Display API errors (email exists, network issues)
   - Clear error on retry
   - Field-level validation errors

5. **Navigation**
   - Link to phone signup
   - Link to login screen
   - Redirect to main app on success

## Acceptance Criteria

- [ ] Screen renders at `/(auth)/signup` route
- [ ] All form fields render with proper validation
- [ ] Password requirements show real-time feedback
- [ ] Passwords must match validation works
- [ ] Form submits and creates account with Appwrite
- [ ] Error message displays for existing email
- [ ] Loading state shown during account creation
- [ ] Link to phone signup works
- [ ] Link to login screen works
- [ ] Successful signup redirects to main app
- [ ] Terms and privacy policy text displays

## Testing Checklist

- [ ] Valid form data creates account successfully
- [ ] Invalid name shows validation error
- [ ] Invalid email shows validation error
- [ ] Weak password shows requirement failures
- [ ] Mismatched passwords show error
- [ ] Existing email shows API error
- [ ] Network error shows appropriate message
- [ ] Password toggle shows/hides password
- [ ] Links navigate to correct screens
- [ ] Screen accessible via screen reader

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `app/(auth)/signup.tsx` | Create | Signup screen component |

## Files to Reference

- `lib/validations/auth.ts` - Signup schema (FOUND-005)
- `lib/auth/AuthContext.tsx` - Signup function (FOUND-003)
- `lib/appwrite/errors.ts` - Error handling (FOUND-003)
- `components/ui/Button.tsx` - Button component (FOUND-004)
- `components/forms/FormInput.tsx` - Form input (FOUND-005)

## Notes for AI Agent

- The PasswordRequirements component should be defined in the same file or extracted to components
- Password requirements must match the Zod schema in auth.ts
- Consider extracting PasswordRequirements to a separate component file for reuse
- Ensure form scrolls properly on small screens
- Test with long names to ensure input handles overflow
