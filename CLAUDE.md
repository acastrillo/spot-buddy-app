# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kinex Fit is a fitness tracking web app with AI-powered workout features. It uses Next.js 15 (App Router) with React 19, DynamoDB for persistence, AWS Bedrock (Claude) for AI features, and Stripe for subscriptions.

## Development Commands

```bash
# Development server with Turbopack
npm run dev

# Production build
npm run build

# Linting
npm run lint

# Playwright tests (E2E)
npx playwright test
npx playwright test --project=chromium  # Single browser

# Generate Prisma client (if schema changes)
npm run db:generate
```

## Architecture

### Data Layer (DynamoDB-First)
- **Primary data source**: DynamoDB (not Prisma/SQLite in production)
- **Tables**: `spotter-users`, `spotter-workouts`, `spotter-body-metrics`, `spotter-workout-completions`, `spotter-webhook-events`, `spotter-audit-logs`
- **Key file**: `src/lib/dynamodb.ts` - all DynamoDB operations (`dynamoDBUsers`, `dynamoDBWorkouts`, etc.)
- Prisma exists but is secondary; DynamoDB is the source of truth

### Authentication
- NextAuth v4 with JWT sessions (30-day max age, 5-minute refresh)
- Providers: Google, Facebook, Email/Password credentials
- **Auth config**: `src/lib/auth-options.ts`
- Session augmented with subscription tier, quotas, onboarding status
- Type declarations in `src/types/next-auth.d.ts`

### Subscription Tiers
- **Tiers**: `free`, `core`, `pro`, `elite` (4-tier system)
- Legacy "starter" tier maps to "core" via `normalizeSubscriptionTier()`
- **Config file**: `src/lib/subscription-tiers.ts`
- Stripe integration for payments via `src/lib/stripe-server.ts`

### AI Features (Bedrock)
- Claude models via AWS Bedrock: Opus, Sonnet (default), Haiku
- **Client**: `src/lib/ai/bedrock-client.ts`
- Features: workout generation, enhancement, timer suggestions
- Prompt caching and cost tracking built-in
- Usage tracked per user with monthly limits by tier

### Timer System
- Platform-agnostic timer engine (designed for React Native portability)
- **Types**: `src/timers/types.ts` - EMOM, AMRAP, Interval, Tabata
- **Engine**: `src/timers/engine.ts`
- Timer configs can be attached to workouts or blocks

### Workout Card System
- Workouts display as card sequences (exercises + rest periods)
- **Types**: `src/types/workout-card.ts` - `ExerciseCard`, `RestCard`
- Supports AMRAP/EMOM blocks with `amrapBlocks`/`emomBlocks` arrays
- Card transformer: `src/lib/workout/card-transformer.ts`

### Component Patterns
- UI components in `src/components/ui/` (shadcn/ui based)
- Feature components organized by domain: `workout/`, `timer/`, `admin/`, `ai/`
- Session provider wraps app in `src/components/providers/session-provider.tsx`

## Key Type Definitions

- `DynamoDBUser` - User model with subscription, quotas, training profile
- `DynamoDBWorkout` - Workout with exercises, scheduling, AI enhancements
- `WorkoutCard`, `ExerciseCard`, `RestCard` - Card-based workout representation
- `TimerParams` - Discriminated union for timer configurations
- `SubscriptionTier` - `'free' | 'core' | 'pro' | 'elite'`

## API Routes

API routes follow Next.js App Router conventions under `src/app/api/`:
- `/api/workouts/[id]` - CRUD for individual workouts
- `/api/ai/*` - AI endpoints (generate, enhance, test)
- `/api/stripe/*` - Checkout, portal, webhooks
- `/api/admin/*` - Admin operations (users, logs, settings)

## Environment Configuration

Copy `.env.example` to `.env.local`. Key variables:
- `AUTH_SECRET` - Required for NextAuth
- `DYNAMODB_*` - Table names
- `AWS_REGION` / `AWS_BEDROCK_REGION` - AWS configuration
- `STRIPE_*` - Stripe keys and price IDs
- `UPSTASH_REDIS_*` - Rate limiting

## Path Alias

Use `@/*` for imports from `src/*`:
```typescript
import { dynamoDBUsers } from '@/lib/dynamodb';
import { Button } from '@/components/ui/button';
```