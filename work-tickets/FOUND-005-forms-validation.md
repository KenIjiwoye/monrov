# FOUND-005: Form & Validation Setup

## Ticket Information
- **ID**: FOUND-005
- **Priority**: High
- **Dependencies**: FOUND-001, FOUND-004
- **Phase**: MVP (Phase 1)
- **Parallel Work**: Can run in parallel with FOUND-003, FOUND-006

## Description
Set up React Hook Form with Zod validation schemas for the 231Booking mobile app. Create reusable form components and validation schemas that will be used across authentication, booking, and profile forms.

## Context
Forms are critical for user interactions throughout the app - from login/signup to booking creation. Using React Hook Form with Zod provides type-safe validation and excellent developer experience. This ticket creates the foundation that all feature forms will build upon.

## Implementation Requirements

### 1. Install Dependencies

```bash
npm install react-hook-form @hookform/resolvers zod
```

### 2. Common Validation Schemas

**File**: `lib/validations/common.ts`

```typescript
import { z } from 'zod';

// Liberian phone number validation (format: +231 XX XXX XXXX)
export const liberianPhoneSchema = z
  .string()
  .regex(/^\+231[0-9]{9}$/, 'Please enter a valid Liberian phone number (+231XXXXXXXXX)');

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must be less than 50 characters');

export const priceSchema = z
  .number()
  .min(0, 'Price cannot be negative')
  .max(1000000, 'Price exceeds maximum');

export const dateSchema = z
  .string()
  .or(z.date())
  .transform((val) => (typeof val === 'string' ? new Date(val) : val));

export const futureDateSchema = dateSchema.refine(
  (date) => date > new Date(),
  'Date must be in the future'
);
```

### 3. Authentication Schemas

**File**: `lib/validations/auth.ts`

```typescript
import { z } from 'zod';
import { emailSchema, passwordSchema, nameSchema, liberianPhoneSchema } from './common';

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const phoneSignupSchema = z.object({
  name: nameSchema,
  phone: liberianPhoneSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Type exports
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type PhoneSignupFormData = z.infer<typeof phoneSignupSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
```

### 4. Profile Schemas

**File**: `lib/validations/profile.ts`

```typescript
import { z } from 'zod';
import { emailSchema, nameSchema, liberianPhoneSchema } from './common';

export const editProfileSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: liberianPhoneSchema.optional().or(z.literal('')),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
});

export const businessProfileSchema = z.object({
  businessName: z.string().min(2, 'Business name is required').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000),
  category: z.string().min(1, 'Please select a category'),
  phone: liberianPhoneSchema,
  email: emailSchema,
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});

export type EditProfileFormData = z.infer<typeof editProfileSchema>;
export type BusinessProfileFormData = z.infer<typeof businessProfileSchema>;
```

### 5. Booking Schemas

**File**: `lib/validations/booking.ts`

```typescript
import { z } from 'zod';
import { futureDateSchema } from './common';

export const bookingSchema = z.object({
  date: futureDateSchema,
  time: z.string().min(1, 'Please select a time'),
  guests: z.number().min(1, 'At least 1 guest required').max(100, 'Maximum 100 guests'),
  specialRequests: z.string().max(500, 'Special requests must be less than 500 characters').optional(),
});

export const contactProviderSchema = z.object({
  subject: z.string().min(3, 'Subject is required').max(100),
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000),
});

export type BookingFormData = z.infer<typeof bookingSchema>;
export type ContactProviderFormData = z.infer<typeof contactProviderSchema>;
```

### 6. Listing Schemas

**File**: `lib/validations/listing.ts`

```typescript
import { z } from 'zod';
import { priceSchema } from './common';

export const listingSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000),
  category: z.string().min(1, 'Please select a category'),
  price: priceSchema,
  priceUnit: z.enum(['per_night', 'per_person', 'per_event', 'flat_rate']),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  amenities: z.array(z.string()).optional(),
  maxGuests: z.number().min(1).max(1000).optional(),
});

export const listingAvailabilitySchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  isAvailable: z.boolean(),
}).refine((data) => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export type ListingFormData = z.infer<typeof listingSchema>;
export type ListingAvailabilityFormData = z.infer<typeof listingAvailabilitySchema>;
```

### 7. Review Schema

**File**: `lib/validations/review.ts`

```typescript
import { z } from 'zod';

export const reviewSchema = z.object({
  rating: z.number().min(1, 'Please select a rating').max(5),
  title: z.string().min(3, 'Title must be at least 3 characters').max(100).optional(),
  content: z.string().min(10, 'Review must be at least 10 characters').max(1000),
});

export const reviewResponseSchema = z.object({
  response: z.string().min(10, 'Response must be at least 10 characters').max(500),
});

export type ReviewFormData = z.infer<typeof reviewSchema>;
export type ReviewResponseFormData = z.infer<typeof reviewResponseSchema>;
```

### 8. Form Controller Component

**File**: `components/forms/FormInput.tsx`

```typescript
import { Controller, Control, FieldPath, FieldValues } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { GetProps } from 'tamagui';

type InputProps = GetProps<typeof Input>;

interface FormInputProps<T extends FieldValues> extends Omit<InputProps, 'value' | 'onChangeText'> {
  control: Control<T>;
  name: FieldPath<T>;
}

export function FormInput<T extends FieldValues>({
  control,
  name,
  ...inputProps
}: FormInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <Input
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          error={error?.message}
          {...inputProps}
        />
      )}
    />
  );
}
```

