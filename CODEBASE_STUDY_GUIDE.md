# KINEX FIT - Comprehensive Codebase Study Guide

**Version:** January 2026
**Application:** Kinex Fit (Workout Tracking & AI-Powered Training)
**Tech Stack:** Next.js 15, React 19, TypeScript, AWS (DynamoDB, Bedrock, S3, SES), Stripe

---

## Table of Contents

1. [Frontend Architecture & Tech Stack](#1-frontend-architecture--tech-stack)
2. [Backend Architecture & Tech Stack](#2-backend-architecture--tech-stack)
3. [Database Schema & Models](#3-database-schema--models)
4. [API Structure & Endpoints](#4-api-structure--endpoints)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Key Features & Components](#6-key-features--components)
7. [File Structure & Organization](#7-file-structure--organization)
8. [External Services & Integrations](#8-external-services--integrations)
9. [Build & Deployment Configuration](#9-build--deployment-configuration)
10. [Data Flow & User Journeys](#10-data-flow--user-journeys)
11. [Security Considerations](#11-security-considerations)
12. [Monitoring & Observability](#12-monitoring--observability)
13. [Testing & Quality](#13-testing--quality)
14. [Key Technical Patterns](#14-key-technical-patterns)
15. [Learning Path & Resources](#15-learning-path--resources)

---

## 1. Frontend Architecture & Tech Stack

### Core Framework
- **Next.js 15.5.7** with **React 19.1.0**
- **TypeScript** for type safety
- **App Router** (not Pages Router)
- **Standalone output mode** for Docker deployment
- **Turbopack** for optimized development bundling

### Styling & UI
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives (dialog, dropdown, tabs, etc.)
- **shadcn/ui** - Pre-built component library (58 components total)
- Custom UI components: button, card, dialog, tabs, tooltip, input, select, etc.

### State Management & Forms
- **Zustand 5.0.8** - Lightweight global state management (`useAuthStore`)
- **React Hook Form 7.63.0** - Form handling with minimal re-renders
- **Zod 3.25.76** - Schema validation and type inference

### Data Visualization
- **Recharts 3.2.1** - Charts and graphs (bar charts, line charts, area charts)
- **Lucide React 0.542.0** - Icon library (consistent, modern icons)

### Drag & Drop
- **@dnd-kit** - Drag-and-drop functionality for exercise reordering

### File Structure
```
src/
├── app/                      # Next.js App Router
│   ├── api/                 # API routes (server-side endpoints)
│   │   ├── admin/           # Admin endpoints
│   │   ├── ai/              # AI features (generate, enhance workouts)
│   │   ├── auth/            # Authentication (NextAuth, signup)
│   │   ├── stripe/          # Stripe webhooks & checkout
│   │   ├── user/            # User profile, settings, onboarding
│   │   ├── workouts/        # Workout CRUD operations
│   │   └── ...              # Other API routes
│   ├── (routes)/            # Pages: dashboard, library, timer, etc.
│   ├── layout.tsx           # Root layout with providers
│   └── page.tsx             # Home/landing page
├── components/              # React components (58 files)
│   ├── ui/                  # Reusable UI components (buttons, cards, etc.)
│   ├── workout/             # Workout-specific components
│   ├── timer/               # Timer components (HIIT, rest, interval)
│   ├── admin/               # Admin dashboard components
│   ├── onboarding/          # Onboarding flow (8 steps)
│   ├── ai/                  # AI integration components
│   └── layout/              # Header, navigation
├── lib/                     # Utilities & helpers (41 files)
│   ├── ai/                  # AI implementation (Bedrock, Claude)
│   ├── dynamodb.ts          # Database operations
│   ├── auth-options.ts      # NextAuth configuration
│   ├── subscription-tiers.ts # Subscription logic
│   ├── stripe-server.ts     # Stripe server integration
│   ├── rate-limit.ts        # Upstash Redis rate limiting
│   └── ...                  # Other utilities
├── store/                   # Zustand stores
├── types/                   # TypeScript definitions
└── middleware.ts            # Security headers middleware
```

---

## 2. Backend Architecture & Tech Stack

### Runtime & Framework
- **Node.js** with Next.js API routes
- Runtime: `nodejs` (required for NextAuth)
- Serverless architecture (AWS ECS/Fargate)

### Authentication
- **NextAuth.js 4.24.7** - JWT-based session management
- Supported OAuth providers:
  - **Google** (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
  - **Facebook** (FACEBOOK_CLIENT_ID, FACEBOOK_CLIENT_SECRET)
  - **Credentials** (Email/Password with bcryptjs)
  - **Dev Login** (development-only, ALLOW_DEV_LOGIN flag)

### Session Management
- **JWT strategy** with 30-day max age
- Token refresh every 5 minutes of activity
- Secure httpOnly cookies with `lax` SameSite policy
- Cookie domain support for `kinexfit.com`

### API Architecture
- RESTful API design
- JSON request/response format
- Rate limiting on all endpoints
- Zod schema validation for request bodies
- Centralized error handling

---

## 3. Database Schema & Models

### Primary Database: AWS DynamoDB

**Tables:**
1. **`spotter-users`** - User accounts and profiles
2. **`spotter-workouts`** - Workout data
3. **`spotter-body-metrics`** - Body weight/metrics tracking
4. **`spotter-workout-completions`** - Completion records
5. **`spotter-webhook-events`** - Stripe webhook idempotency
6. **`spotter-audit-logs`** - Audit trail

**Key Characteristics:**
- NoSQL document database
- Global Secondary Indexes (GSI) on email field
- On-demand billing mode
- Strong consistency reads available (critical for subscription updates)

### User Model (DynamoDB)

```typescript
interface DynamoDBUser {
  // Identity
  id: string;                          // UUID
  email: string;                       // Unique, GSI
  firstName?: string | null;
  lastName?: string | null;
  emailVerified?: string | null;
  passwordHash?: string | null;        // For email/password auth

  // Subscription
  subscriptionTier: "free" | "core" | "pro" | "elite";
  subscriptionStatus: "active" | "inactive" | "trialing" | "canceled" | "past_due";
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
  trialEndsAt?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;

  // Quotas & Usage
  ocrQuotaUsed: number;
  ocrQuotaLimit: number;
  ocrQuotaResetDate?: string | null;
  workoutsSaved: number;
  aiRequestsUsed?: number;
  aiRequestsLimit?: number;
  lastAiRequestReset?: string | null;

  // Training Profile
  trainingProfile?: TrainingProfile;
  experience?: 'beginner' | 'intermediate' | 'advanced';

  // Admin/Roles
  isAdmin?: boolean;
  roles?: string[];

  // Onboarding
  onboardingCompleted?: boolean;
  onboardingSkipped?: boolean;
  onboardingCompletedAt?: string | null;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}
```

### Workout Model

```typescript
interface DynamoDBWorkout {
  id: string;                          // UUID
  userId: string;                      // User who created it
  title: string;
  description?: string;
  exercises: Exercise[];
  totalDuration?: number;              // Minutes
  difficulty?: string;                 // 'beginner', 'intermediate', 'advanced'
  tags?: string[];                     // ['chest', 'push', 'hypertrophy']
  source?: string;                     // 'user', 'ai', 'instagram'
  author?: string;                     // For imported workouts
  createdAt: string;
  updatedAt: string;
}

interface Exercise {
  id: string;                          // UUID
  name: string;                        // 'Bench Press'
  sets: number;                        // 4
  reps: number | string;               // 8 or '8-10' or 'AMRAP'
  weight?: number | null;              // 185
  unit?: 'lbs' | 'kg';                // Weight unit
  restSeconds?: number | null;         // 60
  notes?: string | null;               // 'Focus on form'
}
```

### Training Profile Model

```typescript
interface TrainingProfile {
  personalRecords: Record<string, PersonalRecord>;
  experience: 'beginner' | 'intermediate' | 'advanced';
  preferredSplit?: 'full-body' | 'upper-lower' | 'push-pull-legs' | 'bro-split' | 'custom';
  trainingDays: number;                // Days per week
  sessionDuration?: number;            // Minutes
  equipment: string[];                 // ['barbell', 'dumbbells', 'bench']
  trainingLocation?: 'home' | 'gym' | 'both';
  goals: string[];                     // ['hypertrophy', 'strength']
  primaryGoal?: string;                // 'hypertrophy'
  constraints: TrainingConstraint[];   // Injuries, limitations
  updatedAt: string;
}

interface PersonalRecord {
  exercise: string;
  weight: number;
  unit: 'lbs' | 'kg';
  reps: number;
  date: string;
  oneRepMax?: number;                  // Calculated 1RM
}

interface TrainingConstraint {
  type: 'injury' | 'limitation' | 'preference';
  description: string;
  affectedExercises?: string[];
}
```

### Workout Completion Model

```typescript
interface WorkoutCompletion {
  id: string;                          // UUID
  userId: string;
  workoutId: string;
  completedAt: string;                 // ISO date
  duration?: number;                   // Minutes
  notes?: string;
  exerciseResults?: ExerciseResult[];  // Per-exercise performance
}

interface ExerciseResult {
  exerciseId: string;
  completedSets: number;
  completedReps: number | string;
  actualWeight?: number;
  notes?: string;
}
```

### Secondary Database: SQLite (Prisma)

- Used for **local development** and **NextAuth schema**
- Location: `./prisma/dev.db` (local), `/tmp/prisma/prod.db` (production)
- Minimal usage in production (DynamoDB is primary)

---

## 4. API Structure & Endpoints

### Authentication APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/[...nextauth]` | `POST/GET` | NextAuth handler (login, callback, session) |
| `/api/auth/signup` | `POST` | User signup with email/password |
| `/api/beta-signup` | `POST` | Beta waitlist signup |

### Workout APIs

| Endpoint | Method | Rate Limit | Description |
|----------|--------|------------|-------------|
| `/api/workouts` | `GET` | 100/min | List all workouts (paginated) |
| `/api/workouts` | `POST` | 50/min | Create new workout |
| `/api/workouts/[id]` | `GET` | 100/min | Get specific workout |
| `/api/workouts/[id]` | `PATCH` | 50/min | Update workout |
| `/api/workouts/[id]` | `DELETE` | 50/min | Delete workout |
| `/api/workouts/scheduled` | `GET` | 100/min | Get scheduled workouts |
| `/api/workouts/[id]/complete` | `POST` | 50/min | Mark workout complete |
| `/api/workouts/[id]/completions` | `GET` | 100/min | Get completion history |
| `/api/workouts/completions/stats` | `GET` | 100/min | Get user stats (weekly, total, streak) |

### AI Features APIs

| Endpoint | Method | Rate Limit | Description |
|----------|--------|------------|-------------|
| `/api/ai/generate-workout` | `POST` | 20/hr | Generate workout from text prompt |
| `/api/ai/enhance-workout` | `POST` | 30/hr | Improve OCR text with AI |
| `/api/ai/workout-of-the-day` | `POST` | 10/day | Generate personalized WOTD |
| `/api/ai/workout-of-the-week` | `POST` | 5/week | Generate weekly workout plan |
| `/api/ai/test-connection` | `POST` | 10/min | Test Bedrock connectivity |

### User APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/user/profile` | `GET` | Get user profile |
| `/api/user/profile` | `POST` | Update user profile |
| `/api/user/settings` | `GET` | Get user settings |
| `/api/user/settings` | `POST` | Update user settings |
| `/api/user/onboarding` | `POST` | Update onboarding status |
| `/api/user/ai-usage` | `GET` | Get AI quota usage |
| `/api/user/delete` | `POST` | Delete account |

### Body Metrics APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/body-metrics` | `POST` | Log body metrics (weight, body fat %) |
| `/api/body-metrics/latest` | `GET` | Get latest metrics |
| `/api/body-metrics/[date]` | `GET` | Get metrics for specific date |

### Admin APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/users` | `GET` | List users (paginated, filterable) |
| `/api/admin/add-password` | `POST` | Add password to OAuth user |
| `/api/admin/reset-quotas` | `POST` | Reset user quotas (AI, OCR, etc.) |
| `/api/admin/ai-cost-monitoring` | `GET` | AI cost analytics and usage |

### Stripe APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stripe/checkout` | `POST` | Create checkout session |
| `/api/stripe/portal` | `POST` | Stripe customer portal link |
| `/api/stripe/webhook` | `POST` | Webhook handler (idempotent) |

### Other APIs

| Endpoint | Method | Rate Limit | Description |
|----------|--------|------------|-------------|
| `/api/upload-image` | `POST` | 20/hr | Upload image to S3 |
| `/api/ocr` | `POST` | 10/hr | OCR processing (Textract) |
| `/api/instagram-fetch` | `POST` | 20/hr | Instagram import (Apify) |
| `/api/ingest` | `POST` | 50/min | Data ingestion |
| `/api/health` | `GET` | Unlimited | Health check |
| `/api/csp-report` | `POST` | Unlimited | CSP violation reporting |

---

## 5. Authentication & Authorization

### NextAuth Configuration

**File:** `src/lib/auth-options.ts`

### Providers

1. **Google OAuth**
   - Configured if `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` exist
   - Automatic profile sync to DynamoDB
   - Email verification required

2. **Facebook OAuth**
   - Configured if `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET` exist
   - Similar profile sync mechanism

3. **Credentials Provider**
   - Email/password authentication
   - Password hashing with `bcryptjs`
   - Manual account creation flow

4. **Dev Credentials**
   - Development-only login (if `ALLOW_DEV_LOGIN=true`)
   - Bypasses authentication for testing

### Key Authentication Features

**User Creation & Sync:**
- Prevents duplicate user creation via race condition protection (DynamoDB `ConditionExpression`)
- Syncs OAuth users to DynamoDB on first sign-in
- Preserves subscription data during OAuth profile updates
- Automatic email verification checks

**Session Management:**
- JWT-based sessions (not database-backed)
- Session callbacks refresh subscription tier on every token refresh
- Strong consistency reads from DynamoDB for subscription status after webhooks
- 30-day session expiry, refreshed every 5 minutes

**Callbacks:**
```typescript
callbacks: {
  async signIn({ user, account, profile }) {
    // Create or update user in DynamoDB
    // Sync OAuth profile data
    return true;
  },

  async jwt({ token, user, account, trigger }) {
    // Add user ID to token on sign-in
    // Refresh subscription tier on every request
    return token;
  },

  async session({ session, token }) {
    // Add user ID and subscription to session
    return session;
  }
}
```

### Authorization (RBAC)

**Roles:**
```typescript
type Role = "user" | "admin" | "support";
```

**Permissions:**
```typescript
type Permission =
  | "admin:reset-quotas"
  | "admin:view-analytics"
  | "admin:manage-quotas";
```

**Permission Checking:**
```typescript
export function hasPermission(user: DynamoDBUser, permission: Permission): boolean {
  if (user.isAdmin) return true;
  // Check roles array for specific permissions
  return user.roles?.includes(permission) ?? false;
}
```

**Usage in API Routes:**
```typescript
// Check authentication
const session = await getServerSession(authOptions);
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Check authorization
const user = await getUserById(session.user.id);
if (!hasPermission(user, 'admin:reset-quotas')) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### Security Headers (Middleware)

**File:** `src/middleware.ts`

- **Strict-Transport-Security (HSTS)** - Forces HTTPS for 1 year
- **X-Frame-Options: DENY** - Prevents clickjacking
- **X-Content-Type-Options: nosniff** - Prevents MIME sniffing
- **Content-Security-Policy** - XSS protection with `unsafe-eval` for Next.js
- **Permissions-Policy** - Restricts camera, microphone, geolocation

---

## 6. Key Features & Components

### 1. Workout Management

**Components:**
- `WorkoutCard.tsx` - Display workout summary
- `WorkoutEditor.tsx` - Create/edit workout with drag-and-drop
- `ExerciseList.tsx` - List of exercises with reordering
- `ExerciseForm.tsx` - Add/edit individual exercise

**Features:**
- Create/edit workouts with exercises, sets, reps, weights
- Drag-and-drop exercise reordering (@dnd-kit)
- Multiple workout types: standard, AMRAP, EMOM, circuit
- Workout templates and library
- Completion tracking with date/duration
- Tags and difficulty levels

### 2. AI-Powered Features (AWS Bedrock - Claude)

**Available Models:**
- **Claude Opus 4.5** - Best quality, highest cost ($15/$75 per 1M tokens)
- **Claude Sonnet 4.5** - Balanced, default ($3/$15 per 1M tokens)
- **Claude Haiku 4.5** - Fast, cheapest ($1/$5 per 1M tokens)

**AI Features:**

1. **Workout Generation** (`/api/ai/generate-workout`)
   - Input: Natural language prompt ("Create a push day workout with compound lifts")
   - Output: Complete workout with sets, reps, form cues
   - Uses user's training profile for personalization

2. **Workout Enhancement** (`/api/ai/enhance-workout`)
   - Input: OCR text from workout image
   - Output: Cleaned, structured workout data
   - Fixes OCR errors, adds missing details

3. **Workout of the Day** (`/api/ai/workout-of-the-day`)
   - Generates daily workout based on user profile
   - Considers training history and preferences
   - Rotates muscle groups intelligently

4. **Workout of the Week** (`/api/ai/workout-of-the-week`)
   - Creates full week training split
   - Balances volume and recovery
   - Aligned with user's schedule

**Prompt Caching:**
- Ephemeral cache on system/training prompts
- Reduces cost by up to 90% for repeated requests
- Cache TTL: 5 minutes

**Implementation:**
```typescript
// src/lib/ai/workout-generator.ts
export async function generateWorkout(
  prompt: string,
  trainingProfile: TrainingProfile,
  modelId: string = 'claude-sonnet-4-5'
): Promise<GeneratedWorkout> {
  const systemPrompt = buildSystemPrompt(trainingProfile);

  const response = await bedrockClient.converse({
    modelId,
    messages: [
      { role: 'user', content: prompt }
    ],
    system: [
      {
        text: systemPrompt,
        cacheControl: { type: 'ephemeral' } // Enable caching
      }
    ]
  });

  return parseWorkoutResponse(response);
}
```

### 3. Training Profile

**Components:**
- `OnboardingWizard.tsx` - 8-step setup wizard
- `ProfileForm.tsx` - Edit training profile
- `PRCalculator.tsx` - 1RM calculator
- `EquipmentSelector.tsx` - Multi-select equipment

**Profile Data:**
- Personal records (PRs) for key lifts
- Experience level (beginner/intermediate/advanced)
- Equipment availability
- Training goals (hypertrophy, strength, endurance, etc.)
- Training constraints (injuries, limitations)
- Preferred split (full-body, upper-lower, PPL, bro-split)
- Training frequency and session duration

### 4. Workout Timers

**Timer Types:**

1. **HIIT Timer** (`HIITTimer.tsx`)
   - Work/rest interval configuration
   - Round tracking
   - Audio/visual cues

2. **AMRAP Timer** (`AMRAPTimer.tsx`)
   - Countdown timer
   - Round counter
   - Pause/resume

3. **EMOM Timer** (`EMOMTimer.tsx`)
   - Minute-based intervals
   - Exercise rotation
   - Automatic progression

4. **Rest Timer** (`RestTimer.tsx`)
   - Configurable rest periods
   - Quick preset buttons (30s, 60s, 90s, 2m)
   - Notification when rest complete

**Features:**
- Customizable intervals
- Audio cues
- Vibration alerts
- Background timer support

### 5. Progress Tracking

**Components:**
- `ProgressDashboard.tsx` - Overview of all metrics
- `PRTracker.tsx` - Personal record tracking
- `BodyMetricsChart.tsx` - Weight/body fat trends
- `WorkoutHistory.tsx` - Completion calendar
- `StreakTracker.tsx` - Consecutive day tracking
- `VolumeChart.tsx` - Training volume trends

**Metrics:**
- Personal records (1RM, volume PRs)
- Body metrics (weight, body fat %)
- Workout completion rate
- Training streak (consecutive days)
- Volume per muscle group
- Week-over-week progress

### 6. Instagram Import

**Flow:**
1. User provides Instagram username
2. Apify scraper fetches recent posts
3. Filter for workout-related images
4. Display thumbnails in library
5. OCR processing on selected images
6. AI enhancement of OCR text
7. Save as structured workout

**Components:**
- `InstagramImport.tsx` - Import form
- `InstagramThumbnails.tsx` - Grid of thumbnails
- `OCRProcessor.tsx` - Image-to-text conversion

**Files:**
- `src/app/api/instagram-fetch/route.ts` - Apify integration
- `src/lib/ocr.ts` - AWS Textract wrapper

### 7. Subscription System

**Tiers:**

| Tier | Price (Monthly) | Workouts | IG Imports | AI Requests |
|------|-----------------|----------|------------|-------------|
| **Free** | $0 | 3/week | 1/month | 1/month |
| **Core** | $9.99 | Unlimited | 3/week | 10/month |
| **Pro** | $19.99 | Unlimited | Unlimited | 30/month |
| **Elite** | $29.99 | Unlimited | Unlimited | 100/month |

**Features by Tier:**
- Free: Basic workout tracking
- Core: Unlimited workouts + basic AI
- Pro: Advanced analytics + more AI
- Elite: Priority support + highest AI quotas

**Billing:**
- Monthly and annual options
- Annual discount: 20% off
- Managed via Stripe

**Implementation:**
```typescript
// src/lib/subscription-tiers.ts
export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    workoutsPerWeek: 3,
    igImportsPerMonth: 1,
    aiRequestsPerMonth: 1,
    features: ['Basic workout tracking']
  },
  core: {
    name: 'Core',
    price: 999, // cents
    workoutsPerWeek: -1, // unlimited
    igImportsPerWeek: 3,
    aiRequestsPerMonth: 10,
    features: ['Unlimited workouts', 'AI workout generation']
  }
  // ... other tiers
};
```

**Stripe Integration:**
- Checkout session creation
- Webhook handling (idempotent)
- Customer portal for self-service
- Subscription lifecycle management

### 8. Onboarding Flow

**8-Step Wizard:**

1. **Welcome** - Introduction to app
2. **Basic Profile** - Name, email
3. **Experience Level** - Beginner/intermediate/advanced
4. **Equipment** - Multi-select available equipment
5. **Training Goals** - Select primary goals
6. **Personal Records** - Add key lifts (optional)
7. **Schedule** - Training days per week, session duration
8. **Completion** - Summary and first workout suggestion

**Components:**
- `OnboardingWizard.tsx` - Main wizard container
- `OnboardingStep1.tsx` through `OnboardingStep8.tsx` - Individual steps
- `OnboardingProgress.tsx` - Progress indicator

**State Management:**
- Form state via React Hook Form
- Progress saved to DynamoDB after each step
- Skip option available

### 9. Admin Panel

**Features:**
- User management with filters (tier, status, role)
- Quota reset functionality
- AI cost monitoring and analytics
- Password addition for OAuth users
- Audit log viewing

**Components:**
- `AdminDashboard.tsx` - Overview
- `UserManagement.tsx` - User list and actions
- `AICostMonitoring.tsx` - Cost analytics
- `QuotaManager.tsx` - Quota controls

**Permissions:**
- Admin role required for all endpoints
- Role-based permission checking
- Audit logging for admin actions

### 10. Responsive Design

**Mobile-First Components:**
- `MobileNav.tsx` - Mobile navigation drawer
- `Header.tsx` - Responsive header with hamburger menu
- `ResponsiveWorkoutCard.tsx` - Adaptive card layout
- `MobileTimerControls.tsx` - Touch-optimized controls

**Breakpoints (Tailwind):**
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

---

## 7. File Structure & Organization

### Complete Directory Tree

```
spot-buddy-web/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                     # API routes (40+ endpoints)
│   │   │   ├── admin/
│   │   │   │   ├── users/route.ts
│   │   │   │   ├── add-password/route.ts
│   │   │   │   ├── reset-quotas/route.ts
│   │   │   │   └── ai-cost-monitoring/route.ts
│   │   │   ├── ai/
│   │   │   │   ├── generate-workout/route.ts
│   │   │   │   ├── enhance-workout/route.ts
│   │   │   │   ├── workout-of-the-day/route.ts
│   │   │   │   └── workout-of-the-week/route.ts
│   │   │   ├── auth/
│   │   │   │   ├── [...nextauth]/route.ts
│   │   │   │   └── signup/route.ts
│   │   │   ├── stripe/
│   │   │   │   ├── checkout/route.ts
│   │   │   │   ├── portal/route.ts
│   │   │   │   └── webhook/route.ts
│   │   │   ├── user/
│   │   │   │   ├── profile/route.ts
│   │   │   │   ├── settings/route.ts
│   │   │   │   ├── onboarding/route.ts
│   │   │   │   ├── ai-usage/route.ts
│   │   │   │   └── delete/route.ts
│   │   │   ├── workouts/
│   │   │   │   ├── route.ts                # GET (list), POST (create)
│   │   │   │   ├── [id]/route.ts           # GET, PATCH, DELETE
│   │   │   │   ├── [id]/complete/route.ts
│   │   │   │   ├── [id]/completions/route.ts
│   │   │   │   ├── completions/stats/route.ts
│   │   │   │   └── scheduled/route.ts
│   │   │   ├── body-metrics/
│   │   │   ├── upload-image/route.ts
│   │   │   ├── ocr/route.ts
│   │   │   ├── instagram-fetch/route.ts
│   │   │   ├── health/route.ts
│   │   │   └── csp-report/route.ts
│   │   ├── dashboard/page.tsx
│   │   ├── library/page.tsx
│   │   ├── timer/page.tsx
│   │   ├── progress/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── admin/page.tsx
│   │   ├── layout.tsx                    # Root layout
│   │   ├── page.tsx                      # Landing page
│   │   └── globals.css                   # Global styles
│   ├── components/                        # React components (58 files)
│   │   ├── ui/                           # Reusable UI components (33 files)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── tooltip.tsx
│   │   │   └── ...                       # Other shadcn/ui components
│   │   ├── workout/                      # Workout features
│   │   │   ├── WorkoutCard.tsx
│   │   │   ├── WorkoutEditor.tsx
│   │   │   ├── ExerciseList.tsx
│   │   │   ├── ExerciseForm.tsx
│   │   │   └── WorkoutLibrary.tsx
│   │   ├── timer/                        # Timer components
│   │   │   ├── HIITTimer.tsx
│   │   │   ├── AMRAPTimer.tsx
│   │   │   ├── EMOMTimer.tsx
│   │   │   └── RestTimer.tsx
│   │   ├── admin/                        # Admin dashboard
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── UserManagement.tsx
│   │   │   ├── AICostMonitoring.tsx
│   │   │   └── QuotaManager.tsx
│   │   ├── onboarding/                   # Onboarding flow
│   │   │   ├── OnboardingWizard.tsx
│   │   │   ├── OnboardingStep1.tsx
│   │   │   ├── OnboardingStep2.tsx
│   │   │   └── ...                       # Steps 3-8
│   │   ├── ai/                           # AI features
│   │   │   ├── WorkoutGenerator.tsx
│   │   │   ├── WorkoutEnhancer.tsx
│   │   │   └── AIUsageIndicator.tsx
│   │   ├── layout/                       # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── MobileNav.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Sidebar.tsx
│   │   └── providers.tsx                 # Context providers
│   ├── lib/                              # Utilities (41 files)
│   │   ├── ai/
│   │   │   ├── bedrock-client.ts        # AWS Bedrock setup
│   │   │   ├── workout-generator.ts     # Workout generation logic
│   │   │   ├── workout-enhancer.ts      # OCR enhancement
│   │   │   └── prompts.ts               # AI prompts
│   │   ├── dynamodb.ts                  # DynamoDB operations
│   │   ├── auth-options.ts              # NextAuth config
│   │   ├── subscription-tiers.ts        # Subscription logic
│   │   ├── stripe-server.ts             # Stripe server SDK
│   │   ├── rate-limit.ts                # Upstash Redis
│   │   ├── email.ts                     # AWS SES
│   │   ├── s3.ts                        # S3 file uploads
│   │   ├── ocr.ts                       # AWS Textract
│   │   ├── logger.ts                    # Custom logger
│   │   ├── performance-monitor.ts       # Performance tracking
│   │   └── utils.ts                     # General utilities
│   ├── store/                            # Zustand stores
│   │   └── auth-store.ts                # Auth state
│   ├── types/                            # TypeScript definitions
│   │   ├── index.ts                     # Main types
│   │   ├── api.ts                       # API types
│   │   ├── workout.ts                   # Workout types
│   │   └── user.ts                      # User types
│   └── middleware.ts                     # Security headers
├── prisma/
│   ├── schema.prisma                     # Prisma schema (SQLite)
│   └── dev.db                            # Local database
├── public/
│   ├── images/
│   └── favicon.ico
├── .env.local                            # Environment variables (gitignored)
├── .env.example                          # Example env file
├── .eslintrc.json                        # ESLint config
├── .gitignore
├── docker-compose.yml                    # Local Docker setup
├── Dockerfile                            # Production Docker image
├── next.config.js                        # Next.js configuration
├── package.json                          # Dependencies
├── postcss.config.js                     # PostCSS config
├── tailwind.config.js                    # Tailwind config
├── tsconfig.json                         # TypeScript config
└── README.md
```

### Key Files Explained

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout with providers (NextAuth, Zustand) |
| `src/middleware.ts` | Security headers for all routes |
| `src/lib/auth-options.ts` | NextAuth configuration (providers, callbacks) |
| `src/lib/dynamodb.ts` | DynamoDB client and CRUD operations |
| `src/lib/ai/workout-generator.ts` | AI workout generation logic |
| `src/lib/subscription-tiers.ts` | Subscription tier definitions and checks |
| `src/lib/rate-limit.ts` | Upstash Redis rate limiting |
| `src/store/auth-store.ts` | Zustand auth state management |
| `next.config.js` | Next.js config (standalone output, image domains) |
| `tailwind.config.js` | Tailwind theme and plugin configuration |
| `Dockerfile` | Multi-stage Docker build for production |

---

## 8. External Services & Integrations

### 1. Authentication
- **Google OAuth** - Google Cloud Console
- **Facebook OAuth** - Facebook Developer Platform
- **NextAuth.js** - Session management

### 2. AI & Language Models
- **AWS Bedrock** - Managed Claude API access
- **Three Claude Models:**
  - **Claude Opus 4.5** (`us.anthropic.claude-opus-4-5-20251101-v1:0`)
  - **Claude Sonnet 4.5** (`us.anthropic.claude-sonnet-4-5-20250929-v1:0`) - Default
  - **Claude Haiku 4.5** (`us.anthropic.claude-haiku-4-5-20251001-v1:0`)
- **Cross-region inference profiles** for optimal performance

### 3. Database
- **Primary: AWS DynamoDB** (NoSQL)
  - 5 main tables: users, workouts, metrics, completions, audit logs
  - Global Secondary Indexes (GSI) on email field
  - On-demand billing
  - Strong consistency reads for critical operations
- **Secondary: SQLite** via Prisma (local/NextAuth schema)

### 4. File Storage
- **AWS S3** for workout images
- **CloudFront CDN** for image distribution (optional)
- Bucket: `spotter-workout-images`
- Key format: `workouts/{userId}/{workoutId}/{timestamp}-{filename}`

### 5. Email Service
- **AWS SES** (Simple Email Service)
- Signup alerts to admin
- Retry logic with exponential backoff (3 attempts)
- Email templates with HTML formatting
- From address: `notifications@kinexfit.com`

### 6. Payment Processing
- **Stripe** for subscription management
- Webhook handling for events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Idempotent webhook processing (DynamoDB tracking)
- Customer portal for self-service management
- Price IDs per tier/billing period

### 7. Rate Limiting
- **Upstash Redis** (serverless Redis)
- Sliding window algorithm
- Different limits per operation:
  - `api:read` - 100 requests/minute
  - `api:write` - 50 requests/minute
  - `api:ai` - 30 requests/hour
  - `api:ocr` - 10 requests/hour
  - `api:instagram` - 20 requests/hour
  - `auth:login` - 10 requests/15 minutes

### 8. OCR & Text Extraction
- **AWS Textract** for image-to-text conversion
- Processes workout screenshots
- Returns structured text blocks
- Integration in `/api/ocr` endpoint

### 9. Instagram Integration
- **Apify API** for Instagram scraping
- Endpoint: `apify.com/apify/instagram-post-scraper`
- Extracts post images and captions
- Batch processing for multiple imports
- Thumbnail display in workout library

### 10. Monitoring & Logging
- **AWS CloudWatch** for application metrics
- Custom logger with severity levels
- Request duration tracking
- Error rate monitoring
- Custom dimensions: userId, endpoint, tier

### 11. Infrastructure
- **AWS ECS/Fargate** - Containerized deployment
- **AWS ECR** - Container registry
- **AWS ALB** - Application Load Balancer
- **AWS Systems Manager** - Parameter Store for secrets
- **IAM Roles** - Service permissions

---

## 9. Build & Deployment Configuration

### Build Process

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Push Prisma schema to database
npm run db:push

# Build Next.js application
npm run build           # Creates .next folder with standalone output

# Start production server
npm start              # Runs .next/standalone/server.js
```

### Docker Configuration

**Multi-Stage Dockerfile:**

```dockerfile
# Stage 1: Dependencies
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 3: Runner
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

**Docker Compose (Local Development):**

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.local
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Deployment (AWS ECS/Fargate)

**Task Definition:**

```json
{
  "family": "kinexfit-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "kinexfit-app",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/kinexfit:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "AWS_REGION", "value": "us-east-1" }
      ],
      "secrets": [
        { "name": "AUTH_SECRET", "valueFrom": "arn:aws:ssm:..." }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/kinexfit",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

**ECS Service Configuration:**
- Desired count: 2 (for high availability)
- Load balancer: Application Load Balancer (ALB)
- Auto-scaling: Target tracking (CPU 70%, Memory 80%)
- Deployment: Rolling update, minimum healthy: 100%

### Environment Variables

**Required:**

```bash
# Authentication
AUTH_SECRET=                              # Random 32-byte string
NEXTAUTH_URL=https://kinexfit.com
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=

# AWS
AWS_REGION=us-east-1
AWS_BEDROCK_MODEL=claude-sonnet-4-5      # or opus, haiku

# Databases
DATABASE_URL=file:/tmp/prisma/prod.db    # Prisma SQLite
DYNAMODB_USERS_TABLE=spotter-users
DYNAMODB_WORKOUTS_TABLE=spotter-workouts
DYNAMODB_BODY_METRICS_TABLE=spotter-body-metrics
DYNAMODB_WORKOUT_COMPLETIONS_TABLE=spotter-workout-completions
DYNAMODB_WEBHOOK_EVENTS_TABLE=spotter-webhook-events
DYNAMODB_AUDIT_LOGS_TABLE=spotter-audit-logs

# File Storage
S3_WORKOUT_IMAGES_BUCKET=spotter-workout-images

# Rate Limiting
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_CORE_MONTHLY=price_...
STRIPE_PRICE_CORE_ANNUAL=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...
STRIPE_PRICE_ELITE_MONTHLY=price_...
STRIPE_PRICE_ELITE_ANNUAL=price_...

# Email
ADMIN_EMAIL=admin@kinexfit.com
EMAIL_FROM=notifications@kinexfit.com

# Instagram
APIFY_API_TOKEN=

# Node Environment
NODE_ENV=production
```

**Optional/Development:**

```bash
ALLOW_DEV_LOGIN=false                    # Enable dev login (dev only)
LOG_LEVEL=info                          # debug, info, warn, error
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### Performance Optimizations

1. **Next.js Turbopack** - Faster development builds
2. **Package Import Optimization** - Tree-shaking for large libraries
3. **Prompt Caching** - Bedrock ephemeral cache (90% cost reduction)
4. **Lazy DynamoDB Client** - Initialize on first use
5. **Rate Limiting** - Prevent abuse and control costs
6. **Cache Headers** - Immutable assets cached forever
7. **Image Optimization** - Next.js Image component with CloudFront
8. **Code Splitting** - Automatic route-based splitting

---

## 10. Data Flow & User Journeys

### 1. User Signup & Onboarding Flow

```
1. User visits landing page
2. Clicks "Sign up"
3. Chooses signup method:

   Option A: OAuth (Google/Facebook)
   ├─→ Redirect to provider
   ├─→ User authorizes app
   ├─→ Provider returns to /api/auth/callback
   ├─→ NextAuth signIn callback
   │   ├─→ Check DynamoDB for existing email (GSI query)
   │   ├─→ If new: Create user with UUID, default tier (free)
   │   └─→ If exists: Update profile from OAuth data
   ├─→ JWT callback adds userId to token
   └─→ Session created with user info

   Option B: Email/Password
   ├─→ POST /api/auth/signup
   ├─→ Validate email format and password strength (Zod)
   ├─→ Hash password with bcryptjs (10 rounds)
   ├─→ Create user in DynamoDB with UUID
   ├─→ Send welcome email via SES
   └─→ Redirect to login

4. User lands on dashboard
5. OnboardingWizard component renders (8 steps)
6. Each step saves progress to DynamoDB
7. Final step marks onboardingCompleted = true
8. User redirected to dashboard with first workout suggestion
```

### 2. Workout Creation Flow

**Manual Creation:**

```
1. User clicks "Create Workout" button
2. WorkoutEditor component renders
3. User fills form:
   ├─→ Title (required)
   ├─→ Description (optional)
   ├─→ Difficulty (beginner/intermediate/advanced)
   └─→ Tags (array of strings)
4. User adds exercises:
   ├─→ Click "Add Exercise"
   ├─→ ExerciseForm modal opens
   ├─→ Fill: name, sets, reps, weight, rest, notes
   ├─→ Click "Add"
   └─→ Exercise added to list (React Hook Form array field)
5. User drag-and-drops exercises to reorder (@dnd-kit)
6. User clicks "Save Workout"
7. Form validation with Zod
8. POST /api/workouts
   ├─→ Auth check (getServerSession)
   ├─→ Rate limit check (50/min)
   ├─→ Generate workout UUID
   ├─→ DynamoDB PutItem
   └─→ Return workout with ID
9. Client redirects to /library with success toast
```

**AI-Assisted Creation:**

```
1. User clicks "Generate with AI"
2. AIWorkoutGenerator component opens
3. User enters natural language prompt:
   Example: "Create a chest and triceps workout with compound lifts, 5-8 rep range"
4. User clicks "Generate"
5. POST /api/ai/generate-workout
   ├─→ Auth check
   ├─→ Rate limit check (20/hr)
   ├─→ Check AI quota (subscription tier)
   ├─→ Fetch user profile from DynamoDB
   ├─→ Build system prompt with training profile:
   │   ├─→ Experience level
   │   ├─→ Available equipment
   │   ├─→ Training goals
   │   ├─→ Constraints/injuries
   │   └─→ Personal records (for weight suggestions)
   ├─→ Invoke Claude via Bedrock:
   │   ├─→ Model: claude-sonnet-4-5 (default)
   │   ├─→ System prompt (cached)
   │   ├─→ User prompt
   │   └─→ Response format: JSON with exercises array
   ├─→ Parse JSON response
   ├─→ Validate exercise structure with Zod
   ├─→ Save workout to DynamoDB
   ├─→ Increment aiRequestsUsed counter
   └─→ Return workout + token usage stats
6. Client displays generated workout
7. User can edit before saving or save immediately
```

### 3. Workout Execution Flow

```
1. User navigates to /library
2. Clicks on workout card
3. Workout detail page loads
4. User clicks "Start Workout"
5. WorkoutSession component renders:
   ├─→ Current exercise displayed prominently
   ├─→ Rest timer between sets
   ├─→ Checkboxes for completed sets
   └─→ Notes field for each exercise
6. User performs workout:
   ├─→ Complete set → check checkbox
   ├─→ Rest timer starts automatically
   ├─→ Log actual weight/reps if different from plan
   └─→ Add notes (e.g., "Felt heavy", "New PR!")
7. User clicks "Next Exercise" or swipes
8. Repeat for all exercises
9. User clicks "Finish Workout"
10. POST /api/workouts/[id]/complete
    ├─→ Auth check
    ├─→ Create completion record:
    │   ├─→ completionId (UUID)
    │   ├─→ userId
    │   ├─→ workoutId
    │   ├─→ completedAt (ISO timestamp)
    │   ├─→ duration (minutes)
    │   ├─→ exerciseResults (array)
    │   └─→ notes
    ├─→ DynamoDB PutItem (spotter-workout-completions)
    ├─→ Update user stats:
    │   ├─→ Increment workoutsSaved
    │   ├─→ Update streak
    │   └─→ Check for new PRs
    └─→ Return completion data
11. Client displays completion celebration:
    ├─→ Confetti animation
    ├─→ Stats summary (duration, volume, PRs)
    └─→ Share button
```

### 4. Subscription Upgrade Flow

```
1. User clicks "Upgrade" button (from dashboard or paywall)
2. Subscription selection page loads
3. User selects tier (Core/Pro/Elite) and billing period (monthly/annual)
4. User clicks "Subscribe"
5. POST /api/stripe/checkout
   ├─→ Auth check
   ├─→ Get user from DynamoDB
   ├─→ Create or retrieve Stripe customer:
   │   ├─→ If stripeCustomerId exists: use it
   │   └─→ Else: create new customer with email
   ├─→ Get price ID from tier + billing period
   ├─→ Create Stripe CheckoutSession:
   │   ├─→ mode: 'subscription'
   │   ├─→ line_items: [{ price: priceId, quantity: 1 }]
   │   ├─→ customer: stripeCustomerId
   │   ├─→ metadata: { userId, tier }
   │   ├─→ success_url: /dashboard?session_id={CHECKOUT_SESSION_ID}
   │   └─→ cancel_url: /pricing
   └─→ Return { url: session.url }
6. Client redirects to Stripe Checkout (session.url)
7. User enters payment details on Stripe-hosted page
8. Stripe processes payment
9. Stripe webhook fires: checkout.session.completed
10. POST /api/stripe/webhook (from Stripe servers)
    ├─→ Verify signature with STRIPE_WEBHOOK_SECRET
    ├─→ Parse event payload
    ├─→ Check idempotency:
    │   ├─→ Query spotter-webhook-events table
    │   ├─→ If eventId exists: return 200 (already processed)
    │   └─→ Else: continue processing
    ├─→ Extract metadata: userId, tier
    ├─→ Update user in DynamoDB:
    │   ├─→ subscriptionTier = tier
    │   ├─→ subscriptionStatus = 'active'
    │   ├─→ subscriptionStartDate = now
    │   ├─→ stripeCustomerId = customer.id
    │   ├─→ stripeSubscriptionId = subscription.id
    │   ├─→ Update quotas based on new tier
    │   └─→ Use strong consistency for read-after-write
    ├─→ Record webhook in spotter-webhook-events
    └─→ Return 200 OK
11. Stripe redirects user to success_url
12. Client detects subscription upgrade (JWT refresh)
13. Session updated with new tier (jwt callback)
14. Dashboard refreshes with new features unlocked
```

### 5. AI Workout Generation Flow (Detailed)

```
1. User provides prompt: "Create a leg day workout focusing on quads, 8-12 rep range"
2. POST /api/ai/generate-workout { prompt, modelId? }
3. Server processing:
   ├─→ Auth check
   ├─→ Rate limit check (Upstash Redis):
   │   ├─→ Key: `ai:generate:${userId}`
   │   ├─→ Limit: 20 requests/hour
   │   └─→ If exceeded: return 429 Too Many Requests
   ├─→ Fetch user profile from DynamoDB (strong consistency)
   ├─→ Check AI quota:
   │   ├─→ If aiRequestsUsed >= aiRequestsLimit: return 402 Payment Required
   │   └─→ Else: continue
   ├─→ Build system prompt (cached):
   │   ├─→ Base instructions (workout generation rules)
   │   ├─→ User's experience level
   │   ├─→ Available equipment list
   │   ├─→ Training goals and constraints
   │   ├─→ Personal records (for weight recommendations)
   │   └─→ Response format (JSON schema)
   ├─→ Invoke AWS Bedrock:
   │   ├─→ Model: claude-sonnet-4-5 (or user-selected)
   │   ├─→ API: converse() with prompt caching
   │   ├─→ Request:
   │   │   {
   │   │     modelId: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
   │   │     system: [
   │   │       {
   │   │         text: systemPrompt,
   │   │         cacheControl: { type: 'ephemeral' }  // Cache for 5 minutes
   │   │       }
   │   │     ],
   │   │     messages: [
   │   │       { role: 'user', content: prompt }
   │   │     ],
   │   │     inferenceConfig: {
   │   │       maxTokens: 4096,
   │   │       temperature: 0.7
   │   │     }
   │   │   }
   │   └─→ Response includes token usage + cache metrics
   ├─→ Parse JSON response:
   │   ├─→ Extract exercises array
   │   ├─→ Validate structure with Zod
   │   └─→ Handle parsing errors gracefully
   ├─→ Create workout object:
   │   {
   │     id: uuid(),
   │     userId,
   │     title: generated title,
   │     description: generated description,
   │     exercises: parsed exercises,
   │     source: 'ai',
   │     difficulty: inferred from prompt,
   │     tags: extracted from content,
   │     createdAt: now
   │   }
   ├─→ Save to DynamoDB (spotter-workouts)
   ├─→ Update user stats:
   │   ├─→ Increment aiRequestsUsed
   │   └─→ Increment workoutsSaved
   ├─→ Log AI usage metrics:
   │   ├─→ CloudWatch custom metric
   │   ├─→ Dimensions: userId, tier, model
   │   ├─→ Values: inputTokens, outputTokens, cacheTokens, cost
   └─→ Return response:
       {
         workout: { ...workoutObject },
         usage: {
           inputTokens: 1234,
           outputTokens: 567,
           cacheReadTokens: 890,  // Cached tokens (90% cheaper)
           cacheCreationTokens: 1234,
           totalCost: 0.05  // USD
         }
       }
4. Client displays generated workout
5. User reviews exercises:
   ├─→ Can edit any field
   ├─→ Can reorder exercises
   ├─→ Can add/remove exercises
   └─→ Can regenerate if unsatisfied
6. User clicks "Save to Library"
7. Workout already saved, redirect to /library
```

### 6. Instagram Import Flow

```
1. User navigates to /library
2. Clicks "Import from Instagram"
3. InstagramImport modal opens
4. User enters Instagram username or post URL
5. User clicks "Import"
6. POST /api/instagram-fetch { username, postLimit: 20 }
   ├─→ Auth check
   ├─→ Rate limit check (20/hr)
   ├─→ Check IG quota (subscription tier)
   ├─→ Call Apify API:
   │   ├─→ Actor: apify/instagram-post-scraper
   │   ├─→ Input: { username, resultsLimit: 20 }
   │   └─→ Wait for completion (polling)
   ├─→ Filter posts:
   │   ├─→ Only image posts (no videos)
   │   ├─→ Exclude ads and promotions
   │   └─→ Score relevance to fitness content
   └─→ Return:
       {
         posts: [
           {
             id,
             imageUrl,
             thumbnailUrl,
             caption,
             timestamp
           }
         ]
       }
7. Client displays thumbnail grid
8. User selects workout images (multi-select)
9. User clicks "Process Selected"
10. For each selected image:
    ├─→ POST /api/ocr { imageUrl }
    │   ├─→ Download image from Instagram CDN
    │   ├─→ Upload to S3 (temp bucket)
    │   ├─→ Call AWS Textract:
    │   │   ├─→ detectDocumentText()
    │   │   └─→ Extract text blocks
    │   ├─→ Parse text blocks into lines
    │   └─→ Return raw OCR text
    ├─→ POST /api/ai/enhance-workout { ocrText }
    │   ├─→ Build prompt: "Clean up this OCR text from a workout image"
    │   ├─→ Call Bedrock with Haiku model (fast + cheap)
    │   ├─→ Parse response into structured workout
    │   └─→ Return enhanced workout
    ├─→ Display preview to user
    └─→ User confirms or edits
11. User clicks "Add to Library"
12. POST /api/workouts (batch create)
13. Workouts saved to DynamoDB
14. Update user stats:
    ├─→ Increment ocrQuotaUsed
    ├─→ Increment aiRequestsUsed
    └─→ Increment workoutsSaved
15. Client redirects to /library with new workouts
```

---

## 11. Security Considerations

### Authentication Security

1. **Password Security**
   - Bcrypt hashing with 10 salt rounds
   - Minimum password length: 8 characters
   - Password strength validation (Zod schema)
   - No password storage in logs

2. **Session Security**
   - JWT tokens in httpOnly cookies
   - SameSite: Lax (CSRF protection)
   - Secure flag in production (HTTPS only)
   - 30-day expiration with 5-minute refresh
   - Token rotation on every request

3. **OAuth Security**
   - State parameter validation (CSRF)
   - Email verification checks
   - Account linking prevention (duplicate email detection)
   - Profile sync with data preservation

4. **Race Condition Protection**
   - DynamoDB ConditionExpression on user creation
   - Prevents duplicate accounts from concurrent signups

### Authorization Security

1. **Role-Based Access Control (RBAC)**
   - User, admin, support roles
   - Permission checks in every protected API route
   - Admin-only endpoints isolated

2. **Resource Ownership**
   - Every API checks userId matches session
   - Users can only access their own workouts/data
   - Admin override for support cases

3. **Rate Limiting**
   - Per-user and per-IP limits
   - Different limits per operation type
   - Fail-closed for expensive operations
   - Redis-based distributed limiting

### Data Protection

1. **Sensitive Data Masking**
   - Emails masked in logs: `user@*****.com`
   - User IDs redacted in error messages
   - Tokens never logged
   - Custom logger with automatic masking

2. **Input Validation**
   - Zod schemas for all API inputs
   - Type checking with TypeScript
   - SQL injection prevention (NoSQL, no raw queries)
   - XSS prevention (React auto-escaping)

3. **Output Encoding**
   - JSON responses properly encoded
   - HTML entities escaped
   - No eval() or dangerous code execution

### HTTP Security Headers

**Set in `src/middleware.ts`:**

```typescript
// HSTS: Force HTTPS for 1 year
Strict-Transport-Security: max-age=31536000; includeSubDomains

// Prevent clickjacking
X-Frame-Options: DENY

// Prevent MIME sniffing
X-Content-Type-Options: nosniff

// Referrer policy
Referrer-Policy: strict-origin-when-cross-origin

// Content Security Policy
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-eval';  // unsafe-eval required for Next.js
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://spotter-workout-images.s3.amazonaws.com;
  font-src 'self';
  connect-src 'self' https://api.stripe.com;
  frame-src 'self' https://js.stripe.com;

// Permissions Policy
Permissions-Policy:
  camera=(),
  microphone=(),
  geolocation=()
```

### API Security

1. **Authentication Requirement**
   - All non-public endpoints require valid session
   - Token validation on every request
   - Session refresh extends expiration

2. **Request Validation**
   - Content-Type checks
   - Body size limits
   - Parameter type validation
   - Enum validation for constrained fields

3. **Error Handling**
   - Generic error messages to users
   - Detailed errors in server logs
   - No stack traces in production
   - HTTP status codes properly set

4. **Webhook Security**
   - Signature verification (Stripe webhook secret)
   - Idempotency tracking (prevent replay attacks)
   - Timeout protection
   - Event type validation

### Database Security

1. **DynamoDB Security**
   - Encryption at rest (AWS managed)
   - IAM roles for service access
   - No hardcoded credentials
   - Strong consistency reads for critical operations

2. **Query Safety**
   - Parameterized queries (DocumentClient)
   - No string concatenation
   - Type-safe operations
   - Error handling for all operations

### File Upload Security

1. **S3 Upload Security**
   - Presigned URLs with expiration
   - File type validation (MIME type)
   - File size limits (10MB)
   - Virus scanning (optional, not implemented)
   - Private bucket (not public read)

2. **Image Processing**
   - Validation before OCR processing
   - Sanitize filenames
   - No executable file uploads

### Monitoring & Incident Response

1. **Logging**
   - All authentication events logged
   - Failed login attempts tracked
   - API errors logged with context
   - Admin actions audited

2. **Alerts**
   - CloudWatch alarms for:
     - High error rates
     - Failed authentication attempts
     - Unusual API usage patterns
     - Quota violations

3. **Audit Trail**
   - DynamoDB audit-logs table
   - Immutable records
   - Timestamp, actor, action, target
   - Retention policy (90 days)

---

## 12. Monitoring & Observability

### Logging

**Custom Logger** (`src/lib/logger.ts`):

```typescript
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export class Logger {
  log(level: LogLevel, message: string, context?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.maskSensitiveData(context)
    };

    console.log(JSON.stringify(logEntry));

    // Send to CloudWatch (if configured)
    if (process.env.NODE_ENV === 'production') {
      this.sendToCloudWatch(logEntry);
    }
  }

  private maskSensitiveData(data: any): any {
    // Mask emails: user@example.com → user@*****.com
    // Mask tokens: sk_live_abc123 → sk_live_***
    // Redact passwords, API keys, etc.
  }
}
```

**Request Logger:**

```typescript
// Logs every API request
export function requestLogger(req: NextRequest) {
  const start = Date.now();

  // ... handle request

  const duration = Date.now() - start;
  logger.info('API Request', {
    method: req.method,
    path: req.nextUrl.pathname,
    duration,
    status: response.status,
    userId: session?.user?.id
  });
}
```

### Metrics

**CloudWatch Custom Metrics:**

1. **API Metrics**
   - `API.RequestCount` - Total requests
   - `API.ResponseTime` - P50, P95, P99 latency
   - `API.ErrorRate` - Percentage of 5xx responses
   - Dimensions: `Endpoint`, `Method`, `StatusCode`

2. **AI Metrics**
   - `AI.RequestCount` - Total AI requests
   - `AI.TokensUsed` - Input + output tokens
   - `AI.CacheHitRate` - Percentage cached
   - `AI.Cost` - Estimated cost per request
   - Dimensions: `UserId`, `Tier`, `Model`

3. **Business Metrics**
   - `Workouts.Created` - Workouts created per day
   - `Workouts.Completed` - Workouts completed per day
   - `Users.Signups` - New signups per day
   - `Users.ActiveDaily` - Daily active users
   - `Subscriptions.Conversions` - Free → paid conversions

4. **Performance Metrics**
   - `Database.QueryTime` - DynamoDB query latency
   - `S3.UploadTime` - File upload duration
   - `Cache.HitRate` - Redis cache hit rate

**PerformanceMonitor Class:**

```typescript
export class PerformanceMonitor {
  private startTime: number;

  start(): void {
    this.startTime = performance.now();
  }

  end(metricName: string, dimensions?: Record<string, string>): void {
    const duration = performance.now() - this.startTime;

    logger.info(`Performance: ${metricName}`, {
      duration,
      dimensions
    });

    // Send to CloudWatch
    cloudwatch.putMetricData({
      Namespace: 'KinexFit',
      MetricData: [{
        MetricName: metricName,
        Value: duration,
        Unit: 'Milliseconds',
        Dimensions: Object.entries(dimensions || {}).map(([k, v]) => ({
          Name: k,
          Value: v
        }))
      }]
    });
  }
}
```

### Health Checks

**Health Check Endpoint** (`/api/health`):

```typescript
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION,
    checks: {
      database: await checkDynamoDB(),
      redis: await checkRedis(),
      s3: await checkS3(),
      bedrock: await checkBedrock()
    }
  };

  const allHealthy = Object.values(health.checks).every(c => c.status === 'ok');

  return NextResponse.json(health, {
    status: allHealthy ? 200 : 503
  });
}
```

**ECS Health Check:**
```json
{
  "healthCheck": {
    "command": ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"],
    "interval": 30,
    "timeout": 5,
    "retries": 3,
    "startPeriod": 60
  }
}
```

### Error Tracking

**Centralized Error Handler:**

```typescript
export function handleApiError(error: any, context?: string): NextResponse {
  // Log full error server-side
  logger.error('API Error', {
    error: error.message,
    stack: error.stack,
    context
  });

  // Send generic error to client
  return NextResponse.json(
    {
      error: 'An error occurred',
      code: error.code || 'INTERNAL_ERROR'
    },
    { status: error.statusCode || 500 }
  );
}
```

**CSP Violation Reporting:**

```typescript
// POST /api/csp-report
export async function POST(req: NextRequest) {
  const violation = await req.json();

  logger.warn('CSP Violation', {
    blockedUri: violation['blocked-uri'],
    violatedDirective: violation['violated-directive'],
    sourceFile: violation['source-file']
  });

  return new NextResponse(null, { status: 204 });
}
```

### Alerts & Notifications

**CloudWatch Alarms:**

1. **High Error Rate**
   - Metric: `API.ErrorRate`
   - Threshold: > 5% for 5 minutes
   - Action: SNS notification to ops team

2. **High Latency**
   - Metric: `API.ResponseTime` (P95)
   - Threshold: > 2000ms for 5 minutes
   - Action: SNS notification

3. **High AI Cost**
   - Metric: `AI.Cost` (sum)
   - Threshold: > $100/hour
   - Action: SNS notification + auto-disable AI features

4. **Failed Health Checks**
   - Metric: ECS health check failures
   - Threshold: 3 consecutive failures
   - Action: ECS auto-restart task

### Dashboards

**CloudWatch Dashboard Widgets:**

1. **API Overview**
   - Request count (line chart)
   - Response time (line chart, P50/P95/P99)
   - Error rate (line chart)
   - Status code distribution (pie chart)

2. **User Activity**
   - Daily active users (line chart)
   - Signups per day (bar chart)
   - Workouts created (line chart)
   - Workouts completed (line chart)

3. **AI Usage**
   - Requests per hour (line chart)
   - Tokens used (stacked area: input/output/cached)
   - Cost per hour (line chart)
   - Model distribution (pie chart)

4. **Infrastructure**
   - ECS task count (line chart)
   - CPU utilization (line chart)
   - Memory utilization (line chart)
   - DynamoDB consumed capacity (line chart)

---

## 13. Testing & Quality

### Testing Strategy

**Test Types:**
1. **Unit Tests** - Individual functions and utilities
2. **Integration Tests** - API endpoints with mocked dependencies
3. **E2E Tests** - Full user flows with Playwright
4. **Manual Testing** - Critical paths before release

### Dev Tools

1. **TypeScript**
   - Strict mode enabled
   - No implicit any
   - Catch type errors at compile time

2. **ESLint**
   - Next.js recommended rules
   - React Hooks rules
   - Custom rules for consistency

3. **Prettier**
   - Automatic code formatting
   - Enforced in CI/CD

4. **Zod**
   - Runtime validation
   - Type inference from schemas
   - API request/response validation

### Development Workflow

**Local Development:**

```bash
# Start development server
npm run dev               # Runs on http://localhost:3000

# Type checking
npm run type-check       # tsc --noEmit

# Linting
npm run lint             # next lint

# Database
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to local SQLite
npm run db:studio        # Open Prisma Studio (GUI)

# Docker
docker-compose up        # Run in Docker locally
```

**Environment Setup:**
- Copy `.env.example` to `.env.local`
- Fill in required secrets (OAuth, Stripe, AWS)
- Generate `AUTH_SECRET`: `openssl rand -base64 32`

### Code Quality Practices

1. **Type Safety**
   - TypeScript for all files
   - Zod for runtime validation
   - Strict null checks

2. **Error Handling**
   - Try-catch blocks for async operations
   - Proper error types and codes
   - Graceful degradation

3. **Performance**
   - Lazy loading for heavy components
   - React.memo for expensive renders
   - Debouncing for frequent operations
   - Pagination for large lists

4. **Accessibility**
   - Semantic HTML
   - ARIA labels where needed
   - Keyboard navigation support
   - Focus management

---

## 14. Key Technical Patterns

### Summary Table

| Pattern | Implementation |
|---------|-----------------|
| **State Management** | Zustand for global auth state, React Hook Form for forms |
| **Form Handling** | React Hook Form + Zod validation |
| **Authentication** | NextAuth.js with OAuth + credentials providers |
| **Database** | DynamoDB (primary), SQLite (local/dev) |
| **API Communication** | Next.js API routes with typed responses |
| **Rate Limiting** | Upstash Redis with sliding window algorithm |
| **File Storage** | AWS S3 with presigned URLs |
| **Payment Processing** | Stripe with webhook webhooks (idempotent) |
| **Email** | AWS SES with retry logic |
| **AI Integration** | AWS Bedrock with Claude models + prompt caching |
| **Styling** | Tailwind CSS with Radix UI primitives |
| **Icons** | Lucide React |
| **Charts** | Recharts |
| **Drag & Drop** | @dnd-kit |
| **Logging** | Custom logger with sensitive data masking |
| **Error Handling** | Centralized error responses + CloudWatch |
| **Monitoring** | CloudWatch metrics and alarms |
| **Deployment** | Docker + ECS/Fargate |

### Common Code Patterns

**1. Protected API Route:**

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  // 1. Authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Rate limiting
  const rateLimitResult = await rateLimit('api:write', session.user.id);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  // 3. Input validation
  const body = await req.json();
  const validatedData = schema.parse(body);  // Zod validation

  // 4. Business logic
  const result = await doSomething(validatedData);

  // 5. Response
  return NextResponse.json(result, { status: 200 });
}
```

**2. DynamoDB CRUD:**

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

// Get item
async function getUser(userId: string): Promise<DynamoDBUser | null> {
  const result = await docClient.send(new GetCommand({
    TableName: process.env.DYNAMODB_USERS_TABLE,
    Key: { id: userId }
  }));

  return result.Item as DynamoDBUser || null;
}

// Put item
async function updateUser(user: DynamoDBUser): Promise<void> {
  await docClient.send(new PutCommand({
    TableName: process.env.DYNAMODB_USERS_TABLE,
    Item: {
      ...user,
      updatedAt: new Date().toISOString()
    }
  }));
}
```

**3. AI Workout Generation:**

```typescript
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

async function generateWorkout(prompt: string, profile: TrainingProfile) {
  const client = new BedrockRuntimeClient({ region: 'us-east-1' });

  const systemPrompt = buildSystemPrompt(profile);

  const response = await client.send(new ConverseCommand({
    modelId: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
    system: [
      {
        text: systemPrompt,
        cacheControl: { type: 'ephemeral' }  // Cache for cost savings
      }
    ],
    messages: [
      { role: 'user', content: [{ text: prompt }] }
    ],
    inferenceConfig: {
      maxTokens: 4096,
      temperature: 0.7
    }
  }));

  const text = response.output.message.content[0].text;
  return JSON.parse(text);  // Parse workout JSON
}
```

**4. Stripe Webhook Handler:**

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  // 1. Verify signature
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // 2. Check idempotency
  const existingEvent = await getWebhookEvent(event.id);
  if (existingEvent) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // 3. Handle event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    await handleCheckoutComplete(session);
  }

  // 4. Record event
  await recordWebhookEvent(event.id);

  return NextResponse.json({ received: true }, { status: 200 });
}
```

---

## 15. Learning Path & Resources

### For New Developers

**1. Foundation (1-2 weeks)**
- Learn TypeScript basics
- Understand Next.js App Router
- Study React Hooks and component patterns
- Explore Tailwind CSS utilities

**2. Core Technologies (2-3 weeks)**
- NextAuth.js authentication flows
- DynamoDB data modeling (NoSQL concepts)
- AWS SDK for JavaScript (S3, Bedrock, SES)
- Stripe API and webhook handling

**3. Advanced Topics (3-4 weeks)**
- AI integration with Bedrock (Claude API)
- Rate limiting strategies
- Performance optimization (caching, lazy loading)
- Security best practices (OWASP Top 10)

**4. Hands-On Practice**
- Set up local development environment
- Implement a new feature end-to-end
- Debug existing issues
- Write tests for API endpoints

### Key Resources

**Documentation:**
- [Next.js Docs](https://nextjs.org/docs)
- [NextAuth.js Docs](https://next-auth.js.org/)
- [AWS Bedrock Docs](https://docs.aws.amazon.com/bedrock/)
- [Stripe API Docs](https://stripe.com/docs/api)
- [DynamoDB Developer Guide](https://docs.aws.amazon.com/dynamodb/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Zod Documentation](https://zod.dev/)

**Courses:**
- Next.js 15 Deep Dive (Vercel)
- AWS Certified Developer - Associate
- Stripe Payments Masterclass

**Books:**
- "Learning DynamoDB" by Alex DeBrie
- "Designing Data-Intensive Applications" by Martin Kleppmann

### Architecture Concepts to Study

1. **Serverless Architecture** - ECS/Fargate, Lambda
2. **NoSQL Data Modeling** - Single-table design, GSI patterns
3. **JWT Authentication** - Token-based auth, refresh strategies
4. **API Rate Limiting** - Sliding window, token bucket algorithms
5. **Webhook Security** - Signature verification, idempotency
6. **AI Prompt Engineering** - System prompts, few-shot learning, caching
7. **Content Security Policy** - CSP headers, XSS prevention
8. **Subscription Logic** - Freemium models, quota management

---

## Appendix: Environment Variables Reference

```bash
# ====================
# AUTHENTICATION
# ====================
AUTH_SECRET=                              # Random 32-byte string (openssl rand -base64 32)
NEXTAUTH_URL=https://kinexfit.com
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
ALLOW_DEV_LOGIN=false                    # Dev only: enable test login

# ====================
# AWS
# ====================
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=                       # IAM user key (dev only)
AWS_SECRET_ACCESS_KEY=                   # IAM user secret (dev only)
AWS_BEDROCK_MODEL=claude-sonnet-4-5      # or claude-opus-4-5, claude-haiku-4-5

# ====================
# DATABASES
# ====================
DATABASE_URL=file:/tmp/prisma/prod.db    # Prisma SQLite (local: ./prisma/dev.db)
DYNAMODB_USERS_TABLE=spotter-users
DYNAMODB_WORKOUTS_TABLE=spotter-workouts
DYNAMODB_BODY_METRICS_TABLE=spotter-body-metrics
DYNAMODB_WORKOUT_COMPLETIONS_TABLE=spotter-workout-completions
DYNAMODB_WEBHOOK_EVENTS_TABLE=spotter-webhook-events
DYNAMODB_AUDIT_LOGS_TABLE=spotter-audit-logs

# ====================
# FILE STORAGE
# ====================
S3_WORKOUT_IMAGES_BUCKET=spotter-workout-images
CLOUDFRONT_DOMAIN=                       # Optional CDN

# ====================
# RATE LIMITING
# ====================
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# ====================
# STRIPE
# ====================
STRIPE_SECRET_KEY=sk_live_...            # or sk_test_... for testing
STRIPE_PUBLISHABLE_KEY=pk_live_...       # or pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_CORE_MONTHLY=price_...
STRIPE_PRICE_CORE_ANNUAL=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...
STRIPE_PRICE_ELITE_MONTHLY=price_...
STRIPE_PRICE_ELITE_ANNUAL=price_...

# ====================
# EMAIL
# ====================
ADMIN_EMAIL=admin@kinexfit.com
EMAIL_FROM=notifications@kinexfit.com

# ====================
# INSTAGRAM
# ====================
APIFY_API_TOKEN=

# ====================
# APPLICATION
# ====================
NODE_ENV=production                      # or development
LOG_LEVEL=info                          # debug, info, warn, error
NEXT_PUBLIC_APP_VERSION=1.0.0
```

---

## Conclusion

This study guide covers the complete architecture of **Kinex Fit**, a modern full-stack fitness application built with:

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes, Node.js
- **Database:** AWS DynamoDB (primary), SQLite (local)
- **AI:** AWS Bedrock with Claude models
- **Services:** Stripe, AWS S3, SES, Textract, Upstash Redis

The application demonstrates best practices in:
- Authentication and authorization (NextAuth.js)
- Serverless architecture (ECS/Fargate)
- AI integration (prompt engineering, caching)
- Subscription management (Stripe)
- Security (CSP, rate limiting, RBAC)
- Observability (CloudWatch, custom logging)

Use this guide as a reference for understanding the codebase, contributing to development, or building similar applications.

**For questions or issues, refer to the source code and official documentation of each technology.**

---

**Document Version:** 1.0
**Last Updated:** January 14, 2026
**Maintained By:** Development Team
