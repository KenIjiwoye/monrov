# FOUND-003: Appwrite SDK Setup

## Ticket Information
- **ID**: FOUND-003
- **Priority**: Critical
- **Dependencies**: FOUND-001
- **Phase**: MVP (Phase 1)
- **Parallel Work**: Can run in parallel with FOUND-002, FOUND-004

## Description
Set up the Appwrite Cloud SDK for the 231Booking mobile app. This includes configuring the client, creating authentication context, and establishing database collection references.

## Context
231Booking uses Appwrite Cloud as the backend-as-a-service platform. This ticket establishes the foundation for all backend communication including authentication, database operations, and file storage. All subsequent features will depend on this setup.

## Implementation Requirements

### 1. Install Appwrite SDK

```bash
npm install react-native-appwrite
```

### 2. Appwrite Client Configuration

**File**: `lib/appwrite/client.ts`

```typescript
import { Client, Account, Databases, Storage, Functions } from 'react-native-appwrite';
import { config } from '@/lib/config';

// Initialize the Appwrite client
const client = new Client()
  .setEndpoint(config.appwrite.endpoint)
  .setProject(config.appwrite.projectId)
  .setPlatform('com.booking231.app'); // Update with actual bundle ID

// Export initialized services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);

export { client };
```

### 3. Database Collection IDs

**File**: `lib/appwrite/collections.ts`

```typescript
import { config } from '@/lib/config';

const DB = config.appwrite.databaseId;

export const collections = {
  // User related
  USERS: { databaseId: DB, collectionId: 'users' },
  USER_PROFILES: { databaseId: DB, collectionId: 'user_profiles' },
  BUSINESS_PROFILES: { databaseId: DB, collectionId: 'business_profiles' },

  // Listings
  LISTINGS: { databaseId: DB, collectionId: 'listings' },
  LISTING_CATEGORIES: { databaseId: DB, collectionId: 'listing_categories' },
  LISTING_IMAGES: { databaseId: DB, collectionId: 'listing_images' },
  LISTING_AVAILABILITY: { databaseId: DB, collectionId: 'listing_availability' },

  // Bookings
  BOOKINGS: { databaseId: DB, collectionId: 'bookings' },
  BOOKING_REQUESTS: { databaseId: DB, collectionId: 'booking_requests' },

  // Payments
  PAYMENTS: { databaseId: DB, collectionId: 'payments' },
  PAYMENT_METHODS: { databaseId: DB, collectionId: 'payment_methods' },

  // Reviews
  REVIEWS: { databaseId: DB, collectionId: 'reviews' },

  // Notifications
  NOTIFICATIONS: { databaseId: DB, collectionId: 'notifications' },
  NOTIFICATION_PREFERENCES: { databaseId: DB, collectionId: 'notification_preferences' },
} as const;

export const buckets = {
  LISTING_IMAGES: 'listing-images',
  PROFILE_IMAGES: 'profile-images',
  REVIEW_IMAGES: 'review-images',
  BUSINESS_DOCUMENTS: 'business-documents',
} as const;
```

### 4. Authentication Context

**File**: `lib/auth/AuthContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Models } from 'react-native-appwrite';
import { account } from '@/lib/appwrite/client';
import * as SecureStore from 'expo-secure-store';

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithPhone: (phone: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  signupWithPhone: (phone: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await account.get();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        await refreshUser();
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    await account.createEmailPasswordSession(email, password);
    await refreshUser();
  };

  const loginWithPhone = async (phone: string, password: string) => {
    // Appwrite phone auth flow - may need adjustment based on setup
    await account.createEmailPasswordSession(phone, password);
    await refreshUser();
  };

  const signup = async (email: string, password: string, name: string) => {
    await account.create('unique()', email, password, name);
    await login(email, password);
  };

  const signupWithPhone = async (phone: string, password: string, name: string) => {
    // Phone signup - implementation depends on Appwrite phone auth setup
    await account.create('unique()', phone, password, name);
    await loginWithPhone(phone, password);
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
    } finally {
      setUser(null);
    }
  };

  const resetPassword = async (email: string) => {
    await account.createRecovery(
      email,
      'https://your-app.com/reset-password' // Update with actual reset URL
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithPhone,
        signup,
        signupWithPhone,
        logout,
        resetPassword,
        refreshUser,
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

### 5. API Error Handling

**File**: `lib/appwrite/errors.ts`

```typescript
import { AppwriteException } from 'react-native-appwrite';

export interface AppError {
  message: string;
  code: string;
  type: 'auth' | 'database' | 'storage' | 'network' | 'unknown';
}

