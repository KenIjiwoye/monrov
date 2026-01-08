# 231Booking Work Tickets

This directory contains all implementation tickets for the 231Booking mobile application. Each ticket is designed to provide enough context for an AI agent to independently implement the feature.

## Tech Stack

- **Framework**: React Native with Expo
- **UI Library**: Tamagui
- **Navigation**: Expo Router
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod
- **Backend**: Appwrite Cloud
- **Payment**: Orange Money, MTN Mobile Money

---

## Ticket Index

### Foundation (FOUND) - Must Complete First
| Ticket | Title | Priority | Dependencies |
|--------|-------|----------|--------------|
| [FOUND-001](./FOUND-001-project-setup.md) | Project Setup & Configuration | Critical | None |
| [FOUND-002](./FOUND-002-navigation-structure.md) | Navigation Structure | Critical | FOUND-001 |
| [FOUND-003](./FOUND-003-appwrite-setup.md) | Appwrite SDK Setup | Critical | FOUND-001 |
| [FOUND-004](./FOUND-004-ui-components.md) | Common UI Components | High | FOUND-001 |
| [FOUND-005](./FOUND-005-forms-validation.md) | Forms & Validation Setup | High | FOUND-001, FOUND-004 |
| [FOUND-006](./FOUND-006-state-api-layer.md) | State Management & API Layer | High | FOUND-001, FOUND-003 |

### Authentication (AUTH) - MVP Phase 1

> **Passwordless OTP Authentication**: 231Booking uses Appwrite's Email OTP and Phone SMS for passwordless authentication. Users receive a 6-digit code to their email or phone - no passwords required.

| Ticket | Title | Priority | Dependencies |
|--------|-------|----------|--------------|
| [AUTH-001](./AUTH-001-login-screen.md) | Login Screen (Email OTP & Phone SMS) | Critical | FOUND-* |
| [AUTH-002](./AUTH-002-signup-email.md) | Sign Up (Email OTP) | Critical | FOUND-* |
| [AUTH-003](./AUTH-003-signup-phone.md) | Sign Up (Phone SMS) | High | FOUND-* |
| ~~[AUTH-004](./AUTH-004-forgot-password.md)~~ | ~~Password Reset~~ | **DEPRECATED** | N/A |
| [AUTH-005](./AUTH-005-logout.md) | Logout Functionality | High | FOUND-003 |
| [AUTH-006](./AUTH-006-session-management.md) | Session Management | Medium | FOUND-003 |

**Note**: AUTH-004 is deprecated - with passwordless OTP, there are no passwords to reset.

### User Profiles (PROF) - MVP Phase 1
| Ticket | Title | Priority | Dependencies |
|--------|-------|----------|--------------|
| [PROF-001](./PROF-001-profile-screen.md) | Profile Screen | High | FOUND-*, AUTH-* |
| [PROF-002](./PROF-002-edit-profile.md) | Edit Profile | High | PROF-001 |
| [PROF-003](./PROF-003-payment-methods.md) | Payment Methods | High | FOUND-* |
| [PROF-004](./PROF-004-notification-preferences.md) | Notification Preferences | Medium | FOUND-* |

### Listings (LIST) - MVP Phase 1
| Ticket | Title | Priority | Dependencies |
|--------|-------|----------|--------------|
| [LIST-001](./LIST-001-home-screen.md) | Home Screen | Critical | FOUND-* |
| [LIST-002](./LIST-002-listing-details.md) | Listing Details | Critical | FOUND-*, LIST-001 |

### Search (SRCH) - MVP Phase 1
| Ticket | Title | Priority | Dependencies |
|--------|-------|----------|--------------|
| [SRCH-001](./SRCH-001-search-screen.md) | Search & Filter Screen | Critical | FOUND-* |

### Bookings (BOOK) - MVP Phase 1
| Ticket | Title | Priority | Dependencies |
|--------|-------|----------|--------------|
| [BOOK-001](./BOOK-001-booking-flow.md) | Booking Flow | Critical | FOUND-*, LIST-002 |
| [BOOK-002](./BOOK-002-bookings-screen.md) | My Bookings Screen | High | FOUND-*, BOOK-001 |

