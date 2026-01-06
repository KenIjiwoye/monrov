# FOUND-002: Navigation Structure

## Ticket Information
- **ID**: FOUND-002
- **Priority**: Critical
- **Dependencies**: FOUND-001
- **Phase**: MVP (Phase 1)
- **Parallel Work**: Can run in parallel with FOUND-003, FOUND-004

## Description
Set up the complete navigation structure for the 231Booking mobile app using Expo Router. This includes tab navigation for main sections, stack navigation for detail screens, and authentication flow navigation.

## Context
The app requires a navigation structure that supports both authenticated and unauthenticated states. Basic users will have access to browse, search, bookings, and profile sections. Business users will have additional management screens. The navigation should be intuitive and follow mobile UX best practices.

## Implementation Requirements

### 1. Navigation Structure Overview

```
app/
├── _layout.tsx              # Root layout with providers
├── (auth)/                  # Authentication flow (unauthenticated)
│   ├── _layout.tsx
│   ├── login.tsx
│   ├── signup.tsx
│   ├── signup-phone.tsx
│   └── forgot-password.tsx
├── (tabs)/                  # Main tab navigation (authenticated)
│   ├── _layout.tsx
│   ├── index.tsx            # Home/Explore
│   ├── search.tsx           # Search
│   ├── bookings.tsx         # My Bookings
│   └── profile.tsx          # Profile
├── listing/
│   └── [id].tsx             # Listing details
├── booking/
│   ├── [listingId].tsx      # Create booking
│   └── confirmation/[id].tsx # Booking confirmation
├── business/                # Business user screens
│   ├── _layout.tsx
│   ├── dashboard.tsx
│   ├── listings/
│   │   ├── index.tsx
│   │   ├── create.tsx
│   │   └── [id]/
│   │       ├── edit.tsx
│   │       └── bookings.tsx
│   └── earnings.tsx
└── settings/
    ├── _layout.tsx
    ├── index.tsx
    ├── edit-profile.tsx
    ├── payment-methods.tsx
    └── notifications.tsx
```

### 2. Root Layout

**File**: `app/_layout.tsx`

```typescript
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { TamaguiProvider } from 'tamagui';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/lib/auth/AuthContext';
import config from '../tamagui.config';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <TamaguiProvider config={config}>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="listing/[id]"
              options={{
                headerShown: true,
                headerTitle: 'Listing Details',
                presentation: 'card'
              }}
            />
            <Stack.Screen
              name="booking/[listingId]"
              options={{
                headerShown: true,
                headerTitle: 'Book Now',
                presentation: 'modal'
              }}
            />
          </Stack>
        </AuthProvider>
      </TamaguiProvider>
    </QueryClientProvider>
  );
}
```

### 3. Tab Navigation Layout

**File**: `app/(tabs)/_layout.tsx`

```typescript
import { Tabs } from 'expo-router';
import { Home, Search, Calendar, User } from '@tamagui/lucide-icons';
import { useTheme } from 'tamagui';

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary.val,
        tabBarInactiveTintColor: theme.gray500.val,
        tabBarStyle: {
          backgroundColor: theme.background.val,
          borderTopColor: theme.borderColor.val,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

### 4. Auth Layout

**File**: `app/(auth)/_layout.tsx`

```typescript
import { Stack } from 'expo-router';
import { useAuth } from '@/lib/auth/AuthContext';
import { Redirect } from 'expo-router';

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or a loading screen
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="signup-phone" />
      <Stack.Screen
        name="forgot-password"
        options={{
          presentation: 'modal',
          headerShown: true,
          headerTitle: 'Reset Password'
        }}
      />
    </Stack>
  );
}
```

### 5. Navigation Types

**File**: `types/navigation.ts`

```typescript
export type RootStackParamList = {
  '(auth)': undefined;
  '(tabs)': undefined;
  'listing/[id]': { id: string };
  'booking/[listingId]': { listingId: string };
  'booking/confirmation/[id]': { id: string };
};

export type TabParamList = {
  index: undefined;
  search: { query?: string; category?: string };
  bookings: { tab?: 'upcoming' | 'past' };
  profile: undefined;
};

