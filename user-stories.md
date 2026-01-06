# 231Booking User Stories

## User Types

- **Basic User**: End users who browse and book services
- **Business User**: Service providers who create and manage listings
- **Admin**: Platform administrators who oversee the system

---

## 1. User Authentication

### Basic User / Business User

- As a user, I want to sign up with my email and password so that I can create an account
- As a user, I want to sign up with my phone number so that I can create an account using my Liberian mobile number
- As a user, I want to log in with my credentials so that I can access my account
- As a user, I want to reset my password so that I can regain access if I forget it
- As a user, I want to log out so that I can secure my account on shared devices
- As a user, I want to stay logged in so that I don't have to enter credentials every time

---

## 2. User Profiles

### Basic User

- As a basic user, I want to view my profile so that I can see my account information
- As a basic user, I want to edit my profile (name, photo, contact info) so that my information stays current
- As a basic user, I want to add my preferred payment methods so that I can book faster
- As a basic user, I want to set my notification preferences so that I control what alerts I receive

### Business User

- As a business user, I want to create a business profile so that I can list my services
- As a business user, I want to add my business details (name, description, logo, contact) so that customers know about my business
- As a business user, I want to verify my business so that customers trust my listings
- As a business user, I want to view my earnings dashboard so that I can track my revenue
- As a business user, I want to add my payout details (mobile money or bank) so that I can receive payments

### Admin

- As an admin, I want to view all user accounts so that I can manage the platform
- As an admin, I want to suspend or deactivate user accounts so that I can enforce platform rules
- As an admin, I want to verify business accounts so that I can maintain platform quality

---

## 3. Listings Management (Business Users)

### Creating Listings

- As a business user, I want to create a new listing so that I can offer my services
- As a business user, I want to select a category (hotel, event, travel package, etc.) so that my listing is properly classified
- As a business user, I want to add a title and description so that users understand my offering
- As a business user, I want to upload photos so that users can see what they're booking
- As a business user, I want to set pricing so that users know the cost
- As a business user, I want to set availability/dates so that users can book open slots
- As a business user, I want to add location details so that users know where the service is

### Managing Listings

- As a business user, I want to view all my listings so that I can manage them
- As a business user, I want to edit my listings so that I can update information
- As a business user, I want to delete listings so that I can remove outdated offerings
- As a business user, I want to temporarily disable a listing so that I can pause bookings without deleting
- As a business user, I want to view booking requests so that I can manage incoming reservations
- As a business user, I want to accept or decline booking requests so that I can control my availability

---

## 4. Listings (Basic Users - Browse & Book)

### Discovering Listings

- As a user, I want to browse listings by category so that I can find relevant services
- As a user, I want to view featured/popular listings so that I can discover top options
- As a user, I want to view listing details (photos, description, price, location) so that I can make informed decisions
- As a user, I want to see listing availability so that I know when I can book
- As a user, I want to view the business profile so that I can learn about the service provider

### Search and Filter

- As a user, I want to search listings by keyword so that I can find specific services
- As a user, I want to filter by category so that I see only relevant results
- As a user, I want to filter by price range so that I find options within my budget
- As a user, I want to filter by location so that I find nearby services
- As a user, I want to filter by date/availability so that I find available options
- As a user, I want to filter by rating so that I find highly-rated services
- As a user, I want to sort results (price, rating, distance) so that I can prioritize what matters to me

---

## 5. Booking System

### Making a Booking

- As a user, I want to select a date/time for my booking so that I reserve my preferred slot
- As a user, I want to select quantity/guests (if applicable) so that my booking is accurate
- As a user, I want to add special requests or notes so that the provider knows my needs
- As a user, I want to review my booking details before confirming so that I can verify accuracy
- As a user, I want to receive a booking confirmation so that I have proof of my reservation

### Managing Bookings

- As a user, I want to view my upcoming bookings so that I can see what I have scheduled
- As a user, I want to view my past bookings so that I can see my history
- As a user, I want to cancel a booking so that I can change my plans if needed
- As a user, I want to modify a booking so that I can adjust details if needed
- As a user, I want to contact the service provider so that I can communicate about my booking