### Payments (PAY) - MVP Phase 1
| Ticket | Title | Priority | Dependencies |
|--------|-------|----------|--------------|
| [PAY-001](./PAY-001-payment-integration.md) | Payment Integration | Critical | FOUND-*, BOOK-001 |

### Business Profiles (BPROF) - Phase 2
| Ticket | Title | Priority | Dependencies |
|--------|-------|----------|--------------|
| [BPROF-001](./BPROF-001-business-profile-creation.md) | Business Profile Creation | High | FOUND-*, AUTH-* |

### Reviews (REV) - Phase 2
| Ticket | Title | Priority | Dependencies |
|--------|-------|----------|--------------|
| [REV-001](./REV-001-reviews-system.md) | Reviews & Ratings | High | FOUND-*, BOOK-001 |

---

## Parallelization Guide

### Phase 1: Foundation (Sequential)
These tickets should be completed first, mostly in order:

```
FOUND-001 (Project Setup)
    │
    ├── FOUND-002 (Navigation) ─────┐
    ├── FOUND-003 (Appwrite) ───────┼── Can run in parallel
    └── FOUND-004 (UI Components) ──┘
              │
              └── FOUND-005 (Forms) ─┬── Can run in parallel
              └── FOUND-006 (API) ───┘
```

### Phase 2: Authentication (Parallel)
Once foundation is complete, auth tickets can run in parallel:

```
┌─────────────────────────────────────────┐
│  AUTH-001    AUTH-002    AUTH-003       │
│  (Login OTP) (Email OTP) (Phone SMS)    │
│     │           │            │          │
│     └───────────┼────────────┘          │
│                 │                        │
│            AUTH-005    AUTH-006         │
│            (Logout)    (Session)        │
└─────────────────────────────────────────┘
         All can run in parallel
         (AUTH-004 deprecated - no passwords)
```

### Phase 3: Main Features (Parallel)
After auth, these feature groups can be developed in parallel:

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   LISTINGS      │  │    PROFILES     │  │    BOOKINGS     │
│                 │  │                 │  │                 │
│  LIST-001 ──┐   │  │  PROF-001 ──┐   │  │  BOOK-001 ──┐   │
│  LIST-002 ──┘   │  │  PROF-002 ──┤   │  │  BOOK-002 ──┘   │
│                 │  │  PROF-003 ──┤   │  │                 │
│  SRCH-001       │  │  PROF-004 ──┘   │  │  PAY-001        │
└─────────────────┘  └─────────────────┘  └─────────────────┘
     Agent 1              Agent 2              Agent 3
```

### Phase 4: Phase 2 Features (Parallel)
These can all run in parallel after MVP is complete:

```
┌─────────────────┐  ┌─────────────────┐
│    BUSINESS     │  │     REVIEWS     │
│                 │  │                 │
│  BPROF-001      │  │  REV-001        │
└─────────────────┘  └─────────────────┘
     Agent A              Agent B
```

---

## Recommended Execution Order

### For Single Agent
1. FOUND-001 → FOUND-002 → FOUND-003 → FOUND-004 → FOUND-005 → FOUND-006
2. AUTH-001 → AUTH-002 → AUTH-003 → AUTH-005 → AUTH-006 (skip AUTH-004)
3. LIST-001 → LIST-002 → SRCH-001
4. BOOK-001 → BOOK-002 → PAY-001
5. PROF-001 → PROF-002 → PROF-003 → PROF-004
6. BPROF-001 → REV-001

### For Multiple Agents (3 Agents)

**Round 1 - Foundation:**
- Agent 1: FOUND-001 (all agents wait)

**Round 2 - Foundation Parallel:**
- Agent 1: FOUND-002
- Agent 2: FOUND-003
- Agent 3: FOUND-004

**Round 3 - Foundation Complete:**
- Agent 1: FOUND-005
- Agent 2: FOUND-006
- Agent 3: Start AUTH-001

**Round 4 - Auth & Features:**
- Agent 1: AUTH-002, AUTH-003
- Agent 2: AUTH-005, AUTH-006 (AUTH-004 deprecated)
- Agent 3: LIST-001, LIST-002

**Round 5 - Main Features:**
- Agent 1: SRCH-001, BOOK-001
- Agent 2: PROF-001, PROF-002
- Agent 3: BOOK-002, PAY-001

**Round 6 - Remaining:**
- Agent 1: PROF-003, PROF-004
- Agent 2: BPROF-001
- Agent 3: REV-001

---

## Ticket Structure

Each ticket follows this structure:

```markdown
# TICKET-ID: Title

