# BPROF-001: Business Profile Creation

## Ticket Information
- **ID**: BPROF-001
- **Priority**: High
- **Dependencies**: FOUND-001, FOUND-003, FOUND-004, FOUND-005, FOUND-006
- **Phase**: Phase 2
- **Parallel Work**: Can run in parallel with REV-001, NOTIF-001

## Description
Create the business profile creation flow that allows users to register as a business owner and list their services on 231Booking. This includes the multi-step registration form and business verification request.

## Context
Business users are essential for the platform's supply side. This flow converts regular users into business users by collecting business information, contact details, and initiating the verification process.

## Implementation Requirements

### 1. Business Profile Schema

**File**: `lib/validations/business.ts`

```typescript
import { z } from 'zod';
import { emailSchema, liberianPhoneSchema } from './common';

export const businessProfileSchema = z.object({
  businessName: z.string()
    .min(2, 'Business name must be at least 2 characters')
    .max(100, 'Business name must be less than 100 characters'),
  description: z.string()
    .min(20, 'Description must be at least 20 characters')
    .max(1000, 'Description must be less than 1000 characters'),
  category: z.string().min(1, 'Please select a category'),
  phone: liberianPhoneSchema,
  email: emailSchema,
  address: z.string().min(5, 'Please enter your business address'),
  city: z.string().min(2, 'Please enter your city'),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});

export type BusinessProfileFormData = z.infer<typeof businessProfileSchema>;
```

### 2. Create Business Screen

**File**: `app/business/create.tsx`

```typescript
import { useState } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, XStack, Text, TextArea } from 'tamagui';
import { Stack, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  CheckCircle,
} from '@tamagui/lucide-icons';

import { Button, Card } from '@/components/ui';
import { FormInput, FormSelect, PhoneInput } from '@/components/forms';
import { businessProfileSchema, BusinessProfileFormData } from '@/lib/validations/business';
import { useCreateBusinessProfile } from '@/hooks/api/useBusinessProfile';
import { useCategories } from '@/hooks/api/useCategories';

export default function CreateBusinessScreen() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const { data: categories } = useCategories();
  const createBusiness = useCreateBusinessProfile();

  const {
    control,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<BusinessProfileFormData>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      businessName: '',
      description: '',
      category: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      website: '',
    },
  });

  const categoryOptions = categories?.map((c) => ({
    label: c.name,
    value: c.slug,
  })) || [];

  const cityOptions = [
    { label: 'Monrovia', value: 'Monrovia' },
    { label: 'Buchanan', value: 'Buchanan' },
    { label: 'Gbarnga', value: 'Gbarnga' },
    { label: 'Kakata', value: 'Kakata' },
    { label: 'Voinjama', value: 'Voinjama' },
    { label: 'Other', value: 'Other' },
  ];

  const handleNext = async () => {
    let fieldsToValidate: (keyof BusinessProfileFormData)[] = [];

    if (step === 1) {
      fieldsToValidate = ['businessName', 'category', 'description'];
    } else if (step === 2) {
      fieldsToValidate = ['phone', 'email', 'address', 'city'];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setStep((s) => Math.min(s + 1, 3) as 1 | 2 | 3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => Math.max(s - 1, 1) as 1 | 2 | 3);
    } else {
      router.back();
    }
  };

  const onSubmit = async (data: BusinessProfileFormData) => {
    try {
      await createBusiness.mutateAsync(data);
      router.replace('/business/success');
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Create Business',
          headerLeft: () => (
            <Button
              variant="ghost"
              size="sm"
              onPress={handleBack}
              icon={<ArrowLeft size={20} />}
            />
          ),
        }}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* Progress Indicator */}
          <XStack padding="$4" gap="$2">
            {[1, 2, 3].map((s) => (
              <YStack
                key={s}
                flex={1}
                height={4}
                backgroundColor={s <= step ? '$primary' : '$gray200'}
                borderRadius="$2"
              />
            ))}
          </XStack>

          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <YStack padding="$4" gap="$5" flex={1}>
              {/* Step 1: Business Info */}
              {step === 1 && (
                <YStack gap="$4">
                  <YStack gap="$1">
                    <Text fontSize="$6" fontWeight="700">
                      Tell us about your business
                    </Text>
                    <Text color="$gray500">
                      This information will be shown to potential customers
                    </Text>
                  </YStack>

                  <FormInput
                    control={control}
                    name="businessName"
                    label="Business Name"
                    placeholder="Enter your business name"
                    leftIcon={<Building2 size={18} color="$gray400" />}
                  />

                  <FormSelect
                    control={control}
                    name="category"
                    label="Category"
                    placeholder="Select a category"
                    options={categoryOptions}
                  />

                  <YStack gap="$1">
                    <Text fontSize="$3" fontWeight="500" color="$gray700">
                      Description
                    </Text>
                    <Controller
                      control={control}
                      name="description"
                      render={({ field: { value, onChange, onBlur } }) => (
                        <TextArea
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="Describe your business and services..."
                          numberOfLines={5}
                          minHeight={120}
                        />
                      )}
                    />
                    {errors.description && (
                      <Text color="$error" fontSize="$2">
                        {errors.description.message}
                      </Text>
                    )}
                  </YStack>
                </YStack>
              )}

              {/* Step 2: Contact Info */}
              {step === 2 && (
                <YStack gap="$4">
                  <YStack gap="$1">
                    <Text fontSize="$6" fontWeight="700">
                      Contact Information
                    </Text>
                    <Text color="$gray500">
                      How customers can reach your business
                    </Text>
                  </YStack>

                  <PhoneInput
                    control={control}
                    name="phone"
                    label="Business Phone"
                  />

                  <FormInput
                    control={control}
                    name="email"
                    label="Business Email"
                    placeholder="business@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    leftIcon={<Mail size={18} color="$gray400" />}
                  />

                  <FormInput
                    control={control}
                    name="address"
                    label="Business Address"
                    placeholder="Street address"
                    leftIcon={<MapPin size={18} color="$gray400" />}
                  />

                  <FormSelect
                    control={control}
                    name="city"
                    label="City"
                    placeholder="Select your city"
                    options={cityOptions}
                  />

                  <FormInput
                    control={control}
                    name="website"
                    label="Website (Optional)"
                    placeholder="https://yourbusiness.com"
                    keyboardType="url"
                    autoCapitalize="none"
                    leftIcon={<Globe size={18} color="$gray400" />}
                  />
                </YStack>
              )}

              {/* Step 3: Review */}
              {step === 3 && (
                <YStack gap="$4">
                  <YStack gap="$1">
                    <Text fontSize="$6" fontWeight="700">
                      Review & Submit
                    </Text>
                    <Text color="$gray500">
                      Please review your information before submitting
                    </Text>
                  </YStack>

                  <Card variant="outlined" padding="$4">
                    <YStack gap="$3">
                      <Text fontSize="$2" color="$gray500" fontWeight="600">
                        BUSINESS INFORMATION
                      </Text>
                      {/* Display form data summary */}
                    </YStack>
                  </Card>

                  <Card variant="flat" padding="$4">
                    <XStack gap="$3">
                      <CheckCircle size={24} color="$primary" />
                      <YStack flex={1}>
                        <Text fontWeight="600">Verification Required</Text>
                        <Text fontSize="$3" color="$gray500">
                          Your business will be reviewed by our team within 24-48 hours.
                          You'll receive a notification once verified.
                        </Text>
                      </YStack>
                    </XStack>
                  </Card>
                </YStack>
              )}

              <YStack flex={1} />
            </YStack>
          </ScrollView>

          {/* Bottom Actions */}
          <YStack padding="$4" borderTopWidth={1} borderTopColor="$gray200">
            {step < 3 ? (
              <Button size="lg" fullWidth onPress={handleNext}>
                Continue
              </Button>
            ) : (
              <Button
                size="lg"
                fullWidth
                loading={createBusiness.isPending}
                onPress={handleSubmit(onSubmit)}
              >
                Submit for Review
              </Button>
            )}
          </YStack>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
```

