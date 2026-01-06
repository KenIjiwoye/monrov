# SRCH-001: Search & Filter Screen

## Ticket Information
- **ID**: SRCH-001
- **Priority**: Critical
- **Dependencies**: FOUND-001, FOUND-002, FOUND-004, FOUND-006
- **Phase**: MVP (Phase 1)
- **Parallel Work**: Can run in parallel with LIST-001, LIST-002, SRCH-002

## Description
Create the main search screen for 231Booking that allows users to search listings by keyword and filter results by various criteria including category, price range, location, and rating.

## Context
The search screen is essential for users to find specific services. It should provide both a search input and filtering options, display results in a scrollable list with infinite loading, and allow sorting of results.

## Implementation Requirements

### 1. Screen File

**File**: `app/(tabs)/search.tsx`

### 2. Filter Sheet Component

**File**: `components/FilterSheet.tsx`

```typescript
import { useState } from 'react';
import { Sheet, YStack, XStack, Text, Slider } from 'tamagui';
import { Button } from '@/components/ui';
import { FormSelect } from '@/components/forms';
import { useForm } from 'react-hook-form';
import { ListingFilters, ListingCategory } from '@/types/models';
import { useCategories } from '@/hooks/api/useCategories';

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFilters: ListingFilters;
  onApplyFilters: (filters: ListingFilters) => void;
}

export function FilterSheet({
  open,
  onOpenChange,
  currentFilters,
  onApplyFilters,
}: FilterSheetProps) {
  const { data: categories } = useCategories();
  const [priceRange, setPriceRange] = useState<[number, number]>([
    currentFilters.minPrice || 0,
    currentFilters.maxPrice || 1000,
  ]);
  const [rating, setRating] = useState(currentFilters.minRating || 0);
  const [category, setCategory] = useState(currentFilters.category || '');
  const [sortBy, setSortBy] = useState(currentFilters.sortBy || 'newest');

  const categoryOptions = [
    { label: 'All Categories', value: '' },
    ...(categories?.map((c) => ({ label: c.name, value: c.slug })) || []),
  ];

  const sortOptions = [
    { label: 'Newest', value: 'newest' },
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' },
    { label: 'Highest Rated', value: 'rating' },
  ];

  const ratingOptions = [
    { label: 'Any Rating', value: 0 },
    { label: '4+ Stars', value: 4 },
    { label: '3+ Stars', value: 3 },
    { label: '2+ Stars', value: 2 },
  ];

  const handleApply = () => {
    onApplyFilters({
      category: category as ListingCategory | undefined,
      minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
      maxPrice: priceRange[1] < 1000 ? priceRange[1] : undefined,
      minRating: rating > 0 ? rating : undefined,
      sortBy: sortBy as ListingFilters['sortBy'],
    });
    onOpenChange(false);
  };

  const handleReset = () => {
    setPriceRange([0, 1000]);
    setRating(0);
    setCategory('');
    setSortBy('newest');
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[600]}
      dismissOnSnapToBottom
    >
      <Sheet.Overlay />
      <Sheet.Frame padding="$4">
        <Sheet.Handle />

        <YStack gap="$5" marginTop="$4">
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$6" fontWeight="700">
              Filters
            </Text>
            <Button variant="ghost" size="sm" onPress={handleReset}>
              <Text color="$primary">Reset</Text>
            </Button>
          </XStack>

          {/* Category */}
          <YStack gap="$2">
            <Text fontSize="$4" fontWeight="500">
              Category
            </Text>
            <XStack flexWrap="wrap" gap="$2">
              {categoryOptions.map((opt) => (
                <Button
                  key={opt.value}
                  variant={category === opt.value ? 'primary' : 'outline'}
                  size="sm"
                  onPress={() => setCategory(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </XStack>
          </YStack>

          {/* Price Range */}
          <YStack gap="$2">
            <XStack justifyContent="space-between">
              <Text fontSize="$4" fontWeight="500">
                Price Range
              </Text>
              <Text fontSize="$3" color="$gray500">
                ${priceRange[0]} - ${priceRange[1]}+
              </Text>
            </XStack>
            <Slider
              value={priceRange}
              onValueChange={setPriceRange}
              min={0}
              max={1000}
              step={10}
            >
              <Slider.Track>
                <Slider.TrackActive />
              </Slider.Track>
              <Slider.Thumb index={0} circular size="$2" />
              <Slider.Thumb index={1} circular size="$2" />
            </Slider>
          </YStack>

          {/* Rating */}
          <YStack gap="$2">
            <Text fontSize="$4" fontWeight="500">
              Minimum Rating
            </Text>
            <XStack gap="$2">
              {ratingOptions.map((opt) => (
                <Button
                  key={opt.value}
                  variant={rating === opt.value ? 'primary' : 'outline'}
                  size="sm"
                  onPress={() => setRating(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </XStack>
          </YStack>

          {/* Sort */}
          <YStack gap="$2">
            <Text fontSize="$4" fontWeight="500">
              Sort By
            </Text>
            <XStack flexWrap="wrap" gap="$2">
              {sortOptions.map((opt) => (
                <Button
                  key={opt.value}
                  variant={sortBy === opt.value ? 'primary' : 'outline'}
                  size="sm"
                  onPress={() => setSortBy(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </XStack>
          </YStack>

          {/* Apply Button */}
          <Button size="lg" fullWidth onPress={handleApply}>
            Apply Filters
          </Button>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}
```

### 3. Search Screen Implementation

**File**: `app/(tabs)/search.tsx`