---

## 6. Payment System

### Making Payments

- As a user, I want to pay with Stripe (card) so that I can use my debit/credit card
- As a user, I want to pay with Orange Money so that I can use my mobile money account
- As a user, I want to pay with MTN Mobile Money so that I can use my preferred mobile payment
- As a user, I want to see a breakdown of costs (service fee, taxes, total) so that I understand what I'm paying
- As a user, I want to receive a payment receipt so that I have a record of my transaction
- As a user, I want to save my payment method so that future payments are faster

### Refunds

- As a user, I want to request a refund for cancelled bookings so that I can get my money back
- As a user, I want to view my refund status so that I know when to expect my money

### Business Payouts

- As a business user, I want to receive payments to my mobile money account so that I can access my earnings
- As a business user, I want to view my transaction history so that I can track all payments
- As a business user, I want to withdraw my earnings so that I can access my funds

---

## 7. Reviews and Ratings

### Leaving Reviews

- As a user, I want to rate a service after my booking so that I can share my experience
- As a user, I want to write a review so that I can provide detailed feedback
- As a user, I want to add photos to my review so that I can show my experience

### Viewing Reviews

- As a user, I want to view reviews on a listing so that I can see others' experiences
- As a user, I want to see the average rating so that I can quickly assess quality
- As a user, I want to filter reviews (by rating, recency) so that I can find relevant feedback

### Managing Reviews

- As a business user, I want to respond to reviews so that I can engage with customers
- As a business user, I want to view all my reviews so that I can monitor my reputation
- As an admin, I want to moderate reviews so that I can remove inappropriate content

---

## 8. Push Notifications

### Basic User Notifications

- As a user, I want to receive booking confirmation notifications so that I know my booking was successful
- As a user, I want to receive booking reminder notifications so that I don't miss my appointments
- As a user, I want to receive booking status updates so that I know if anything changes
- As a user, I want to receive promotional notifications so that I learn about deals
- As a user, I want to control my notification preferences so that I only get relevant alerts

### Business User Notifications

- As a business user, I want to receive new booking notifications so that I can respond quickly
- As a business user, I want to receive cancellation notifications so that I know when bookings are cancelled
- As a business user, I want to receive new review notifications so that I can respond to feedback
- As a business user, I want to receive payout notifications so that I know when I've been paid

---

## 9. Booking History

- As a user, I want to view all my past bookings so that I can see my complete history
- As a user, I want to filter my booking history by status (completed, cancelled) so that I can find specific bookings
- As a user, I want to filter my booking history by date range so that I can find bookings from a specific period
- As a user, I want to rebook a past service so that I can easily repeat a booking
- As a user, I want to download/export my booking history so that I have records for my own use

---

## 10. Admin Features

### Platform Management

- As an admin, I want to view platform analytics so that I can monitor overall performance
- As an admin, I want to manage categories so that I can organize listings properly
- As an admin, I want to feature listings so that I can promote quality services
- As an admin, I want to manage promotional banners so that I can highlight campaigns

### Content Moderation

- As an admin, I want to review and approve new business listings so that I maintain quality
- As an admin, I want to remove inappropriate listings so that I protect users
- As an admin, I want to handle reported content so that I can address user concerns

### Support

- As an admin, I want to view support tickets so that I can help users with issues
- As an admin, I want to issue refunds so that I can resolve payment disputes
- As an admin, I want to send platform-wide notifications so that I can communicate with all users

---

## Priority Matrix

### MVP (Phase 1)
- User Authentication (all stories)
- Basic User Profiles
- Listings (browse, view details)
- Basic Search and Filter
- Booking System (make and view bookings)
- Payment System (at least one mobile money option)

### Phase 2
- Business User Profiles
- Listings Management
- Reviews and Ratings
- Push Notifications
- Booking History

### Phase 3
- Admin Features
- Advanced Search and Filters
- Additional Payment Methods
- Analytics and Reporting
