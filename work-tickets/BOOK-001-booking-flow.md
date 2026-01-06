# BOOK-001: Booking Flow Screen

## Ticket Information
- **ID**: BOOK-001
- **Priority**: Critical
- **Dependencies**: FOUND-001, FOUND-004, FOUND-005, FOUND-006, LIST-002
- **Phase**: MVP (Phase 1)
- **Parallel Work**: Can run in parallel with BOOK-002, PAY-001

## Description
Create the main booking flow screen that allows users to select dates, number of guests, add special requests, and proceed to payment. This is the core booking functionality of the app.

## Context
The booking flow is the critical path to conversion. It should be simple, clear, and guide users through selecting their booking options with clear pricing information at each step.

## Implementation Requirements

### 1. Screen File

**File**: `app/booking/[listingId].tsx`

### 2. Booking Schema

**File**: `lib/validations/booking.ts` (update if exists)

```typescript
import { z } from 'zod';

export const createBookingSchema = z.object({
  date: z.date({ required_error: 'Please select a date' }),
  time: z.string().min(1, 'Please select a time'),
  guests: z.number().min(1, 'At least 1 guest required').max(100, 'Maximum 100 guests'),
  specialRequests: z.string().max(500).optional(),
});

export type CreateBookingFormData = z.infer<typeof createBookingSchema>;
```

### 3. Date Picker Component

**File**: `components/DatePicker.tsx`

```typescript
import { useState } from 'react';
import { YStack, XStack, Text, Button as TamaguiButton } from 'tamagui';
import { ChevronLeft, ChevronRight } from '@tamagui/lucide-icons';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isAfter, isBefore } from 'date-fns';

interface DatePickerProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  minDate?: Date;
  disabledDates?: Date[];
}

export function DatePicker({
  selectedDate,
  onDateSelect,
  minDate = new Date(),
  disabledDates = [],
}: DatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const isDateDisabled = (date: Date) => {
    if (isBefore(date, minDate)) return true;
    return disabledDates.some((d) => isSameDay(d, date));
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const startDayOfWeek = monthStart.getDay();

  return (
    <YStack gap="$3">
      {/* Month Navigation */}
      <XStack justifyContent="space-between" alignItems="center">
        <TamaguiButton
          variant="ghost"
          size="sm"
          circular
          onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}
          icon={<ChevronLeft size={20} />}
        />
        <Text fontSize="$5" fontWeight="600">
          {format(currentMonth, 'MMMM yyyy')}
        </Text>
        <TamaguiButton
          variant="ghost"
          size="sm"
          circular
          onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}
          icon={<ChevronRight size={20} />}
        />
      </XStack>

      {/* Day Names */}
      <XStack justifyContent="space-around">
        {dayNames.map((day) => (
          <Text
            key={day}
            width={40}
            textAlign="center"
            fontSize="$2"
            color="$gray500"
            fontWeight="500"
          >
            {day}
          </Text>
        ))}
      </XStack>

      {/* Calendar Grid */}
      <XStack flexWrap="wrap">
        {/* Empty cells for start of month */}
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <YStack key={`empty-${i}`} width="14.28%" height={40} />
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const disabled = isDateDisabled(day);

          return (
            <YStack
              key={day.toISOString()}
              width="14.28%"
              height={40}
              alignItems="center"
              justifyContent="center"
            >
              <TamaguiButton
                size="sm"
                circular
                backgroundColor={isSelected ? '$primary' : 'transparent'}
                disabled={disabled}
                opacity={disabled ? 0.3 : 1}
                onPress={() => !disabled && onDateSelect(day)}
              >
                <Text
                  color={isSelected ? '$white' : disabled ? '$gray400' : '$gray900'}
                  fontWeight={isSelected ? '600' : '400'}
                >
                  {format(day, 'd')}
                </Text>
              </TamaguiButton>
            </YStack>
          );
        })}
      </XStack>
    </YStack>
  );
}
```

### 4. Time Slot Picker Component

**File**: `components/TimeSlotPicker.tsx`

```typescript
import { XStack, YStack, Text } from 'tamagui';
import { Button } from '@/components/ui';

interface TimeSlotPickerProps {
  selectedTime: string | null;
  onTimeSelect: (time: string) => void;
  availableSlots?: string[];
}

const DEFAULT_SLOTS = [
  '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00',
  '17:00', '18:00', '19:00', '20:00',
];

export function TimeSlotPicker({
  selectedTime,
  onTimeSelect,
  availableSlots = DEFAULT_SLOTS,
}: TimeSlotPickerProps) {
  const formatTime = (time: string) => {
    const [hours] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${ampm}`;
  };

  return (
    <YStack gap="$3">
      <Text fontSize="$4" fontWeight="500">
        Select Time
      </Text>
      <XStack flexWrap="wrap" gap="$2">
        {availableSlots.map((slot) => (
          <Button
            key={slot}
            variant={selectedTime === slot ? 'primary' : 'outline'}
            size="sm"
            onPress={() => onTimeSelect(slot)}
          >
            {formatTime(slot)}
          </Button>
        ))}
      </XStack>
    </YStack>
  );
}
```

### 5. Booking Screen Implementation

**File**: `app/booking/[listingId].tsx`

```typescript
import { useState } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, XStack, Text, Separator, TextArea } from 'tamagui';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, Clock, Users, MessageSquare } from '@tamagui/lucide-icons';