```typescript
import { useState, useCallback, useEffect } from 'react';
import { FlatList, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, XStack, Text, Input } from 'tamagui';
import { router, useLocalSearchParams } from 'expo-router';
import { Search, SlidersHorizontal, X } from '@tamagui/lucide-icons';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

import {
  Button,
  Badge,
  LoadingCard,
  LoadingList,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { ListingCard } from '@/components/ListingCard';
import { FilterSheet } from '@/components/FilterSheet';
import { useListings, ListingFilters } from '@/hooks/api/useListings';

export default function SearchScreen() {
  const params = useLocalSearchParams<{
    query?: string;
    category?: string;
    featured?: string;
  }>();

  const [searchQuery, setSearchQuery] = useState(params.query || '');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ListingFilters>({
    category: params.category as any,
    search: params.query,
  });

  const debouncedQuery = useDebouncedValue(searchQuery, 300);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, search: debouncedQuery || undefined }));
  }, [debouncedQuery]);

  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useListings(filters);

  const listings = data?.pages.flatMap((page) => page.listings) || [];
  const totalCount = data?.pages[0]?.total || 0;

  const handleApplyFilters = useCallback((newFilters: ListingFilters) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
  }, []);

  const clearSearch = () => {
    setSearchQuery('');
    setFilters((prev) => ({ ...prev, search: undefined }));
  };

  const clearFilter = (key: keyof ListingFilters) => {
    setFilters((prev) => ({ ...prev, [key]: undefined }));
  };

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== ''
  ).length;

  const renderHeader = () => (
    <YStack gap="$3" padding="$4" paddingBottom="$2">
      {/* Search Input */}
      <XStack
        backgroundColor="$gray100"
        borderRadius="$4"
        paddingHorizontal="$3"
        alignItems="center"
        gap="$2"
      >
        <Search size={20} color="$gray500" />
        <Input
          flex={1}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search hotels, events, packages..."
          borderWidth={0}
          backgroundColor="transparent"
          returnKeyType="search"
          onSubmitEditing={() => Keyboard.dismiss()}
        />
        {searchQuery.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            circular
            onPress={clearSearch}
            icon={<X size={16} />}
          />
        )}
      </XStack>

      {/* Filter Button & Active Filters */}
      <XStack justifyContent="space-between" alignItems="center">
        <XStack gap="$2" flex={1} flexWrap="wrap">
          {filters.category && (
            <Badge
              label={filters.category}
              variant="primary"
              onPress={() => clearFilter('category')}
            />
          )}
          {filters.minPrice && (
            <Badge
              label={`$${filters.minPrice}+`}
              variant="default"
              onPress={() => clearFilter('minPrice')}
            />
          )}
          {filters.minRating && (
            <Badge
              label={`${filters.minRating}+ stars`}
              variant="default"
              onPress={() => clearFilter('minRating')}
            />
          )}
        </XStack>

        <Button
          variant="outline"
          size="sm"
          onPress={() => setShowFilters(true)}
          icon={<SlidersHorizontal size={16} />}
        >
          Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </Button>
      </XStack>

      {/* Results Count */}
      {!isLoading && (
        <Text fontSize="$3" color="$gray500">
          {totalCount} {totalCount === 1 ? 'result' : 'results'} found
        </Text>
      )}
    </YStack>
  );

  const renderItem = useCallback(
    ({ item }: { item: (typeof listings)[0] }) => (
      <YStack paddingHorizontal="$4" paddingBottom="$3">
        <ListingCard
          listing={item}
          onPress={() => router.push(`/listing/${item.$id}`)}
        />
      </YStack>
    ),
    []
  );

  const renderFooter = () => {
    if (isFetchingNextPage) {
      return (
        <YStack padding="$4">
          <LoadingCard />
        </YStack>
      );
    }
    return null;
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <YStack padding="$4">
          <LoadingList count={3} />
        </YStack>
      );
    }

    return (
      <EmptyState
        icon={<Search size={48} color="$gray400" />}
        title="No listings found"
        description={
          searchQuery
            ? `No results for "${searchQuery}". Try adjusting your filters.`
            : 'Try a different search or adjust your filters.'
        }
        actionLabel="Clear Filters"
        onAction={() => {
          setSearchQuery('');
          setFilters({});
        }}
      />
    );
  };

  if (error) {
    return (
      <ErrorState
        message="Failed to load listings"
        onRetry={refetch}
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <FlatList
        data={listings}
        renderItem={renderItem}
        keyExtractor={(item) => item.$id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />

      <FilterSheet
        open={showFilters}
        onOpenChange={setShowFilters}
        currentFilters={filters}
        onApplyFilters={handleApplyFilters}
      />
    </SafeAreaView>
  );
}
```

### 4. Debounce Hook

**File**: `hooks/useDebouncedValue.ts`

```typescript
import { useState, useEffect } from 'react';

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

## Acceptance Criteria

- [ ] Search screen renders at `/(tabs)/search`
- [ ] Search input with debounced query
- [ ] Filter sheet with category, price, rating, sort options
- [ ] Active filters displayed as badges
- [ ] Results count displayed
- [ ] Infinite scroll loading
- [ ] Empty state when no results
- [ ] URL params for category and query supported
- [ ] Clear filters functionality
- [ ] Keyboard dismisses on search submit

## Testing Checklist

- [ ] Search query filters results
- [ ] Debounce delays API calls
- [ ] Filter sheet opens/closes
- [ ] Category filter works
- [ ] Price range filter works
- [ ] Rating filter works
- [ ] Sort options work
- [ ] Infinite scroll loads more
- [ ] Empty state renders correctly
- [ ] URL params set initial state

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `app/(tabs)/search.tsx` | Create | Search screen |
| `components/FilterSheet.tsx` | Create | Filter sheet component |
| `hooks/useDebouncedValue.ts` | Create | Debounce hook |
