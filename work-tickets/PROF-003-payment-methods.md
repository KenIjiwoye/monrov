# PROF-003: Payment Methods Management

## Ticket Information
- **ID**: PROF-003
- **Priority**: High
- **Dependencies**: FOUND-001, FOUND-003, FOUND-004, FOUND-006
- **Phase**: MVP (Phase 1)
- **Parallel Work**: Can run in parallel with PROF-001, PROF-002, PROF-004

## Description
Create the payment methods management screen for 231Booking that allows users to add, view, and manage their saved payment methods including mobile money accounts (Orange Money, MTN Money) and cards.

## Context
231Booking supports multiple payment methods popular in Liberia: Orange Money, MTN Mobile Money, and card payments (via Stripe). Users should be able to save their preferred payment methods for faster checkout and set a default payment method.

## Implementation Requirements

### 1. Payment Method Types

**File**: `types/payment.ts`

```typescript
export type PaymentMethodType = 'orange_money' | 'mtn_money' | 'card';

export interface PaymentMethod {
  id: string;
  userId: string;
  type: PaymentMethodType;
  // For mobile money
  phone?: string;
  // For card
  last4?: string;
  brand?: string; // visa, mastercard, etc.
  expiryMonth?: number;
  expiryYear?: number;
  // Common
  isDefault: boolean;
  createdAt: string;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
  orange_money: 'Orange Money',
  mtn_money: 'MTN Mobile Money',
  card: 'Card',
};

export const PAYMENT_METHOD_ICONS: Record<PaymentMethodType, string> = {
  orange_money: 'orange-money', // Custom icon or emoji
  mtn_money: 'mtn-money',
  card: 'credit-card',
};
```

### 2. Payment Methods Hook

**File**: `hooks/api/usePaymentMethods.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Query } from 'react-native-appwrite';
import { databases } from '@/lib/appwrite/client';
import { collections } from '@/lib/appwrite/collections';
import { PaymentMethod } from '@/types/payment';
import { useAuth } from '@/lib/auth/AuthContext';

export const paymentMethodKeys = {
  all: ['paymentMethods'] as const,
  list: (userId: string) => [...paymentMethodKeys.all, 'list', userId] as const,
};

export function usePaymentMethods() {
  const { user } = useAuth();

  return useQuery({
    queryKey: paymentMethodKeys.list(user?.$id ?? ''),
    queryFn: async () => {
      const response = await databases.listDocuments(
        collections.PAYMENT_METHODS.databaseId,
        collections.PAYMENT_METHODS.collectionId,
        [
          Query.equal('userId', user!.$id),
          Query.orderDesc('isDefault'),
          Query.orderDesc('$createdAt'),
        ]
      );
      return response.documents as unknown as PaymentMethod[];
    },
    enabled: !!user,
  });
}

export function useAddPaymentMethod() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Omit<PaymentMethod, 'id' | 'userId' | 'createdAt'>) => {
      // If this is set as default, unset other defaults first
      if (data.isDefault) {
        const existing = await databases.listDocuments(
          collections.PAYMENT_METHODS.databaseId,
          collections.PAYMENT_METHODS.collectionId,
          [
            Query.equal('userId', user!.$id),
            Query.equal('isDefault', true),
          ]
        );

        for (const doc of existing.documents) {
          await databases.updateDocument(
            collections.PAYMENT_METHODS.databaseId,
            collections.PAYMENT_METHODS.collectionId,
            doc.$id,
            { isDefault: false }
          );
        }
      }

      const paymentMethod = await databases.createDocument(
        collections.PAYMENT_METHODS.databaseId,
        collections.PAYMENT_METHODS.collectionId,
        'unique()',
        {
          ...data,
          userId: user!.$id,
          createdAt: new Date().toISOString(),
        }
      );
      return paymentMethod as unknown as PaymentMethod;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentMethodKeys.list(user!.$id) });
    },
  });
}

export function useDeletePaymentMethod() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (paymentMethodId: string) => {
      await databases.deleteDocument(
        collections.PAYMENT_METHODS.databaseId,
        collections.PAYMENT_METHODS.collectionId,
        paymentMethodId
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentMethodKeys.list(user!.$id) });
    },
  });
}

export function useSetDefaultPaymentMethod() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (paymentMethodId: string) => {
      // Unset all defaults
      const existing = await databases.listDocuments(
        collections.PAYMENT_METHODS.databaseId,
        collections.PAYMENT_METHODS.collectionId,
        [
          Query.equal('userId', user!.$id),
          Query.equal('isDefault', true),
        ]
      );

      for (const doc of existing.documents) {
        await databases.updateDocument(
          collections.PAYMENT_METHODS.databaseId,
          collections.PAYMENT_METHODS.collectionId,
          doc.$id,
          { isDefault: false }
        );
      }

      // Set new default
      await databases.updateDocument(
        collections.PAYMENT_METHODS.databaseId,
        collections.PAYMENT_METHODS.collectionId,
        paymentMethodId,
        { isDefault: true }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentMethodKeys.list(user!.$id) });
    },
  });
}
```

