# PROF-004: Notification Preferences Screen

## Ticket Information
- **ID**: PROF-004
- **Priority**: Medium
- **Dependencies**: FOUND-001, FOUND-003, FOUND-004, FOUND-006
- **Phase**: MVP (Phase 1)
- **Parallel Work**: Can run in parallel with PROF-001, PROF-002, PROF-003

## Description
Create the notification preferences screen for 231Booking that allows users to control what types of notifications they receive. Users can toggle different notification categories on/off.

## Context
Users should have control over what notifications they receive to avoid notification fatigue. This screen allows users to enable/disable different notification types such as booking confirmations, reminders, promotional messages, and more.

## Implementation Requirements

### 1. Notification Preferences Types

**File**: `types/notifications.ts`

```typescript
export interface NotificationPreferences {
  // Booking notifications
  bookingConfirmations: boolean;
  bookingReminders: boolean;
  bookingStatusUpdates: boolean;

  // Marketing
  promotions: boolean;
  newListings: boolean;

  // Account
  accountAlerts: boolean;
  paymentReceipts: boolean;

  // Communication
  messages: boolean;
  reviewReminders: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  bookingConfirmations: true,
  bookingReminders: true,
  bookingStatusUpdates: true,
  promotions: true,
  newListings: true,
  accountAlerts: true,
  paymentReceipts: true,
  messages: true,
  reviewReminders: true,
};
```

### 2. Notification Preferences Hook

**File**: `hooks/api/useNotificationPreferences.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Query } from 'react-native-appwrite';
import { databases } from '@/lib/appwrite/client';
import { collections } from '@/lib/appwrite/collections';
import {
  NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '@/types/notifications';
import { useAuth } from '@/lib/auth/AuthContext';

export const notificationPrefsKeys = {
  all: ['notificationPrefs'] as const,
  user: (userId: string) => [...notificationPrefsKeys.all, userId] as const,
};

interface NotificationPrefsDocument {
  $id: string;
  userId: string;
  preferences: NotificationPreferences;
}

export function useNotificationPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: notificationPrefsKeys.user(user?.$id ?? ''),
    queryFn: async () => {
      try {
        const response = await databases.listDocuments(
          collections.NOTIFICATION_PREFERENCES.databaseId,
          collections.NOTIFICATION_PREFERENCES.collectionId,
          [Query.equal('userId', user!.$id)]
        );

        if (response.documents.length > 0) {
          const doc = response.documents[0] as unknown as NotificationPrefsDocument;
          return doc.preferences;
        }

        // Return defaults if no preferences saved
        return DEFAULT_NOTIFICATION_PREFERENCES;
      } catch (error) {
        return DEFAULT_NOTIFICATION_PREFERENCES;
      }
    },
    enabled: !!user,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (preferences: NotificationPreferences) => {
      // Check if document exists
      const existing = await databases.listDocuments(
        collections.NOTIFICATION_PREFERENCES.databaseId,
        collections.NOTIFICATION_PREFERENCES.collectionId,
        [Query.equal('userId', user!.$id)]
      );

      if (existing.documents.length > 0) {
        // Update existing
        await databases.updateDocument(
          collections.NOTIFICATION_PREFERENCES.databaseId,
          collections.NOTIFICATION_PREFERENCES.collectionId,
          existing.documents[0].$id,
          { preferences }
        );
      } else {
        // Create new
        await databases.createDocument(
          collections.NOTIFICATION_PREFERENCES.databaseId,
          collections.NOTIFICATION_PREFERENCES.collectionId,
          'unique()',
          {
            userId: user!.$id,
            preferences,
          }
        );
      }

      return preferences;
    },
    onSuccess: (preferences) => {
      queryClient.setQueryData(
        notificationPrefsKeys.user(user!.$id),
        preferences
      );
    },
  });
}
```

### 3. Toggle Switch Component

**File**: `components/ui/Toggle.tsx`

```typescript
import { Switch, styled, GetProps } from 'tamagui';

export const Toggle = styled(Switch, {
  backgroundColor: '$gray300',

  variants: {
    checked: {
      true: {
        backgroundColor: '$primary',
      },
    },
  } as const,
});

export type ToggleProps = GetProps<typeof Toggle>;
```

### 4. Notification Preferences Screen

**File**: `app/settings/notifications.tsx`

