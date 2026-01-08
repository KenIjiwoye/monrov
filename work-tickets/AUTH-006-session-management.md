# AUTH-006: Session Management (Stay Logged In)

## Ticket Information
- **ID**: AUTH-006
- **Priority**: Medium
- **Dependencies**: FOUND-003
- **Phase**: MVP (Phase 1)
- **Parallel Work**: Can run in parallel with AUTH-005

## Description
Implement session management for 231Booking that allows users to stay logged in between app sessions. This includes secure session persistence using Expo SecureStore and automatic session restoration on app launch.

## Context
Users expect to remain logged in when they close and reopen the app. This ticket implements secure session persistence using device-level secure storage. The session should be automatically restored on app launch, and the app should gracefully handle expired sessions. With OTP-based authentication, if a session expires, users simply request a new OTP to log back in.

## Implementation Requirements

### 1. Session Storage Service

**File**: `lib/auth/sessionStorage.ts`

```typescript
import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = '231booking_session';
const SESSION_EXPIRY_KEY = '231booking_session_expiry';

interface StoredSession {
  sessionId: string;
  userId: string;
  createdAt: string;
}

export const sessionStorage = {
  async saveSession(sessionId: string, userId: string): Promise<void> {
    const session: StoredSession = {
      sessionId,
      userId,
      createdAt: new Date().toISOString(),
    };

    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));

    // Set expiry for 30 days (Appwrite default session length)
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    await SecureStore.setItemAsync(SESSION_EXPIRY_KEY, expiry.toISOString());
  },

  async getSession(): Promise<StoredSession | null> {
    try {
      const sessionData = await SecureStore.getItemAsync(SESSION_KEY);
      const expiryData = await SecureStore.getItemAsync(SESSION_EXPIRY_KEY);

      if (!sessionData || !expiryData) {
        return null;
      }

      // Check if session has expired locally
      const expiry = new Date(expiryData);
      if (expiry < new Date()) {
        await this.clearSession();
        return null;
      }

      return JSON.parse(sessionData) as StoredSession;
    } catch (error) {
      console.error('Error reading session:', error);
      return null;
    }
  },

  async clearSession(): Promise<void> {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    await SecureStore.deleteItemAsync(SESSION_EXPIRY_KEY);
  },

  async isSessionValid(): Promise<boolean> {
    const session = await this.getSession();
    return session !== null;
  },
};
```

### 2. Updated Auth Context with Session Persistence

**File**: `lib/auth/AuthContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Models, ID } from 'react-native-appwrite';
import { account } from '@/lib/appwrite/client';
import { sessionStorage } from './sessionStorage';

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
  refreshUser: () => Promise<Models.User<Models.Preferences> | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await account.get();
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      setUser(null);
      await sessionStorage.clearSession();
      return null;
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if we have a stored session
        const hasSession = await sessionStorage.isSessionValid();

        if (hasSession) {
          // Try to validate with Appwrite
          const currentUser = await refreshUser();

          if (currentUser) {
            // Session is valid, user is logged in
            console.log('Session restored for user:', currentUser.name || currentUser.email || currentUser.phone);
          }
        }
      } catch (error) {
        // Session invalid or expired
        console.log('Session validation failed, redirecting to login');
        await sessionStorage.clearSession();
        setUser(null);
      } finally {
        setIsInitialized(true);
      }
    };

    initAuth();
  }, [refreshUser]);

  const logout = async () => {
    setIsLoading(true);
    try {
      await account.deleteSession('current');
    } catch (error) {
      // Session might already be invalid, continue with local cleanup
      console.warn('Logout API error:', error);
    } finally {
      await sessionStorage.clearSession();
      setUser(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isInitialized,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### 3. Save Session After OTP Verification

The OTP verification screen (AUTH-001) should save the session after successful verification:

**File**: `app/(auth)/verify-otp.tsx` (add to handleVerify)

```typescript
const handleVerify = async (otpCode: string) => {
  if (!userId || otpCode.length !== OTP_LENGTH) return;

  try {
    setError(null);
    setIsLoading(true);

    // Create session with OTP
    const session = await account.createSession(userId, otpCode);

    // Save session to secure storage for persistence
    await sessionStorage.saveSession(session.$id, userId);

    // If this is a signup flow and we have a name, update the user's name
    if (isSignup === 'true' && name) {
      try {
        await account.updateName(name);
      } catch (updateErr) {
        console.warn('Failed to set user name:', updateErr);
      }
    }

    // Refresh user data
    await refreshUser();

    // Navigation handled by auth state change in layout
  } catch (err) {
    const appError = handleAppwriteError(err);
    setError(appError.message);
    setOtp(Array(OTP_LENGTH).fill(''));
    inputRefs.current[0]?.focus();
  } finally {
    setIsLoading(false);
  }
};
```

### 4. Splash/Loading Screen

**File**: `components/SplashScreen.tsx`

```typescript
import { YStack, Spinner, Text } from 'tamagui';