export function handleAppwriteError(error: unknown): AppError {
  if (error instanceof AppwriteException) {
    // Map Appwrite error codes to user-friendly messages
    switch (error.code) {
      case 401:
        return {
          message: 'Invalid credentials. Please check your email and password.',
          code: 'auth/invalid-credentials',
          type: 'auth',
        };
      case 409:
        return {
          message: 'An account with this email already exists.',
          code: 'auth/email-exists',
          type: 'auth',
        };
      case 404:
        return {
          message: 'Resource not found.',
          code: 'database/not-found',
          type: 'database',
        };
      case 429:
        return {
          message: 'Too many requests. Please try again later.',
          code: 'rate-limit',
          type: 'network',
        };
      default:
        return {
          message: error.message || 'An unexpected error occurred.',
          code: `appwrite/${error.code}`,
          type: 'unknown',
        };
    }
  }

  if (error instanceof Error) {
    if (error.message.includes('Network')) {
      return {
        message: 'Network error. Please check your connection.',
        code: 'network/offline',
        type: 'network',
      };
    }
    return {
      message: error.message,
      code: 'unknown',
      type: 'unknown',
    };
  }

  return {
    message: 'An unexpected error occurred.',
    code: 'unknown',
    type: 'unknown',
  };
}
```

### 6. TanStack Query Hooks Factory

**File**: `lib/appwrite/queryHelpers.ts`

```typescript
import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { databases } from './client';
import { Models, Query } from 'react-native-appwrite';
import { handleAppwriteError } from './errors';

interface CollectionRef {
  databaseId: string;
  collectionId: string;
}

// Generic document fetcher
export function useDocument<T extends Models.Document>(
  collection: CollectionRef,
  documentId: string | undefined,
  options?: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<T, Error>({
    queryKey: [collection.collectionId, documentId],
    queryFn: async () => {
      if (!documentId) throw new Error('Document ID required');
      return databases.getDocument(
        collection.databaseId,
        collection.collectionId,
        documentId
      ) as Promise<T>;
    },
    enabled: !!documentId,
    ...options,
  });
}

// Generic list fetcher
export function useDocuments<T extends Models.Document>(
  collection: CollectionRef,
  queries: string[] = [],
  options?: Omit<UseQueryOptions<Models.DocumentList<T>, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Models.DocumentList<T>, Error>({
    queryKey: [collection.collectionId, 'list', queries],
    queryFn: async () => {
      return databases.listDocuments(
        collection.databaseId,
        collection.collectionId,
        queries
      ) as Promise<Models.DocumentList<T>>;
    },
    ...options,
  });
}

// Generic create mutation
export function useCreateDocument<T extends Models.Document>(
  collection: CollectionRef,
  options?: UseMutationOptions<T, Error, Omit<T, keyof Models.Document>>
) {
  return useMutation<T, Error, Omit<T, keyof Models.Document>>({
    mutationFn: async (data) => {
      return databases.createDocument(
        collection.databaseId,
        collection.collectionId,
        'unique()',
        data
      ) as Promise<T>;
    },
    ...options,
  });
}

// Generic update mutation
export function useUpdateDocument<T extends Models.Document>(
  collection: CollectionRef,
  options?: UseMutationOptions<T, Error, { id: string; data: Partial<T> }>
) {
  return useMutation<T, Error, { id: string; data: Partial<T> }>({
    mutationFn: async ({ id, data }) => {
      return databases.updateDocument(
        collection.databaseId,
        collection.collectionId,
        id,
        data
      ) as Promise<T>;
    },
    ...options,
  });
}

// Generic delete mutation
export function useDeleteDocument(
  collection: CollectionRef,
  options?: UseMutationOptions<void, Error, string>
) {
  return useMutation<void, Error, string>({
    mutationFn: async (documentId) => {
      await databases.deleteDocument(
        collection.databaseId,
        collection.collectionId,
        documentId
      );
    },
    ...options,
  });
}
```

## Acceptance Criteria

- [ ] Appwrite client configured with environment variables
- [ ] Account, Databases, Storage, Functions services exported
- [ ] Collection ID constants defined for all collections
- [ ] Storage bucket constants defined
- [ ] AuthContext provides login, signup, logout, password reset
- [ ] Error handling utility converts Appwrite errors to user-friendly messages
- [ ] TanStack Query helper hooks created for CRUD operations
- [ ] useAuth hook accessible throughout the app

## Testing Checklist

- [ ] Appwrite client connects successfully
- [ ] `account.get()` returns user when logged in
- [ ] Login flow works with valid credentials
- [ ] Signup creates new account successfully
- [ ] Logout clears session
- [ ] Error messages display correctly for invalid credentials
- [ ] Network errors handled gracefully

## Files to Create

| File | Description |
|------|-------------|
| `lib/appwrite/client.ts` | Appwrite client initialization |
| `lib/appwrite/collections.ts` | Collection and bucket ID constants |
| `lib/appwrite/errors.ts` | Error handling utilities |
| `lib/appwrite/queryHelpers.ts` | TanStack Query factory hooks |
| `lib/auth/AuthContext.tsx` | Authentication context and provider |

## Files to Reference

- `lib/config.ts` - Environment configuration (from FOUND-001)
- Appwrite documentation: https://appwrite.io/docs

## Notes for AI Agent

- The collection IDs in `collections.ts` should match those created in Appwrite Console
- Phone authentication may require additional Appwrite configuration
- The password recovery URL needs to be updated to actual app scheme for deep linking
- Consider adding session persistence with SecureStore for "stay logged in" feature
- The query helpers use TypeScript generics - ensure types are properly defined in `types/` folder
