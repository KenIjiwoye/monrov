# PAY-001: Payment Integration (Mobile Money)

## Ticket Information
- **ID**: PAY-001
- **Priority**: Critical
- **Dependencies**: FOUND-001, FOUND-003, BOOK-001
- **Phase**: MVP (Phase 1)
- **Parallel Work**: Can run in parallel with BOOK-002, BOOK-003

## Description
Integrate mobile money payment options (Orange Money and MTN Mobile Money) for booking payments. This is the primary payment method for Liberian users.

## Context
Mobile money is the dominant payment method in Liberia. This ticket implements the payment flow for Orange Money and MTN Mobile Money, allowing users to complete bookings using their mobile money accounts.

## Implementation Requirements

### 1. Payment Service Types

**File**: `types/payment.ts` (extend)

```typescript
export interface PaymentIntent {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  method: 'orange_money' | 'mtn_money' | 'card';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  phone?: string;
  transactionId?: string;
  createdAt: string;
}

export interface PaymentRequest {
  bookingId: string;
  amount: number;
  method: 'orange_money' | 'mtn_money';
  phone: string;
}
```

### 2. Payment Service

**File**: `lib/services/paymentService.ts`

```typescript
import { functions } from '@/lib/appwrite/client';
import { PaymentIntent, PaymentRequest } from '@/types/payment';

// Note: These functions call Appwrite Cloud Functions that handle
// the actual mobile money API integration (Orange Money, MTN)

export const paymentService = {
  async initiatePayment(request: PaymentRequest): Promise<PaymentIntent> {
    const result = await functions.createExecution(
      'initiate-payment', // Appwrite function ID
      JSON.stringify(request)
    );

    if (result.responseStatusCode !== 200) {
      throw new Error(JSON.parse(result.responseBody).message);
    }

    return JSON.parse(result.responseBody) as PaymentIntent;
  },

  async checkPaymentStatus(paymentId: string): Promise<PaymentIntent> {
    const result = await functions.createExecution(
      'check-payment-status',
      JSON.stringify({ paymentId })
    );

    if (result.responseStatusCode !== 200) {
      throw new Error(JSON.parse(result.responseBody).message);
    }

    return JSON.parse(result.responseBody) as PaymentIntent;
  },

  async processRefund(paymentId: string, reason: string): Promise<void> {
    const result = await functions.createExecution(
      'process-refund',
      JSON.stringify({ paymentId, reason })
    );

    if (result.responseStatusCode !== 200) {
      throw new Error(JSON.parse(result.responseBody).message);
    }
  },
};
```

### 3. Payment Hook

**File**: `hooks/api/usePayment.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '@/lib/services/paymentService';
import { PaymentIntent, PaymentRequest } from '@/types/payment';

export function useInitiatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: PaymentRequest) =>
      paymentService.initiatePayment(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

export function usePaymentStatus(paymentId: string | null) {
  return useQuery({
    queryKey: ['payment', paymentId],
    queryFn: () => paymentService.checkPaymentStatus(paymentId!),
    enabled: !!paymentId,
    refetchInterval: (data) => {
      // Poll while payment is processing
      if (data?.status === 'pending' || data?.status === 'processing') {
        return 3000; // Poll every 3 seconds
      }
      return false;
    },
  });
}

// Hook for managing the full payment flow with polling
export function usePaymentFlow() {
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const initiatePayment = useInitiatePayment();
  const { data: paymentStatus, isLoading: isChecking } = usePaymentStatus(paymentId);

  const startPayment = useCallback(
    async (request: PaymentRequest) => {
      const payment = await initiatePayment.mutateAsync(request);
      setPaymentId(payment.id);
      return payment;
    },
    [initiatePayment]
  );

  const reset = useCallback(() => {
    setPaymentId(null);
  }, []);

  return {
    startPayment,
    paymentStatus,
    isInitiating: initiatePayment.isPending,
    isChecking,
    isProcessing: paymentStatus?.status === 'processing',
    isCompleted: paymentStatus?.status === 'completed',
    isFailed: paymentStatus?.status === 'failed',
    error: initiatePayment.error,
    reset,
  };
}
```

### 4. Payment Screen

**File**: `app/payment/[bookingId].tsx`

