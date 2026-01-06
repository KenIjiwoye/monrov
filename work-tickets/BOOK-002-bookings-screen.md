# BOOK-002: My Bookings Screen

## Ticket Information
- **ID**: BOOK-002
- **Priority**: High
- **Dependencies**: FOUND-001, FOUND-002, FOUND-004, FOUND-006, BOOK-001
- **Phase**: MVP (Phase 1)
- **Parallel Work**: Can run in parallel with BOOK-001, BOOK-003

## Description
Create the My Bookings screen that displays the user's upcoming and past bookings with options to view details, cancel, or modify bookings.

## Context
Users need to track their bookings easily. This screen provides a tabbed interface showing upcoming and past bookings, with quick access to booking details and management actions.

## Implementation Requirements

### 1. Screen File

**File**: `app/(tabs)/bookings.tsx`

### 2. Booking Card Component

**File**: `components/BookingCard.tsx`

```typescript
import { YStack, XStack, Text, Image } from 'tamagui';
import { format, parseISO } from 'date-fns';
import { Calendar, Clock, Users, MapPin } from '@tamagui/lucide-icons';
import { router } from 'expo-router';

import { Card, Badge, Button } from '@/components/ui';
import { Booking, BookingStatus } from '@/types/models';

interface BookingCardProps {
  booking: Booking;
  listing?: {
    title: string;
    images: string[];
    city: string;
  };
  onCancel?: () => void;
  onModify?: () => void;
}

const STATUS_VARIANTS: Record<BookingStatus, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  pending: 'warning',
  confirmed: 'success',
  cancelled: 'error',
  completed: 'default',
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

export function BookingCard({
  booking,
  listing,
  onCancel,
  onModify,
}: BookingCardProps) {
  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), 'EEE, MMM d, yyyy');
  };

  const formatTime = (time: string) => {
    const [hours] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${ampm}`;
  };

  const isUpcoming = booking.status === 'pending' || booking.status === 'confirmed';
  const canModify = booking.status === 'pending' || booking.status === 'confirmed';

  return (
    <Card
      variant="elevated"
      padding={0}
      pressable
      onPress={() => router.push(`/booking/details/${booking.$id}`)}
    >
      {/* Image Header */}
      {listing?.images?.[0] && (
        <Image
          source={{ uri: listing.images[0] }}
          width="100%"
          height={120}
          borderTopLeftRadius="$4"
          borderTopRightRadius="$4"
        />
      )}

      <YStack padding="$3" gap="$3">
        {/* Status & Title */}
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1} gap="$1">
            <Text fontSize="$5" fontWeight="600" numberOfLines={1}>
              {listing?.title || 'Booking'}
            </Text>
            {listing?.city && (
              <XStack gap="$1" alignItems="center">
                <MapPin size={14} color="$gray500" />
                <Text fontSize="$3" color="$gray500">
                  {listing.city}
                </Text>
              </XStack>
            )}
          </YStack>
          <Badge
            label={STATUS_LABELS[booking.status]}
            variant={STATUS_VARIANTS[booking.status]}
          />
        </XStack>

        {/* Booking Details */}
        <YStack gap="$2">
          <XStack gap="$4">
            <XStack gap="$2" alignItems="center">
              <Calendar size={16} color="$gray600" />
              <Text fontSize="$3">{formatDate(booking.date)}</Text>
            </XStack>
            <XStack gap="$2" alignItems="center">
              <Clock size={16} color="$gray600" />
              <Text fontSize="$3">{formatTime(booking.time)}</Text>
            </XStack>
          </XStack>
          <XStack gap="$2" alignItems="center">
            <Users size={16} color="$gray600" />
            <Text fontSize="$3">
              {booking.guests} {booking.guests === 1 ? 'guest' : 'guests'}
            </Text>
          </XStack>
        </YStack>

        {/* Price */}
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize="$3" color="$gray500">
            Total paid
          </Text>
          <Text fontSize="$5" fontWeight="700" color="$primary">
            ${booking.totalPrice.toFixed(2)}
          </Text>
        </XStack>

        {/* Actions */}
        {isUpcoming && (
          <XStack gap="$2">
            {canModify && onModify && (
              <Button variant="outline" size="sm" flex={1} onPress={onModify}>
                Modify
              </Button>
            )}
            {canModify && onCancel && (
              <Button variant="ghost" size="sm" flex={1} onPress={onCancel}>
                <Text color="$error">Cancel</Text>
              </Button>
            )}
          </XStack>
        )}

        {/* Past booking actions */}
        {booking.status === 'completed' && (
          <XStack gap="$2">
            <Button
              variant="outline"
              size="sm"
              flex={1}
              onPress={() => router.push(`/booking/${booking.listingId}`)}
            >
              Book Again
            </Button>
            <Button
              variant="primary"
              size="sm"
              flex={1}
              onPress={() => router.push(`/review/${booking.$id}`)}
            >
              Leave Review
            </Button>
          </XStack>
        )}
      </YStack>
    </Card>
  );
}
```

### 3. Bookings Screen Implementation

**File**: `app/(tabs)/bookings.tsx`

```typescript
import { useState, useCallback } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, XStack, Text, Tabs } from 'tamagui';
import { Calendar, History } from '@tamagui/lucide-icons';

