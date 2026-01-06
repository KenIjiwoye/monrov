# FOUND-001: Project Setup & Configuration

## Ticket Information
- **ID**: FOUND-001
- **Priority**: Critical
- **Dependencies**: None
- **Phase**: MVP (Phase 1)
- **Parallel Work**: Can run in parallel with FOUND-002, FOUND-003

## Description
Set up the foundational project configuration for the 231Booking mobile app. This includes configuring the Expo project, installing required dependencies, and setting up the development environment.

## Context
This is the first ticket that must be completed before any feature development can begin. The project uses Expo with React Native, Tamagui for UI components, TanStack Query for data fetching, React Hook Form with Zod for form validation, and Appwrite Cloud as the backend.

## Implementation Requirements

### 1. Install Core Dependencies

```bash
# UI Framework
npx expo install tamagui @tamagui/config @tamagui/font-inter

# Data Fetching & State
npm install @tanstack/react-query

# Forms & Validation
npm install react-hook-form @hookform/resolvers zod

# Appwrite SDK
npm install react-native-appwrite

# Navigation (if not installed)
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context

# Additional utilities
npm install date-fns
npx expo install expo-secure-store expo-image-picker expo-notifications
```

### 2. Configure Tamagui

**File**: `tamagui.config.ts`

Ensure the Tamagui configuration includes:
- Custom theme tokens for 231Booking brand colors
- Typography scale
- Spacing scale
- Component themes

```typescript
import { createTamagui } from 'tamagui';
import { config } from '@tamagui/config/v3';

const appConfig = createTamagui({
  ...config,
  themes: {
    ...config.themes,
    light: {
      ...config.themes.light,
      primary: '#2563EB', // Customize brand color
      secondary: '#64748B',
      success: '#22C55E',
      warning: '#F59E0B',
      error: '#EF4444',
    },
  },
});

export type AppConfig = typeof appConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default appConfig;
```

### 3. Configure TanStack Query

**File**: `lib/queryClient.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});
```

### 4. Environment Configuration

**File**: `lib/config.ts`

```typescript
export const config = {
  appwrite: {
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || '',
    databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || '',
  },
};
```

**File**: `.env.example`

```
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
EXPO_PUBLIC_APPWRITE_DATABASE_ID=your_database_id
```

### 5. Update App Entry Point

**File**: `app/_layout.tsx`

```typescript
import { TamaguiProvider } from 'tamagui';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import config from '../tamagui.config';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <TamaguiProvider config={config}>
        {/* Stack or other navigation */}
      </TamaguiProvider>
    </QueryClientProvider>
  );
}
```

### 6. TypeScript Configuration

Ensure `tsconfig.json` has proper path aliases:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"],
      "@/hooks/*": ["./hooks/*"],
      "@/types/*": ["./types/*"]
    }
  }
}
```

## Acceptance Criteria

- [ ] All dependencies installed without errors
- [ ] Tamagui configured with custom brand colors
- [ ] TanStack Query client configured with default options
- [ ] Environment variables structure created
- [ ] App entry point wraps providers correctly
- [ ] TypeScript path aliases configured
- [ ] App runs without errors: `npx expo start`

## Testing Checklist

- [ ] `npm install` completes successfully
- [ ] `npx expo start` launches without errors
- [ ] Tamagui components render correctly
- [ ] No TypeScript errors in the project

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add dependencies |
| `tamagui.config.ts` | Modify | Update theme configuration |
| `lib/queryClient.ts` | Create | TanStack Query client |
| `lib/config.ts` | Create | App configuration |
| `.env.example` | Create | Environment template |
| `app/_layout.tsx` | Modify | Add providers |
| `tsconfig.json` | Modify | Add path aliases |

## Notes for AI Agent

- Check existing `tamagui.config.ts` before modifying - preserve any existing configuration
- The project already has some structure in place - integrate with existing code
- Use `@/` path alias convention throughout the project
- Ensure all providers are properly nested in the correct order