```typescript
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, Text, XStack, Separator, Switch } from 'tamagui';
import { Stack, router } from 'expo-router';
import {
  Bell,
  Calendar,
  Tag,
  Shield,
  CreditCard,
  MessageSquare,
  Star,
  Megaphone,
  ArrowLeft,
} from '@tamagui/lucide-icons';

import { Card, Button, LoadingScreen } from '@/components/ui';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/api/useNotificationPreferences';
import { NotificationPreferences } from '@/types/notifications';

interface NotificationToggleProps {
  icon: React.ElementType;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

function NotificationToggle({
  icon: Icon,
  title,
  description,
  value,
  onValueChange,
  disabled,
}: NotificationToggleProps) {
  return (
    <XStack
      alignItems="center"
      justifyContent="space-between"
      paddingVertical="$3"
    >
      <XStack gap="$3" alignItems="center" flex={1}>
        <YStack
          backgroundColor="$gray100"
          padding="$2"
          borderRadius="$3"
        >
          <Icon size={20} color="$gray600" />
        </YStack>
        <YStack flex={1}>
          <Text fontSize="$4" fontWeight="500">
            {title}
          </Text>
          <Text fontSize="$2" color="$gray500">
            {description}
          </Text>
        </YStack>
      </XStack>
      <Switch
        size="$3"
        checked={value}
        onCheckedChange={onValueChange}
        disabled={disabled}
        backgroundColor={value ? '$primary' : '$gray300'}
      >
        <Switch.Thumb animation="quick" />
      </Switch>
    </XStack>
  );
}

export default function NotificationsScreen() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();

  const handleToggle = (
    key: keyof NotificationPreferences,
    value: boolean
  ) => {
    if (!preferences) return;

    updatePreferences.mutate({
      ...preferences,
      [key]: value,
    });
  };

  if (isLoading || !preferences) {
    return <LoadingScreen message="Loading preferences..." />;
  }

  const bookingNotifications = [
    {
      key: 'bookingConfirmations' as const,
      icon: Bell,
      title: 'Booking Confirmations',
      description: 'Get notified when your booking is confirmed',
    },
    {
      key: 'bookingReminders' as const,
      icon: Calendar,
      title: 'Booking Reminders',
      description: 'Receive reminders before your upcoming bookings',
    },
    {
      key: 'bookingStatusUpdates' as const,
      icon: Bell,
      title: 'Status Updates',
      description: 'Get notified when your booking status changes',
    },
  ];

  const marketingNotifications = [
    {
      key: 'promotions' as const,
      icon: Tag,
      title: 'Promotions & Deals',
      description: 'Receive special offers and discounts',
    },
    {
      key: 'newListings' as const,
      icon: Megaphone,
      title: 'New Listings',
      description: 'Be notified about new services in your area',
    },
  ];

  const accountNotifications = [
    {
      key: 'accountAlerts' as const,
      icon: Shield,
      title: 'Account Alerts',
      description: 'Security and account-related notifications',
    },
    {
      key: 'paymentReceipts' as const,
      icon: CreditCard,
      title: 'Payment Receipts',
      description: 'Receive receipts for your payments',
    },
  ];

  const communicationNotifications = [
    {
      key: 'messages' as const,
      icon: MessageSquare,
      title: 'Messages',
      description: 'Get notified when you receive messages',
    },
    {
      key: 'reviewReminders' as const,
      icon: Star,
      title: 'Review Reminders',
      description: 'Reminders to review your completed bookings',
    },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Notifications',
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
          <YStack padding="$4" gap="$6">
            {/* Booking Notifications */}
            <YStack gap="$2">
              <Text
                fontSize="$3"
                color="$gray500"
                fontWeight="600"
                paddingLeft="$1"
              >
                BOOKINGS
              </Text>
              <Card variant="flat" padding="$2">
                {bookingNotifications.map((item, index) => (
                  <YStack key={item.key}>
                    <NotificationToggle
                      icon={item.icon}
                      title={item.title}
                      description={item.description}
                      value={preferences[item.key]}
                      onValueChange={(value) => handleToggle(item.key, value)}
                      disabled={updatePreferences.isPending}
                    />
                    {index < bookingNotifications.length - 1 && (
                      <Separator marginVertical="$1" />
                    )}
                  </YStack>
                ))}
              </Card>
            </YStack>

            {/* Marketing Notifications */}
            <YStack gap="$2">
              <Text
                fontSize="$3"
                color="$gray500"
                fontWeight="600"
                paddingLeft="$1"
              >
                MARKETING
              </Text>
              <Card variant="flat" padding="$2">
                {marketingNotifications.map((item, index) => (
                  <YStack key={item.key}>
                    <NotificationToggle
                      icon={item.icon}
                      title={item.title}
                      description={item.description}
                      value={preferences[item.key]}
                      onValueChange={(value) => handleToggle(item.key, value)}
                      disabled={updatePreferences.isPending}
                    />
                    {index < marketingNotifications.length - 1 && (
                      <Separator marginVertical="$1" />
                    )}
                  </YStack>
                ))}
              </Card>
            </YStack>

            {/* Account Notifications */}
            <YStack gap="$2">
              <Text
                fontSize="$3"
                color="$gray500"
                fontWeight="600"
                paddingLeft="$1"
              >
                ACCOUNT
              </Text>
              <Card variant="flat" padding="$2">
                {accountNotifications.map((item, index) => (
                  <YStack key={item.key}>
                    <NotificationToggle
                      icon={item.icon}
                      title={item.title}
                      description={item.description}
                      value={preferences[item.key]}
                      onValueChange={(value) => handleToggle(item.key, value)}
                      disabled={updatePreferences.isPending}
                    />
                    {index < accountNotifications.length - 1 && (
                      <Separator marginVertical="$1" />
                    )}
                  </YStack>
                ))}
              </Card>
            </YStack>

            {/* Communication Notifications */}
            <YStack gap="$2">
              <Text
                fontSize="$3"
                color="$gray500"
                fontWeight="600"
                paddingLeft="$1"
              >
                COMMUNICATION
              </Text>
              <Card variant="flat" padding="$2">
                {communicationNotifications.map((item, index) => (
                  <YStack key={item.key}>
                    <NotificationToggle
                      icon={item.icon}
                      title={item.title}
                      description={item.description}
                      value={preferences[item.key]}
                      onValueChange={(value) => handleToggle(item.key, value)}
                      disabled={updatePreferences.isPending}
                    />
                    {index < communicationNotifications.length - 1 && (
                      <Separator marginVertical="$1" />
                    )}
                  </YStack>
                ))}
              </Card>
            </YStack>

            {/* Info Text */}
            <Text fontSize="$2" color="$gray400" textAlign="center">
              Some notifications may still be sent for important account
              and security updates.
            </Text>
          </YStack>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
```

