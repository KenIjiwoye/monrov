# FOUND-004: Common UI Components Library

## Ticket Information
- **ID**: FOUND-004
- **Priority**: High
- **Dependencies**: FOUND-001
- **Phase**: MVP (Phase 1)
- **Parallel Work**: Can run in parallel with FOUND-002, FOUND-003, FOUND-005

## Description
Create a library of reusable UI components using Tamagui that will be used throughout the 231Booking mobile app. These components should follow consistent design patterns and be accessible.

## Context
Having a consistent set of UI components ensures visual coherence across the app and speeds up development of feature screens. All components use Tamagui for styling and should be mobile-first with proper touch targets and accessibility support.

## Implementation Requirements

### 1. Button Component

**File**: `components/ui/Button.tsx`

```typescript
import { Button as TamaguiButton, styled, GetProps, Spinner } from 'tamagui';

const StyledButton = styled(TamaguiButton, {
  borderRadius: '$4',
  fontWeight: '600',

  variants: {
    variant: {
      primary: {
        backgroundColor: '$primary',
        color: '$white',
        pressStyle: {
          backgroundColor: '$primaryDark',
        },
      },
      secondary: {
        backgroundColor: '$secondary',
        color: '$white',
        pressStyle: {
          backgroundColor: '$secondaryDark',
        },
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '$primary',
        color: '$primary',
        pressStyle: {
          backgroundColor: '$primaryLight',
        },
      },
      ghost: {
        backgroundColor: 'transparent',
        color: '$primary',
        pressStyle: {
          backgroundColor: '$gray100',
        },
      },
      danger: {
        backgroundColor: '$error',
        color: '$white',
        pressStyle: {
          backgroundColor: '$errorDark',
        },
      },
    },
    size: {
      sm: {
        height: 36,
        paddingHorizontal: '$3',
        fontSize: '$3',
      },
      md: {
        height: 44,
        paddingHorizontal: '$4',
        fontSize: '$4',
      },
      lg: {
        height: 52,
        paddingHorizontal: '$5',
        fontSize: '$5',
      },
    },
    fullWidth: {
      true: {
        width: '100%',
      },
    },
  } as const,

  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

type ButtonProps = GetProps<typeof StyledButton> & {
  loading?: boolean;
};

export function Button({ loading, disabled, children, ...props }: ButtonProps) {
  return (
    <StyledButton disabled={disabled || loading} {...props}>
      {loading ? <Spinner color="$white" /> : children}
    </StyledButton>
  );
}
```

### 2. Input Component

**File**: `components/ui/Input.tsx`

```typescript
import { Input as TamaguiInput, styled, GetProps, YStack, Text, XStack } from 'tamagui';
import { forwardRef } from 'react';

const StyledInput = styled(TamaguiInput, {
  borderWidth: 1,
  borderColor: '$gray300',
  borderRadius: '$3',
  backgroundColor: '$white',
  paddingHorizontal: '$3',
  height: 48,
  fontSize: '$4',

  focusStyle: {
    borderColor: '$primary',
    borderWidth: 2,
  },

  variants: {
    error: {
      true: {
        borderColor: '$error',
        focusStyle: {
          borderColor: '$error',
        },
      },
    },
    disabled: {
      true: {
        backgroundColor: '$gray100',
        opacity: 0.6,
      },
    },
  } as const,
});

type InputProps = GetProps<typeof StyledInput> & {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export const Input = forwardRef<TamaguiInput, InputProps>(
  ({ label, error, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <YStack gap="$1">
        {label && (
          <Text fontSize="$3" fontWeight="500" color="$gray700">
            {label}
          </Text>
        )}
        <XStack alignItems="center" position="relative">
          {leftIcon && (
            <YStack position="absolute" left="$3" zIndex={1}>
              {leftIcon}
            </YStack>
          )}
          <StyledInput
            ref={ref}
            error={!!error}
            paddingLeft={leftIcon ? '$10' : '$3'}
            paddingRight={rightIcon ? '$10' : '$3'}
            flex={1}
            {...props}
          />
          {rightIcon && (
            <YStack position="absolute" right="$3" zIndex={1}>
              {rightIcon}
            </YStack>
          )}
        </XStack>
        {error && (
          <Text fontSize="$2" color="$error">
            {error}
          </Text>
        )}
      </YStack>
    );
  }
);

Input.displayName = 'Input';
```