```typescript
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Smartphone,
  CheckCircle,
  XCircle,
  Clock,
} from '@tamagui/lucide-icons';

import { Button, Card, LoadingScreen, ErrorState } from '@/components/ui';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { useBooking } from '@/hooks/api/useBookings';
import { usePaymentMethods } from '@/hooks/api/usePaymentMethods';
import { usePaymentFlow } from '@/hooks/api/usePayment';
import { liberianPhoneSchema } from '@/lib/validations/common';

const paymentSchema = z.object({
  method: z.enum(['orange_money', 'mtn_money']),
  phone: liberianPhoneSchema,
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export default function PaymentScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { data: booking, isLoading: bookingLoading } = useBooking(bookingId);
  const { data: savedMethods } = usePaymentMethods();
  const {
    startPayment,
    paymentStatus,
    isInitiating,
    isProcessing,
    isCompleted,
    isFailed,
  } = usePaymentFlow();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      method: 'orange_money',
      phone: '',
    },
  });

  const selectedMethod = watch('method');

  // Pre-fill with default payment method
  useEffect(() => {
    const defaultMethod = savedMethods?.find((m) => m.isDefault);
    if (defaultMethod && defaultMethod.type !== 'card') {
      setValue('method', defaultMethod.type as 'orange_money' | 'mtn_money');
      if (defaultMethod.phone) {
        setValue('phone', defaultMethod.phone);
      }
    }
  }, [savedMethods, setValue]);

  // Navigate on success
  useEffect(() => {
    if (isCompleted && booking) {
      router.replace(`/booking/confirmation/${booking.$id}`);
    }
  }, [isCompleted, booking]);

  const onSubmit = async (data: PaymentFormData) => {
    if (!booking) return;

    await startPayment({
      bookingId: booking.$id,
      amount: booking.totalPrice,
      method: data.method,
      phone: data.phone,
    });
  };

  if (bookingLoading) {
    return <LoadingScreen message="Loading booking..." />;
  }

  if (!booking) {
    return <ErrorState message="Booking not found" onRetry={() => router.back()} />;
  }

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

  // Payment processing view
  if (isInitiating || isProcessing) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <YStack flex={1} alignItems="center" justifyContent="center" padding="$6" gap="$6">
          <YStack backgroundColor="$primaryLight" padding="$6" borderRadius={1000}>
            <Spinner size="large" color="$primary" />
          </YStack>
          <YStack alignItems="center" gap="$2">
            <Text fontSize="$6" fontWeight="600">
              Processing Payment
            </Text>
            <Text color="$gray500" textAlign="center">
              Please complete the payment on your phone when prompted.
              Do not close this screen.
            </Text>
          </YStack>
          <Card variant="flat" padding="$4" width="100%">
            <YStack gap="$2">
              <XStack justifyContent="space-between">
                <Text color="$gray500">Amount</Text>
                <Text fontWeight="600">{formatPrice(booking.totalPrice)}</Text>
              </XStack>
              <XStack justifyContent="space-between">
                <Text color="$gray500">Method</Text>
                <Text fontWeight="600">
                  {selectedMethod === 'orange_money' ? 'Orange Money' : 'MTN Money'}
                </Text>
              </XStack>
            </YStack>
          </Card>
        </YStack>
      </SafeAreaView>
    );
  }

  // Payment failed view
  if (isFailed) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <YStack flex={1} alignItems="center" justifyContent="center" padding="$6" gap="$6">
          <YStack backgroundColor="$errorLight" padding="$6" borderRadius={1000}>
            <XCircle size={48} color="$error" />
          </YStack>
          <YStack alignItems="center" gap="$2">
            <Text fontSize="$6" fontWeight="600">
              Payment Failed
            </Text>
            <Text color="$gray500" textAlign="center">
              {paymentStatus?.errorMessage || 'Something went wrong. Please try again.'}
            </Text>
          </YStack>
          <Button fullWidth onPress={() => router.back()}>
            Try Again
          </Button>
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Payment',
          headerLeft: () => (
            <Button
              variant="ghost"
              size="sm"
              onPress={() => router.back()}
              icon={<ArrowLeft size={20} />}
            />
          ),
        }}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <YStack flex={1} padding="$4" gap="$5">
          {/* Amount */}
          <Card variant="elevated" padding="$4">
            <YStack alignItems="center" gap="$1">
              <Text color="$gray500">Total to Pay</Text>
              <Text fontSize="$9" fontWeight="700" color="$primary">
                {formatPrice(booking.totalPrice)}
              </Text>
            </YStack>
          </Card>

          {/* Payment Method Selection */}
          <YStack gap="$3">
            <Text fontSize="$5" fontWeight="600">
              Select Payment Method
            </Text>

            <Controller
              control={control}
              name="method"
              render={({ field: { value, onChange } }) => (
                <YStack gap="$2">
                  <Card
                    variant={value === 'orange_money' ? 'elevated' : 'outlined'}
                    padding="$4"
                    pressable
                    onPress={() => onChange('orange_money')}
                    borderColor={value === 'orange_money' ? '$primary' : '$gray200'}
                    borderWidth={2}
                  >
                    <XStack gap="$3" alignItems="center">
                      <YStack backgroundColor="#FF6600" padding="$2" borderRadius="$2">
                        <Smartphone size={24} color="white" />
                      </YStack>
                      <YStack flex={1}>
                        <Text fontSize="$4" fontWeight="600">
                          Orange Money
                        </Text>
                        <Text fontSize="$2" color="$gray500">
                          Pay with your Orange Money account
                        </Text>
                      </YStack>
                    </XStack>
                  </Card>

                  <Card
                    variant={value === 'mtn_money' ? 'elevated' : 'outlined'}
                    padding="$4"
                    pressable
                    onPress={() => onChange('mtn_money')}
                    borderColor={value === 'mtn_money' ? '$primary' : '$gray200'}
                    borderWidth={2}
                  >
                    <XStack gap="$3" alignItems="center">
                      <YStack backgroundColor="#FFCC00" padding="$2" borderRadius="$2">
                        <Smartphone size={24} color="black" />
                      </YStack>
                      <YStack flex={1}>
                        <Text fontSize="$4" fontWeight="600">
                          MTN Mobile Money
                        </Text>
                        <Text fontSize="$2" color="$gray500">
                          Pay with your MTN MoMo account
                        </Text>
                      </YStack>
                    </XStack>
                  </Card>
                </YStack>
              )}
            />
          </YStack>

          {/* Phone Number */}
          <YStack gap="$2">
            <Text fontSize="$5" fontWeight="600">
              {selectedMethod === 'orange_money' ? 'Orange' : 'MTN'} Phone Number
            </Text>
            <PhoneInput
              control={control}
              name="phone"
              label=""
            />
            {errors.phone && (
              <Text color="$error" fontSize="$2">
                {errors.phone.message}
              </Text>
            )}
          </YStack>

          {/* Payment Instructions */}
          <Card variant="flat" padding="$3">
            <XStack gap="$2" alignItems="flex-start">
              <Clock size={18} color="$gray500" />
              <YStack flex={1}>
                <Text fontSize="$3" color="$gray500">
                  After clicking "Pay Now", you'll receive a prompt on your phone
                  to confirm the payment. Complete the transaction within 5 minutes.
                </Text>
              </YStack>
            </XStack>
          </Card>

          {/* Spacer */}
          <YStack flex={1} />

          {/* Pay Button */}
          <Button
            size="lg"
            fullWidth
            onPress={handleSubmit(onSubmit)}
            loading={isInitiating}
          >
            Pay {formatPrice(booking.totalPrice)}
          </Button>
        </YStack>
      </SafeAreaView>
    </>
  );
}
```