## Ticket Information
- **ID**: TICKET-ID
- **Priority**: Critical/High/Medium/Low
- **Dependencies**: List of required tickets
- **Phase**: MVP (Phase 1) / Phase 2
- **Parallel Work**: Can run in parallel with X, Y

## Description
Brief description of what needs to be built.

## Context
Why this is needed and how it fits into the larger system.

## Implementation Requirements
Detailed code examples and file structures.

## Acceptance Criteria
Checklist of requirements for completion.

## Testing Checklist
Tests to verify the implementation.

## Files to Create/Modify
Table of files and actions.

## Notes for AI Agent
Special considerations and tips.
```

---

## File Structure

The implementation will create/modify files in the following structure:

```
mobile/
├── app/
│   ├── _layout.tsx
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   ├── signup-phone.tsx
│   │   └── verify-otp.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx (Home)
│   │   ├── search.tsx
│   │   ├── bookings.tsx
│   │   └── profile.tsx
│   ├── listing/
│   │   └── [id].tsx
│   ├── booking/
│   │   ├── [listingId].tsx
│   │   └── confirmation/[id].tsx
│   ├── payment/
│   │   └── [bookingId].tsx
│   ├── review/
│   │   └── [bookingId].tsx
│   ├── business/
│   │   ├── create.tsx
│   │   └── dashboard.tsx
│   └── settings/
│       ├── _layout.tsx
│       ├── edit-profile.tsx
│       ├── payment-methods.tsx
│       └── notifications.tsx
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Avatar.tsx
│   │   ├── Badge.tsx
│   │   ├── Skeleton.tsx
│   │   ├── LoadingStates.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ErrorState.tsx
│   │   └── index.ts
│   ├── forms/
│   │   ├── FormInput.tsx
│   │   ├── FormSelect.tsx
│   │   ├── FormNumberInput.tsx
│   │   ├── PhoneInput.tsx
│   │   └── index.ts
│   ├── ListingCard.tsx
│   ├── CategoryCard.tsx
│   ├── BookingCard.tsx
│   ├── ReviewCard.tsx
│   ├── StarRating.tsx
│   ├── ImageGallery.tsx
│   ├── DatePicker.tsx
│   ├── TimeSlotPicker.tsx
│   ├── FilterSheet.tsx
│   ├── AvatarPicker.tsx
│   └── LogoutDialog.tsx
├── hooks/
│   ├── api/
│   │   ├── useListings.ts
│   │   ├── useBookings.ts
│   │   ├── useReviews.ts
│   │   ├── useProfile.ts
│   │   ├── useCategories.ts
│   │   ├── usePaymentMethods.ts
│   │   ├── usePayment.ts
│   │   └── index.ts
│   ├── useLogout.ts
│   ├── useDebouncedValue.ts
│   └── index.ts
├── lib/
│   ├── appwrite/
│   │   ├── client.ts
│   │   ├── collections.ts
│   │   ├── errors.ts
│   │   └── queryHelpers.ts
│   ├── auth/
│   │   ├── AuthContext.tsx
│   │   └── sessionStorage.ts
│   ├── services/
│   │   └── paymentService.ts
│   ├── validations/
│   │   ├── common.ts
│   │   ├── auth.ts
│   │   ├── profile.ts
│   │   ├── booking.ts
│   │   ├── listing.ts
│   │   ├── review.ts
│   │   ├── business.ts
│   │   └── index.ts
│   ├── config.ts
│   ├── queryClient.ts
│   └── navigation.ts
├── types/
│   ├── models.ts
│   ├── navigation.ts
│   ├── payment.ts
│   └── notifications.ts
└── tamagui.config.ts
```

---

## Getting Started

1. Start with FOUND-001 to set up the project
2. Complete foundation tickets (FOUND-002 through FOUND-006)
3. Implement authentication (AUTH-001 through AUTH-006)
4. Build main features in parallel (Listings, Search, Bookings, Profiles)
5. Add Phase 2 features (Business Profiles, Reviews)

Each ticket is self-contained with all necessary implementation details. Follow the acceptance criteria to ensure completeness.