### 5. Visual Design Guidelines

```
┌─────────────────────────────────────────────────┐
│  ← Back         Notifications                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  BOOKINGS                                       │
│  ┌─────────────────────────────────────────┐   │
│  │ 🔔 Booking Confirmations          [ON] │   │
│  │    Get notified when your booking is... │   │
│  │ ─────────────────────────────────────── │   │
│  │ 📅 Booking Reminders              [ON] │   │
│  │    Receive reminders before your...     │   │
│  │ ─────────────────────────────────────── │   │
│  │ 🔔 Status Updates                 [ON] │   │
│  │    Get notified when your booking...    │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  MARKETING                                      │
│  ┌─────────────────────────────────────────┐   │
│  │ 🏷️ Promotions & Deals             [OFF]│   │
│  │    Receive special offers and discounts │   │
│  │ ─────────────────────────────────────── │   │
│  │ 📢 New Listings                   [ON] │   │
│  │    Be notified about new services...    │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ACCOUNT                                        │
│  ┌─────────────────────────────────────────┐   │
│  │ 🛡️ Account Alerts                 [ON] │   │
│  │    Security and account-related...      │   │
│  │ ─────────────────────────────────────── │   │
│  │ 💳 Payment Receipts               [ON] │   │
│  │    Receive receipts for your payments   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Some notifications may still be sent for      │
│  important account and security updates.       │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Acceptance Criteria

- [ ] Screen renders at `/settings/notifications`
- [ ] All notification categories displayed
- [ ] Current preferences loaded from Appwrite
- [ ] Toggle switches update preferences
- [ ] Optimistic updates for smooth UX
- [ ] Changes persist to database
- [ ] Loading state while fetching
- [ ] Disabled state during updates
- [ ] Back navigation works

## Testing Checklist

- [ ] Preferences load correctly
- [ ] Default values used for new users
- [ ] Toggle updates preference
- [ ] Multiple toggles work correctly
- [ ] Preferences persist after reload
- [ ] Disabled state prevents rapid toggling
- [ ] UI doesn't freeze during updates

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `types/notifications.ts` | Create | Notification types |
| `hooks/api/useNotificationPreferences.ts` | Create | Preferences hook |
| `components/ui/Toggle.tsx` | Create | Toggle component (optional) |
| `app/settings/notifications.tsx` | Create | Notifications screen |
| `components/ui/index.ts` | Modify | Export Toggle |

## Files to Reference

- `lib/appwrite/collections.ts` - Collection IDs (FOUND-003)

## Notes for AI Agent

- Use optimistic updates for better UX when toggling
- Preferences auto-save on toggle (no explicit save button)
- The default preferences should enable most notifications
- Account alerts and security notifications should always be sent (mention in UI)
- Consider debouncing rapid toggle changes
- Test switch animation on both platforms
