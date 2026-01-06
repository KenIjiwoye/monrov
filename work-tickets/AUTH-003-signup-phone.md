# AUTH-003: Sign Up Screen (Phone Number)

## Ticket Information
- **ID**: AUTH-003
- **Priority**: High
- **Dependencies**: FOUND-001, FOUND-002, FOUND-003, FOUND-004, FOUND-005
- **Phase**: MVP (Phase 1)
- **Parallel Work**: Can run in parallel with AUTH-001, AUTH-002

## Description
Create the phone number sign up screen for 231Booking that allows new users to create an account using their Liberian mobile number (+231). This provides an alternative to email signup for users who prefer phone-based authentication.

## Context
In Liberia, many users prefer phone-based authentication over email. This screen allows users to sign up with their Liberian mobile number (+231 format). The implementation should validate the phone format and create an account through Appwrite.

## Implementation Requirements

### 1. Screen File

**File**: `app/(auth)/signup-phone.tsx`

### 2. Phone Input Component

**File**: `components/forms/PhoneInput.tsx`

```typescript
import { forwardRef } from 'react';
import { Controller, Control, FieldPath, FieldValues } from 'react-hook-form';
import { XStack, YStack, Text, Input as TamaguiInput } from 'tamagui';

interface PhoneInputProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
}

export function PhoneInput<T extends FieldValues>({
  control,
  name,
  label,
}: PhoneInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => {
        // Extract the number part (remove +231 prefix if present)
        const phoneNumber = value?.startsWith('+231')
          ? value.slice(4)
          : value || '';

        const handleChange = (text: string) => {
          // Only allow digits
          const digits = text.replace(/\D/g, '');
          // Limit to 9 digits (Liberian number format)
          const limited = digits.slice(0, 9);
          // Always store with +231 prefix
          onChange(limited ? `+231${limited}` : '');
        };

        return (
          <YStack gap="$1">
            {label && (
              <Text fontSize="$3" fontWeight="500" color="$gray700">
                {label}
              </Text>
            )}
            <XStack
              borderWidth={1}
              borderColor={error ? '$error' : '$gray300'}
              borderRadius="$3"
              backgroundColor="$white"
              alignItems="center"
              height={48}
              focusStyle={{
                borderColor: error ? '$error' : '$primary',
                borderWidth: 2,
              }}
            >
              {/* Country Code Prefix */}
              <XStack
                paddingHorizontal="$3"
                height="100%"
                alignItems="center"
                backgroundColor="$gray100"
                borderRightWidth={1}
                borderRightColor="$gray300"
                borderTopLeftRadius="$3"
                borderBottomLeftRadius="$3"
              >
                <Text fontSize="$4" color="$gray700" fontWeight="500">
                  🇱🇷 +231
                </Text>
              </XStack>

              {/* Phone Number Input */}
              <TamaguiInput
                flex={1}
                value={phoneNumber}
                onChangeText={handleChange}
                onBlur={onBlur}
                placeholder="XX XXX XXXX"
                keyboardType="phone-pad"
                maxLength={11} // 9 digits + 2 spaces for formatting
                borderWidth={0}
                backgroundColor="transparent"
                fontSize="$4"
                paddingHorizontal="$3"
              />
            </XStack>
            {error && (
              <Text fontSize="$2" color="$error">
                {error.message}
              </Text>
            )}
          </YStack>
        );
      }}
    />
  );
}
```

### 3. Screen Structure

**File**: `app/(auth)/signup-phone.tsx`

```typescript
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, Text, XStack } from 'tamagui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';

import { FormInput, PhoneInput } from '@/components/forms';
import { Button } from '@/components/ui';
import { phoneSignupSchema, PhoneSignupFormData } from '@/lib/validations/auth';
import { useAuth } from '@/lib/auth/AuthContext';
import { handleAppwriteError } from '@/lib/appwrite/errors';
import { User, Lock, Eye, EyeOff, Check, X } from '@tamagui/lucide-icons';

export default function SignupPhoneScreen() {
  const { signupWithPhone } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<PhoneSignupFormData>({
    resolver: zodResolver(phoneSignupSchema),
    defaultValues: {
      name: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  const onSubmit = async (data: PhoneSignupFormData) => {
    try {
      setError(null);
      await signupWithPhone(data.phone, data.password, data.name);
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
                Sign up with your Liberian phone number
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

// Password Requirements Component (same as AUTH-002)
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

### 4. Visual Design Guidelines

```
┌─────────────────────────────────────────────────┐
│                                                 │
│              Create Account                     │
│   Sign up with your Liberian phone number      │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  👤  Enter your full name               │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Phone Number                                   │
│  ┌──────────────┬──────────────────────────┐   │
│  │ 🇱🇷 +231    │  XX XXX XXXX             │   │
│  └──────────────┴──────────────────────────┘   │
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
│  By signing up, you agree to our Terms...      │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │          CREATE ACCOUNT                 │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│       Sign up with email instead               │
│                                                 │
│        Already have an account? Log In         │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 5. Phone Number Format

- **Country code**: +231 (Liberia)
- **Number format**: 9 digits after country code
- **Display format**: +231 XX XXX XXXX
- **Storage format**: +231XXXXXXXXX (no spaces)

## Acceptance Criteria

- [ ] Screen renders at `/(auth)/signup-phone` route
- [ ] Phone input shows Liberian flag and +231 prefix
- [ ] Phone input accepts only 9 digits
- [ ] Phone validation follows Liberian format
- [ ] Password requirements display works
- [ ] Form submits and creates account
- [ ] Error handling for duplicate phone numbers
- [ ] Link to email signup works
- [ ] Link to login works
- [ ] Successful signup redirects to main app

## Testing Checklist

- [ ] Valid phone number creates account
- [ ] Invalid phone format shows error
- [ ] Phone input filters non-numeric characters
- [ ] +231 prefix cannot be removed
- [ ] Existing phone number shows API error
- [ ] Password validation matches email signup
- [ ] Navigation links work correctly
- [ ] Keyboard type is phone-pad

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `app/(auth)/signup-phone.tsx` | Create | Phone signup screen |
| `components/forms/PhoneInput.tsx` | Create | Phone input component |
| `components/forms/index.ts` | Modify | Export PhoneInput |

## Files to Reference

- `lib/validations/auth.ts` - Phone signup schema (FOUND-005)
- `lib/auth/AuthContext.tsx` - signupWithPhone function (FOUND-003)
- `app/(auth)/signup.tsx` - Reference for similar structure (AUTH-002)

## Notes for AI Agent

- The PhoneInput component should be reusable for profile editing
- Liberian phone numbers are 9 digits after the +231 prefix
- The country code prefix should be visually distinct and non-editable
- Consider adding phone number formatting (spaces) for better readability
- Test keyboard behavior - phone-pad should appear
- The PasswordRequirements component can be extracted to a shared component