import {
  Button,
  LoadingList,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { BookingCard } from '@/components/BookingCard';
import { CancelBookingDialog } from '@/components/CancelBookingDialog';
import { useUserBookings, useCancelBooking } from '@/hooks/api/useBookings';
import { Booking } from '@/types/models';

export default function BookingsScreen() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: upcomingBookings,
    isLoading: upcomingLoading,
    error: upcomingError,
    refetch: refetchUpcoming,
  } = useUserBookings('upcoming');

  const {
    data: pastBookings,
    isLoading: pastLoading,
    error: pastError,
    refetch: refetchPast,
  } = useUserBookings('past');

  const cancelBooking = useCancelBooking();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchUpcoming(), refetchPast()]);
    setRefreshing(false);
  }, [refetchUpcoming, refetchPast]);

  const handleCancel = async () => {
    if (bookingToCancel) {
      await cancelBooking.mutateAsync(bookingToCancel);
      setBookingToCancel(null);
    }
  };

  const bookings = activeTab === 'upcoming' ? upcomingBookings : pastBookings;
  const isLoading = activeTab === 'upcoming' ? upcomingLoading : pastLoading;
  const error = activeTab === 'upcoming' ? upcomingError : pastError;

  const renderItem = useCallback(
    ({ item }: { item: Booking }) => (
      <YStack paddingHorizontal="$4" paddingBottom="$3">
        <BookingCard
          booking={item}
          // Note: Listing data would need to be fetched or included
          onCancel={() => setBookingToCancel(item.$id)}
          onModify={() => {/* TODO: Navigate to modify screen */}}
        />
      </YStack>
    ),
    []
  );

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <YStack padding="$4">
          <LoadingList count={2} />
        </YStack>
      );
    }

    return (
      <EmptyState
        icon={activeTab === 'upcoming' ? <Calendar size={48} color="$gray400" /> : <History size={48} color="$gray400" />}
        title={activeTab === 'upcoming' ? 'No Upcoming Bookings' : 'No Past Bookings'}
        description={
          activeTab === 'upcoming'
            ? "You don't have any upcoming bookings. Start exploring!"
            : "You haven't completed any bookings yet."
        }
        actionLabel={activeTab === 'upcoming' ? 'Explore Services' : undefined}
        onAction={activeTab === 'upcoming' ? () => {/* Navigate to explore */} : undefined}
      />
    );
  };

  if (error) {
    return (
      <ErrorState
        message="Failed to load bookings"
        onRetry={onRefresh}
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <YStack flex={1}>
        {/* Header */}
        <YStack padding="$4" paddingBottom="$2">
          <Text fontSize="$8" fontWeight="700">
            My Bookings
          </Text>
        </YStack>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'upcoming' | 'past')}
          orientation="horizontal"
          flexDirection="column"
          flex={1}
        >
          <Tabs.List paddingHorizontal="$4" marginBottom="$3">
            <Tabs.Tab value="upcoming" flex={1}>
              <XStack gap="$2" alignItems="center">
                <Calendar size={18} />
                <Text>Upcoming</Text>
              </XStack>
            </Tabs.Tab>
            <Tabs.Tab value="past" flex={1}>
              <XStack gap="$2" alignItems="center">
                <History size={18} />
                <Text>Past</Text>
              </XStack>
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Content value="upcoming" flex={1}>
            <FlatList
              data={upcomingBookings}
              renderItem={renderItem}
              keyExtractor={(item) => item.$id}
              ListEmptyComponent={renderEmpty}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              showsVerticalScrollIndicator={false}
            />
          </Tabs.Content>

          <Tabs.Content value="past" flex={1}>
            <FlatList
              data={pastBookings}
              renderItem={renderItem}
              keyExtractor={(item) => item.$id}
              ListEmptyComponent={renderEmpty}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              showsVerticalScrollIndicator={false}
            />
          </Tabs.Content>
        </Tabs>
      </YStack>

      {/* Cancel Dialog */}
      <CancelBookingDialog
        open={!!bookingToCancel}
        onOpenChange={() => setBookingToCancel(null)}
        onConfirm={handleCancel}
        isLoading={cancelBooking.isPending}
      />
    </SafeAreaView>
  );
}
```

### 4. Cancel Booking Dialog

**File**: `components/CancelBookingDialog.tsx`

```typescript
import { AlertDialog, YStack, XStack, Text } from 'tamagui';
import { AlertTriangle } from '@tamagui/lucide-icons';
import { Button } from '@/components/ui';

