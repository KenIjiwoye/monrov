# UPROF-001: User Profile Creation & Management

## Ticket Information
- **ID**: UPROF-001
- **Priority**: High
- **Dependencies**: FOUND-001, FOUND-003, FOUND-004, FOUND-005, FOUND-006
- **Phase**: MVP (Phase 1)
- **Parallel Work**: Can run in parallel with BPROF-001, AUTH-001

## Description
Create the basic user profile system that allows regular users (non-business) to create and manage their personal profiles. This includes profile creation, viewing, and editing functionality with proper data validation and storage in Appwrite.

## Context
Basic users need profiles to interact with the platform - booking services, leaving reviews, and managing their account. This is separate from business profiles (BPROF-001) and serves the consumer side of the marketplace.

## Database Schema Updates

### User Profile Collection in Appwrite

**Collection Name**: `user_profiles`

**Attributes**:
| Attribute | Type | Size | Required | Default | Description |
|-----------|------|------|----------|---------|-------------|
| userId | string | 36 | Yes | - | Reference to Appwrite Auth user ID (indexed, unique) |
| fullName | string | 100 | Yes | - | User's full name |
| displayName | string | 50 | No | - | Public display name (if different from full name) |
| bio | string | 500 | No | - | Short bio or description |
| phone | string | 20 | No | - | Liberian phone number (+231XXXXXXXXX) |
| email | string | 255 | Yes | - | User's email (from Auth, duplicated for queries) |
| avatar | string | 255 | No | - | URL to profile image in storage |
| dateOfBirth | datetime | - | No | - | User's date of birth |
| city | string | 50 | No | - | User's city |
| address | string | 255 | No | - | User's address |
| preferredPaymentMethod | string | 20 | No | - | Enum: 'card', 'orange_money', 'mtn_money' |
| emailVerified | boolean | - | Yes | false | Whether email is verified |
| phoneVerified | boolean | - | Yes | false | Whether phone is verified |
| accountStatus | string | 20 | Yes | 'active' | Enum: 'active', 'suspended', 'inactive' |
| notificationPreferences | json | - | Yes | {} | Notification settings object |
| bookingCount | number | - | Yes | 0 | Total bookings made |
| reviewCount | number | - | Yes | 0 | Total reviews written |
| createdAt | datetime | - | Yes | now() | Profile creation timestamp |
| updatedAt | datetime | - | Yes | now() | Last update timestamp |

**Indexes**:
- `userId` - Unique index for fast user lookups
- `email` - Index for email searches
- `accountStatus` - Index for filtering active users

**Permissions**:
- Read: User (own profile), Admins
- Write: User (own profile), Admins
- Create: Any authenticated user
- Delete: Admins only

## Implementation Requirements

### 1. Update Collection Constants

**File**: `lib/appwrite/collections.ts` (Update existing file)

```typescript
import { config } from '@/lib/config';

const DB = config.appwrite.databaseId;

export const collections = {
  // User related
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

### 2. User Profile Types

**File**: `types/profile.ts`

```typescript
import { Models } from 'react-native-appwrite';

export type PaymentMethod = 'card' | 'orange_money' | 'mtn_money';
export type AccountStatus = 'active' | 'suspended' | 'inactive';