### 3. Payment Methods Screen

**File**: `app/settings/payment-methods.tsx`

```typescript
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, Text, XStack, AlertDialog, Sheet } from 'tamagui';
import { Stack, router } from 'expo-router';
import {
  CreditCard,
  Smartphone,
  Plus,
  Trash2,
  Check,
  ArrowLeft,
  MoreVertical,
} from '@tamagui/lucide-icons';

import { Card, Button, Badge, EmptyState, LoadingScreen } from '@/components/ui';
import {
  usePaymentMethods,
  useDeletePaymentMethod,
  useSetDefaultPaymentMethod,
} from '@/hooks/api/usePaymentMethods';
import { PaymentMethod, PaymentMethodType, PAYMENT_METHOD_LABELS } from '@/types/payment';
import { AddPaymentMethodSheet } from '@/components/AddPaymentMethodSheet';

function PaymentMethodIcon({ type }: { type: PaymentMethodType }) {
  switch (type) {
    case 'orange_money':
      return (
        <YStack
          backgroundColor="#FF6600"
          padding="$2"
          borderRadius="$2"
        >
          <Smartphone size={20} color="white" />
        </YStack>
      );
    case 'mtn_money':
      return (
        <YStack
          backgroundColor="#FFCC00"
          padding="$2"
          borderRadius="$2"
        >
          <Smartphone size={20} color="black" />
        </YStack>
      );
    case 'card':
      return (
        <YStack
          backgroundColor="$primary"
          padding="$2"
          borderRadius="$2"
        >
          <CreditCard size={20} color="white" />
        </YStack>
      );
  }
}

function PaymentMethodCard({
  method,
  onDelete,
  onSetDefault,
}: {
  method: PaymentMethod;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const getMethodDisplay = () => {
    if (method.type === 'card') {
      return `•••• •••• •••• ${method.last4}`;
    }
    return method.phone;
  };

  return (
    <Card variant="outlined" padding="$3">
      <XStack alignItems="center" justifyContent="space-between">
        <XStack gap="$3" alignItems="center" flex={1}>
          <PaymentMethodIcon type={method.type} />
          <YStack flex={1}>
            <XStack gap="$2" alignItems="center">
              <Text fontSize="$4" fontWeight="500">
                {PAYMENT_METHOD_LABELS[method.type]}
              </Text>
              {method.isDefault && (
                <Badge label="Default" variant="primary" />
              )}
            </XStack>
            <Text fontSize="$3" color="$gray500">
              {getMethodDisplay()}
            </Text>
          </YStack>
        </XStack>

        <Button
          variant="ghost"
          size="sm"
          onPress={() => setShowMenu(true)}
          icon={<MoreVertical size={20} color="$gray500" />}
        />
      </XStack>

      {/* Action Sheet */}
      <Sheet
        open={showMenu}
        onOpenChange={setShowMenu}
        snapPoints={[200]}
        dismissOnSnapToBottom
      >
        <Sheet.Overlay />
        <Sheet.Frame padding="$4">
          <YStack gap="$3">
            {!method.isDefault && (
              <Button
                variant="ghost"
                onPress={() => {
                  setShowMenu(false);
                  onSetDefault();
                }}
                icon={<Check size={20} />}
              >
                Set as Default
              </Button>
            )}
            <Button
              variant="ghost"
              onPress={() => {
                setShowMenu(false);
                onDelete();
              }}
            >
              <XStack gap="$2" alignItems="center">
                <Trash2 size={20} color="$error" />
                <Text color="$error">Remove</Text>
              </XStack>
            </Button>
          </YStack>
        </Sheet.Frame>
      </Sheet>
    </Card>
  );
}

export default function PaymentMethodsScreen() {
  const { data: methods, isLoading, refetch } = usePaymentMethods();
  const deleteMethod = useDeletePaymentMethod();
  const setDefault = useSetDefaultPaymentMethod();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState<string | null>(null);

  const handleDelete = async () => {
    if (methodToDelete) {
      await deleteMethod.mutateAsync(methodToDelete);
      setMethodToDelete(null);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading payment methods..." />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Payment Methods',
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
        <ScrollView>
          <YStack padding="$4" gap="$4">
            {/* Add Button */}
            <Button
              variant="outline"
              onPress={() => setShowAddSheet(true)}
              icon={<Plus size={20} />}
            >
              Add Payment Method
            </Button>

            {/* Payment Methods List */}
            {methods && methods.length > 0 ? (
              <YStack gap="$3">
                {methods.map((method) => (
                  <PaymentMethodCard
                    key={method.id}
                    method={method}
                    onDelete={() => setMethodToDelete(method.id)}
                    onSetDefault={() => setDefault.mutate(method.id)}
                  />
                ))}
              </YStack>
            ) : (
              <EmptyState
                icon={<CreditCard size={48} color="$gray400" />}
                title="No Payment Methods"
                description="Add a payment method to make booking faster"
                actionLabel="Add Payment Method"
                onAction={() => setShowAddSheet(true)}
              />
            )}
          </YStack>
        </ScrollView>

        {/* Add Payment Method Sheet */}
        <AddPaymentMethodSheet
          open={showAddSheet}
          onOpenChange={setShowAddSheet}
          onSuccess={() => {
            setShowAddSheet(false);
            refetch();
          }}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!methodToDelete} onOpenChange={() => setMethodToDelete(null)}>
          <AlertDialog.Portal>
            <AlertDialog.Overlay />
            <AlertDialog.Content padding="$5" maxWidth={340}>
              <YStack gap="$4">
                <AlertDialog.Title>Remove Payment Method?</AlertDialog.Title>
                <AlertDialog.Description>
                  This payment method will be removed from your account.
                </AlertDialog.Description>
                <XStack gap="$3" justifyContent="flex-end">
                  <AlertDialog.Cancel asChild>
                    <Button variant="outline">Cancel</Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action asChild>
                    <Button
                      variant="danger"
                      onPress={handleDelete}
                      loading={deleteMethod.isPending}
                    >
                      Remove
                    </Button>
                  </AlertDialog.Action>
                </XStack>
              </YStack>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog>
      </SafeAreaView>
    </>
  );
}
```

