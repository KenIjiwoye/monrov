# PROF-002: Edit Profile Screen

## Ticket Information
- **ID**: PROF-002
- **Priority**: High
- **Dependencies**: FOUND-001, FOUND-004, FOUND-005, FOUND-006, PROF-001
- **Phase**: MVP (Phase 1)
- **Parallel Work**: Can run in parallel with PROF-003, PROF-004

## Description
Create the edit profile screen for 231Booking that allows users to update their personal information including name, profile photo, contact details, and bio.

## Context
Users need the ability to update their profile information after initial signup. This screen provides a form to edit name, upload a new avatar, change contact details, and add a bio. Changes should persist to Appwrite and update the local state.

## Implementation Requirements

### 1. Screen File

**File**: `app/settings/edit-profile.tsx`

### 2. Avatar Picker Component

**File**: `components/AvatarPicker.tsx`

```typescript
import { useState } from 'react';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon } from '@tamagui/lucide-icons';

import { Avatar, Button } from '@/components/ui';
import { useUploadAvatar } from '@/hooks/api/useProfile';

interface AvatarPickerProps {
  currentAvatarUrl?: string | null;
  name?: string;
  onAvatarChange?: (url: string) => void;
}

export function AvatarPicker({
  currentAvatarUrl,
  name,
  onAvatarChange,
}: AvatarPickerProps) {
  const [localUri, setLocalUri] = useState<string | null>(null);
  const uploadAvatar = useUploadAvatar();

  const pickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to change your photo.');
      return;
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setLocalUri(asset.uri);

      try {
        const url = await uploadAvatar.mutateAsync({
          uri: asset.uri,
          name: `avatar-${Date.now()}.jpg`,
          type: 'image/jpeg',
        });
        onAvatarChange?.(url);
      } catch (error) {
        setLocalUri(null);
        alert('Failed to upload image. Please try again.');
      }
    }
  };

  const takePhoto = async () => {
    // Request permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera permissions to take a photo.');
      return;
    }

    // Take photo
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setLocalUri(asset.uri);

      try {
        const url = await uploadAvatar.mutateAsync({
          uri: asset.uri,
          name: `avatar-${Date.now()}.jpg`,
          type: 'image/jpeg',
        });
        onAvatarChange?.(url);
      } catch (error) {
        setLocalUri(null);
        alert('Failed to upload image. Please try again.');
      }
    }
  };

  const displayUri = localUri || currentAvatarUrl;

  return (
    <YStack alignItems="center" gap="$3">
      <YStack position="relative">
        <Avatar
          src={displayUri}
          name={name}
          size="xl"
          style={{ width: 100, height: 100 }}
        />
        {uploadAvatar.isPending && (
          <YStack
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.5)"
            borderRadius={1000}
            alignItems="center"
            justifyContent="center"
          >
            <Spinner color="$white" />
          </YStack>
        )}
      </YStack>

      <XStack gap="$2">
        <Button
          variant="outline"
          size="sm"
          onPress={pickImage}
          disabled={uploadAvatar.isPending}
          icon={<ImageIcon size={16} />}
        >
          Gallery
        </Button>
        <Button
          variant="outline"
          size="sm"
          onPress={takePhoto}
          disabled={uploadAvatar.isPending}
          icon={<Camera size={16} />}
        >
          Camera
        </Button>
      </XStack>
    </YStack>
  );
}
```

### 3. Edit Profile Screen Implementation

**File**: `app/settings/edit-profile.tsx`

