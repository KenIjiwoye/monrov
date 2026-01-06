# FOUND-006: State Management & API Layer

## Ticket Information
- **ID**: FOUND-006
- **Priority**: High
- **Dependencies**: FOUND-001, FOUND-003
- **Phase**: MVP (Phase 1)
- **Parallel Work**: Can run in parallel with FOUND-004, FOUND-005

## Description
Set up the complete API layer using TanStack Query hooks for all data fetching operations. Create typed hooks for listings, bookings, users, and other entities that will be used throughout the application.

## Context
TanStack Query provides powerful data fetching, caching, and synchronization capabilities. This ticket creates all the custom hooks that feature screens will use to interact with the Appwrite backend. Having a centralized API layer ensures consistent data handling across the app.

## Implementation Requirements

### 1. Type Definitions

**File**: `types/models.ts`

```typescript
import { Models } from 'react-native-appwrite';

// User types
export interface User extends Models.Document {
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: 'basic' | 'business' | 'admin';
  createdAt: string;
}

export interface UserProfile extends Models.Document {
  userId: string;
  bio?: string;
  notificationPreferences: NotificationPreferences;
}

export interface NotificationPreferences {
  bookingConfirmations: boolean;
  bookingReminders: boolean;
  promotions: boolean;
  messages: boolean;
}

// Business types
export interface BusinessProfile extends Models.Document {
  userId: string;
  businessName: string;
  description: string;
  category: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  logoUrl?: string;
  website?: string;
  isVerified: boolean;
  rating: number;
  reviewCount: number;
}

// Listing types
export interface Listing extends Models.Document {
  businessId: string;
  title: string;
  description: string;
  category: ListingCategory;
  price: number;
  priceUnit: 'per_night' | 'per_person' | 'per_event' | 'flat_rate';
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
  images: string[];
  amenities: string[];
  maxGuests?: number;
  rating: number;
  reviewCount: number;
  isActive: boolean;
  isFeatured: boolean;
}

export type ListingCategory =
  | 'hotel'
  | 'event_venue'
  | 'travel_package'
  | 'restaurant'
  | 'spa'
  | 'tour'
  | 'transportation'
  | 'other';

export interface ListingAvailability extends Models.Document {
  listingId: string;
  date: string;
  isAvailable: boolean;
  slots?: number;
}

// Booking types
export interface Booking extends Models.Document {
  userId: string;
  listingId: string;
  businessId: string;
  date: string;
  time: string;
  guests: number;
  specialRequests?: string;
  status: BookingStatus;
  totalPrice: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  createdAt: string;
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'refunded'
  | 'failed';

// Payment types
export interface Payment extends Models.Document {
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  method: 'stripe' | 'orange_money' | 'mtn_money';
  status: PaymentStatus;
  transactionId?: string;
  createdAt: string;
}

export interface PaymentMethod extends Models.Document {
  userId: string;
  type: 'card' | 'orange_money' | 'mtn_money';
  last4?: string;
  phone?: string;
  isDefault: boolean;
}

// Review types
export interface Review extends Models.Document {
  userId: string;
  listingId: string;
  bookingId: string;
  rating: number;
  title?: string;
  content: string;
  images?: string[];
  response?: string;
  responseAt?: string;
  createdAt: string;
}
```

### 2. Listings Hooks

**File**: `hooks/api/useListings.ts`

