# LIST-001: Home Screen with Categories

## Ticket Information
- **ID**: LIST-001
- **Priority**: Critical
- **Dependencies**: FOUND-001, FOUND-002, FOUND-004, FOUND-006
- **Phase**: MVP (Phase 1)
- **Parallel Work**: Can run in parallel with LIST-002, LIST-003, SRCH-001

## Description
Create the main home/explore screen for 231Booking that displays service categories and allows users to browse available listings. This is the primary landing screen after login.

## Context
The home screen is the first screen users see after logging in. It should showcase service categories (hotels, events, travel packages, etc.), featured listings, and provide easy navigation to search and category browsing.

## Implementation Requirements

### 1. Screen File

**File**: `app/(tabs)/index.tsx`

### 2. Category Card Component

**File**: `components/CategoryCard.tsx`

```typescript
import { YStack, Text, Image } from 'tamagui';
import { router } from 'expo-router';

interface CategoryCardProps {
  id: string;
  name: string;
  slug: string;
  icon: string;
  listingCount: number;
  imageUrl?: string;
}

export function CategoryCard({
  id,
  name,
  slug,
  icon,
  listingCount,
  imageUrl,
}: CategoryCardProps) {
  return (
    <YStack
      width={140}
      height={160}
      borderRadius="$4"
      overflow="hidden"
      backgroundColor="$gray100"
      pressStyle={{ scale: 0.98, opacity: 0.9 }}
      onPress={() => router.push(`/(tabs)/search?category=${slug}`)}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          width="100%"
          height={100}
          resizeMode="cover"
        />
      ) : (
        <YStack
          height={100}
          alignItems="center"
          justifyContent="center"
          backgroundColor="$primaryLight"
        >
          <Text fontSize={40}>{icon}</Text>
        </YStack>
      )}
      <YStack padding="$2" flex={1} justifyContent="center">
        <Text fontSize="$3" fontWeight="600" numberOfLines={1}>
          {name}
        </Text>
        <Text fontSize="$2" color="$gray500">
          {listingCount} listings
        </Text>
      </YStack>
    </YStack>
  );
}
```

### 3. Home Screen Implementation

**File**: `app/(tabs)/index.tsx`

