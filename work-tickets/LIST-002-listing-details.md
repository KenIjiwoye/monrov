# LIST-002: Listing Details Screen

## Ticket Information
- **ID**: LIST-002
- **Priority**: Critical
- **Dependencies**: FOUND-001, FOUND-002, FOUND-004, FOUND-006, LIST-001
- **Phase**: MVP (Phase 1)
- **Parallel Work**: Can run in parallel with LIST-001, LIST-003, SRCH-001

## Description
Create the listing details screen that displays comprehensive information about a service listing including photos, description, amenities, pricing, availability, reviews, and a booking call-to-action.

## Context
The listing details screen is where users make their booking decision. It must present all relevant information clearly and provide an easy path to booking. The screen should be engaging with a photo gallery, detailed descriptions, and social proof through reviews.

## Implementation Requirements

### 1. Screen File

**File**: `app/listing/[id].tsx`

### 2. Image Gallery Component

**File**: `components/ImageGallery.tsx`

```typescript
import { useState, useRef } from 'react';
import { Dimensions, FlatList } from 'react-native';
import { YStack, XStack, Image, Text } from 'tamagui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ImageGalleryProps {
  images: string[];
}

export function ImageGallery({ images }: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  if (!images || images.length === 0) {
    return (
      <YStack
        width={SCREEN_WIDTH}
        height={300}
        backgroundColor="$gray200"
        alignItems="center"
        justifyContent="center"
      >
        <Text color="$gray500">No images available</Text>
      </YStack>
    );
  }

  return (
    <YStack>
      <FlatList
        ref={flatListRef}
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            width={SCREEN_WIDTH}
            height={300}
            resizeMode="cover"
          />
        )}
        keyExtractor={(_, index) => index.toString()}
      />

      {/* Pagination Dots */}
      <XStack
        position="absolute"
        bottom="$3"
        left={0}
        right={0}
        justifyContent="center"
        gap="$2"
      >
        {images.map((_, index) => (
          <YStack
            key={index}
            width={8}
            height={8}
            borderRadius={4}
            backgroundColor={index === activeIndex ? '$white' : 'rgba(255,255,255,0.5)'}
          />
        ))}
      </XStack>

      {/* Image Counter */}
      <YStack
        position="absolute"
        bottom="$3"
        right="$3"
        backgroundColor="rgba(0,0,0,0.6)"
        paddingHorizontal="$2"
        paddingVertical="$1"
        borderRadius="$2"
      >
        <Text color="$white" fontSize="$2">
          {activeIndex + 1} / {images.length}
        </Text>
      </YStack>
    </YStack>
  );
}
```

### 3. Amenities List Component

**File**: `components/AmenitiesList.tsx`

```typescript
import { XStack, YStack, Text } from 'tamagui';
import {
  Wifi,
  Car,
  Utensils,
  Wind,
  Tv,
  Coffee,
  Dumbbell,
  Waves,
  PawPrint,
  Cigarette,
  Check,
} from '@tamagui/lucide-icons';

const AMENITY_ICONS: Record<string, React.ElementType> = {
  wifi: Wifi,
  parking: Car,
  restaurant: Utensils,
  'air-conditioning': Wind,
  tv: Tv,
  breakfast: Coffee,
  gym: Dumbbell,
  pool: Waves,
  'pet-friendly': PawPrint,
  smoking: Cigarette,
};

interface AmenitiesListProps {
  amenities: string[];
  maxDisplay?: number;
}

export function AmenitiesList({ amenities, maxDisplay = 6 }: AmenitiesListProps) {
  const displayAmenities = amenities.slice(0, maxDisplay);
  const remaining = amenities.length - maxDisplay;

  return (
    <XStack flexWrap="wrap" gap="$3">
      {displayAmenities.map((amenity) => {
        const Icon = AMENITY_ICONS[amenity.toLowerCase()] || Check;
        const label = amenity.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

        return (
          <XStack
            key={amenity}
            alignItems="center"
            gap="$2"
            backgroundColor="$gray100"
            paddingHorizontal="$3"
            paddingVertical="$2"
            borderRadius="$3"
          >
            <Icon size={16} color="$gray600" />
            <Text fontSize="$3" color="$gray700">
              {label}
            </Text>
          </XStack>
        );
      })}
      {remaining > 0 && (
        <XStack
          alignItems="center"
          backgroundColor="$primaryLight"
          paddingHorizontal="$3"
          paddingVertical="$2"
          borderRadius="$3"
        >
          <Text fontSize="$3" color="$primary" fontWeight="500">
            +{remaining} more
          </Text>
        </XStack>
      )}
    </XStack>
  );
}
```