```typescript
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { Query } from 'react-native-appwrite';
import { databases } from '@/lib/appwrite/client';
import { collections } from '@/lib/appwrite/collections';
import { Listing, ListingCategory, ListingAvailability } from '@/types/models';

const LISTINGS_PER_PAGE = 20;

// Query keys
export const listingKeys = {
  all: ['listings'] as const,
  lists: () => [...listingKeys.all, 'list'] as const,
  list: (filters: ListingFilters) => [...listingKeys.lists(), filters] as const,
  details: () => [...listingKeys.all, 'detail'] as const,
  detail: (id: string) => [...listingKeys.details(), id] as const,
  featured: () => [...listingKeys.all, 'featured'] as const,
  availability: (id: string) => [...listingKeys.all, 'availability', id] as const,
};

export interface ListingFilters {
  category?: ListingCategory;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  search?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'newest';
}

// Fetch all listings with filters
export function useListings(filters: ListingFilters = {}) {
  return useInfiniteQuery({
    queryKey: listingKeys.list(filters),
    queryFn: async ({ pageParam = 0 }) => {
      const queries: string[] = [
        Query.equal('isActive', true),
        Query.limit(LISTINGS_PER_PAGE),
        Query.offset(pageParam),
      ];

      if (filters.category) {
        queries.push(Query.equal('category', filters.category));
      }
      if (filters.city) {
        queries.push(Query.equal('city', filters.city));
      }
      if (filters.minPrice !== undefined) {
        queries.push(Query.greaterThanEqual('price', filters.minPrice));
      }
      if (filters.maxPrice !== undefined) {
        queries.push(Query.lessThanEqual('price', filters.maxPrice));
      }
      if (filters.minRating !== undefined) {
        queries.push(Query.greaterThanEqual('rating', filters.minRating));
      }
      if (filters.search) {
        queries.push(Query.search('title', filters.search));
      }

      // Sorting
      switch (filters.sortBy) {
        case 'price_asc':
          queries.push(Query.orderAsc('price'));
          break;
        case 'price_desc':
          queries.push(Query.orderDesc('price'));
          break;
        case 'rating':
          queries.push(Query.orderDesc('rating'));
          break;
        case 'newest':
        default:
          queries.push(Query.orderDesc('$createdAt'));
      }

      const response = await databases.listDocuments(
        collections.LISTINGS.databaseId,
        collections.LISTINGS.collectionId,
        queries
      );

      return {
        listings: response.documents as Listing[],
        total: response.total,
        hasMore: pageParam + LISTINGS_PER_PAGE < response.total,
      };
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.length * LISTINGS_PER_PAGE;
    },
    initialPageParam: 0,
  });
}

// Fetch single listing
export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: listingKeys.detail(id!),
    queryFn: async () => {
      const doc = await databases.getDocument(
        collections.LISTINGS.databaseId,
        collections.LISTINGS.collectionId,
        id!
      );
      return doc as Listing;
    },
    enabled: !!id,
  });
}

// Fetch featured listings
export function useFeaturedListings() {
  return useQuery({
    queryKey: listingKeys.featured(),
    queryFn: async () => {
      const response = await databases.listDocuments(
        collections.LISTINGS.databaseId,
        collections.LISTINGS.collectionId,
        [
          Query.equal('isActive', true),
          Query.equal('isFeatured', true),
          Query.orderDesc('rating'),
          Query.limit(10),
        ]
      );
      return response.documents as Listing[];
    },
  });
}

// Fetch listing availability
export function useListingAvailability(listingId: string, startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: listingKeys.availability(listingId),
    queryFn: async () => {
      const response = await databases.listDocuments(
        collections.LISTING_AVAILABILITY.databaseId,
        collections.LISTING_AVAILABILITY.collectionId,
        [
          Query.equal('listingId', listingId),
          Query.greaterThanEqual('date', startDate.toISOString()),
          Query.lessThanEqual('date', endDate.toISOString()),
        ]
      );
      return response.documents as ListingAvailability[];
    },
    enabled: !!listingId,
  });
}
```

### 3. Bookings Hooks

**File**: `hooks/api/useBookings.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Query } from 'react-native-appwrite';
import { databases } from '@/lib/appwrite/client';
import { collections } from '@/lib/appwrite/collections';
import { Booking, BookingStatus } from '@/types/models';
import { useAuth } from '@/lib/auth/AuthContext';

export const bookingKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingKeys.all, 'list'] as const,
  list: (filters: { status?: BookingStatus; type?: 'upcoming' | 'past' }) =>
    [...bookingKeys.lists(), filters] as const,
  details: () => [...bookingKeys.all, 'detail'] as const,
  detail: (id: string) => [...bookingKeys.details(), id] as const,
};

// Fetch user's bookings
export function useUserBookings(type: 'upcoming' | 'past' = 'upcoming') {
  const { user } = useAuth();

  return useQuery({
    queryKey: bookingKeys.list({ type }),
    queryFn: async () => {
      const now = new Date().toISOString();
      const queries = [
        Query.equal('userId', user!.$id),
        Query.orderDesc('date'),
      ];

      if (type === 'upcoming') {
        queries.push(Query.greaterThanEqual('date', now));
        queries.push(Query.notEqual('status', 'cancelled'));
      } else {
        queries.push(Query.lessThan('date', now));
      }

      const response = await databases.listDocuments(
        collections.BOOKINGS.databaseId,
        collections.BOOKINGS.collectionId,
        queries
      );
      return response.documents as Booking[];
    },
    enabled: !!user,
  });
}

// Fetch single booking
export function useBooking(id: string | undefined) {
  return useQuery({
    queryKey: bookingKeys.detail(id!),
    queryFn: async () => {
      const doc = await databases.getDocument(
        collections.BOOKINGS.databaseId,
        collections.BOOKINGS.collectionId,
        id!
      );
      return doc as Booking;
    },
    enabled: !!id,
  });
}

// Create booking mutation
export function useCreateBooking() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      listingId: string;
      businessId: string;
      date: string;
      time: string;
      guests: number;
      specialRequests?: string;
      totalPrice: number;
    }) => {
      const booking = await databases.createDocument(
        collections.BOOKINGS.databaseId,
        collections.BOOKINGS.collectionId,
        'unique()',
        {
          ...data,
          userId: user!.$id,
          status: 'pending',
          paymentStatus: 'pending',
          createdAt: new Date().toISOString(),
        }
      );
      return booking as Booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
  });
}

// Cancel booking mutation
export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const booking = await databases.updateDocument(
        collections.BOOKINGS.databaseId,
        collections.BOOKINGS.collectionId,
        bookingId,
        { status: 'cancelled' }
      );
      return booking as Booking;
    },
    onSuccess: (_, bookingId) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(bookingId) });
    },
  });
}

// Modify booking mutation
export function useModifyBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      data
    }: {
      bookingId: string;
      data: Partial<Pick<Booking, 'date' | 'time' | 'guests' | 'specialRequests'>>
    }) => {
      const booking = await databases.updateDocument(
        collections.BOOKINGS.databaseId,
        collections.BOOKINGS.collectionId,
        bookingId,
        data
      );
      return booking as Booking;
    },
    onSuccess: (_, { bookingId }) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(bookingId) });
    },
  });
}
```