interface CancelBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function CancelBookingDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: CancelBookingDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay />
        <AlertDialog.Content padding="$5" maxWidth={340}>
          <YStack gap="$4" alignItems="center">
            <YStack backgroundColor="$warningLight" padding="$4" borderRadius={1000}>
              <AlertTriangle size={32} color="$warning" />
            </YStack>

            <AlertDialog.Title textAlign="center">
              Cancel Booking?
            </AlertDialog.Title>

            <AlertDialog.Description textAlign="center">
              Are you sure you want to cancel this booking? This action cannot be undone. Refund policies may apply.
            </AlertDialog.Description>

            <XStack gap="$3" width="100%">
              <AlertDialog.Cancel asChild>
                <Button variant="outline" flex={1} disabled={isLoading}>
                  Keep Booking
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  variant="danger"
                  flex={1}
                  onPress={onConfirm}
                  loading={isLoading}
                >
                  Cancel Booking
                </Button>
              </AlertDialog.Action>
            </XStack>
          </YStack>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog>
  );
}
```

## Acceptance Criteria

- [ ] Screen renders at `/(tabs)/bookings`
- [ ] Tabs for Upcoming and Past bookings
- [ ] Upcoming bookings show pending/confirmed bookings
- [ ] Past bookings show completed/cancelled bookings
- [ ] Booking cards display all relevant info
- [ ] Status badges show correct state
- [ ] Cancel button triggers confirmation dialog
- [ ] Cancel updates booking status
- [ ] Book Again navigates to booking flow
- [ ] Leave Review available for completed bookings
- [ ] Pull-to-refresh works
- [ ] Empty states for each tab

## Testing Checklist

- [ ] Tabs switch between upcoming and past
- [ ] Correct bookings shown in each tab
- [ ] Booking card navigation works
- [ ] Cancel flow works correctly
- [ ] Refund notice displayed in cancel dialog
- [ ] Loading states display
- [ ] Empty states render correctly
- [ ] Pull to refresh updates data

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `app/(tabs)/bookings.tsx` | Create | My bookings screen |
| `components/BookingCard.tsx` | Create | Booking card component |
| `components/CancelBookingDialog.tsx` | Create | Cancel confirmation dialog |
