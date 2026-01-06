# AUTH-005: Logout Functionality

## Ticket Information
- **ID**: AUTH-005
- **Priority**: High
- **Dependencies**: FOUND-003, PROF-001
- **Phase**: MVP (Phase 1)
- **Parallel Work**: Can run in parallel with AUTH-004, AUTH-006

## Description
Implement the logout functionality for 231Booking that allows users to securely sign out of their accounts. This includes the logout action, confirmation dialog, and proper session cleanup.

## Context
Users need to be able to log out from their accounts for security, especially on shared devices. The logout should clear all session data, remove cached user information, and redirect to the login screen.

## Implementation Requirements

### 1. Logout Confirmation Dialog Component

**File**: `components/LogoutDialog.tsx`

```typescript
import { AlertDialog, Button, XStack, YStack, Text } from 'tamagui';
import { LogOut } from '@tamagui/lucide-icons';

interface LogoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function LogoutDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: LogoutDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay
          key="overlay"
          animation="quick"
          opacity={0.5}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />
        <AlertDialog.Content
          bordered
          elevate
          key="content"
          animation={[
            'quick',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          x={0}
          scale={1}
          opacity={1}
          y={0}
          padding="$5"
          maxWidth={340}
          width="90%"
        >
          <YStack gap="$4">
            {/* Icon */}
            <YStack alignItems="center">
              <YStack
                backgroundColor="$errorLight"
                padding="$4"
                borderRadius={1000}
              >
                <LogOut size={32} color="$error" />
              </YStack>
            </YStack>

            {/* Title & Description */}
            <YStack gap="$2" alignItems="center">
              <AlertDialog.Title fontSize="$7" fontWeight="700">
                Log Out?
              </AlertDialog.Title>
              <AlertDialog.Description
                fontSize="$4"
                color="$gray500"
                textAlign="center"
              >
                Are you sure you want to log out of your account?
              </AlertDialog.Description>
            </YStack>

            {/* Actions */}
            <XStack gap="$3" justifyContent="center">
              <AlertDialog.Cancel asChild>
                <Button
                  variant="outline"
                  flex={1}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  variant="danger"
                  flex={1}
                  onPress={onConfirm}
                  disabled={isLoading}
                >
                  {isLoading ? 'Logging out...' : 'Log Out'}
                </Button>
              </AlertDialog.Action>
            </XStack>
          </YStack>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog>
  );
}
```

### 2. useLogout Hook

**File**: `hooks/useLogout.ts`

```typescript
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth/AuthContext';
import { handleAppwriteError } from '@/lib/appwrite/errors';

export function useLogout() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Clear all cached data
      queryClient.clear();

      // Logout from Appwrite
      await logout();

      // Navigate to login
      router.replace('/(auth)/login');
    } catch (err) {
      const appError = handleAppwriteError(err);
      setError(appError.message);
      // Still navigate to login even on error (session might be invalid)
      router.replace('/(auth)/login');
    } finally {
      setIsLoading(false);
    }
  }, [logout, queryClient]);

  return {
    logout: handleLogout,
    isLoading,
    error,
  };
}
```

### 3. Profile Screen Logout Integration

**File**: `app/(tabs)/profile.tsx` (partial - add logout section)