### 3. Business Profile Hook

**File**: `hooks/api/useBusinessProfile.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { databases } from '@/lib/appwrite/client';
import { collections } from '@/lib/appwrite/collections';
import { useAuth } from '@/lib/auth/AuthContext';
import { BusinessProfileFormData } from '@/lib/validations/business';

export function useCreateBusinessProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: BusinessProfileFormData) => {
      const profile = await databases.createDocument(
        collections.BUSINESS_PROFILES.databaseId,
        collections.BUSINESS_PROFILES.collectionId,
        'unique()',
        {
          ...data,
          userId: user!.$id,
          isVerified: false,
          rating: 0,
          reviewCount: 0,
          createdAt: new Date().toISOString(),
        }
      );
      return profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'business'] });
    },
  });
}
```

## Acceptance Criteria

- [ ] Multi-step form (3 steps) with progress indicator
- [ ] Step 1: Business name, category, description
- [ ] Step 2: Phone, email, address, city, website
- [ ] Step 3: Review and submit
- [ ] Form validation at each step
- [ ] Back navigation between steps
- [ ] Submit creates business profile
- [ ] Success screen after submission
- [ ] Verification notice displayed

## Testing Checklist

- [ ] Progress indicator updates correctly
- [ ] Form validation works at each step
- [ ] Cannot proceed with invalid data
- [ ] Back navigation preserves data
- [ ] Submit creates profile in database
- [ ] Success navigation works
- [ ] Error handling for failed submission

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `lib/validations/business.ts` | Create | Business validation schema |
| `app/business/create.tsx` | Create | Create business screen |
| `app/business/success.tsx` | Create | Success confirmation screen |
| `hooks/api/useBusinessProfile.ts` | Create | Business profile hooks |