export function SplashScreen() {
  return (
    <YStack
      flex={1}
      backgroundColor="$primary"
      alignItems="center"
      justifyContent="center"
      gap="$6"
    >
      {/* App Logo */}
      <YStack
        width={120}
        height={120}
        backgroundColor="$white"
        borderRadius="$6"
        alignItems="center"
        justifyContent="center"
      >
        <Text fontSize="$10" fontWeight="700" color="$primary">
          231
        </Text>
      </YStack>

      <Text fontSize="$8" fontWeight="700" color="$white">
        231Booking
      </Text>

      <Spinner size="large" color="$white" />
    </YStack>
  );
}
```

### 5. Updated Root Layout with Auth Guard

**File**: `app/_layout.tsx`

```typescript
import { useEffect } from 'react';
import { Stack, router, useSegments, useRootNavigationState } from 'expo-router';
import { TamaguiProvider } from 'tamagui';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider, useAuth } from '@/lib/auth/AuthContext';
import { SplashScreen } from '@/components/SplashScreen';
import config from '../tamagui.config';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized } = useAuth();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!isInitialized || !navigationState?.key) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated and not already on auth screens
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to home if authenticated and on auth screens
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isInitialized, segments, navigationState?.key]);

  // Show splash screen while initializing
  if (!isInitialized) {
    return <SplashScreen />;
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <TamaguiProvider config={config}>
        <AuthProvider>
          <AuthGuard>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="listing/[id]"
                options={{
                  headerShown: true,
                  headerTitle: 'Listing Details',
                }}
              />
            </Stack>
          </AuthGuard>
        </AuthProvider>
      </TamaguiProvider>
    </QueryClientProvider>
  );
}
```

### 6. Session Refresh on App Focus

**File**: `hooks/useSessionRefresh.ts`

```typescript
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from '@/lib/auth/AuthContext';

export function useSessionRefresh() {
  const { refreshUser, isAuthenticated } = useAuth();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async (nextAppState: AppStateStatus) => {
        // App came to foreground from background
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === 'active' &&
          isAuthenticated
        ) {
          // Silently refresh user data to validate session
          try {
            await refreshUser();
          } catch (error) {
            // Session might be expired, auth guard will handle redirect
            console.log('Session refresh failed:', error);
          }
        }
        appState.current = nextAppState;
      }
    );

    return () => subscription.remove();
  }, [refreshUser, isAuthenticated]);
}
```

### 7. Add Session Refresh to Tab Layout

**File**: `app/(tabs)/_layout.tsx`

```typescript
import { Tabs } from 'expo-router';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';
import { Home, Search, Calendar, User } from '@tamagui/lucide-icons';

export default function TabLayout() {
  // Refresh session when app comes to foreground
  useSessionRefresh();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '$primary',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => <Search size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color }) => <Calendar size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

## Flow Diagram