### 9. Form Select Component

**File**: `components/forms/FormSelect.tsx`

```typescript
import { Controller, Control, FieldPath, FieldValues } from 'react-hook-form';
import { YStack, Text, Select, Adapt, Sheet } from 'tamagui';
import { Check, ChevronDown } from '@tamagui/lucide-icons';

interface Option {
  label: string;
  value: string;
}

interface FormSelectProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  placeholder?: string;
  options: Option[];
}

export function FormSelect<T extends FieldValues>({
  control,
  name,
  label,
  placeholder = 'Select an option',
  options,
}: FormSelectProps<T>) {
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
          <Select value={value} onValueChange={onChange}>
            <Select.Trigger
              iconAfter={ChevronDown}
              borderColor={error ? '$error' : '$gray300'}
            >
              <Select.Value placeholder={placeholder} />
            </Select.Trigger>

            <Adapt when="sm" platform="touch">
              <Sheet modal dismissOnSnapToBottom>
                <Sheet.Frame>
                  <Sheet.ScrollView>
                    <Adapt.Contents />
                  </Sheet.ScrollView>
                </Sheet.Frame>
                <Sheet.Overlay />
              </Sheet>
            </Adapt>

            <Select.Content>
              <Select.Viewport>
                {options.map((option, i) => (
                  <Select.Item
                    key={option.value}
                    index={i}
                    value={option.value}
                  >
                    <Select.ItemText>{option.label}</Select.ItemText>
                    <Select.ItemIndicator>
                      <Check size={16} />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select>
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

### 10. Form Number Input

**File**: `components/forms/FormNumberInput.tsx`

```typescript
import { Controller, Control, FieldPath, FieldValues } from 'react-hook-form';
import { Input } from '@/components/ui/Input';

interface FormNumberInputProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  placeholder?: string;
  min?: number;
  max?: number;
}

export function FormNumberInput<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  min,
  max,
}: FormNumberInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <Input
          label={label}
          placeholder={placeholder}
          value={value?.toString() ?? ''}
          onChangeText={(text) => {
            const num = parseFloat(text);
            if (text === '' || text === '-') {
              onChange(undefined);
            } else if (!isNaN(num)) {
              if (min !== undefined && num < min) return;
              if (max !== undefined && num > max) return;
              onChange(num);
            }
          }}
          onBlur={onBlur}
          error={error?.message}
          keyboardType="numeric"
        />
      )}
    />
  );
}
```

### 11. Form Exports

**File**: `components/forms/index.ts`

```typescript
export { FormInput } from './FormInput';
export { FormSelect } from './FormSelect';
export { FormNumberInput } from './FormNumberInput';
```

### 12. Validation Exports

**File**: `lib/validations/index.ts`

```typescript
export * from './common';
export * from './auth';
export * from './profile';
export * from './booking';
export * from './listing';
export * from './review';
```

## Usage Example

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginFormData } from '@/lib/validations/auth';
import { FormInput } from '@/components/forms';
import { Button } from '@/components/ui';

export function LoginForm() {
  const { control, handleSubmit, formState: { isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    // Handle login
  };

  return (
    <YStack gap="$4">
      <FormInput
        control={control}
        name="email"
        label="Email"
        placeholder="Enter your email"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <FormInput
        control={control}
        name="password"
        label="Password"
        placeholder="Enter your password"
        secureTextEntry
      />
      <Button onPress={handleSubmit(onSubmit)} loading={isSubmitting}>
        Log In
      </Button>
    </YStack>
  );
}
```

## Acceptance Criteria

- [ ] All validation schemas created and exported
- [ ] FormInput component integrates with react-hook-form
- [ ] FormSelect component with sheet adapter for mobile
- [ ] FormNumberInput handles numeric input correctly
- [ ] Liberian phone number validation (+231 format)
- [ ] Password validation enforces security requirements
- [ ] Type exports for all form data types
- [ ] Zod resolver integrated with forms

## Testing Checklist

- [ ] Login form validates email format
- [ ] Signup form validates password match
- [ ] Phone number accepts valid Liberian format
- [ ] Number inputs restrict to valid ranges
- [ ] Error messages display correctly under fields
- [ ] Form submission blocked with invalid data
- [ ] Type inference works correctly in TypeScript

## Files to Create

| File | Description |
|------|-------------|
| `lib/validations/common.ts` | Common reusable schemas |
| `lib/validations/auth.ts` | Authentication schemas |
| `lib/validations/profile.ts` | Profile schemas |
| `lib/validations/booking.ts` | Booking schemas |
| `lib/validations/listing.ts` | Listing schemas |
| `lib/validations/review.ts` | Review schemas |
| `lib/validations/index.ts` | Barrel export |
| `components/forms/FormInput.tsx` | Input with controller |
| `components/forms/FormSelect.tsx` | Select with controller |
| `components/forms/FormNumberInput.tsx` | Number input with controller |
| `components/forms/index.ts` | Barrel export |

## Notes for AI Agent

- Zod schemas should be exported along with inferred TypeScript types
- The Liberian phone format is +231 followed by 9 digits
- Use zodResolver from @hookform/resolvers/zod
- Form components must use forwardRef to support focus management
- Error messages should be user-friendly, not technical
- Consider adding `.transform()` for data normalization where needed