### 4. Reviews Hooks

**File**: `hooks/api/useReviews.ts`

```typescript
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { Query } from 'react-native-appwrite';
import { databases } from '@/lib/appwrite/client';
import { collections } from '@/lib/appwrite/collections';
import { Review } from '@/types/models';
import { useAuth } from '@/lib/auth/AuthContext';

export const reviewKeys = {
  all: ['reviews'] as const,
  lists: () => [...reviewKeys.all, 'list'] as const,
  listByListing: (listingId: string) => [...reviewKeys.lists(), 'listing', listingId] as const,
  listByUser: (userId: string) => [...reviewKeys.lists(), 'user', userId] as const,
};

// Fetch reviews for a listing
export function useListingReviews(listingId: string) {
  return useInfiniteQuery({
    queryKey: reviewKeys.listByListing(listingId),
    queryFn: async ({ pageParam = 0 }) => {
      const response = await databases.listDocuments(
        collections.REVIEWS.databaseId,
        collections.REVIEWS.collectionId,
        [
          Query.equal('listingId', listingId),
          Query.orderDesc('$createdAt'),
          Query.limit(10),
          Query.offset(pageParam),
        ]
      );
      return {
        reviews: response.documents as Review[],
        total: response.total,
        hasMore: pageParam + 10 < response.total,
      };
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.length * 10;
    },
    initialPageParam: 0,
  });
}

// Create review mutation
export function useCreateReview() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      listingId: string;
      bookingId: string;
      rating: number;
      title?: string;
      content: string;
      images?: string[];
    }) => {
      const review = await databases.createDocument(
        collections.REVIEWS.databaseId,
        collections.REVIEWS.collectionId,
        'unique()',
        {
          ...data,
          userId: user!.$id,
          createdAt: new Date().toISOString(),
        }
      );
      return review as Review;
    },
    onSuccess: (review) => {
      queryClient.invalidateQueries({
        queryKey: reviewKeys.listByListing(review.listingId)
      });
    },
  });
}
```

### 5. User Profile Hooks

