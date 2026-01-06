# REV-001: Reviews & Ratings System

## Ticket Information
- **ID**: REV-001
- **Priority**: High
- **Dependencies**: FOUND-001, FOUND-003, FOUND-004, FOUND-006, BOOK-001
- **Phase**: Phase 2
- **Parallel Work**: Can run in parallel with BPROF-001, NOTIF-001

## Description
Implement the reviews and ratings system that allows users to rate and review services after completing a booking. This includes the review form, review display components, and business response functionality.

## Context
Reviews are critical for building trust on the platform. Users can leave reviews after completing bookings, and businesses can respond to reviews. Reviews include a star rating, written content, and optional photos.

## Implementation Requirements

### 1. Review Schema

**File**: `lib/validations/review.ts`

```typescript
import { z } from 'zod';

export const reviewSchema = z.object({
  rating: z.number()
    .min(1, 'Please select a rating')
    .max(5, 'Rating must be between 1 and 5'),
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters')
    .optional(),
  content: z.string()
    .min(10, 'Review must be at least 10 characters')
    .max(1000, 'Review must be less than 1000 characters'),
});

export type ReviewFormData = z.infer<typeof reviewSchema>;
```

### 2. Star Rating Component

**File**: `components/StarRating.tsx`

```typescript
import { XStack } from 'tamagui';
import { Star } from '@tamagui/lucide-icons';

interface StarRatingProps {
  rating: number;
  size?: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
}

export function StarRating({
  rating,
  size = 24,
  onRatingChange,
  readonly = false,
}: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <XStack gap="$1">
      {stars.map((star) => (
        <Star
          key={star}
          size={size}
          color={star <= rating ? '$warning' : '$gray300'}
          fill={star <= rating ? '$warning' : 'transparent'}
          onPress={!readonly ? () => onRatingChange?.(star) : undefined}
          style={{ cursor: readonly ? 'default' : 'pointer' }}
        />
      ))}
    </XStack>
  );
}
```

### 3. Review Card Component

**File**: `components/ReviewCard.tsx`

```typescript
import { YStack, XStack, Text, Image } from 'tamagui';
import { format, parseISO } from 'date-fns';

import { Card, Avatar } from '@/components/ui';
import { StarRating } from '@/components/StarRating';
import { Review } from '@/types/models';

interface ReviewCardProps {
  review: Review;
  userName?: string;
  userAvatar?: string;
  showResponse?: boolean;
}

export function ReviewCard({
  review,
  userName = 'Anonymous',
  userAvatar,
  showResponse = true,
}: ReviewCardProps) {
  return (
    <Card variant="flat" padding="$3">
      <YStack gap="$3">
        {/* User Info & Rating */}
        <XStack justifyContent="space-between" alignItems="flex-start">
          <XStack gap="$2" alignItems="center">
            <Avatar src={userAvatar} name={userName} size="sm" />
            <YStack>
              <Text fontSize="$4" fontWeight="500">
                {userName}
              </Text>
              <Text fontSize="$2" color="$gray500">
                {format(parseISO(review.createdAt), 'MMM d, yyyy')}
              </Text>
            </YStack>
          </XStack>
          <StarRating rating={review.rating} size={16} readonly />
        </XStack>

        {/* Review Content */}
        {review.title && (
          <Text fontSize="$4" fontWeight="600">
            {review.title}
          </Text>
        )}
        <Text fontSize="$4" color="$gray700">
          {review.content}
        </Text>

        {/* Review Images */}
        {review.images && review.images.length > 0 && (
          <XStack gap="$2" flexWrap="wrap">
            {review.images.map((image, index) => (
              <Image
                key={index}
                source={{ uri: image }}
                width={80}
                height={80}
                borderRadius="$2"
              />
            ))}
          </XStack>
        )}

        {/* Business Response */}
        {showResponse && review.response && (
          <Card variant="outlined" padding="$3" marginTop="$2">
            <YStack gap="$2">
              <Text fontSize="$3" fontWeight="600" color="$primary">
                Response from business
              </Text>
              <Text fontSize="$3" color="$gray600">
                {review.response}
              </Text>
              {review.responseAt && (
                <Text fontSize="$2" color="$gray400">
                  {format(parseISO(review.responseAt), 'MMM d, yyyy')}
                </Text>
              )}
            </YStack>
          </Card>
        )}
      </YStack>
    </Card>
  );
}
```

### 4. Write Review Screen

**File**: `app/review/[bookingId].tsx`