### 4. Add Payment Method Sheet

**File**: `components/AddPaymentMethodSheet.tsx`

```typescript
import { useState } from 'react';
import { Sheet, YStack, Text, XStack } from 'tamagui';
import { Smartphone, CreditCard } from '@tamagui/lucide-icons';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button, Card } from '@/components/ui';
import { FormInput, PhoneInput } from '@/components/forms';
import { useAddPaymentMethod } from '@/hooks/api/usePaymentMethods';
import { PaymentMethodType } from '@/types/payment';
import { liberianPhoneSchema } from '@/lib/validations/common';

const mobileMoneySchema = z.object({
  phone: liberianPhoneSchema,
  isDefault: z.boolean().default(false),
});

type MobileMoneyFormData = z.infer<typeof mobileMoneySchema>;

interface AddPaymentMethodSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddPaymentMethodSheet({
  open,
  onOpenChange,
  onSuccess,
}: AddPaymentMethodSheetProps) {
  const [selectedType, setSelectedType] = useState<PaymentMethodType | null>(null);
  const addPaymentMethod = useAddPaymentMethod();

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<MobileMoneyFormData>({
    resolver: zodResolver(mobileMoneySchema),
    defaultValues: {
      phone: '',
      isDefault: false,
    },
  });

  const handleClose = () => {
    setSelectedType(null);
    reset();
    onOpenChange(false);
  };

  const onSubmitMobileMoney = async (data: MobileMoneyFormData) => {
    if (!selectedType) return;

    await addPaymentMethod.mutateAsync({
      type: selectedType,
      phone: data.phone,
      isDefault: data.isDefault,
    });

    handleClose();
    onSuccess();
  };

  const paymentOptions = [
    {
      type: 'orange_money' as PaymentMethodType,
      label: 'Orange Money',
      color: '#FF6600',
      icon: Smartphone,
    },
    {
      type: 'mtn_money' as PaymentMethodType,
      label: 'MTN Mobile Money',
      color: '#FFCC00',
      icon: Smartphone,
      iconColor: 'black',
    },
    {
      type: 'card' as PaymentMethodType,
      label: 'Credit/Debit Card',
      color: '$primary',
      icon: CreditCard,
      disabled: true, // Card integration handled separately
    },
  ];

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={selectedType ? [450] : [350]}
      dismissOnSnapToBottom
    >
      <Sheet.Overlay />
      <Sheet.Frame padding="$4">
        <Sheet.Handle />

        <YStack gap="$4" marginTop="$4">
          <Text fontSize="$6" fontWeight="700">
            {selectedType ? 'Add Mobile Money' : 'Add Payment Method'}
          </Text>

          {!selectedType ? (
            // Payment type selection
            <YStack gap="$3">
              {paymentOptions.map((option) => (
                <Card
                  key={option.type}
                  variant="outlined"
                  pressable={!option.disabled}
                  onPress={() => !option.disabled && setSelectedType(option.type)}
                  opacity={option.disabled ? 0.5 : 1}
                >
                  <XStack alignItems="center" gap="$3">
                    <YStack
                      backgroundColor={option.color}
                      padding="$2"
                      borderRadius="$2"
                    >
                      <option.icon
                        size={20}
                        color={option.iconColor || 'white'}
                      />
                    </YStack>
                    <YStack flex={1}>
                      <Text fontSize="$4" fontWeight="500">
                        {option.label}
                      </Text>
                      {option.disabled && (
                        <Text fontSize="$2" color="$gray500">
                          Coming soon
                        </Text>
                      )}
                    </YStack>
                  </XStack>
                </Card>
              ))}
            </YStack>
          ) : (
            // Mobile money form
            <YStack gap="$4">
              <Text fontSize="$3" color="$gray500">
                Enter your{' '}
                {selectedType === 'orange_money' ? 'Orange Money' : 'MTN Money'}{' '}
                phone number
              </Text>

              <PhoneInput
                control={control}
                name="phone"
                label="Phone Number"
              />

              <XStack gap="$3">
                <Button
                  variant="outline"
                  flex={1}
                  onPress={() => setSelectedType(null)}
                >
                  Back
                </Button>
                <Button
                  flex={1}
                  onPress={handleSubmit(onSubmitMobileMoney)}
                  loading={isSubmitting}
                >
                  Add
                </Button>
              </XStack>
            </YStack>
          )}
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}
```