### 3. Card Component

**File**: `components/ui/Card.tsx`

```typescript
import { YStack, styled, GetProps } from 'tamagui';

export const Card = styled(YStack, {
  backgroundColor: '$white',
  borderRadius: '$4',
  padding: '$4',

  variants: {
    variant: {
      elevated: {
        shadowColor: '$shadowColor',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      },
      outlined: {
        borderWidth: 1,
        borderColor: '$gray200',
      },
      flat: {
        backgroundColor: '$gray50',
      },
    },
    pressable: {
      true: {
        pressStyle: {
          scale: 0.98,
          opacity: 0.9,
        },
      },
    },
  } as const,

  defaultVariants: {
    variant: 'elevated',
  },
});

export type CardProps = GetProps<typeof Card>;
```

### 4. Avatar Component

**File**: `components/ui/Avatar.tsx`

```typescript
import { Image, YStack, Text, styled, GetProps } from 'tamagui';

const AvatarContainer = styled(YStack, {
  borderRadius: 1000,
  overflow: 'hidden',
  backgroundColor: '$gray200',
  alignItems: 'center',
  justifyContent: 'center',

  variants: {
    size: {
      sm: { width: 32, height: 32 },
      md: { width: 48, height: 48 },
      lg: { width: 64, height: 64 },
      xl: { width: 96, height: 96 },
    },
  } as const,

  defaultVariants: {
    size: 'md',
  },
});

type AvatarProps = GetProps<typeof AvatarContainer> & {
  src?: string | null;
  name?: string;
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ src, name, size = 'md', ...props }: AvatarProps) {
  const fontSizes = { sm: '$2', md: '$3', lg: '$5', xl: '$7' };

  if (src) {
    return (
      <AvatarContainer size={size} {...props}>
        <Image source={{ uri: src }} width="100%" height="100%" />
      </AvatarContainer>
    );
  }

  return (
    <AvatarContainer size={size} backgroundColor="$primary" {...props}>
      <Text color="$white" fontSize={fontSizes[size]} fontWeight="600">
        {name ? getInitials(name) : '?'}
      </Text>
    </AvatarContainer>
  );
}
```

### 5. Badge Component

**File**: `components/ui/Badge.tsx`

```typescript
import { XStack, Text, styled, GetProps } from 'tamagui';

const BadgeContainer = styled(XStack, {
  paddingHorizontal: '$2',
  paddingVertical: '$1',
  borderRadius: '$2',
  alignItems: 'center',
  justifyContent: 'center',

  variants: {
    variant: {
      default: { backgroundColor: '$gray200' },
      primary: { backgroundColor: '$primaryLight' },
      success: { backgroundColor: '$successLight' },
      warning: { backgroundColor: '$warningLight' },
      error: { backgroundColor: '$errorLight' },
    },
  } as const,

  defaultVariants: {
    variant: 'default',
  },
});

type BadgeProps = GetProps<typeof BadgeContainer> & {
  label: string;
};

const textColors = {
  default: '$gray700',
  primary: '$primary',
  success: '$success',
  warning: '$warning',
  error: '$error',
};

export function Badge({ label, variant = 'default', ...props }: BadgeProps) {
  return (
    <BadgeContainer variant={variant} {...props}>
      <Text fontSize="$2" fontWeight="600" color={textColors[variant]}>
        {label}
      </Text>
    </BadgeContainer>
  );
}
```

### 6. Loading States

**File**: `components/ui/LoadingStates.tsx`

```typescript
import { YStack, Spinner, Text } from 'tamagui';
import { Skeleton } from './Skeleton';

export function LoadingScreen({ message }: { message?: string }) {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$3">
      <Spinner size="large" color="$primary" />
      {message && <Text color="$gray500">{message}</Text>}
    </YStack>
  );
}

export function LoadingCard() {
  return (
    <YStack gap="$3" padding="$4">
      <Skeleton height={200} borderRadius="$4" />
      <Skeleton height={20} width="70%" />
      <Skeleton height={16} width="40%" />
    </YStack>
  );
}

export function LoadingList({ count = 3 }: { count?: number }) {
  return (
    <YStack gap="$3">
      {Array.from({ length: count }).map((_, i) => (
        <LoadingCard key={i} />
      ))}
    </YStack>
  );
}
```

### 7. Skeleton Component

