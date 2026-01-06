# PROF-001: Profile Screen & View

## Ticket Information
- **ID**: PROF-001
- **Priority**: High
- **Dependencies**: FOUND-001, FOUND-002, FOUND-003, FOUND-004, FOUND-006, AUTH-001
- **Phase**: MVP (Phase 1)
- **Parallel Work**: Can run in parallel with PROF-003, PROF-004

## Description
Create the main profile screen for 231Booking that displays the user's account information and provides navigation to profile-related settings. This is the primary hub for user account management.

## Context
The profile screen is one of the main tab screens and serves as the central location for users to view their account information, access settings, and manage their account. It should display user details and provide clear navigation paths to sub-sections.

## Implementation Requirements

### 1. Screen File

**File**: `app/(tabs)/profile.tsx`

### 2. Complete Profile Screen Implementation

```typescript
import { useState } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, Text, XStack, Separator } from 'tamagui';
import { router } from 'expo-router';
import {
  User,
  CreditCard,
  Bell,
  HelpCircle,
  FileText,
  Shield,
  ChevronRight,
  LogOut,
  Briefcase,
  Star,
} from '@tamagui/lucide-icons';

import { Card, Avatar, Button, Badge, LoadingScreen, ErrorState } from '@/components/ui';
import { LogoutDialog } from '@/components/LogoutDialog';
import { useAuth } from '@/lib/auth/AuthContext';
import { useUserProfile, useBusinessProfile } from '@/hooks/api/useProfile';
import { useLogout } from '@/hooks/useLogout';

interface MenuItemProps {
  icon: React.ElementType;
  label: string;
  description?: string;
  onPress: () => void;
  badge?: string;
  showChevron?: boolean;
}

function MenuItem({
  icon: Icon,
  label,
  description,
  onPress,
  badge,
  showChevron = true,
}: MenuItemProps) {
  return (
    <Card variant="flat" pressable onPress={onPress} padding="$3">
      <XStack alignItems="center" justifyContent="space-between">
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
              {label}
            </Text>
            {description && (
              <Text fontSize="$2" color="$gray500">
                {description}
              </Text>
            )}
          </YStack>
        </XStack>
        <XStack gap="$2" alignItems="center">
          {badge && <Badge label={badge} variant="primary" />}
          {showChevron && <ChevronRight size={20} color="$gray400" />}
        </XStack>
      </XStack>
    </Card>
  );
}

export default function ProfileScreen() {
  const { user } = useAuth();
  const { data: profile, isLoading, error, refetch } = useUserProfile();
  const { data: businessProfile } = useBusinessProfile();
  const { logout, isLoading: isLoggingOut } = useLogout();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading && !profile) {
    return <LoadingScreen message="Loading profile..." />;
  }

  if (error && !profile) {
    return (
      <ErrorState
        message="Failed to load profile"
        onRetry={refetch}
      />
    );
  }

  const accountMenuItems: MenuItemProps[] = [
    {
      icon: User,
      label: 'Edit Profile',
      description: 'Update your personal information',
      onPress: () => router.push('/settings/edit-profile'),
    },
    {
      icon: CreditCard,
      label: 'Payment Methods',
      description: 'Manage your payment options',
      onPress: () => router.push('/settings/payment-methods'),
    },
    {
      icon: Bell,
      label: 'Notifications',
      description: 'Configure your alerts',
      onPress: () => router.push('/settings/notifications'),
    },
  ];

  const businessMenuItems: MenuItemProps[] = businessProfile
    ? [
        {
          icon: Briefcase,
          label: 'Business Dashboard',
          description: businessProfile.businessName,
          onPress: () => router.push('/business/dashboard'),
          badge: businessProfile.isVerified ? 'Verified' : undefined,
        },
      ]
    : [
        {
          icon: Briefcase,
          label: 'Become a Business',
          description: 'List your services on 231Booking',
          onPress: () => router.push('/business/create'),
        },
      ];

  const supportMenuItems: MenuItemProps[] = [
    {
      icon: HelpCircle,
      label: 'Help & Support',
      onPress: () => {}, // TODO: Implement help screen
    },
    {
      icon: FileText,
      label: 'Terms of Service',
      onPress: () => {}, // TODO: Implement terms screen
    },
    {
      icon: Shield,
      label: 'Privacy Policy',
      onPress: () => {}, // TODO: Implement privacy screen
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <YStack padding="$4" gap="$6">
          {/* Header */}
          <Text fontSize="$8" fontWeight="700">
            Profile
          </Text>

          {/* User Info Card */}
          <Card variant="elevated" padding="$4">
            <XStack gap="$4" alignItems="center">
              <Avatar
                src={profile?.avatarUrl || user?.prefs?.avatarUrl}
                name={user?.name}
                size="xl"
              />
              <YStack flex={1} gap="$1">
                <Text fontSize="$6" fontWeight="600">
                  {user?.name || 'User'}
                </Text>
                <Text fontSize="$3" color="$gray500">
                  {user?.email}
                </Text>
                {user?.phone && (
                  <Text fontSize="$3" color="$gray500">
                    {user.phone}
                  </Text>
                )}
              </YStack>
              <Button
                variant="outline"
                size="sm"
                onPress={() => router.push('/settings/edit-profile')}
              >
                Edit
              </Button>
            </XStack>

            {/* Stats Row */}
            <XStack marginTop="$4" justifyContent="space-around">
              <YStack alignItems="center">
                <Text fontSize="$6" fontWeight="700" color="$primary">
                  0
                </Text>
                <Text fontSize="$2" color="$gray500">
                  Bookings
                </Text>
              </YStack>
              <Separator vertical />
              <YStack alignItems="center">
                <Text fontSize="$6" fontWeight="700" color="$primary">
                  0
                </Text>
                <Text fontSize="$2" color="$gray500">
                  Reviews
                </Text>
              </YStack>
              <Separator vertical />
              <YStack alignItems="center">
                <XStack alignItems="center" gap="$1">
                  <Star size={16} color="$warning" fill="$warning" />
                  <Text fontSize="$6" fontWeight="700" color="$primary">
                    -
                  </Text>
                </XStack>
                <Text fontSize="$2" color="$gray500">
                  Rating
                </Text>
              </YStack>
            </XStack>
          </Card>

          {/* Account Section */}
          <YStack gap="$2">
            <Text fontSize="$3" color="$gray500" fontWeight="600" paddingLeft="$1">
              ACCOUNT
            </Text>
            <YStack gap="$2">
              {accountMenuItems.map((item) => (
                <MenuItem key={item.label} {...item} />
              ))}
            </YStack>
          </YStack>

          {/* Business Section */}
          <YStack gap="$2">
            <Text fontSize="$3" color="$gray500" fontWeight="600" paddingLeft="$1">
              BUSINESS
            </Text>
            <YStack gap="$2">
              {businessMenuItems.map((item) => (
                <MenuItem key={item.label} {...item} />
              ))}
            </YStack>
          </YStack>

          {/* Support Section */}
          <YStack gap="$2">
            <Text fontSize="$3" color="$gray500" fontWeight="600" paddingLeft="$1">
              SUPPORT
            </Text>
            <YStack gap="$2">
              {supportMenuItems.map((item) => (
                <MenuItem key={item.label} {...item} />
              ))}
            </YStack>
          </YStack>

          {/* Logout Button */}
          <Button
            variant="ghost"
            onPress={() => setShowLogoutDialog(true)}
          >
            <XStack gap="$2" alignItems="center">
              <LogOut size={20} color="$error" />
              <Text color="$error" fontWeight="500">
                Log Out
              </Text>
            </XStack>
          </Button>

          {/* App Version */}
          <Text fontSize="$2" color="$gray400" textAlign="center">
            231Booking v1.0.0
          </Text>
        </YStack>
      </ScrollView>

      {/* Logout Dialog */}
      <LogoutDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        onConfirm={logout}
        isLoading={isLoggingOut}
      />
    </SafeAreaView>
  );
}
```