```typescript
import { useCallback } from 'react';
import { ScrollView, RefreshControl, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, Text, XStack, Input } from 'tamagui';
import { router } from 'expo-router';
import { Search, MapPin, Bell } from '@tamagui/lucide-icons';

import { Card, Button, Avatar, LoadingCard, ErrorState } from '@/components/ui';
import { CategoryCard } from '@/components/CategoryCard';
import { ListingCard } from '@/components/ListingCard';
import { useAuth } from '@/lib/auth/AuthContext';
import { useCategories } from '@/hooks/api/useCategories';
import { useFeaturedListings } from '@/hooks/api/useListings';

export default function HomeScreen() {
  const { user } = useAuth();
  const {
    data: categories,
    isLoading: categoriesLoading,
    refetch: refetchCategories,
  } = useCategories();
  const {
    data: featuredListings,
    isLoading: featuredLoading,
    refetch: refetchFeatured,
  } = useFeaturedListings();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchCategories(), refetchFeatured()]);
    setRefreshing(false);
  }, [refetchCategories, refetchFeatured]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <YStack padding="$4" gap="$6">
          {/* Header */}
          <XStack justifyContent="space-between" alignItems="center">
            <YStack>
              <Text fontSize="$3" color="$gray500">
                {getGreeting()}
              </Text>
              <Text fontSize="$7" fontWeight="700">
                {user?.name?.split(' ')[0] || 'there'}!
              </Text>
            </YStack>
            <XStack gap="$3" alignItems="center">
              <Button
                variant="ghost"
                size="sm"
                circular
                onPress={() => {/* TODO: Notifications */}}
                icon={<Bell size={24} color="$gray600" />}
              />
              <Avatar
                src={user?.prefs?.avatarUrl}
                name={user?.name}
                size="md"
                onPress={() => router.push('/(tabs)/profile')}
              />
            </XStack>
          </XStack>

          {/* Search Bar */}
          <XStack
            backgroundColor="$gray100"
            borderRadius="$4"
            paddingHorizontal="$3"
            paddingVertical="$2"
            alignItems="center"
            gap="$2"
            pressStyle={{ opacity: 0.8 }}
            onPress={() => router.push('/(tabs)/search')}
          >
            <Search size={20} color="$gray500" />
            <Text flex={1} color="$gray500">
              Search hotels, events, packages...
            </Text>
          </XStack>

          {/* Location Banner */}
          <Card variant="flat" padding="$3">
            <XStack alignItems="center" gap="$2">
              <MapPin size={20} color="$primary" />
              <YStack flex={1}>
                <Text fontSize="$3" fontWeight="500">
                  Exploring Monrovia, Liberia
                </Text>
                <Text fontSize="$2" color="$gray500">
                  Tap to change location
                </Text>
              </YStack>
            </XStack>
          </Card>

          {/* Categories */}
          <YStack gap="$3">
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize="$5" fontWeight="600">
                Categories
              </Text>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => router.push('/(tabs)/search')}
              >
                <Text color="$primary">See all</Text>
              </Button>
            </XStack>

            {categoriesLoading ? (
              <XStack gap="$3">
                {[1, 2, 3].map((i) => (
                  <YStack
                    key={i}
                    width={140}
                    height={160}
                    backgroundColor="$gray200"
                    borderRadius="$4"
                  />
                ))}
              </XStack>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                {categories?.map((category) => (
                  <CategoryCard
                    key={category.$id}
                    id={category.$id}
                    name={category.name}
                    slug={category.slug}
                    icon={category.icon}
                    listingCount={category.listingCount}
                    imageUrl={category.imageUrl}
                  />
                ))}
              </ScrollView>
            )}
          </YStack>

          {/* Featured Listings */}
          <YStack gap="$3">
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize="$5" fontWeight="600">
                Featured
              </Text>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => router.push('/(tabs)/search?featured=true')}
              >
                <Text color="$primary">See all</Text>
              </Button>
            </XStack>

            {featuredLoading ? (
              <YStack gap="$3">
                <LoadingCard />
                <LoadingCard />
              </YStack>
            ) : featuredListings && featuredListings.length > 0 ? (
              <YStack gap="$3">
                {featuredListings.slice(0, 5).map((listing) => (
                  <ListingCard
                    key={listing.$id}
                    listing={listing}
                    onPress={() => router.push(`/listing/${listing.$id}`)}
                  />
                ))}
              </YStack>
            ) : (
              <Card variant="flat" padding="$6">
                <Text textAlign="center" color="$gray500">
                  No featured listings available
                </Text>
              </Card>
            )}
          </YStack>

          {/* Popular Near You */}
          <YStack gap="$3">
            <Text fontSize="$5" fontWeight="600">
              Popular Near You
            </Text>
            <Text color="$gray500" fontSize="$3">
              Location-based recommendations coming soon
            </Text>
          </YStack>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
```

### 4. Listing Card Component

**File**: `components/ListingCard.tsx`