import { Button, Card, LoadingScreen, ErrorState } from '@/components/ui';
import { FormNumberInput } from '@/components/forms';
import { DatePicker } from '@/components/DatePicker';
import { TimeSlotPicker } from '@/components/TimeSlotPicker';
import { useListing } from '@/hooks/api/useListings';
import { useCreateBooking } from '@/hooks/api/useBookings';
import { createBookingSchema, CreateBookingFormData } from '@/lib/validations/booking';

export default function BookingScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const { data: listing, isLoading, error } = useListing(listingId);
  const createBooking = useCreateBooking();

  const [step, setStep] = useState<'date' | 'details' | 'review'>('date');

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateBookingFormData>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      guests: 1,
      specialRequests: '',
    },
  });

  const selectedDate = watch('date');
  const selectedTime = watch('time');
  const guests = watch('guests');

  const calculateTotal = () => {
    if (!listing) return 0;
    // Simple calculation - adjust based on business logic
    return listing.price * (guests || 1);
  };

  const onSubmit = async (data: CreateBookingFormData) => {
    if (!listing) return;

    try {
      const booking = await createBooking.mutateAsync({
        listingId: listing.$id,
        businessId: listing.businessId,
        date: format(data.date, 'yyyy-MM-dd'),
        time: data.time,
        guests: data.guests,
        specialRequests: data.specialRequests,
        totalPrice: calculateTotal(),
      });

      router.replace(`/booking/confirmation/${booking.$id}`);
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  if (error || !listing) {
    return <ErrorState message="Failed to load listing" onRetry={() => router.back()} />;
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Book Now',
          headerLeft: () => (
            <Button
              variant="ghost"
              size="sm"
              onPress={() => {
                if (step === 'date') router.back();
                else if (step === 'details') setStep('date');
                else setStep('details');
              }}
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
            <YStack padding="$4" gap="$5" flex={1}>
              {/* Listing Summary */}
              <Card variant="flat" padding="$3">
                <XStack gap="$3">
                  <YStack flex={1}>
                    <Text fontSize="$4" fontWeight="600" numberOfLines={1}>
                      {listing.title}
                    </Text>
                    <Text fontSize="$3" color="$gray500">
                      {listing.city}
                    </Text>
                    <Text fontSize="$4" fontWeight="700" color="$primary" marginTop="$2">
                      {formatPrice(listing.price)}{' '}
                      <Text fontSize="$3" fontWeight="400" color="$gray500">
                        {listing.priceUnit.replace('_', ' ')}
                      </Text>
                    </Text>
                  </YStack>
                </XStack>
              </Card>

              {/* Step: Date Selection */}
              {step === 'date' && (
                <YStack gap="$4">
                  <YStack gap="$2">
                    <XStack gap="$2" alignItems="center">
                      <Calendar size={20} color="$gray600" />
                      <Text fontSize="$5" fontWeight="600">
                        Select Date
                      </Text>
                    </XStack>
                    <Controller
                      control={control}
                      name="date"
                      render={({ field: { value, onChange } }) => (
                        <DatePicker
                          selectedDate={value}
                          onDateSelect={onChange}
                          minDate={new Date()}
                        />
                      )}
                    />
                    {errors.date && (
                      <Text color="$error" fontSize="$2">
                        {errors.date.message}
                      </Text>
                    )}
                  </YStack>

                  <Controller
                    control={control}
                    name="time"
                    render={({ field: { value, onChange } }) => (
                      <TimeSlotPicker
                        selectedTime={value}
                        onTimeSelect={onChange}
                      />
                    )}
                  />
                  {errors.time && (
                    <Text color="$error" fontSize="$2">
                      {errors.time.message}
                    </Text>
                  )}
                </YStack>
              )}

              {/* Step: Booking Details */}
              {step === 'details' && (
                <YStack gap="$4">
                  <YStack gap="$2">
                    <XStack gap="$2" alignItems="center">
                      <Users size={20} color="$gray600" />
                      <Text fontSize="$5" fontWeight="600">
                        Number of Guests
                      </Text>
                    </XStack>
                    <FormNumberInput
                      control={control}
                      name="guests"
                      min={1}
                      max={listing.maxGuests || 100}
                    />
                  </YStack>

                  <YStack gap="$2">
                    <XStack gap="$2" alignItems="center">
                      <MessageSquare size={20} color="$gray600" />
                      <Text fontSize="$5" fontWeight="600">
                        Special Requests
                      </Text>
                    </XStack>
                    <Text fontSize="$3" color="$gray500">
                      Any special requirements or requests? (Optional)
                    </Text>
                    <Controller
                      control={control}
                      name="specialRequests"
                      render={({ field: { value, onChange } }) => (
                        <TextArea
                          value={value}
                          onChangeText={onChange}
                          placeholder="E.g., dietary requirements, accessibility needs..."
                          numberOfLines={4}
                          maxLength={500}
                        />
                      )}
                    />
                  </YStack>
                </YStack>
              )}

              {/* Step: Review */}
              {step === 'review' && (
                <YStack gap="$4">
                  <Text fontSize="$5" fontWeight="600">
                    Review Your Booking
                  </Text>

                  <Card variant="outlined" padding="$4">
                    <YStack gap="$3">
                      <XStack justifyContent="space-between">
                        <Text color="$gray500">Date</Text>
                        <Text fontWeight="500">
                          {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : '-'}
                        </Text>
                      </XStack>
                      <Separator />
                      <XStack justifyContent="space-between">
                        <Text color="$gray500">Time</Text>
                        <Text fontWeight="500">{selectedTime || '-'}</Text>
                      </XStack>
                      <Separator />
                      <XStack justifyContent="space-between">
                        <Text color="$gray500">Guests</Text>
                        <Text fontWeight="500">{guests}</Text>
                      </XStack>
                    </YStack>
                  </Card>

                  <Card variant="flat" padding="$4">
                    <YStack gap="$2">
                      <XStack justifyContent="space-between">
                        <Text color="$gray500">
                          {formatPrice(listing.price)} x {guests} guests
                        </Text>
                        <Text>{formatPrice(listing.price * guests)}</Text>
                      </XStack>
                      <XStack justifyContent="space-between">
                        <Text color="$gray500">Service fee</Text>
                        <Text>{formatPrice(calculateTotal() * 0.1)}</Text>
                      </XStack>
                      <Separator />
                      <XStack justifyContent="space-between">
                        <Text fontWeight="700" fontSize="$5">
                          Total
                        </Text>
                        <Text fontWeight="700" fontSize="$5" color="$primary">
                          {formatPrice(calculateTotal() * 1.1)}
                        </Text>
                      </XStack>
                    </YStack>
                  </Card>
                </YStack>
              )}

              {/* Spacer */}
              <YStack flex={1} />
            </YStack>
          </ScrollView>

          {/* Bottom Action Bar */}
          <YStack
            padding="$4"
            borderTopWidth={1}
            borderTopColor="$gray200"
            backgroundColor="$white"
          >
            {step === 'date' && (
              <Button
                size="lg"
                fullWidth
                disabled={!selectedDate || !selectedTime}
                onPress={() => setStep('details')}
              >
                Continue
              </Button>
            )}
            {step === 'details' && (
              <Button
                size="lg"
                fullWidth
                onPress={() => setStep('review')}
              >
                Review Booking
              </Button>
            )}
            {step === 'review' && (
              <Button
                size="lg"
                fullWidth
                loading={createBooking.isPending}
                onPress={handleSubmit(onSubmit)}
              >
                Confirm & Pay {formatPrice(calculateTotal() * 1.1)}
              </Button>
            )}
          </YStack>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
```

## Acceptance Criteria

- [ ] Screen renders at `/booking/[listingId]`
- [ ] Three-step flow: Date → Details → Review
- [ ] Date picker allows future date selection
- [ ] Time slot picker shows available times
- [ ] Guest count input with min/max validation
- [ ] Special requests text area (optional)
- [ ] Price calculation shown clearly
- [ ] Review step shows all booking details
- [ ] Continue/Back navigation between steps
- [ ] Confirm creates booking and redirects to confirmation
- [ ] Loading state during booking creation

## Testing Checklist

- [ ] Listing data loads correctly
- [ ] Cannot select past dates
- [ ] Time slots are selectable
- [ ] Guest validation works (min/max)
- [ ] Price calculates correctly
- [ ] Review shows correct summary
- [ ] Back navigation works at each step
- [ ] Booking creation succeeds
- [ ] Redirects to confirmation on success
- [ ] Error handling for failed bookings

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `app/booking/[listingId].tsx` | Create | Booking flow screen |
| `components/DatePicker.tsx` | Create | Calendar date picker |
| `components/TimeSlotPicker.tsx` | Create | Time slot selector |
| `lib/validations/booking.ts` | Modify | Add booking schema |
