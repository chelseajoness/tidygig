# TidyGig

TidyGig connects short-term rental co-hosts with local cleaners who are open to gig work. Hosts can find cleaners by location and availability, request a turnover, and pay after it is marked complete. Cleaners set their rate, service area, weekly availability, and Stripe payout details.

The platform fee is 5% of the cleaning price and is deducted from the cleaner's earnings through Stripe Connect.

## Requirements

- Node.js and npm
- Expo development environment: [Expo docs](https://docs.expo.dev/get-started/set-up-your-environment/)
- A [Supabase](https://supabase.com/) project
- A [Stripe](https://stripe.com/) account with Connect enabled
- Xcode for iOS builds on macOS, or Android Studio for Android builds

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create a Supabase project. In its SQL editor, run [`supabase/schema.sql`](supabase/schema.sql).

3. Copy `.env.example` to `.env` and set the project URL, Supabase anon key, and Stripe publishable key:

   ```sh
   cp .env.example .env
   ```

4. Install the Supabase CLI, authenticate, and link this project to your Supabase project. Deploy the payments Edge Function and set its Stripe secret key:

   ```sh
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY
   supabase functions deploy payments --no-verify-jwt
   ```

   The function validates the Supabase user token itself. Supabase provides the URL and service-role key to deployed functions.

5. Start a native development build. Stripe's PaymentSheet requires a development build; Expo Go is not supported for that flow.

   ```sh
   npx expo run:ios
   # or
   npx expo run:android
   ```

   For subsequent JavaScript-only development, start Metro with `npm start` and open the installed development build.

## App scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Start the Expo development server |
| `npm run ios` | Start Expo targeting an iOS device or simulator |
| `npm run android` | Start Expo targeting an Android device or emulator |
| `npm run typecheck` | Run the TypeScript type check |

## Payments and testing

Use Stripe test-mode keys and test Connect onboarding before processing real payments. Hosts are charged when they pay after a cleaner marks the job complete. Stripe transfers the cleaner's share to their connected account and retains the 5% application fee.

The current implementation confirms payment from the app after PaymentSheet succeeds; it does not yet include a Stripe webhook for server-side payment event reconciliation.

## Project structure

- `app/` - Expo Router screens and navigation
- `components/` - Shared interface components
- `lib/` - Supabase client, authentication, location, payments, and shared types
- `supabase/schema.sql` - Database schema, triggers, nearby-cleaner search, and row-level security policies
- `supabase/functions/payments/` - Stripe Connect onboarding and payment Edge Function

## Security notes

- Keep `.env` and all live credentials private. They are excluded from Git.
- Never put the Supabase service-role key or Stripe secret key in the mobile app; set the Stripe secret as a Supabase function secret.
- Configure Supabase Auth email confirmation and production redirect URLs before launch.