```typescript
import { YStack, XStack, Text, Image } from 'tamagui';
import { Star, MapPin } from '@tamagui/lucide-icons';

import { Card, Badge } from '@/components/ui';
import { Listing } from '@/types/models';

interface ListingCardProps {
  listing: Listing;
  onPress: () => void;
  variant?: 'default' | 'compact';
}

export function ListingCard({
  listing,
  onPress,
  variant = 'default',
}: ListingCardProps) {
  const formatPrice = (price: number, unit: string) => {
    const formattedPrice = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);

    const unitLabels: Record<string, string> = {
      per_night: '/night',
      per_person: '/person',
      per_event: '/event',
      flat_rate: '',
    };

    return `${formattedPrice}${unitLabels[unit] || ''}`;
  };

  if (variant === 'compact') {
    return (
      <Card variant="outlined" pressable onPress={onPress} padding="$2">
        <XStack gap="$3">
          <Image
            source={{ uri: listing.images[0] }}
            width={80}
            height={80}
            borderRadius="$3"
          />
          <YStack flex={1} justifyContent="center" gap="$1">
            <Text fontSize="$4" fontWeight="600" numberOfLines={1}>
              {listing.title}
            </Text>
            <XStack gap="$1" alignItems="center">
              <Star size={14} color="$warning" fill="$warning" />
              <Text fontSize="$2" color="$gray600">
                {listing.rating.toFixed(1)} ({listing.reviewCount})
              </Text>
            </XStack>
            <Text fontSize="$4" fontWeight="700" color="$primary">
              {formatPrice(listing.price, listing.priceUnit)}
            </Text>
          </YStack>
        </XStack>
      </Card>
    );
  }

  return (
    <Card variant="elevated" pressable onPress={onPress} padding={0}>
      {/* Image */}
      <YStack position="relative">
        <Image
          source={{ uri: listing.images[0] || 'https://via.placeholder.com/400x200' }}
          width="100%"
          height={180}
          borderTopLeftRadius="$4"
          borderTopRightRadius="$4"
        />
        {listing.isFeatured && (
          <YStack position="absolute" top="$2" left="$2">
            <Badge label="Featured" variant="primary" />
          </YStack>
        )}
      </YStack>

      {/* Content */}
      <YStack padding="$3" gap="$2">
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1} gap="$1">
            <Text fontSize="$5" fontWeight="600" numberOfLines={1}>
              {listing.title}
            </Text>
            <XStack gap="$1" alignItems="center">
              <MapPin size={14} color="$gray500" />
              <Text fontSize="$3" color="$gray500" numberOfLines={1}>
                {listing.city}
              </Text>
            </XStack>
          </YStack>
          <XStack gap="$1" alignItems="center">
            <Star size={16} color="$warning" fill="$warning" />
            <Text fontSize="$3" fontWeight="600">
              {listing.rating.toFixed(1)}
            </Text>
            <Text fontSize="$2" color="$gray500">
              ({listing.reviewCount})
            </Text>
          </XStack>
        </XStack>

        <Text fontSize="$3" color="$gray600" numberOfLines={2}>
          {listing.description}
        </Text>

        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize="$5" fontWeight="700" color="$primary">
            {formatPrice(listing.price, listing.priceUnit)}
          </Text>
          <Badge
            label={listing.category.replace('_', ' ')}
            variant="default"
          />
        </XStack>
      </YStack>
    </Card>
  );
}
```

## Visual Design Guidelines

```
┌─────────────────────────────────────────────────┐
│  Good morning                         🔔 [AV]  │
│  John!                                         │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐   │
│  │ 🔍 Search hotels, events, packages...   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 📍 Exploring Monrovia, Liberia          │   │
│  │    Tap to change location               │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Categories                          See all > │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│  │ 🏨  │ │ 🎉  │ │ ✈️  │ │ 🍽️  │          │
│  │Hotels│ │Events│ │Travel│ │Dining│          │
│  │ 24   │ │ 12   │ │  8   │ │ 15   │          │
│  └──────┘ └──────┘ └──────┘ └──────┘          │
│                                                 │
│  Featured                            See all > │
│  ┌─────────────────────────────────────────┐   │
│  │  [IMAGE]                                │   │
│  │  Luxury Beach Resort         ⭐ 4.8    │   │
│  │  📍 Monrovia                            │   │
│  │  Beautiful beachfront...                │   │
│  │  $150/night              [Hotel]        │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Acceptance Criteria

- [ ] Home screen renders at `/(tabs)/index`
- [ ] Greeting changes based on time of day
- [ ] User name and avatar displayed
- [ ] Search bar navigates to search screen
- [ ] Categories displayed in horizontal scroll
- [ ] Category cards navigate to filtered search
- [ ] Featured listings displayed
- [ ] Listing cards show image, title, rating, price
- [ ] Pull-to-refresh updates data
- [ ] Loading states for categories and listings
- [ ] Empty states handled gracefully

## Testing Checklist

- [ ] Greeting updates based on time
- [ ] Categories load correctly
- [ ] Featured listings load correctly
- [ ] Tapping category opens search with filter
- [ ] Tapping listing opens details
- [ ] Search bar navigation works
- [ ] Pull to refresh works
- [ ] Loading skeletons display
- [ ] Handles empty states

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `app/(tabs)/index.tsx` | Create | Home screen |
| `components/CategoryCard.tsx` | Create | Category card component |
| `components/ListingCard.tsx` | Create | Listing card component |

## Files to Reference

- `hooks/api/useCategories.ts` - Categories hook (FOUND-006)
- `hooks/api/useListings.ts` - Listings hooks (FOUND-006)
- `components/ui/` - UI components (FOUND-004)