## Acceptance Criteria

- [ ] Screen renders at `/settings/payment-methods`
- [ ] Existing payment methods displayed in list
- [ ] Default payment method indicated with badge
- [ ] Can add Orange Money account
- [ ] Can add MTN Mobile Money account
- [ ] Card option shows "Coming soon"
- [ ] Can set a payment method as default
- [ ] Can delete a payment method
- [ ] Delete shows confirmation dialog
- [ ] Empty state shown when no methods
- [ ] Add sheet shows payment type options

## Testing Checklist

- [ ] Payment methods load correctly
- [ ] Add Orange Money works
- [ ] Add MTN Money works
- [ ] Phone validation works for mobile money
- [ ] Set default updates correctly
- [ ] Delete removes payment method
- [ ] Default badge shows on correct item
- [ ] Empty state renders when no methods
- [ ] Sheet opens/closes correctly

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `types/payment.ts` | Create | Payment method types |
| `hooks/api/usePaymentMethods.ts` | Create | Payment methods hooks |
| `app/settings/payment-methods.tsx` | Create | Payment methods screen |
| `components/AddPaymentMethodSheet.tsx` | Create | Add payment method sheet |

## Files to Reference

- `components/forms/PhoneInput.tsx` - Phone input (AUTH-003)
- `lib/validations/common.ts` - Phone validation (FOUND-005)

## Notes for AI Agent

- Card payment integration (Stripe) is a separate ticket (PAY-001)
- Mobile money methods just store the phone number for now
- Actual payment processing happens at checkout
- The default payment method is used for pre-selection at checkout
- Consider adding phone number verification in the future
- Orange Money color: #FF6600, MTN color: #FFCC00