export type AuthStackParamList = {
  login: undefined;
  signup: undefined;
  'signup-phone': undefined;
  'forgot-password': { email?: string };
};
```

### 6. Navigation Utilities

**File**: `lib/navigation.ts`

```typescript
import { router } from 'expo-router';

export const navigation = {
  // Auth
  goToLogin: () => router.replace('/(auth)/login'),
  goToSignup: () => router.push('/(auth)/signup'),
  goToForgotPassword: (email?: string) =>
    router.push({ pathname: '/(auth)/forgot-password', params: { email } }),

  // Main
  goToHome: () => router.replace('/(tabs)'),
  goToSearch: (query?: string) =>
    router.push({ pathname: '/(tabs)/search', params: { query } }),
  goToBookings: () => router.push('/(tabs)/bookings'),
  goToProfile: () => router.push('/(tabs)/profile'),

  // Listings
  goToListing: (id: string) =>
    router.push({ pathname: '/listing/[id]', params: { id } }),

  // Booking
  goToBooking: (listingId: string) =>
    router.push({ pathname: '/booking/[listingId]', params: { listingId } }),
  goToBookingConfirmation: (id: string) =>
    router.replace({ pathname: '/booking/confirmation/[id]', params: { id } }),

  // Settings
  goToEditProfile: () => router.push('/settings/edit-profile'),
  goToPaymentMethods: () => router.push('/settings/payment-methods'),
  goToNotificationSettings: () => router.push('/settings/notifications'),

  // Utilities
  goBack: () => router.back(),
  canGoBack: () => router.canGoBack(),
};
```

### 7. Install Icons Package

```bash
npm install @tamagui/lucide-icons
```

## Acceptance Criteria

- [ ] Root layout configured with all providers
- [ ] Tab navigation with 4 tabs: Explore, Search, Bookings, Profile
- [ ] Auth stack with login, signup, and forgot password screens
- [ ] Deep linking to listing details works
- [ ] Modal presentation for booking flow
- [ ] Authentication redirect logic works (auth screens redirect when logged in)
- [ ] Navigation utility functions created
- [ ] TypeScript types for all navigation params

## Testing Checklist

- [ ] Tab navigation switches between screens correctly
- [ ] Back navigation works properly
- [ ] Deep links to `/listing/123` navigate correctly
- [ ] Auth redirect works when authenticated/unauthenticated
- [ ] Modal screens dismiss correctly
- [ ] Icons render in tab bar

## Files to Create

| File | Description |
|------|-------------|
| `app/_layout.tsx` | Root layout (modify if exists) |
| `app/(auth)/_layout.tsx` | Auth flow layout |
| `app/(auth)/login.tsx` | Login screen placeholder |
| `app/(auth)/signup.tsx` | Signup screen placeholder |
| `app/(auth)/signup-phone.tsx` | Phone signup placeholder |
| `app/(auth)/forgot-password.tsx` | Password reset placeholder |
| `app/(tabs)/_layout.tsx` | Tab navigation layout |
| `app/(tabs)/index.tsx` | Home/Explore screen placeholder |
| `app/(tabs)/search.tsx` | Search screen placeholder |
| `app/(tabs)/bookings.tsx` | Bookings screen placeholder |
| `app/(tabs)/profile.tsx` | Profile screen placeholder |
| `types/navigation.ts` | Navigation type definitions |
| `lib/navigation.ts` | Navigation utilities |

## Placeholder Screen Template

For each placeholder screen, create a basic structure:

```typescript
import { YStack, Text } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ScreenName() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <YStack flex={1} padding="$4" alignItems="center" justifyContent="center">
        <Text>Screen Name - Coming Soon</Text>
      </YStack>
    </SafeAreaView>
  );
}
```

## Notes for AI Agent

- Check existing navigation structure before modifying
- Ensure SafeAreaView is used for proper iOS notch handling
- Tab icons should use consistent sizing (24px recommended)
- The AuthProvider is created in FOUND-003 - use a placeholder if needed
- Placeholder screens should be functional but minimal