```typescript
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { YStack, Text, XStack } from 'tamagui';
import { LogOut, ChevronRight, User, Bell, CreditCard, HelpCircle } from '@tamagui/lucide-icons';

import { Card, Avatar, Button } from '@/components/ui';
import { LogoutDialog } from '@/components/LogoutDialog';
import { useAuth } from '@/lib/auth/AuthContext';
import { useLogout } from '@/hooks/useLogout';
import { navigation } from '@/lib/navigation';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { logout, isLoading } = useLogout();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const menuItems = [
    {
      icon: User,
      label: 'Edit Profile',
      onPress: () => navigation.goToEditProfile(),
    },
    {
      icon: CreditCard,
      label: 'Payment Methods',
      onPress: () => navigation.goToPaymentMethods(),
    },
    {
      icon: Bell,
      label: 'Notifications',
      onPress: () => navigation.goToNotificationSettings(),
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      onPress: () => {}, // TODO: Implement
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView>
        <YStack padding="$4" gap="$6">
          {/* Header */}
          <Text fontSize="$8" fontWeight="700">
            Profile
          </Text>

          {/* User Info Card */}
          <Card variant="elevated">
            <XStack gap="$4" alignItems="center">
              <Avatar
                src={user?.prefs?.avatarUrl}
                name={user?.name}
                size="xl"
              />
              <YStack flex={1}>
                <Text fontSize="$6" fontWeight="600">
                  {user?.name || 'User'}
                </Text>
                <Text fontSize="$3" color="$gray500">
                  {user?.email}
                </Text>
              </YStack>
            </XStack>
          </Card>

          {/* Menu Items */}
          <YStack gap="$2">
            {menuItems.map((item) => (
              <Card
                key={item.label}
                variant="outlined"
                pressable
                onPress={item.onPress}
              >
                <XStack alignItems="center" justifyContent="space-between">
                  <XStack gap="$3" alignItems="center">
                    <item.icon size={20} color="$gray600" />
                    <Text fontSize="$4">{item.label}</Text>
                  </XStack>
                  <ChevronRight size={20} color="$gray400" />
                </XStack>
              </Card>
            ))}
          </YStack>

          {/* Logout Button */}
          <Button
            variant="ghost"
            onPress={() => setShowLogoutDialog(true)}
            icon={<LogOut size={20} color="$error" />}
          >
            <Text color="$error" fontWeight="500">
              Log Out
            </Text>
          </Button>
        </YStack>
      </ScrollView>

      {/* Logout Dialog */}
      <LogoutDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        onConfirm={logout}
        isLoading={isLoading}
      />
    </SafeAreaView>
  );
}
```

### 4. Settings Menu Item Alternative

For apps that prefer logout in settings:

**File**: `app/settings/index.tsx` (alternative placement)

```typescript
// ... other imports
import { LogoutDialog } from '@/components/LogoutDialog';
import { useLogout } from '@/hooks/useLogout';

export default function SettingsScreen() {
  const { logout, isLoading } = useLogout();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  return (
    <>
      {/* ... other settings content ... */}

      {/* Danger Zone */}
      <YStack gap="$3" marginTop="$6">
        <Text fontSize="$3" color="$gray500" fontWeight="500">
          Account
        </Text>

        <Button
          variant="outline"
          borderColor="$error"
          onPress={() => setShowLogoutDialog(true)}
        >
          <XStack gap="$2" alignItems="center">
            <LogOut size={18} color="$error" />
            <Text color="$error">Log Out</Text>
          </XStack>
        </Button>
      </YStack>

      <LogoutDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        onConfirm={logout}
        isLoading={isLoading}
      />
    </>
  );
}
```

## Visual Design Guidelines

**Logout Confirmation Dialog:**
```
┌─────────────────────────────────────────────────┐
│                                                 │
│                   [→]                           │
│                (icon)                           │
│                                                 │
│                Log Out?                         │
│                                                 │
│    Are you sure you want to log out of         │
│              your account?                      │
│                                                 │
│  ┌─────────────┐    ┌─────────────────┐        │
│  │   Cancel    │    │    Log Out      │        │
│  └─────────────┘    └─────────────────┘        │
│     (outline)           (red/danger)            │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Acceptance Criteria

- [ ] Logout button visible on profile screen
- [ ] Tapping logout shows confirmation dialog
- [ ] Cancel dismisses dialog without logging out
- [ ] Confirm logs out and redirects to login
- [ ] All cached data cleared on logout
- [ ] Loading state shown during logout
- [ ] Logout works even if network fails
- [ ] Session properly destroyed in Appwrite
- [ ] User cannot navigate back to authenticated screens after logout

## Testing Checklist

- [ ] Logout button is accessible
- [ ] Dialog appears on tap
- [ ] Cancel button works
- [ ] Confirm button triggers logout
- [ ] Loading spinner shows during logout
- [ ] Redirects to login screen
- [ ] Cannot use back navigation to return
- [ ] Cache cleared (fresh data on next login)
- [ ] Works offline (local session cleared)

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `components/LogoutDialog.tsx` | Create | Logout confirmation dialog |
| `hooks/useLogout.ts` | Create | Logout hook with cache clearing |
| `app/(tabs)/profile.tsx` | Modify | Add logout button and dialog |

## Files to Reference

- `lib/auth/AuthContext.tsx` - logout function (FOUND-003)
- `lib/queryClient.ts` - Query client for cache clearing (FOUND-001)

## Notes for AI Agent

- Always clear TanStack Query cache on logout to prevent stale data
- The logout should work even if the API call fails (local cleanup)
- Use AlertDialog from Tamagui for native-feeling confirmation
- Consider adding haptic feedback on logout button press
- Ensure the dialog is accessible (keyboard navigable, screen reader friendly)
- The danger variant button should have red/error styling