```
App Launch
    |
    v
+-------------------------+
|  Show Splash Screen     |
|  Check SecureStore      |
|  for saved session      |
+-------------------------+
    |
    +-- No session -----------------> Show Login Screen
    |
    v
+-------------------------+
| Validate session        |
| with Appwrite           |
| (account.get())         |
+-------------------------+
    |
    +-- Invalid/Expired ------------> Clear storage -> Show Login
    |
    v
+-------------------------+
|   Session Valid         |
|  Show Main App (Tabs)   |
+-------------------------+
    |
    v
+-------------------------+
| On App Foreground:      |
| Silently refresh user   |
| to validate session     |
+-------------------------+
```

## OTP Session Flow

```
User enters email/phone
    |
    v
createEmailToken() / createPhoneToken()
    |
    v
User receives OTP (email/SMS)
    |
    v
User enters OTP
    |
    v
createSession(userId, secret)
    |
    v
+-------------------------+
| Save to SecureStore:    |
| - sessionId             |
| - userId                |
| - expiry (30 days)      |
+-------------------------+
    |
    v
refreshUser() -> Update AuthContext
    |
    v
AuthGuard redirects to (tabs)
```

## Acceptance Criteria

- [ ] Session saved to SecureStore on successful OTP verification
- [ ] Session restored automatically on app launch
- [ ] Splash screen shown while validating session
- [ ] Expired sessions handled gracefully (redirect to login)
- [ ] Session cleared on logout
- [ ] Invalid server session redirects to login
- [ ] Session refreshed when app returns to foreground
- [ ] 30-day session expiry implemented
- [ ] No sensitive data stored in plain text

## Testing Checklist

- [ ] Login persists after app restart
- [ ] Login persists after phone restart
- [ ] Logout clears stored session
- [ ] Expired session redirects to login
- [ ] Invalid session (server-side revoked) handled
- [ ] Fresh install shows login screen
- [ ] Session validated on app foreground
- [ ] Splash screen displays during initialization
- [ ] No flash of login screen for valid session
- [ ] Session works for both email and phone logins

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `lib/auth/sessionStorage.ts` | Create | Secure session storage service |
| `lib/auth/AuthContext.tsx` | Modify | Add session persistence |
| `components/SplashScreen.tsx` | Create | Loading/splash screen |
| `app/_layout.tsx` | Modify | Add auth guard and splash |
| `app/(auth)/verify-otp.tsx` | Modify | Save session after verification |
| `hooks/useSessionRefresh.ts` | Create | App focus session refresh |
| `hooks/index.ts` | Modify | Export useSessionRefresh |
| `app/(tabs)/_layout.tsx` | Modify | Add session refresh hook |

## Dependencies

```bash
# For secure storage (should already be installed via Expo)
npx expo install expo-secure-store
```

## Files to Reference

- `lib/appwrite/client.ts` - Appwrite account service (FOUND-003)
- `app/(auth)/verify-otp.tsx` - OTP verification (AUTH-001)

## Security Considerations

- Use SecureStore for sensitive session data (encrypted on device)
  - iOS: Uses Keychain
  - Android: Uses Keystore
- Never store OTP codes, only session tokens
- Implement session expiry (30 days default, matches Appwrite)
- Clear session on logout even if API fails
- Validate session server-side on each app launch
- Handle expired/revoked sessions gracefully
- Don't log sensitive session data

## Notes for AI Agent

- SecureStore uses Keychain on iOS and Keystore on Android (both encrypted)
- The `isInitialized` flag prevents flash of wrong screen during load
- Session refresh on foreground prevents stale authentication state
- Always clear local session even if server logout fails
- Appwrite sessions last 30 days by default
- With OTP auth, session expiry just means user needs to request a new OTP
- The sessionStorage module should be imported in verify-otp.tsx
- Test on both iOS and Android as secure storage behaves differently
- Consider showing a "Session expired" toast when redirecting to login