```typescript
import { useEffect } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, Text, XStack } from 'tamagui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack } from 'expo-router';
import { ArrowLeft } from '@tamagui/lucide-icons';

import { FormInput } from '@/components/forms';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { Button, LoadingScreen, ErrorState } from '@/components/ui';
import { AvatarPicker } from '@/components/AvatarPicker';
import { editProfileSchema, EditProfileFormData } from '@/lib/validations/profile';
import { useAuth } from '@/lib/auth/AuthContext';
import { useUserProfile, useUpdateProfile } from '@/hooks/api/useProfile';

export default function EditProfileScreen() {
  const { user } = useAuth();
  const { data: profile, isLoading, error } = useUserProfile();
  const updateProfile = useUpdateProfile();

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      bio: '',
    },
  });

  // Populate form when data loads
  useEffect(() => {
    if (user || profile) {
      reset({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        bio: profile?.bio || '',
      });
    }
  }, [user, profile, reset]);

  const onSubmit = async (data: EditProfileFormData) => {
    try {
      await updateProfile.mutateAsync({
        name: data.name !== user?.name ? data.name : undefined,
        bio: data.bio,
      });
      router.back();
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading profile..." />;
  }

  if (error) {
    return (
      <ErrorState
        message="Failed to load profile"
        onRetry={() => router.back()}
      />
    );
  }

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
          headerRight: () => (
            <Button
              variant="ghost"
              size="sm"
              onPress={handleSubmit(onSubmit)}
              disabled={!isDirty || isSubmitting}
            >
              <Text
                color={isDirty && !isSubmitting ? '$primary' : '$gray400'}
                fontWeight="600"
              >
                Save
              </Text>
            </Button>
          ),
        }}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <YStack padding="$4" gap="$6">
              {/* Avatar Section */}
              <AvatarPicker
                currentAvatarUrl={profile?.avatarUrl || user?.prefs?.avatarUrl}
                name={user?.name}
              />

              {/* Form Fields */}
              <YStack gap="$4">
                <FormInput
                  control={control}
                  name="name"
                  label="Full Name"
                  placeholder="Enter your full name"
                  autoCapitalize="words"
                />

                <FormInput
                  control={control}
                  name="email"
                  label="Email"
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={false} // Email change requires verification
                />
                <Text fontSize="$2" color="$gray400" marginTop={-12}>
                  Contact support to change your email address
                </Text>

                <PhoneInput
                  control={control}
                  name="phone"
                  label="Phone Number (Optional)"
                />

                <YStack gap="$1">
                  <Text fontSize="$3" fontWeight="500" color="$gray700">
                    Bio
                  </Text>
                  <FormInput
                    control={control}
                    name="bio"
                    placeholder="Tell us a bit about yourself..."
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    style={{ minHeight: 100 }}
                  />
                </YStack>
              </YStack>

              {/* Save Button (Mobile) */}
              <Button
                onPress={handleSubmit(onSubmit)}
                loading={isSubmitting}
                disabled={!isDirty || isSubmitting}
                size="lg"
                fullWidth
              >
                Save Changes
              </Button>

              {/* Error Display */}
              {updateProfile.isError && (
                <Text color="$error" textAlign="center">
                  Failed to update profile. Please try again.
                </Text>
              )}
            </YStack>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
```

### 4. Settings Layout

**File**: `app/settings/_layout.tsx`

```typescript
import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
      }}
    />
  );
}
```

### 5. Visual Design Guidelines

```
┌─────────────────────────────────────────────────┐
│  ← Back      Edit Profile           Save       │
├─────────────────────────────────────────────────┤
│                                                 │
│                  ┌────────┐                     │
│                  │        │                     │
│                  │  AVATAR│                     │
│                  │        │                     │
│                  └────────┘                     │
│           [Gallery]  [Camera]                   │
│                                                 │
│  Full Name                                      │
│  ┌─────────────────────────────────────────┐   │
│  │  John Doe                               │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Email                                          │
│  ┌─────────────────────────────────────────┐   │
│  │  john@example.com              (locked) │   │
│  └─────────────────────────────────────────┘   │
│  Contact support to change your email          │
│                                                 │
│  Phone Number (Optional)                        │
│  ┌──────────┬──────────────────────────────┐   │
│  │ 🇱🇷 +231 │  XX XXX XXXX                │   │
│  └──────────┴──────────────────────────────┘   │
│                                                 │
│  Bio                                            │
│  ┌─────────────────────────────────────────┐   │
│  │  Tell us a bit about yourself...        │   │
│  │                                          │   │
│  │                                          │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │            SAVE CHANGES                 │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Acceptance Criteria

- [ ] Screen renders at `/settings/edit-profile`
- [ ] Current profile data pre-populated in form
- [ ] Avatar picker allows gallery and camera selection
- [ ] Avatar uploads to Appwrite storage
- [ ] Name field is editable
- [ ] Email field is disabled with explanation
- [ ] Phone input follows Liberian format (+231)
- [ ] Bio supports multiline text
- [ ] Save button enabled only when form is dirty
- [ ] Success saves data and navigates back
- [ ] Loading state during save
- [ ] Error state on failure

## Testing Checklist

- [ ] Form loads with current user data
- [ ] Avatar can be selected from gallery
- [ ] Avatar can be taken with camera
- [ ] Avatar upload shows progress indicator
- [ ] Name change persists on save
- [ ] Phone validates Liberian format
- [ ] Bio accepts multiline text
- [ ] Save disabled when no changes
- [ ] Back navigation works
- [ ] Keyboard doesn't cover inputs

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `app/settings/_layout.tsx` | Create | Settings stack layout |
| `app/settings/edit-profile.tsx` | Create | Edit profile screen |
| `components/AvatarPicker.tsx` | Create | Avatar selection component |

## Dependencies to Install

```bash
npx expo install expo-image-picker
```

## Files to Reference

- `lib/validations/profile.ts` - Edit profile schema (FOUND-005)
- `hooks/api/useProfile.ts` - Profile hooks (FOUND-006)
- `components/forms/PhoneInput.tsx` - Phone input (AUTH-003)

## Notes for AI Agent

- Email change is disabled - this is intentional for security
- Avatar picker needs camera and media library permissions
- The multiline input for bio needs special styling
- Form should track dirty state to enable/disable save
- Consider adding unsaved changes warning on back navigation
- Test image upload with various sizes and formats