export interface NotificationPreferences {
  bookingConfirmations: boolean;
  bookingReminders: boolean;
  bookingUpdates: boolean;
  promotional: boolean;
  reviewReminders: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

export interface UserProfile extends Models.Document {
  userId: string;
  fullName: string;
  displayName?: string;
  bio?: string;
  phone?: string;
  email: string;
  avatar?: string;
  dateOfBirth?: string;
  city?: string;
  address?: string;
  preferredPaymentMethod?: PaymentMethod;
  emailVerified: boolean;
  phoneVerified: boolean;
  accountStatus: AccountStatus;
  notificationPreferences: NotificationPreferences;
  bookingCount: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export const defaultNotificationPreferences: NotificationPreferences = {
  bookingConfirmations: true,
  bookingReminders: true,
  bookingUpdates: true,
  promotional: true,
  reviewReminders: true,
  emailNotifications: true,
  pushNotifications: true,
};
```

### 3. Update User Profile Validation Schema

**File**: `lib/validations/profile.ts` (Update existing file)

```typescript
import { z } from 'zod';
import { emailSchema, nameSchema, liberianPhoneSchema } from './common';

// User profile (basic users)
export const userProfileSchema = z.object({
  fullName: nameSchema,
  displayName: z.string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name must be less than 50 characters')
    .optional()
    .or(z.literal('')),
  bio: z.string()
    .max(500, 'Bio must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  phone: liberianPhoneSchema.optional().or(z.literal('')),
  city: z.string()
    .min(2, 'City must be at least 2 characters')
    .optional()
    .or(z.literal('')),
  address: z.string()
    .min(5, 'Address must be at least 5 characters')
    .optional()
    .or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
});

// Notification preferences
export const notificationPreferencesSchema = z.object({
  bookingConfirmations: z.boolean(),
  bookingReminders: z.boolean(),
  bookingUpdates: z.boolean(),
  promotional: z.boolean(),
  reviewReminders: z.boolean(),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
});

// Business profile (for business users)
export const businessProfileSchema = z.object({
  businessName: z.string()
    .min(2, 'Business name must be at least 2 characters')
    .max(100, 'Business name must be less than 100 characters'),
  description: z.string()
    .min(20, 'Description must be at least 20 characters')
    .max(1000, 'Description must be less than 1000 characters'),
  category: z.string().min(1, 'Please select a category'),
  phone: liberianPhoneSchema,
  email: emailSchema,
  address: z.string().min(5, 'Please enter your business address'),
  city: z.string().min(2, 'Please enter your city'),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});

export type UserProfileFormData = z.infer<typeof userProfileSchema>;
export type NotificationPreferencesFormData = z.infer<typeof notificationPreferencesSchema>;
export type BusinessProfileFormData = z.infer<typeof businessProfileSchema>;
```

### 4. User Profile API Hooks

**File**: `hooks/api/useUserProfile.ts`

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { databases, storage } from '@/lib/appwrite/client';
import { collections, buckets } from '@/lib/appwrite/collections';
import { useAuth } from '@/lib/auth/AuthContext';
import { UserProfile, defaultNotificationPreferences } from '@/types/profile';
import { UserProfileFormData, NotificationPreferencesFormData } from '@/lib/validations/profile';
import { Query } from 'react-native-appwrite';
import { handleAppwriteError } from '@/lib/appwrite/errors';
import * as ImagePicker from 'expo-image-picker';

// Get current user's profile
export function useUserProfile() {
  const { user } = useAuth();

  return useQuery<UserProfile | null>({
    queryKey: ['profile', 'user', user?.$id],
    queryFn: async () => {
      if (!user?.$id) return null;

      try {
        const response = await databases.listDocuments(
          collections.USER_PROFILES.databaseId,
          collections.USER_PROFILES.collectionId,
          [Query.equal('userId', user.$id), Query.limit(1)]
        );

        return response.documents[0] as UserProfile || null;
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        return null;
      }
    },
    enabled: !!user?.$id,
  });
}

// Create user profile
export function useCreateUserProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: UserProfileFormData) => {
      if (!user?.$id) throw new Error('User not authenticated');

      const profile = await databases.createDocument(
        collections.USER_PROFILES.databaseId,
        collections.USER_PROFILES.collectionId,
        'unique()',
        {
          userId: user.$id,
          fullName: data.fullName,
          displayName: data.displayName || data.fullName,
          bio: data.bio || '',
          phone: data.phone || '',
          email: user.email,
          city: data.city || '',
          address: data.address || '',
          dateOfBirth: data.dateOfBirth || null,
          emailVerified: user.emailVerification || false,
          phoneVerified: false,
          accountStatus: 'active',
          notificationPreferences: defaultNotificationPreferences,
          bookingCount: 0,
          reviewCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      );

      return profile as UserProfile;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', 'user', user?.$id], data);
      queryClient.invalidateQueries({ queryKey: ['profile', 'user'] });
    },
    onError: (error) => {
      const appError = handleAppwriteError(error);
      console.error('Failed to create profile:', appError);
      throw appError;
    },
  });
}

// Update user profile
export function useUpdateUserProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ profileId, data }: { profileId: string; data: Partial<UserProfileFormData> }) => {
      const profile = await databases.updateDocument(
        collections.USER_PROFILES.databaseId,
        collections.USER_PROFILES.collectionId,
        profileId,
        {
          ...data,
          updatedAt: new Date().toISOString(),
        }
      );

      return profile as UserProfile;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', 'user', user?.$id], data);
      queryClient.invalidateQueries({ queryKey: ['profile', 'user'] });
    },
    onError: (error) => {
      const appError = handleAppwriteError(error);
      console.error('Failed to update profile:', appError);
      throw appError;
    },
  });
}

// Update notification preferences
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      profileId,
      preferences
    }: {
      profileId: string;
      preferences: NotificationPreferencesFormData
    }) => {
      const profile = await databases.updateDocument(
        collections.USER_PROFILES.databaseId,
        collections.USER_PROFILES.collectionId,
        profileId,
        {
          notificationPreferences: preferences,
          updatedAt: new Date().toISOString(),
        }
      );

      return profile as UserProfile;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', 'user', user?.$id], data);
      queryClient.invalidateQueries({ queryKey: ['profile', 'user'] });
    },
  });
}

// Upload profile avatar
export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ profileId, imageUri }: { profileId: string; imageUri: string }) => {
      // Upload to Appwrite storage
      const file = await storage.createFile(
        buckets.PROFILE_IMAGES,
        'unique()',
        {
          name: `avatar-${user?.$id}-${Date.now()}`,
          type: 'image/jpeg',
          uri: imageUri,
        } as any
      );

      // Get file URL
      const fileUrl = storage.getFileView(buckets.PROFILE_IMAGES, file.$id);

      // Update profile with new avatar URL
      const profile = await databases.updateDocument(
        collections.USER_PROFILES.databaseId,
        collections.USER_PROFILES.collectionId,
        profileId,
        {
          avatar: fileUrl.href,
          updatedAt: new Date().toISOString(),
        }
      );

      return profile as UserProfile;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', 'user', user?.$id], data);
      queryClient.invalidateQueries({ queryKey: ['profile', 'user'] });
    },
  });
}

// Helper to pick and upload avatar
export async function pickAndUploadAvatar() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (status !== 'granted') {
    throw new Error('Permission to access photos is required');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled) {
    return null;
  }

  return result.assets[0].uri;
}
```

### 5. Profile Setup Screen (First Time)

**File**: `app/(auth)/profile-setup.tsx`

```typescript
import { useState } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, XStack, Text, TextArea, Avatar } from 'tamagui';
import { Stack, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, MapPin, Phone, Calendar, Camera } from '@tamagui/lucide-icons';

import { Button, Card } from '@/components/ui';
import { FormInput, FormSelect, PhoneInput } from '@/components/forms';
import { userProfileSchema, UserProfileFormData } from '@/lib/validations/profile';
import { useCreateUserProfile, useUploadAvatar, pickAndUploadAvatar } from '@/hooks/api/useUserProfile';
import { useAuth } from '@/lib/auth/AuthContext';

export default function ProfileSetupScreen() {
  const { user } = useAuth();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const createProfile = useCreateUserProfile();
  const uploadAvatar = useUploadAvatar();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UserProfileFormData>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      fullName: user?.name || '',
      displayName: '',
      bio: '',
      phone: '',
      city: '',
      address: '',
      dateOfBirth: '',
    },
  });

  const cityOptions = [
    { label: 'Monrovia', value: 'Monrovia' },
    { label: 'Buchanan', value: 'Buchanan' },
    { label: 'Gbarnga', value: 'Gbarnga' },
    { label: 'Kakata', value: 'Kakata' },
    { label: 'Voinjama', value: 'Voinjama' },
    { label: 'Other', value: 'Other' },
  ];

  const handlePickImage = async () => {
    try {
      const uri = await pickAndUploadAvatar();
      if (uri) {
        setAvatarUri(uri);
      }
    } catch (error) {
      console.error('Failed to pick image:', error);
    }
  };

  const onSubmit = async (data: UserProfileFormData) => {
    try {
      const profile = await createProfile.mutateAsync(data);

      // Upload avatar if selected
      if (avatarUri && profile.$id) {
        await uploadAvatar.mutateAsync({
          profileId: profile.$id,
          imageUri: avatarUri,
        });
      }

      // Navigate to home
      router.replace('/(tabs)');
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Complete Your Profile',
          headerBackVisible: false,
        }}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <YStack padding="$4" gap="$5">
              <YStack alignItems="center" gap="$3">
                <Text fontSize="$7" fontWeight="700" textAlign="center">
                  Welcome to 231Booking!
                </Text>
                <Text color="$gray500" textAlign="center">
                  Let's set up your profile to get started
                </Text>
              </YStack>

              {/* Avatar Upload */}
              <YStack alignItems="center" gap="$2">
                <Avatar circular size="$10" onPress={handlePickImage}>
                  {avatarUri ? (
                    <Avatar.Image src={avatarUri} />
                  ) : (
                    <Avatar.Fallback backgroundColor="$gray200">
                      <User size={40} color="$gray400" />
                    </Avatar.Fallback>
                  )}
                </Avatar>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={handlePickImage}
                  icon={<Camera size={16} />}
                >
                  {avatarUri ? 'Change Photo' : 'Add Photo'}
                </Button>
              </YStack>

              {/* Form Fields */}
              <YStack gap="$4">
                <FormInput
                  control={control}
                  name="fullName"
                  label="Full Name"
                  placeholder="Enter your full name"
                  leftIcon={<User size={18} color="$gray400" />}
                />

                <FormInput
                  control={control}
                  name="displayName"
                  label="Display Name (Optional)"
                  placeholder="How should we call you?"
                  leftIcon={<User size={18} color="$gray400" />}
                />

                <YStack gap="$1">
                  <Text fontSize="$3" fontWeight="500" color="$gray700">
                    Bio (Optional)
                  </Text>
                  <Controller
                    control={control}
                    name="bio"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <TextArea
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="Tell us a bit about yourself..."
                        numberOfLines={4}
                        minHeight={100}
                      />
                    )}
                  />
                  {errors.bio && (
                    <Text color="$error" fontSize="$2">
                      {errors.bio.message}
                    </Text>
                  )}
                </YStack>

                <PhoneInput
                  control={control}
                  name="phone"
                  label="Phone Number (Optional)"
                />

                <FormSelect
                  control={control}
                  name="city"
                  label="City (Optional)"
                  placeholder="Select your city"
                  options={cityOptions}
                />

                <FormInput
                  control={control}
                  name="address"
                  label="Address (Optional)"
                  placeholder="Enter your address"
                  leftIcon={<MapPin size={18} color="$gray400" />}
                />

                <FormInput
                  control={control}
                  name="dateOfBirth"
                  label="Date of Birth (Optional)"
                  placeholder="YYYY-MM-DD"
                  leftIcon={<Calendar size={18} color="$gray400" />}
                />
              </YStack>

              <Button
                size="lg"
                fullWidth
                loading={createProfile.isPending || uploadAvatar.isPending}
                onPress={handleSubmit(onSubmit)}
              >
                Complete Setup
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onPress={() => router.replace('/(tabs)')}
              >
                Skip for Now
              </Button>
            </YStack>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
```

### 6. View Profile Screen

**File**: `app/(tabs)/profile/index.tsx`

```typescript
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, XStack, Text, Avatar, Separator } from 'tamagui';
import { Stack, router } from 'expo-router';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Settings,
  Bell,
  CreditCard,
  LogOut,
  ChevronRight,
} from '@tamagui/lucide-icons';

import { Button, Card } from '@/components/ui';
import { useUserProfile } from '@/hooks/api/useUserProfile';
import { useAuth } from '@/lib/auth/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { data: profile, isLoading } = useUserProfile();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Text>Loading profile...</Text>
        </YStack>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <YStack flex={1} alignItems="center" justifyContent="center" padding="$4" gap="$4">
          <User size={64} color="$gray400" />
          <Text fontSize="$6" fontWeight="600">
            No Profile Found
          </Text>
          <Text color="$gray500" textAlign="center">
            Let's create your profile to get started
          </Text>
          <Button onPress={() => router.push('/(auth)/profile-setup')}>
            Create Profile
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
          headerTitle: 'Profile',
        }}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView>
          <YStack padding="$4" gap="$5">
            {/* Profile Header */}
            <Card padding="$4">
              <YStack alignItems="center" gap="$3">
                <Avatar circular size="$10">
                  {profile.avatar ? (
                    <Avatar.Image src={profile.avatar} />
                  ) : (
                    <Avatar.Fallback backgroundColor="$gray200">
                      <User size={40} color="$gray400" />
                    </Avatar.Fallback>
                  )}
                </Avatar>

                <YStack alignItems="center" gap="$1">
                  <Text fontSize="$6" fontWeight="700">
                    {profile.displayName || profile.fullName}
                  </Text>
                  <Text color="$gray500">{profile.email}</Text>
                </YStack>

                {profile.bio && (
                  <Text color="$gray600" textAlign="center" paddingHorizontal="$4">
                    {profile.bio}
                  </Text>
                )}

                <XStack gap="$4" paddingTop="$2">
                  <YStack alignItems="center" gap="$1">
                    <Text fontSize="$6" fontWeight="700">
                      {profile.bookingCount}
                    </Text>
                    <Text fontSize="$2" color="$gray500">
                      Bookings
                    </Text>
                  </YStack>
                  <YStack alignItems="center" gap="$1">
                    <Text fontSize="$6" fontWeight="700">
                      {profile.reviewCount}
                    </Text>
                    <Text fontSize="$2" color="$gray500">
                      Reviews
                    </Text>
                  </YStack>
                </XStack>

                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => router.push('/(tabs)/profile/edit')}
                >
                  Edit Profile
                </Button>
              </YStack>
            </Card>

            {/* Profile Details */}
            <Card>
              <YStack>
                {profile.phone && (
                  <>
                    <XStack padding="$4" gap="$3" alignItems="center">
                      <Phone size={20} color="$gray400" />
                      <YStack flex={1}>
                        <Text fontSize="$2" color="$gray500">
                          Phone
                        </Text>
                        <Text>{profile.phone}</Text>
                      </YStack>
                    </XStack>
                    <Separator />
                  </>
                )}

                {profile.city && (
                  <>
                    <XStack padding="$4" gap="$3" alignItems="center">
                      <MapPin size={20} color="$gray400" />
                      <YStack flex={1}>
                        <Text fontSize="$2" color="$gray500">
                          City
                        </Text>
                        <Text>{profile.city}</Text>
                      </YStack>
                    </XStack>
                    <Separator />
                  </>
                )}

                {profile.dateOfBirth && (
                  <XStack padding="$4" gap="$3" alignItems="center">
                    <Calendar size={20} color="$gray400" />
                    <YStack flex={1}>
                      <Text fontSize="$2" color="$gray500">
                        Date of Birth
                      </Text>
                      <Text>{new Date(profile.dateOfBirth).toLocaleDateString()}</Text>
                    </YStack>
                  </XStack>
                )}
              </YStack>
            </Card>

            {/* Settings Menu */}
            <Card>
              <YStack>
                <XStack
                  padding="$4"
                  gap="$3"
                  alignItems="center"
                  pressStyle={{ backgroundColor: '$gray50' }}
                  onPress={() => router.push('/(tabs)/profile/notifications')}
                >
                  <Bell size={20} color="$gray400" />
                  <Text flex={1}>Notifications</Text>
                  <ChevronRight size={20} color="$gray400" />
                </XStack>

                <Separator />

                <XStack
                  padding="$4"
                  gap="$3"
                  alignItems="center"
                  pressStyle={{ backgroundColor: '$gray50' }}
                  onPress={() => router.push('/(tabs)/profile/payment-methods')}
                >
                  <CreditCard size={20} color="$gray400" />
                  <Text flex={1}>Payment Methods</Text>
                  <ChevronRight size={20} color="$gray400" />
                </XStack>

                <Separator />

                <XStack
                  padding="$4"
                  gap="$3"
                  alignItems="center"
                  pressStyle={{ backgroundColor: '$gray50' }}
                  onPress={() => router.push('/(tabs)/profile/settings')}
                >
                  <Settings size={20} color="$gray400" />
                  <Text flex={1}>Settings</Text>
                  <ChevronRight size={20} color="$gray400" />
                </XStack>
              </YStack>
            </Card>

            {/* Logout Button */}
            <Button
              variant="outline"
              size="lg"
              fullWidth
              icon={<LogOut size={20} />}
              onPress={handleLogout}
            >
              Log Out
            </Button>
          </YStack>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
```

### 7. Edit Profile Screen

**File**: `app/(tabs)/profile/edit.tsx`

```typescript
import { useState } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, Text, TextArea, Avatar } from 'tamagui';
import { Stack, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, MapPin, Calendar, Camera, ArrowLeft } from '@tamagui/lucide-icons';

import { Button } from '@/components/ui';
import { FormInput, FormSelect, PhoneInput } from '@/components/forms';
import { userProfileSchema, UserProfileFormData } from '@/lib/validations/profile';
import { useUserProfile, useUpdateUserProfile, useUploadAvatar, pickAndUploadAvatar } from '@/hooks/api/useUserProfile';

export default function EditProfileScreen() {
  const { data: profile } = useUserProfile();
  const updateProfile = useUpdateUserProfile();
  const uploadAvatar = useUploadAvatar();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<UserProfileFormData>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      fullName: profile?.fullName || '',
      displayName: profile?.displayName || '',
      bio: profile?.bio || '',
      phone: profile?.phone || '',
      city: profile?.city || '',
      address: profile?.address || '',
      dateOfBirth: profile?.dateOfBirth || '',
    },
  });

  const cityOptions = [
    { label: 'Monrovia', value: 'Monrovia' },
    { label: 'Buchanan', value: 'Buchanan' },
    { label: 'Gbarnga', value: 'Gbarnga' },
    { label: 'Kakata', value: 'Kakata' },
    { label: 'Voinjama', value: 'Voinjama' },
    { label: 'Other', value: 'Other' },
  ];

  const handlePickImage = async () => {
    try {
      const uri = await pickAndUploadAvatar();
      if (uri) {
        setAvatarUri(uri);
      }
    } catch (error) {
      console.error('Failed to pick image:', error);
    }
  };

  const onSubmit = async (data: UserProfileFormData) => {
    if (!profile?.$id) return;

    try {
      await updateProfile.mutateAsync({
        profileId: profile.$id,
        data,
      });

      // Upload new avatar if selected
      if (avatarUri) {
        await uploadAvatar.mutateAsync({
          profileId: profile.$id,
          imageUri: avatarUri,
        });
      }

      router.back();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Edit Profile',
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <YStack padding="$4" gap="$5">
              {/* Avatar */}
              <YStack alignItems="center" gap="$2">
                <Avatar circular size="$10" onPress={handlePickImage}>
                  {avatarUri || profile?.avatar ? (
                    <Avatar.Image src={avatarUri || profile?.avatar} />
                  ) : (
                    <Avatar.Fallback backgroundColor="$gray200">
                      <User size={40} color="$gray400" />
                    </Avatar.Fallback>
                  )}
                </Avatar>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={handlePickImage}
                  icon={<Camera size={16} />}
                >
                  Change Photo
                </Button>
              </YStack>

              {/* Form */}
              <YStack gap="$4">
                <FormInput
                  control={control}
                  name="fullName"
                  label="Full Name"
                  placeholder="Enter your full name"
                  leftIcon={<User size={18} color="$gray400" />}
                />

                <FormInput
                  control={control}
                  name="displayName"
                  label="Display Name"
                  placeholder="How should we call you?"
                  leftIcon={<User size={18} color="$gray400" />}
                />

                <YStack gap="$1">
                  <Text fontSize="$3" fontWeight="500" color="$gray700">
                    Bio
                  </Text>
                  <Controller
                    control={control}
                    name="bio"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <TextArea
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="Tell us about yourself..."
                        numberOfLines={4}
                        minHeight={100}
                      />
                    )}
                  />
                  {errors.bio && (
                    <Text color="$error" fontSize="$2">
                      {errors.bio.message}
                    </Text>
                  )}
                </YStack>

                <PhoneInput
                  control={control}
                  name="phone"
                  label="Phone Number"
                />

                <FormSelect
                  control={control}
                  name="city"
                  label="City"
                  placeholder="Select your city"
                  options={cityOptions}
                />

                <FormInput
                  control={control}
                  name="address"
                  label="Address"
                  placeholder="Enter your address"
                  leftIcon={<MapPin size={18} color="$gray400" />}
                />

                <FormInput
                  control={control}
                  name="dateOfBirth"
                  label="Date of Birth"
                  placeholder="YYYY-MM-DD"
                  leftIcon={<Calendar size={18} color="$gray400" />}
                />
              </YStack>

              <Button
                size="lg"
                fullWidth
                loading={updateProfile.isPending || uploadAvatar.isPending}
                disabled={!isDirty && !avatarUri}
                onPress={handleSubmit(onSubmit)}
              >
                Save Changes
              </Button>
            </YStack>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
```

### 8. Notification Preferences Screen

**File**: `app/(tabs)/profile/notifications.tsx`

```typescript
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, XStack, Text, Switch, Separator } from 'tamagui';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { ArrowLeft } from '@tamagui/lucide-icons';

import { Button, Card } from '@/components/ui';
import { useUserProfile, useUpdateNotificationPreferences } from '@/hooks/api/useUserProfile';
import { NotificationPreferences } from '@/types/profile';

export default function NotificationPreferencesScreen() {
  const { data: profile } = useUserProfile();
  const updatePreferences = useUpdateNotificationPreferences();

  const [preferences, setPreferences] = useState<NotificationPreferences>(
    profile?.notificationPreferences || {
      bookingConfirmations: true,
      bookingReminders: true,
      bookingUpdates: true,
      promotional: true,
      reviewReminders: true,
      emailNotifications: true,
      pushNotifications: true,
    }
  );

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    if (!profile?.$id) return;

    try {
      await updatePreferences.mutateAsync({
        profileId: profile.$id,
        preferences,
      });
      router.back();
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  };

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
          <YStack padding="$4" gap="$4">
            {/* Booking Notifications */}
            <Card>
              <YStack>
                <YStack padding="$3" paddingBottom="$2">
                  <Text fontSize="$2" fontWeight="600" color="$gray500">
                    BOOKING NOTIFICATIONS
                  </Text>
                </YStack>

                <XStack padding="$3" alignItems="center" justifyContent="space-between">
                  <YStack flex={1} paddingRight="$3">
                    <Text fontWeight="500">Booking Confirmations</Text>
                    <Text fontSize="$2" color="$gray500">
                      Get notified when your booking is confirmed
                    </Text>
                  </YStack>
                  <Switch
                    checked={preferences.bookingConfirmations}
                    onCheckedChange={() => handleToggle('bookingConfirmations')}
                  />
                </XStack>

                <Separator />

                <XStack padding="$3" alignItems="center" justifyContent="space-between">
                  <YStack flex={1} paddingRight="$3">
                    <Text fontWeight="500">Booking Reminders</Text>
                    <Text fontSize="$2" color="$gray500">
                      Receive reminders before your booking
                    </Text>
                  </YStack>
                  <Switch
                    checked={preferences.bookingReminders}
                    onCheckedChange={() => handleToggle('bookingReminders')}
                  />
                </XStack>

                <Separator />

                <XStack padding="$3" alignItems="center" justifyContent="space-between">
                  <YStack flex={1} paddingRight="$3">
                    <Text fontWeight="500">Booking Updates</Text>
                    <Text fontSize="$2" color="$gray500">
                      Get notified of changes to your bookings
                    </Text>
                  </YStack>
                  <Switch
                    checked={preferences.bookingUpdates}
                    onCheckedChange={() => handleToggle('bookingUpdates')}
                  />
                </XStack>
              </YStack>
            </Card>

            {/* Other Notifications */}
            <Card>
              <YStack>
                <YStack padding="$3" paddingBottom="$2">
                  <Text fontSize="$2" fontWeight="600" color="$gray500">
                    OTHER NOTIFICATIONS
                  </Text>
                </YStack>

                <XStack padding="$3" alignItems="center" justifyContent="space-between">
                  <YStack flex={1} paddingRight="$3">
                    <Text fontWeight="500">Promotional</Text>
                    <Text fontSize="$2" color="$gray500">
                      Receive special offers and promotions
                    </Text>
                  </YStack>
                  <Switch
                    checked={preferences.promotional}
                    onCheckedChange={() => handleToggle('promotional')}
                  />
                </XStack>

                <Separator />

                <XStack padding="$3" alignItems="center" justifyContent="space-between">
                  <YStack flex={1} paddingRight="$3">
                    <Text fontWeight="500">Review Reminders</Text>
                    <Text fontSize="$2" color="$gray500">
                      Remind me to review completed bookings
                    </Text>
                  </YStack>
                  <Switch
                    checked={preferences.reviewReminders}
                    onCheckedChange={() => handleToggle('reviewReminders')}
                  />
                </XStack>
              </YStack>
            </Card>

            {/* Notification Channels */}
            <Card>
              <YStack>
                <YStack padding="$3" paddingBottom="$2">
                  <Text fontSize="$2" fontWeight="600" color="$gray500">
                    NOTIFICATION CHANNELS
                  </Text>
                </YStack>

                <XStack padding="$3" alignItems="center" justifyContent="space-between">
                  <YStack flex={1} paddingRight="$3">
                    <Text fontWeight="500">Email Notifications</Text>
                    <Text fontSize="$2" color="$gray500">
                      Receive notifications via email
                    </Text>
                  </YStack>
                  <Switch
                    checked={preferences.emailNotifications}
                    onCheckedChange={() => handleToggle('emailNotifications')}
                  />
                </XStack>

                <Separator />

                <XStack padding="$3" alignItems="center" justifyContent="space-between">
                  <YStack flex={1} paddingRight="$3">
                    <Text fontWeight="500">Push Notifications</Text>
                    <Text fontSize="$2" color="$gray500">
                      Receive notifications on your device
                    </Text>
                  </YStack>
                  <Switch
                    checked={preferences.pushNotifications}
                    onCheckedChange={() => handleToggle('pushNotifications')}
                  />
                </XStack>
              </YStack>
            </Card>

            <Button
              size="lg"
              fullWidth
              loading={updatePreferences.isPending}
              onPress={handleSave}
            >
              Save Preferences
            </Button>
          </YStack>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
```

## Update Auth Flow

**Update**: `lib/auth/AuthContext.tsx`

After successful signup, redirect users to the profile setup screen if they don't have a profile yet.

```typescript
// Add this helper to check if user has a profile
export async function checkUserProfile(userId: string): Promise<boolean> {
  try {
    const response = await databases.listDocuments(
      collections.USER_PROFILES.databaseId,
      collections.USER_PROFILES.collectionId,
      [Query.equal('userId', userId), Query.limit(1)]
    );
    return response.documents.length > 0;
  } catch {
    return false;
  }
}
```

## Acceptance Criteria

- [ ] User profile collection created in Appwrite with proper schema
- [ ] User can create profile during first-time setup
- [ ] User can view their profile with all details
- [ ] User can edit profile information
- [ ] User can upload/change avatar image
- [ ] User can manage notification preferences
- [ ] Profile displays booking and review counts
- [ ] Form validation works correctly
- [ ] Avatar uploads to Appwrite storage
- [ ] All API operations use proper error handling

## Testing Checklist

- [ ] Profile creation saves to database correctly
- [ ] Profile fields validate properly
- [ ] Avatar upload works and displays correctly
- [ ] Profile edit updates database
- [ ] Notification preferences save correctly
- [ ] Profile loads on app startup
- [ ] Missing profile redirects to setup
- [ ] Back navigation preserves form data
- [ ] Error states display properly
- [ ] Loading states work correctly

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `lib/appwrite/collections.ts` | Modify | Add USER_PROFILES collection constant |
| `types/profile.ts` | Create | User profile types and interfaces |
| `lib/validations/profile.ts` | Modify | Add user profile validation schemas |
| `hooks/api/useUserProfile.ts` | Create | User profile API hooks |
| `app/(auth)/profile-setup.tsx` | Create | First-time profile setup screen |
| `app/(tabs)/profile/index.tsx` | Create | View profile screen |
| `app/(tabs)/profile/edit.tsx` | Create | Edit profile screen |
| `app/(tabs)/profile/notifications.tsx` | Create | Notification preferences screen |
| `lib/auth/AuthContext.tsx` | Modify | Add profile check helper |

## Dependencies

This ticket requires:
- FOUND-003 (Appwrite setup) ✅
- FOUND-004 (UI components) ✅
- FOUND-005 (Forms & validation) ✅
- FOUND-006 (State & API layer) ✅

## Notes for AI Agent

- User profiles are separate from business profiles
- The `userId` field links to Appwrite Auth user
- Avatar images stored in `profile-images` bucket
- Notification preferences stored as JSON object
- Profile is created after signup or can be skipped
- Basic users cannot create business listings without a business profile
- Consider adding email/phone verification flows in future tickets
- The booking and review counts will be updated by triggers/functions