### 3. Visual Design Guidelines

```
┌─────────────────────────────────────────────────┐
│  Profile                                        │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐   │
│  │  ┌────┐                                  │   │
│  │  │ AV │  John Doe              [Edit]   │   │
│  │  │    │  john@example.com               │   │
│  │  └────┘  +231 XX XXX XXXX               │   │
│  │                                          │   │
│  │    12          5          4.8★          │   │
│  │  Bookings   Reviews      Rating         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ACCOUNT                                        │
│  ┌─────────────────────────────────────────┐   │
│  │ 👤 Edit Profile                      >  │   │
│  │    Update your personal information      │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │ 💳 Payment Methods                   >  │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │ 🔔 Notifications                     >  │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  BUSINESS                                       │
│  ┌─────────────────────────────────────────┐   │
│  │ 💼 Become a Business                 >  │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  SUPPORT                                        │
│  ┌─────────────────────────────────────────┐   │
│  │ ❓ Help & Support                    >  │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│           🚪 Log Out                            │
│                                                 │
│          231Booking v1.0.0                      │
└─────────────────────────────────────────────────┘
```

## Acceptance Criteria

- [ ] Profile screen renders as tab at `/(tabs)/profile`
- [ ] User avatar, name, and email display correctly
- [ ] Stats section shows bookings, reviews, and rating
- [ ] Account menu items navigate to correct screens
- [ ] Business section shows appropriate option (create or dashboard)
- [ ] Support menu items are present
- [ ] Logout button triggers confirmation dialog
- [ ] Pull-to-refresh refreshes profile data
- [ ] Loading state shown while fetching
- [ ] Error state with retry option

## Testing Checklist

- [ ] Profile data loads correctly
- [ ] Avatar fallback shows initials when no image
- [ ] Menu items navigate to correct routes
- [ ] Logout flow works correctly
- [ ] Pull to refresh updates data
- [ ] Edit button navigates to edit profile
- [ ] Business dashboard shows for business users
- [ ] "Become a Business" shows for regular users

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `app/(tabs)/profile.tsx` | Create/Replace | Complete profile screen |

## Files to Reference

- `hooks/api/useProfile.ts` - Profile data hooks (FOUND-006)
- `lib/auth/AuthContext.tsx` - Auth context (FOUND-003)
- `components/ui/` - UI components (FOUND-004)
- `components/LogoutDialog.tsx` - Logout dialog (AUTH-005)

## Notes for AI Agent

- The MenuItem component should be reusable or extracted to components
- Stats will show real data once booking/review features are implemented
- Business section changes based on whether user has a business profile
- Pull-to-refresh should invalidate and refetch profile query
- Consider extracting the stats section to a separate component