```typescript
import { useState } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, XStack, Text, TextArea } from 'tamagui';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Camera, X, CheckCircle } from '@tamagui/lucide-icons';

import { Button, Card, LoadingScreen, ErrorState } from '@/components/ui';
import { FormInput } from '@/components/forms';
import { StarRating } from '@/components/StarRating';
import { reviewSchema, ReviewFormData } from '@/lib/validations/review';
import { useBooking } from '@/hooks/api/useBookings';
import { useCreateReview } from '@/hooks/api/useReviews';

export default function WriteReviewScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { data: booking, isLoading } = useBooking(bookingId);
  const createReview = useCreateReview();
  const [images, setImages] = useState<string[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      title: '',
      content: '',
    },
  });

  const rating = watch('rating');

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission needed to add photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5 - images.length,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImages([...images, ...result.assets.map((a) => a.uri)]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ReviewFormData) => {
    if (!booking) return;

    try {
      await createReview.mutateAsync({
        listingId: booking.listingId,
        bookingId: booking.$id,
        rating: data.rating,
        title: data.title,
        content: data.content,
        images: images.length > 0 ? images : undefined,
      });
      setIsSuccess(true);
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  if (!booking) {
    return <ErrorState message="Booking not found" onRetry={() => router.back()} />;
  }

  if (isSuccess) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <YStack flex={1} alignItems="center" justifyContent="center" padding="$6" gap="$6">
          <YStack backgroundColor="$successLight" padding="$6" borderRadius={1000}>
            <CheckCircle size={64} color="$success" />
          </YStack>
          <YStack alignItems="center" gap="$2">
            <Text fontSize="$7" fontWeight="700">
              Thank You!
            </Text>
            <Text color="$gray500" textAlign="center">
              Your review has been submitted. It helps other users make better decisions.
            </Text>
          </YStack>
          <Button fullWidth onPress={() => router.replace('/(tabs)/bookings')}>
            Back to Bookings
          </Button>
        </YStack>
      </SafeAreaView>
    );
  }

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Write Review',
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
              {/* Rating */}
              <YStack gap="$3" alignItems="center">
                <Text fontSize="$5" fontWeight="600">
                  How was your experience?
                </Text>
                <Controller
                  control={control}
                  name="rating"
                  render={({ field: { value, onChange } }) => (
                    <YStack alignItems="center" gap="$2">
                      <StarRating
                        rating={value}
                        size={40}
                        onRatingChange={onChange}
                      />
                      {value > 0 && (
                        <Text color="$primary" fontWeight="500">
                          {ratingLabels[value]}
                        </Text>
                      )}
                    </YStack>
                  )}
                />
                {errors.rating && (
                  <Text color="$error" fontSize="$2">
                    {errors.rating.message}
                  </Text>
                )}
              </YStack>

              {/* Title (Optional) */}
              <FormInput
                control={control}
                name="title"
                label="Review Title (Optional)"
                placeholder="Summarize your experience"
              />

              {/* Content */}
              <YStack gap="$2">
                <Text fontSize="$3" fontWeight="500" color="$gray700">
                  Your Review
                </Text>
                <Controller
                  control={control}
                  name="content"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <TextArea
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Share details of your experience..."
                      numberOfLines={6}
                      minHeight={150}
                    />
                  )}
                />
                {errors.content && (
                  <Text color="$error" fontSize="$2">
                    {errors.content.message}
                  </Text>
                )}
              </YStack>

              {/* Photos */}
              <YStack gap="$2">
                <Text fontSize="$3" fontWeight="500" color="$gray700">
                  Add Photos (Optional)
                </Text>
                <XStack gap="$2" flexWrap="wrap">
                  {images.map((uri, index) => (
                    <YStack key={index} position="relative">
                      <Image
                        source={{ uri }}
                        width={80}
                        height={80}
                        borderRadius="$2"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        circular
                        position="absolute"
                        top={-8}
                        right={-8}
                        backgroundColor="$error"
                        onPress={() => removeImage(index)}
                        icon={<X size={12} color="white" />}
                      />
                    </YStack>
                  ))}
                  {images.length < 5 && (
                    <Button
                      variant="outline"
                      width={80}
                      height={80}
                      onPress={pickImages}
                      icon={<Camera size={24} color="$gray500" />}
                    />
                  )}
                </XStack>
                <Text fontSize="$2" color="$gray400">
                  Up to 5 photos
                </Text>
              </YStack>
            </YStack>
          </ScrollView>

          {/* Submit */}
          <YStack padding="$4" borderTopWidth={1} borderTopColor="$gray200">
            <Button
              size="lg"
              fullWidth
              disabled={rating === 0}
              loading={createReview.isPending}
              onPress={handleSubmit(onSubmit)}
            >
              Submit Review
            </Button>
          </YStack>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
```

### 5. Reviews List Component

**File**: `components/ReviewsList.tsx`

```typescript
import { YStack } from 'tamagui';
import { ReviewCard } from './ReviewCard';
import { Review } from '@/types/models';

interface ReviewsListProps {
  reviews: Review[];
  // Add user data lookup if needed
}

export function ReviewsList({ reviews }: ReviewsListProps) {
  return (
    <YStack gap="$3">
      {reviews.map((review) => (
        <ReviewCard
          key={review.$id}
          review={review}
          // userName and userAvatar would come from user lookup
        />
      ))}
    </YStack>
  );
}
```

## Acceptance Criteria

- [ ] Star rating component with 1-5 stars
- [ ] Rating shows label (Poor to Excellent)
- [ ] Optional review title field
- [ ] Required review content (min 10 chars)
- [ ] Photo upload (up to 5 photos)
- [ ] Success screen after submission
- [ ] Review card displays all info
- [ ] Business response shown if exists
- [ ] Reviews list component for listing pages

## Testing Checklist

- [ ] Star rating selection works
- [ ] Validation prevents submit without rating
- [ ] Content validation works
- [ ] Photo picker works
- [ ] Can remove selected photos
- [ ] Submit creates review
- [ ] Success screen displays
- [ ] Review appears on listing

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `lib/validations/review.ts` | Create | Review schema |
| `components/StarRating.tsx` | Create | Star rating component |
| `components/ReviewCard.tsx` | Create | Review card component |
| `components/ReviewsList.tsx` | Create | Reviews list component |
| `app/review/[bookingId].tsx` | Create | Write review screen |