**File**: `components/ui/Skeleton.tsx`

```typescript
import { useEffect } from 'react';
import { YStack, styled, GetProps } from 'tamagui';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const SkeletonBase = styled(YStack, {
  backgroundColor: '$gray200',
  overflow: 'hidden',
});

type SkeletonProps = GetProps<typeof SkeletonBase> & {
  animated?: boolean;
};

export function Skeleton({ animated = true, ...props }: SkeletonProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (animated) {
      opacity.value = withRepeat(
        withTiming(0.5, { duration: 800 }),
        -1,
        true
      );
    }
  }, [animated, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <SkeletonBase {...props} />
    </Animated.View>
  );
}
```

### 8. Empty State Component

**File**: `components/ui/EmptyState.tsx`

```typescript
import { YStack, Text } from 'tamagui';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      padding="$6"
      gap="$4"
    >
      {icon && <YStack marginBottom="$2">{icon}</YStack>}
      <Text fontSize="$6" fontWeight="600" textAlign="center">
        {title}
      </Text>
      {description && (
        <Text fontSize="$4" color="$gray500" textAlign="center">
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" onPress={onAction}>
          {actionLabel}
        </Button>
      )}
    </YStack>
  );
}
```

### 9. Error State Component

**File**: `components/ui/ErrorState.tsx`

```typescript
import { YStack, Text } from 'tamagui';
import { AlertCircle } from '@tamagui/lucide-icons';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      padding="$6"
      gap="$4"
    >
      <AlertCircle size={48} color="$error" />
      <Text fontSize="$6" fontWeight="600" textAlign="center">
        {title}
      </Text>
      <Text fontSize="$4" color="$gray500" textAlign="center">
        {message}
      </Text>
      {onRetry && (
        <Button variant="outline" onPress={onRetry}>
          Try Again
        </Button>
      )}
    </YStack>
  );
}
```

### 10. Component Exports

**File**: `components/ui/index.ts`

```typescript
export { Button } from './Button';
export { Input } from './Input';
export { Card } from './Card';
export { Avatar } from './Avatar';
export { Badge } from './Badge';
export { Skeleton } from './Skeleton';
export { LoadingScreen, LoadingCard, LoadingList } from './LoadingStates';
export { EmptyState } from './EmptyState';
export { ErrorState } from './ErrorState';
```

## Additional Dependencies

```bash
npx expo install react-native-reanimated
```

Add to `babel.config.js`:
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

## Acceptance Criteria

- [ ] Button component with variants: primary, secondary, outline, ghost, danger
- [ ] Button component with sizes: sm, md, lg
- [ ] Button component with loading state
- [ ] Input component with label, error, and icon support
- [ ] Card component with variants: elevated, outlined, flat
- [ ] Avatar component with image and fallback initials
- [ ] Badge component with color variants
- [ ] Skeleton component with animation
- [ ] Loading states: screen, card, list
- [ ] Empty state component
- [ ] Error state component with retry
- [ ] All components exported from index.ts

## Testing Checklist

- [ ] Button variants render correctly
- [ ] Button loading state shows spinner
- [ ] Input displays error message when provided
- [ ] Input icons position correctly
- [ ] Card shadow/border renders based on variant
- [ ] Avatar shows image or initials fallback
- [ ] Skeleton animation runs smoothly
- [ ] All components accessible (touch targets, labels)

## Files to Create

| File | Description |
|------|-------------|
| `components/ui/Button.tsx` | Button component |
| `components/ui/Input.tsx` | Input component |
| `components/ui/Card.tsx` | Card component |
| `components/ui/Avatar.tsx` | Avatar component |
| `components/ui/Badge.tsx` | Badge component |
| `components/ui/Skeleton.tsx` | Skeleton loading component |
| `components/ui/LoadingStates.tsx` | Loading screen/card/list |
| `components/ui/EmptyState.tsx` | Empty state component |
| `components/ui/ErrorState.tsx` | Error state component |
| `components/ui/index.ts` | Barrel export file |

## Notes for AI Agent

- Use Tamagui's `styled()` function for creating styled components
- All colors should reference theme tokens (e.g., `$primary`) not hardcoded values
- Ensure minimum touch target of 44x44px for interactive elements
- Components should be fully typed with TypeScript
- Use `forwardRef` for input components to support react-hook-form
- Test on both iOS and Android simulators