### 4. Listing Details Screen Implementation

**File**: `app/listing/[id].tsx`

```typescript
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, XStack, Text, Separator } from 'tamagui';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Share2,
  Heart,
  Star,
  MapPin,
  Clock,
  Users,
  Calendar,
  MessageCircle,
} from '@tamagui/lucide-icons';

import {
  Button,
  Card,
  Avatar,
  Badge,
  LoadingScreen,
  ErrorState,
} from '@/components/ui';
import { ImageGallery } from '@/components/ImageGallery';
import { AmenitiesList } from '@/components/AmenitiesList';
import { ReviewsList } from '@/components/ReviewsList';
import { useListing } from '@/hooks/api/useListings';
import { useBusinessProfile } from '@/hooks/api/useProfile';
import { useListingReviews } from '@/hooks/api/useReviews';

export default function ListingDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: listing, isLoading, error, refetch } = useListing(id);
  const { data: business } = useBusinessProfile(listing?.businessId);
  const { data: reviewsData } = useListingReviews(id || '');

  const formatPrice = (price: number, unit: string) => {
    const formattedPrice = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);

    const unitLabels: Record<string, string> = {
      per_night: '/night',
      per_person: '/person',
      per_event: '/event',
      flat_rate: ' total',
    };

    return `${formattedPrice}${unitLabels[unit] || ''}`;
  };

  if (isLoading) {
    return <LoadingScreen message="Loading listing..." />;
  }

  if (error || !listing) {
    return (
      <ErrorState
        message="Failed to load listing"
        onRetry={refetch}
      />
    );
  }

  const reviews = reviewsData?.pages.flatMap((page) => page.reviews) || [];

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: '',
          headerLeft: () => (
            <Button
              variant="ghost"
              size="sm"
              circular
              backgroundColor="rgba(255,255,255,0.9)"
              onPress={() => router.back()}
              icon={<ArrowLeft size={20} />}
            />
          ),
          headerRight: () => (
            <XStack gap="$2">
              <Button
                variant="ghost"
                size="sm"
                circular
                backgroundColor="rgba(255,255,255,0.9)"
                onPress={() => {/* TODO: Share */}}
                icon={<Share2 size={20} />}
              />
              <Button
                variant="ghost"
                size="sm"
                circular
                backgroundColor="rgba(255,255,255,0.9)"
                onPress={() => {/* TODO: Favorite */}}
                icon={<Heart size={20} />}
              />
            </XStack>
          ),
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <ImageGallery images={listing.images} />

        <YStack padding="$4" gap="$5">
          {/* Title & Rating */}
          <YStack gap="$2">
            <XStack justifyContent="space-between" alignItems="flex-start">
              <YStack flex={1} gap="$1">
                <Badge
                  label={listing.category.replace('_', ' ')}
                  variant="primary"
                />
                <Text fontSize="$7" fontWeight="700">
                  {listing.title}
                </Text>
              </YStack>
            </XStack>

            <XStack gap="$4" alignItems="center">
              <XStack gap="$1" alignItems="center">
                <Star size={18} color="$warning" fill="$warning" />
                <Text fontSize="$4" fontWeight="600">
                  {listing.rating.toFixed(1)}
                </Text>
                <Text fontSize="$3" color="$gray500">
                  ({listing.reviewCount} reviews)
                </Text>
              </XStack>
              <XStack gap="$1" alignItems="center">
                <MapPin size={16} color="$gray500" />
                <Text fontSize="$3" color="$gray500">
                  {listing.city}
                </Text>
              </XStack>
            </XStack>
          </YStack>

          <Separator />

          {/* Business Info */}
          {business && (
            <>
              <Card
                variant="flat"
                padding="$3"
                pressable
                onPress={() => {/* TODO: Business profile */}}
              >
                <XStack gap="$3" alignItems="center">
                  <Avatar
                    src={business.logoUrl}
                    name={business.businessName}
                    size="lg"
                  />
                  <YStack flex={1}>
                    <XStack gap="$2" alignItems="center">
                      <Text fontSize="$4" fontWeight="600">
                        {business.businessName}
                      </Text>
                      {business.isVerified && (
                        <Badge label="Verified" variant="success" />
                      )}
                    </XStack>
                    <Text fontSize="$3" color="$gray500">
                      {business.category} • {business.city}
                    </Text>
                  </YStack>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<MessageCircle size={16} />}
                    onPress={() => {/* TODO: Contact */}}
                  >
                    Contact
                  </Button>
                </XStack>
              </Card>

              <Separator />
            </>
          )}

          {/* Description */}
          <YStack gap="$2">
            <Text fontSize="$5" fontWeight="600">
              About
            </Text>
            <Text fontSize="$4" color="$gray700" lineHeight={24}>
              {listing.description}
            </Text>
          </YStack>

          <Separator />

          {/* Quick Info */}
          <XStack justifyContent="space-around">
            {listing.maxGuests && (
              <YStack alignItems="center" gap="$1">
                <Users size={24} color="$gray600" />
                <Text fontSize="$2" color="$gray500">
                  Max Guests
                </Text>
                <Text fontSize="$4" fontWeight="600">
                  {listing.maxGuests}
                </Text>
              </YStack>
            )}
            <YStack alignItems="center" gap="$1">
              <Clock size={24} color="$gray600" />
              <Text fontSize="$2" color="$gray500">
                Response
              </Text>
              <Text fontSize="$4" fontWeight="600">
                Within 1hr
              </Text>
            </YStack>
            <YStack alignItems="center" gap="$1">
              <Calendar size={24} color="$gray600" />
              <Text fontSize="$2" color="$gray500">
                Availability
              </Text>
              <Text fontSize="$4" fontWeight="600" color="$success">
                Available
              </Text>
            </YStack>
          </XStack>

          <Separator />

          {/* Amenities */}
          {listing.amenities && listing.amenities.length > 0 && (
            <>
              <YStack gap="$3">
                <Text fontSize="$5" fontWeight="600">
                  Amenities
                </Text>
                <AmenitiesList amenities={listing.amenities} />
              </YStack>
              <Separator />
            </>
          )}

          {/* Location */}
          <YStack gap="$3">
            <Text fontSize="$5" fontWeight="600">
              Location
            </Text>
            <Card variant="flat" padding="$3">
              <XStack gap="$2" alignItems="center">
                <MapPin size={20} color="$primary" />
                <Text fontSize="$4">{listing.address}</Text>
              </XStack>
              <Text fontSize="$3" color="$gray500" marginTop="$1">
                {listing.city}, Liberia
              </Text>
            </Card>
            {/* TODO: Add map view */}
          </YStack>

          <Separator />

          {/* Reviews Preview */}
          <YStack gap="$3">
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize="$5" fontWeight="600">
                Reviews
              </Text>
              {reviews.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => {/* TODO: All reviews */}}
                >
                  <Text color="$primary">See all</Text>
                </Button>
              )}
            </XStack>

            {reviews.length > 0 ? (
              <ReviewsList reviews={reviews.slice(0, 3)} />
            ) : (
              <Card variant="flat" padding="$4">
                <Text textAlign="center" color="$gray500">
                  No reviews yet
                </Text>
              </Card>
            )}
          </YStack>

          {/* Spacer for bottom bar */}
          <YStack height={100} />
        </YStack>
      </ScrollView>

      {/* Bottom Booking Bar */}
      <SafeAreaView
        edges={['bottom']}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
        }}
      >
        <XStack padding="$4" justifyContent="space-between" alignItems="center">
          <YStack>
            <Text fontSize="$6" fontWeight="700" color="$primary">
              {formatPrice(listing.price, listing.priceUnit)}
            </Text>
            <Text fontSize="$2" color="$gray500">
              Select dates for total
            </Text>
          </YStack>
          <Button
            size="lg"
            onPress={() => router.push(`/booking/${listing.$id}`)}
          >
            Book Now
          </Button>
        </XStack>
      </SafeAreaView>
    </>
  );
}
```

## Acceptance Criteria

- [ ] Screen renders at `/listing/[id]`
- [ ] Image gallery with swipe and pagination
- [ ] Listing title, rating, and location displayed
- [ ] Business info card with contact button
- [ ] Full description rendered
- [ ] Amenities displayed with icons
- [ ] Location information shown
- [ ] Reviews preview displayed
- [ ] Sticky bottom bar with price and Book Now button
- [ ] Book Now navigates to booking flow
- [ ] Back navigation works
- [ ] Share and favorite buttons present

## Testing Checklist

- [ ] Listing loads correctly by ID
- [ ] Image gallery swipes smoothly
- [ ] All sections render with data
- [ ] Handles missing optional data (amenities, reviews)
- [ ] Book Now navigates to booking
- [ ] Contact button triggers action
- [ ] Share button works
- [ ] Error state shows on load failure
- [ ] Loading state displays

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `app/listing/[id].tsx` | Create | Listing details screen |
| `components/ImageGallery.tsx` | Create | Image gallery component |
| `components/AmenitiesList.tsx` | Create | Amenities list component |
| `components/ReviewsList.tsx` | Create | Reviews list component (basic) |