## Backend Requirements (Appwrite Functions)

The following Appwrite Cloud Functions need to be created:

1. **initiate-payment**: Initiates mobile money payment via provider API
2. **check-payment-status**: Checks payment status with provider
3. **process-refund**: Processes refund request
4. **payment-webhook**: Handles provider callbacks (HTTP endpoint)

## Acceptance Criteria

- [ ] Payment screen renders at `/payment/[bookingId]`
- [ ] Orange Money and MTN Money options available
- [ ] Phone number input with Liberian format
- [ ] Pre-fills saved payment method if available
- [ ] Processing state shows spinner and instructions
- [ ] Failed state shows error and retry option
- [ ] Success redirects to confirmation
- [ ] Polling for payment status works
- [ ] Payment amount displayed correctly

## Testing Checklist

- [ ] Payment method selection works
- [ ] Phone validation works
- [ ] Payment initiation calls backend
- [ ] Processing UI displays correctly
- [ ] Status polling continues until complete/failed
- [ ] Success navigation works
- [ ] Failure UI displays with retry
- [ ] Back navigation works

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `types/payment.ts` | Modify | Add payment intent types |
| `lib/services/paymentService.ts` | Create | Payment service |
| `hooks/api/usePayment.ts` | Create | Payment hooks |
| `app/payment/[bookingId].tsx` | Create | Payment screen |

## Notes for AI Agent

- Mobile money integration requires backend functions (Appwrite)
- The actual API integration with Orange/MTN is handled server-side
- Polling is used to check payment status as callbacks may be unreliable
- Consider adding timeout handling for stale payments
- Test with both payment providers in staging environment
- Orange Money API docs: (provider specific)
- MTN MoMo API docs: (provider specific)