**File**: `hooks/api/useProfile.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Query } from 'react-native-appwrite';
import { databases, storage } from '@/lib/appwrite/client';
import { collections, buckets } from '@/lib/appwrite/collections';
import { UserProfile, BusinessProfile } from '@/types/models';
import { useAuth } from '@/lib/auth/AuthContext';

export const profileKeys = {
  all: ['profile'] as const,
  user: (userId: string) => [...profileKeys.all, 'user', userId] as const,
  business: (userId: string) => [...profileKeys.all, 'business', userId] as const,
};

// Fetch user profile
export function useUserProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: profileKeys.user(user?.$id ?? ''),
    queryFn: async () => {
      const response = await databases.listDocuments(
        collections.USER_PROFILES.databaseId,
        collections.USER_PROFILES.collectionId,
        [Query.equal('userId', user!.$id)]
      );
      return response.documents[0] as UserProfile | undefined;
    },
    enabled: !!user,
  });
}

// Update user profile
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user, refreshUser } = useAuth();

  return useMutation({
    mutationFn: async (data: { name?: string; avatarUrl?: string; bio?: string }) => {
      // Update Appwrite account if name changed
      if (data.name) {
        const { account } = await import('@/lib/appwrite/client');
        await account.updateName(data.name);
      }

      // Update profile document
      const existingProfile = await databases.listDocuments(
        collections.USER_PROFILES.databaseId,
        collections.USER_PROFILES.collectionId,
        [Query.equal('userId', user!.$id)]
      );

      if (existingProfile.documents.length > 0) {
        return databases.updateDocument(
          collections.USER_PROFILES.databaseId,
          collections.USER_PROFILES.collectionId,
          existingProfile.documents[0].$id,
          data
        );
      } else {
        return databases.createDocument(
          collections.USER_PROFILES.databaseId,
          collections.USER_PROFILES.collectionId,
          'unique()',
          { userId: user!.$id, ...data }
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.user(user!.$id) });
      refreshUser();
    },
  });
}

// Upload avatar
export function useUploadAvatar() {
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();

  return useMutation({
    mutationFn: async (file: { uri: string; name: string; type: string }) => {
      const response = await storage.createFile(
        buckets.PROFILE_IMAGES,
        'unique()',
        {
          uri: file.uri,
          name: file.name,
          type: file.type,
        } as any
      );

      const fileUrl = storage.getFileView(buckets.PROFILE_IMAGES, response.$id);

      await updateProfile.mutateAsync({ avatarUrl: fileUrl.toString() });

      return fileUrl.toString();
    },
  });
}

// Fetch business profile
export function useBusinessProfile(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId ?? user?.$id;

  return useQuery({
    queryKey: profileKeys.business(targetUserId ?? ''),
    queryFn: async () => {
      const response = await databases.listDocuments(
        collections.BUSINESS_PROFILES.databaseId,
        collections.BUSINESS_PROFILES.collectionId,
        [Query.equal('userId', targetUserId!)]
      );
      return response.documents[0] as BusinessProfile | undefined;
    },
    enabled: !!targetUserId,
  });
}
```

### 6. Categories Hook

**File**: `hooks/api/useCategories.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { databases } from '@/lib/appwrite/client';
import { collections } from '@/lib/appwrite/collections';
import { Models } from 'react-native-appwrite';

interface Category extends Models.Document {
  name: string;
  slug: string;
  icon: string;
  description?: string;
  listingCount: number;
}

export const categoryKeys = {
  all: ['categories'] as const,
};

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: async () => {
      const response = await databases.listDocuments(
        collections.LISTING_CATEGORIES.databaseId,
        collections.LISTING_CATEGORIES.collectionId
      );
      return response.documents as Category[];
    },
    staleTime: 1000 * 60 * 60, // 1 hour - categories rarely change
  });
}
```

### 7. Hooks Export

**File**: `hooks/api/index.ts`

```typescript
export * from './useListings';
export * from './useBookings';
export * from './useReviews';
export * from './useProfile';
export * from './useCategories';
```

### 8. Main Hooks Export

**File**: `hooks/index.ts`

```typescript
export * from './api';
```

## Acceptance Criteria

- [ ] Type definitions created for all entities
- [ ] Listing hooks: list, detail, featured, availability
- [ ] Booking hooks: list, detail, create, cancel, modify
- [ ] Review hooks: list by listing, create
- [ ] Profile hooks: get, update, upload avatar
- [ ] Business profile hooks: get
- [ ] Category hooks: list
- [ ] All hooks use proper query keys for caching
- [ ] Mutations invalidate relevant queries
- [ ] Infinite query support for paginated data
- [ ] TypeScript types are correct throughout

## Testing Checklist

- [ ] Listings load correctly with filters
- [ ] Infinite scroll loads more listings
- [ ] Single listing fetches correctly
- [ ] Bookings list shows user's bookings
- [ ] Creating booking adds to list
- [ ] Cancelling booking updates status
- [ ] Reviews load for listing
- [ ] Creating review invalidates list
- [ ] Profile updates reflect immediately
- [ ] Avatar upload works

## Files to Create

| File | Description |
|------|-------------|
| `types/models.ts` | TypeScript interfaces for all entities |
| `hooks/api/useListings.ts` | Listing-related hooks |
| `hooks/api/useBookings.ts` | Booking-related hooks |
| `hooks/api/useReviews.ts` | Review-related hooks |
| `hooks/api/useProfile.ts` | User profile hooks |
| `hooks/api/useCategories.ts` | Category hooks |
| `hooks/api/index.ts` | API hooks barrel export |
| `hooks/index.ts` | Main hooks barrel export |

## Notes for AI Agent

- Query keys are structured for granular cache invalidation
- Use `useInfiniteQuery` for lists that support pagination
- All mutations should invalidate relevant queries on success
- The `enabled` option prevents queries from running without required data
- Consider optimistic updates for better UX in mutations
- File upload format may need adjustment based on Expo's file picker output
