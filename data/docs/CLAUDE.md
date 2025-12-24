# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working with This Project

**IMPORTANT**: This project has MCP (Model Context Protocol) servers configured. When working on tasks, prefer using MCP tools over bash commands when available, as they provide:
- Better error handling and structured responses
- Direct integration with external services (AWS, GitHub, Docker, n8n, shadcn/ui)
- Reduced need for environment variable management
- More reliable authentication handling

Check available MCP tools at the start of relevant tasks (infrastructure changes, GitHub operations, UI component work, etc.) and use them when they fit the task better than standard CLI commands.

## Project Overview

Spot Buddy is a fitness tracking application built with Next.js 15.5.7, React 19.1, and TypeScript. It's designed to let users save Instagram workouts, upload workout screenshots, and track progress with OCR and AI features.

**Current Status**: v1.6 - Production deployment on AWS with:
- **Authentication**: AWS Cognito with Google OAuth federated sign-in
- **Database**: DynamoDB for workouts, users, and body metrics (production), SQLite/Prisma for development
- **Infrastructure**: ECS Fargate, ALB with HTTPS, Route53 DNS
- **Domain**: https://spotter.cannashieldct.com
- **Phase 1-5 Complete**: Full app with monetization and AI features
- **Development Strategy**: Multi-platform (Web, Android, iOS) with shared backend

**Completed Phases** (December 2024 - January 2025):
- ✅ **Phase 1**: DynamoDB workout persistence with cross-device sync
- ✅ **Phase 2**: Calendar & Scheduling with workout status tracking
- ✅ **Phase 3**: Smart Timers (Interval, HIIT, Rest Timer widget)
- ✅ **Phase 4**: Enhanced Stats & PRs tracking with body metrics
- ✅ **Phase 5**: Stripe integration with subscription tiers (Free, Starter $7.99, Pro $14.99, Elite $34.99)
- ✅ **Phase 6**: AI-Powered Features (Smart Parser, Training Profile, AI Generator via AWS Bedrock)

**Recent Enhancements** (December 2024):
- 🏋️ **AMRAP Workout Type**: First-class AMRAP support with dedicated UI, round counting, and time-based tracking
- 📝 **Workout Notes**: Optional notes on workout completion for logging PRs and observations
- 🎯 **Session Execution**: Dedicated workout session page with card-based exercise flow
- 🤖 **AI Integration**: AWS Bedrock with Claude Sonnet 4.5 for workout enhancement and generation

**Next Development Priorities**:
1. 📱 **Android App**: Native Kotlin app with Instagram share sheet integration (90-day timeline)
2. 🍎 **iOS App**: Native Swift app (after Android launch)
3. 🧠 **AI Coach**: Interactive AI coaching for Elite tier users

## Development Commands

```bash
# Start development server
npm run dev

# Build for production (includes TypeScript checking and ESLint)
npm run build

# Start production server
npm run start

# Run ESLint for code quality
npm run lint

# Type checking (configured to fail builds on errors)
npx tsc --noEmit

# Database commands
npm run prisma           # Prisma CLI access
npm run db:push          # Push schema to database
npm run db:generate      # Generate Prisma client
npm run db:seed:user     # Seed user data

# UI Components (shadcn/ui)
npx shadcn@latest add [component-name]   # Add new UI components
```

## Architecture Overview

### Key Technologies
- **Framework**: Next.js 15.5.1 with App Router
- **UI**: React 19 with TypeScript, Tailwind CSS
- **Database**: DynamoDB (production), SQLite with Prisma ORM (development)
- **Authentication**: NextAuth.js with AWS Cognito provider + Google OAuth
- **State**: Zustand wrapping NextAuth session
- **Build**: Standalone output mode configured for containerization
- **Deployment**: Docker on AWS ECS Fargate
- **Charts**: Recharts for data visualization

### Directory Structure
- `src/app/` - Next.js App Router pages and API routes (54 files)
  - **Pages (21 routes)**:
    - `/` - Home/Dashboard with workout stats
    - `/dashboard` - Main dashboard view
    - `/add` - Add workout with sub-routes (edit, generate)
    - `/library` - Workout library/browser
    - `/calendar` - Calendar view with scheduling
    - `/timer` - Timer interface with playground mode
    - `/workout/[id]` - Workout detail with sub-routes (edit, session execution)
    - `/exercise/[name]` - Individual exercise tracking
    - `/stats` - Stats hub with sub-routes (metrics, PRs)
    - `/settings` - User settings with training-profile sub-route
    - `/subscription` - Subscription management
    - `/body-weight` - Body metrics tracking
    - `/auth/login` - Authentication page
  - **API Routes (27 endpoints)**:
    - `/api/ai/` - AI features (enhance-workout, generate-workout, test-connection)
    - `/api/auth/` - Authentication (NextAuth, signup)
    - `/api/workouts/` - Full CRUD with completions, stats, scheduling (9 routes)
    - `/api/body-metrics/` - Metrics CRUD (3 routes)
    - `/api/stripe/` - Payment processing (checkout, portal, webhook)
    - `/api/user/` - User management (profile, settings, delete)
    - `/api/ocr` - OCR processing (Tesseract.js + AWS Textract)
    - `/api/instagram-fetch` - Instagram content extraction
    - `/api/upload-image` - S3 image uploads
    - `/api/ingest` - Data ingestion
    - `/api/health` - Health check
- `src/components/` - Reusable React components (42 components)
  - **UI Components** (18): Input, Button, Card, Dialog, Textarea, Select, Badge, Label, Progress, Checkbox, Tabs, Table, Alert, Tooltip, Navigation Menu, Dropdown Menu, Sheet, Calendar
  - **Workout Components** (7): amrap-wrapper-card, amrap-header-card, amrap-exercise-item, exercise-card, workout-card-list, rest-card, editable-workout-table
  - **Timer Components** (5): unified-timer, workout-timer, hiit-timer, rest-timer, interval-timer
  - **AI Components** (2): workout-enhancer-button, enhance-button
  - **Layout** (2): header, mobile-nav
  - **Auth** (2): login, landing
  - **Other**: upgrade-prompt, session-provider, pr-celebration, streak-popup, loading-spinner
- `src/store/` - Zustand state management
  - `index.ts` - Auth store wrapping NextAuth.js session
- `src/lib/` - Utility functions and shared logic (35+ files)
  - **AI Integration** (6): bedrock-client, workout-enhancer, workout-generator, workout-content-organizer, timer-suggester, profile-context
  - **Database** (5): dynamodb, dynamodb-body-metrics, db (Prisma), s3, stripe-server
  - **Workout Processing** (4): smartWorkoutParser, card-transformer, reify, types
  - **Analytics** (3): metrics, workout-stats, pr-calculator
  - **User Management** (3): training-profile, exercise-history, subscription-tiers
  - **Utilities** (9): rate-limit, cache-utils, logger, safe-logger, timer-utils, stripe, utils, feature-gating, api-auth
  - **Parsing** (2): igParser, igParser_toV1
  - **Knowledge Base** (1): exercise-matcher
  - **Auth** (1): auth-options
  - **Hooks** (1): useTimerRunner

### Database Architecture

**Production (DynamoDB)**:
- `src/lib/dynamodb.ts` - DynamoDB client with CRUD operations
- **spotter-users** table: User data with subscription and quota tracking
  - Partition Key: `userId`
  - Attributes: email, firstName, lastName, subscriptionTier, ocrQuotaUsed, etc.
- **spotter-workouts** table: Workout data with cross-device sync
  - Partition Key: `userId` (enables per-user queries)
  - Sort Key: `workoutId` (unique workout identifier)
  - Attributes: title, description, exercises[], content, source, type, difficulty, tags[], timestamps
- **spotter-body-metrics** table: Body metrics tracking
  - Partition Key: `userId`
  - Sort Key: `date` (ISO date: YYYY-MM-DD)
  - Attributes: weight, bodyFatPercentage, muscleMass, 8 body measurements (chest, waist, hips, thighs, arms, calves, shoulders, neck), unit (metric/imperial), notes, photoUrls[]
- All dates stored as ISO strings (not Date objects)
- Auto-sync to DynamoDB on user login via NextAuth callbacks

**Development (SQLite/Prisma)**:
- **User** model with fields:
  - Standard: id, email, firstName, lastName, password, emailVerified, image
  - Subscription: subscriptionTier (free/starter/pro/elite), subscriptionStatus, Stripe IDs
  - Usage tracking: ocrQuotaUsed, ocrQuotaLimit (2 per week for free tier), workoutsSaved
- **Account**, **Session**, **VerificationToken** - NextAuth.js models
- Database URL configured via `DATABASE_URL` environment variable
- User seeding script at `scripts/seed-user.mjs`

### Authentication System
Uses NextAuth.js with AWS Cognito provider + Google OAuth:
- Configuration in `src/lib/auth-options.ts` (shared for all routes)
- Route handler in `src/app/api/auth/[...nextauth]/route.ts`
- **Federated Identity Providers**: Google sign-in enabled alongside Cognito
- JWT session strategy with 30-day session expiration
- Cookie configuration: httpOnly, sameSite: "lax", secure in production
- OAuth checks: state validation only (no PKCE/nonce for federated providers)
- Custom callbacks:
  - **jwt callback**: Syncs user to DynamoDB on login, fetches subscription data on refresh
  - **session callback**: Shapes user object with subscription tier and quota info
- Environment variables required:
  - `COGNITO_CLIENT_ID`, `COGNITO_CLIENT_SECRET`, `COGNITO_USER_POOL_ID`
  - `AWS_REGION`, `AUTH_SECRET`, `COGNITO_ISSUER_URL`
  - `DYNAMODB_USERS_TABLE`, `DYNAMODB_WORKOUTS_TABLE`, `DYNAMODB_BODY_METRICS_TABLE`
- `useAuthStore` in `src/store/index.ts` wraps NextAuth session for client state
- Custom dark-themed sign-in page at `/auth/login`

### Styling System
- **Tailwind CSS** with custom dark theme using CSS custom properties
- **shadcn/ui** configured with "new-york" style, no RSC (`components.json`)
- **Custom color palette** for fitness app:
  - Background: Dark navy (via `--background`)
  - Primary: Cyan accent (via `--primary`)
  - Secondary: Purple accent (via `--secondary`)
  - Rest: Amber accent (via `--rest-color`)
  - Surface levels with elevation support
- **Path aliases**: `@/components`, `@/lib/utils`, `@/ui`, `@/hooks`
- **Animations**: Custom keyframes for fade-in, slide-up, and bounce effects

## Development Guidelines

### Code Quality
- **TypeScript**: Strict mode enabled with target ES2017
- **Build enforcement**: Currently `ignoreDuringBuilds: true` and `ignoreBuildErrors: true` for production deployment (to be tightened)
- **ESLint rules** (all set to "warn"):
  - `@typescript-eslint/no-explicit-any`
  - `@typescript-eslint/no-unused-vars`
  - `@typescript-eslint/no-empty-object-type`
  - `react/no-unescaped-entities`
  - `react-hooks/exhaustive-deps`
  - `prefer-const`
- **Path aliases**: `@/*` maps to `./src/*` for clean imports
- **Next.js 15 Requirements**:
  - Dynamic route params are async (must await `params` in route handlers)
  - Route handlers only export GET, POST, etc. (no custom exports like `authOptions`)
  - NextAuth configuration must be in a separate file for `getServerSession()` to work

### Development Workflows

**Adding a New Feature**:
1. Read relevant documentation files (ARCHITECTURE.md, HOW-TO-GUIDE.md, phase implementation guides)
2. Understand the existing patterns in similar features
3. For UI: Use existing shadcn/ui components and Tailwind utilities
4. For Data: Follow DynamoDB patterns with userId partition key
5. For AI: Use bedrock-client.ts with cost tracking
6. Test locally with `npm run dev`
7. Check TypeScript with `npx tsc --noEmit`
8. Run ESLint with `npm run lint`

**Adding a New Page**:
1. Create page.tsx in appropriate `src/app/` directory
2. Use `useAuthStore` for authentication state
3. Follow existing layout patterns (Header, mobile navigation)
4. Use Tailwind dark theme classes with custom color palette
5. Make it mobile-responsive (test on small screens)

**Adding a New API Route**:
1. Create route.ts in `src/app/api/` directory
2. Export only HTTP methods (GET, POST, PATCH, DELETE)
3. Use `getServerSession(authOptions)` for authentication
4. Always include userId in DynamoDB queries for security
5. Handle errors gracefully with try-catch and return proper status codes
6. Use `NextRequest` and `NextResponse` types
7. Await `params` for dynamic routes (Next.js 15 requirement)

**Working with DynamoDB**:
1. Use service layers: `dynamoDBWorkouts`, `dynamoDBBodyMetrics`
2. Always include userId as partition key for row-level security
3. Store dates as ISO strings, not Date objects
4. Use ExpressionAttributeNames for reserved keywords (date, tags, etc.)
5. Implement optimistic UI updates with localStorage cache
6. Handle errors gracefully (network failures, validation errors)

**Working with AI Features**:
1. Use `bedrock-client.ts` for all Bedrock requests
2. Always track costs per request
3. Include user's training profile for personalization via `profile-context.ts`
4. Use streaming for better UX on long generations
5. Handle rate limiting and quota enforcement
6. Provide fallbacks for AI failures

**Adding UI Components**:
1. Check if shadcn/ui has a suitable component: `npx shadcn@latest add [component]`
2. Place custom components in appropriate `src/components/` subdirectory
3. Use `cn()` utility for className merging
4. Follow Radix UI patterns for accessibility
5. Make components mobile-responsive by default
6. Use Tailwind custom properties for theming (--primary, --secondary, etc.)

### API Routes
Located in `src/app/api/` (27 endpoints):

**AI Features** (3 routes):
- `/api/ai/enhance-workout` - POST (enhance workout with AI using Claude Sonnet)
- `/api/ai/generate-workout` - POST (generate workout from natural language prompt)
- `/api/ai/test-connection` - GET (test AWS Bedrock connectivity)

**Authentication** (2 routes):
- `/api/auth/[...nextauth]` - NextAuth.js authentication endpoints (GET, POST)
- `/api/auth/signup` - POST (user registration)

**Workouts** (9 routes):
- `/api/workouts` - GET (list workouts), POST (create workout)
- `/api/workouts/[id]` - GET (get workout), PATCH (update), DELETE (delete)
- `/api/workouts/[id]/schedule` - PATCH (schedule workout), DELETE (unschedule)
- `/api/workouts/[id]/complete` - POST (mark workout as completed with optional notes)
- `/api/workouts/[id]/completions` - GET (get completion history for specific workout)
- `/api/workouts/completions` - POST (create completion), GET (list all completions)
- `/api/workouts/completions/stats` - GET (completion statistics and trends)
- `/api/workouts/stats` - GET (workout statistics and analytics)
- `/api/workouts/scheduled` - GET (list scheduled workouts, optional ?date=YYYY-MM-DD)

**Body Metrics** (3 routes):
- `/api/body-metrics` - GET (list metrics), POST (create metric)
- `/api/body-metrics/[date]` - GET (get metric), PATCH (update), DELETE (delete)
- `/api/body-metrics/latest` - GET (get most recent metric)

**Stripe/Payments** (3 routes):
- `/api/stripe/checkout` - POST (create checkout session)
- `/api/stripe/portal` - POST (create customer portal session)
- `/api/stripe/webhook` - POST (handle Stripe webhooks)

**User Management** (3 routes):
- `/api/user/profile` - GET (get training profile), PATCH (update training profile)
- `/api/user/settings` - GET (get user settings), PATCH (update settings)
- `/api/user/delete` - DELETE (delete user account)

**Other** (4 routes):
- `/api/health` - GET (health check endpoint)
- `/api/ocr` - POST (OCR processing with Tesseract.js/AWS Textract)
- `/api/instagram-fetch` - POST (Instagram content extraction via Apify)
- `/api/upload-image` - POST (S3 image upload with presigned URLs)
- `/api/ingest` - POST (data ingestion endpoint)

### Page Structure
Next.js App Router pages in `src/app/` (21 pages):

**Main Pages**:
- `/` - Home page with workout stats (this week, total, hours trained, streak)
- `/dashboard` - Main dashboard view with recent workouts
- `/library` - Workout library/browser with search and filters
- `/calendar` - Calendar view with scheduled and completed workouts
- `/timer` - Timer interface (unified, HIIT, interval)
- `/timer/playground` - Timer testing/playground mode

**Workout Management**:
- `/add` - Add workout interface with multiple input methods
- `/add/edit` - Edit workout after OCR/import
- `/add/generate` - AI-powered workout generation from natural language
- `/workout/[id]` - Workout detail view with full exercise breakdown
- `/workout/[id]/edit` - Edit existing workout
- `/workout/[id]/session` - Session execution mode with card-based UI and progress tracking
- `/exercise/[name]` - Individual exercise history and performance tracking

**Stats & Metrics**:
- `/stats` - Stats hub page
- `/stats/prs` - Personal records tracking with 1RM calculations
- `/stats/metrics` - Body metrics trends and charts
- `/body-weight` - Body weight and metrics tracking

**Settings & Account**:
- `/settings` - User settings and preferences
- `/settings/training-profile` - Training profile (PRs, goals, equipment, constraints)
- `/subscription` - Subscription management and billing
- `/auth/login` - Authentication login page

### External Integrations
- **AWS Bedrock**: AI processing with Claude Sonnet 4.5 and Haiku models (`@aws-sdk/client-bedrock-runtime`)
- **AWS DynamoDB**: Primary database for workouts, users, and body metrics (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`)
- **AWS S3**: Image storage for workout photos and body metrics (`@aws-sdk/client-s3`)
- **AWS Textract**: OCR for document processing (`@aws-sdk/client-textract`)
- **Tesseract.js**: Client-side OCR capabilities via `/api/ocr`
- **AWS Cognito**: Authentication provider with Google OAuth federation
- **Stripe**: Payment processing and subscription management (`stripe`, `@stripe/stripe-js`)
- **Upstash Redis**: Rate limiting and caching (`@upstash/redis`, `@upstash/ratelimit`)
- **Apify**: Instagram scraping for workout import (requires `APIFY_API_TOKEN`)
- **NextAuth.js**: Session management with multiple auth strategies (`next-auth`)
- **Prisma**: ORM for SQLite development database (`@prisma/client`)
- **Form Handling**: React Hook Form with Zod validation (`react-hook-form`, `zod`, `@hookform/resolvers`)
- **UI Framework**: Radix UI primitives for accessible components
- **Icons**: Lucide React for consistent iconography (`lucide-react`)
- **Charts**: Recharts for data visualization (`recharts`)
- **Email**: Nodemailer for transactional emails (`nodemailer`)

## Key Features & Data Flow

### Authentication Flow
1. User clicks login → redirected to AWS Cognito hosted UI
2. Cognito validates credentials (or Google OAuth) and returns to callback
3. NextAuth.js JWT callback extracts Cognito profile (sub, email, given_name, family_name)
4. User data synced to DynamoDB on login via `jwt` callback
5. Session callback shapes user object with subscription tier and quota info
6. `useAuthStore` provides auth state via `useSession` hook

### Workout Data Processing
- Instagram content parsing via custom `igParser.ts` and `igParser_toV1.ts`
- AST (Abstract Syntax Tree) to workout data transformation
- Editable workout table component for data manipulation
- OCR processing for workout images via Tesseract.js and AWS Textract
- Exercise extraction and categorization by muscle group

### Workout Persistence & Sync (Phase 1 - Complete)
- Full CRUD operations via `dynamoDBWorkouts` service layer:
  - `list(userId)` - Get all user workouts
  - `get(userId, workoutId)` - Get specific workout
  - `upsert(userId, workout)` - Create or update workout
  - `update(userId, workoutId, updates)` - Partial update
  - `delete(userId, workoutId)` - Delete workout
  - `getByDateRange(userId, startDate, endDate)` - Query by date
  - `search(userId, searchTerm)` - Search workouts
- Cross-device synchronization with userId as partition key
- Offline support with localStorage cache as fallback
- API routes at `/api/workouts` and `/api/workouts/[id]`
- Frontend pages updated to use DynamoDB:
  - `src/app/add/edit/page.tsx` - Save to DynamoDB
  - `src/app/library/page.tsx` - Load from DynamoDB
  - `src/app/workout/[id]/page.tsx` - Fetch from DynamoDB

### Workout Scheduling (Phase 2 - Complete)
- Schedule workouts for future dates
- Mark workouts as completed on specific dates
- Track workout status (scheduled, completed, skipped)
- Full scheduling API via `dynamoDBWorkouts` service layer:
  - `getScheduledForDate(userId, date)` - Get workouts for specific date
  - `getScheduled(userId)` - Get all scheduled workouts
  - `scheduleWorkout(userId, workoutId, scheduledDate, status)` - Schedule a workout
  - `completeWorkout(userId, workoutId, completedDate)` - Mark as completed
  - `unscheduleWorkout(userId, workoutId)` - Remove scheduling
- Visual calendar indicators:
  - Scheduled workouts: Hollow ring (purple/secondary)
  - Completed workouts: Filled dot/badge (cyan/primary)
  - Combined view showing both states
- API routes: `/api/workouts/[id]/schedule`, `/api/workouts/[id]/complete`, `/api/workouts/scheduled`
- Library page integration for scheduling via date picker

### Personal Records Tracking (Phase 4 - Complete)
- Automatic PR detection across all workouts
- 7 different 1RM calculation formulas:
  - Brzycki, Epley, Lander, Lombardi, Mayhew, O'Conner, Wathan
- Exercise history extraction and analysis
- Volume tracking (weight × reps) by exercise
- Muscle group categorization (Chest, Back, Shoulders, Arms, Legs, Core)
- Exercise detail pages with progression charts
- Located in `src/lib/pr-calculator.ts` and `src/lib/exercise-history.ts`

### Body Metrics Tracking (Phase 4 - Complete)
- Full CRUD operations via `dynamoDBBodyMetrics` service layer:
  - `list(userId)` - Get all metrics
  - `get(userId, date)` - Get specific metric
  - `upsert(userId, metric)` - Create or update metric
  - `delete(userId, date)` - Delete metric
  - `getByDateRange(userId, startDate, endDate)` - Query by date range
  - `getLatest(userId)` - Get most recent metric
- Support for weight, body fat %, muscle mass, and 8 body measurements
- Metric/imperial unit support
- Progress photos via S3 URLs
- Progression charts with 30/90-day trends
- API routes at `/api/body-metrics` with date-based endpoints

### Smart Workout Timers (Phase 3 - Complete)
- **Interval Timer**: Basic countdown timer with circular progress visualization
  - Custom durations (1-60 minutes)
  - Start/pause/reset controls
  - Sound & notification toggles
  - LocalStorage state persistence
- **HIIT Timer**: High-Intensity Interval Training timer
  - Work/rest phase alternation
  - Round counting (1-50 rounds)
  - Built-in presets (Tabata, EMOM, Long Intervals, Sprint Intervals)
  - Custom configuration panel
  - Phase indicators (GET READY, WORK, REST)
  - Color-coded progress bars
- **Rest Timer Widget**: Floating rest timer for workout pages
  - Quick-start presets (30s, 1m, 1m 30s, 2m, 3m, 5m)
  - Fixed bottom-right positioning
  - Compact collapsed state
  - Integrated into workout detail pages
- **Workout Session Timer**: Integrated timer for session execution mode
  - Automatic rest timer between exercises
  - Set-by-set progress tracking
  - Card-based navigation
- **Web Audio API**: Generated beeps (no audio files required)
- **Web Notifications**: Background alerts when timer completes
- **Timer Page**: Dedicated page at `/timer` with tab selector and playground mode
- **Mobile Nav**: Timer link in mobile navigation

### AMRAP Workout Type (December 2024)
- **First-class AMRAP support** with dedicated UI components and logic
- **Components**:
  - `AMRAPWrapperCard` - Main AMRAP display with timer, exercise grid, and round counting
  - `AMRAPHeaderCard` - Time limit editor with +/- controls (1-60 minutes)
  - `AMRAPExerciseItem` - Individual exercise item with card/compact variants
- **Visual Design**:
  - Prominent amber-themed AMRAP badge throughout app
  - Pulse animation on timer when < 1 minute remaining
  - Progress bar showing time elapsed
  - Round counter showing completed rounds
  - Mobile-responsive layouts (grid on desktop, compact list on mobile)
- **Session Execution**:
  - Real-time countdown timer
  - Exercise checkboxes for tracking rounds
  - Sound toggle for audio cues
  - AMRAP-specific completion dialog ("AMRAP Complete! 💪")
- **Data Model**:
  - `workoutType: "AMRAP"` field in workout schema
  - `structure.timeLimit` persisted in DynamoDB (1-60 minutes)
  - Completion tracking with notes support
- **Research-based UX** inspired by SmartWOD Timer and Box Timer apps

### Workout Completion & Notes System (December 2024)
- **Completion Tracking**:
  - Multiple completions per workout tracked separately
  - Completion date, time, and duration recorded
  - Optional notes on each completion for logging PRs and observations
  - API: `/api/workouts/completions` (POST, GET) and `/api/workouts/[id]/completions` (GET)
  - Stats endpoint: `/api/workouts/completions/stats` for trends and analytics
- **Completion Dialog**:
  - Appears on workout completion or early end
  - Optional notes textarea with placeholder encouraging PR logging
  - Notes saved to DynamoDB workout completions
  - Supports both completing full workout and early end scenarios
  - Different messaging for AMRAP vs. standard workouts
- **Data Model**:
  - `completions` array in DynamoDB workout schema
  - Each completion: `{ completedAt, completedDate, durationSeconds, durationMinutes, notes }`
  - Enables tracking workout frequency, consistency, and progress over time
- **Session Execution Page** (`/workout/[id]/session`):
  - Card-based exercise flow with navigation
  - Set-by-set tracking with checkboxes
  - Integrated timer and rest periods
  - Progress tracking (exercises completed / total)
  - Completion dialog at end of workout

### Subscription & Usage Tracking (Phase 5 - Complete)
- Tiered subscription model with Stripe integration:
  - **Free**: 15 workouts max, 1 OCR/week, 30-day history, basic stats
  - **Starter** ($7.99/mo or $79.99/year): Unlimited workouts, 5 OCR/week, 10 AI enhancements/month
  - **Pro** ($14.99/mo or $149.99/year): Unlimited OCR, 30 AI enhancements/month, 30 AI generations/month
  - **Elite** ($34.99/mo or $349.99/year): 100 AI enhancements/month, 100 AI generations/month, AI Coach (20 messages/day), Crew features
- Stripe integration via `stripeCustomerId` and `stripeSubscriptionId` fields
- Usage tracking: `ocrQuotaUsed`, `workoutsSaved`, `aiRequestsUsed` (Phase 6)
- Feature gating implemented in `src/lib/feature-gating.tsx`

### AI-Powered Features (Phase 6 - Complete)

**Architecture**:
- **AWS Bedrock** with Claude models for AI processing
  - Primary: Claude Sonnet 4.5 (`anthropic.claude-sonnet-4.5-v2:0`)
  - Cost-optimized: Claude Haiku 3.5 for simpler tasks
  - Cross-region inference profiles for availability
  - Prompt caching support (90% cost savings on repeated prompts)
  - Streaming responses for better UX
- **Cost Tracking**: Built-in cost calculation per request
  - Input tokens, output tokens, and cache metrics tracked
  - Cost: ~$0.01-0.02 per enhancement, ~$0.02-0.03 per generation
- **Rate Limiting**: Upstash Redis-based rate limiting to prevent abuse
- **Usage Quotas**: Tier-based quotas to manage costs

**Implemented Features**:

1. **Smart Workout Enhancer** ✅
   - "Enhance with AI" button on edit pages
   - Cleans up messy OCR text and Instagram captions
   - Standardizes exercise names (e.g., "pushups" → "Push-ups")
   - Adds proper sets/reps formatting
   - Suggests form cues and safety tips based on training profile
   - API: `/api/ai/enhance-workout` (POST)
   - Files: `src/lib/ai/bedrock-client.ts`, `src/lib/ai/workout-enhancer.ts`
   - Components: `src/components/ai/workout-enhancer-button.tsx`

2. **Training Profile System** ✅
   - Manual PR entry for common exercises
   - Training goals (strength, hypertrophy, endurance, weight loss)
   - Available equipment (dumbbells, barbell, kettlebells, etc.)
   - Experience level (beginner, intermediate, advanced, elite)
   - Training constraints (injuries, time limits, preferences)
   - Page: `/settings/training-profile`
   - API: `/api/user/profile` (GET, PATCH)
   - Storage: `trainingProfile` object in DynamoDB `spotter-users` table
   - Files: `src/lib/training-profile.ts`, `src/lib/ai/profile-context.ts`

3. **AI Workout Generator** ✅
   - Natural language input: "Upper body workout with dumbbells, 45 minutes"
   - Personalized based on training profile, PRs, and equipment
   - Complete workout with warm-up, main exercises, and cool-down
   - Proper sets/reps/rest periods based on user's goals
   - Page: `/add/generate`
   - API: `/api/ai/generate-workout` (POST)
   - Files: `src/lib/ai/workout-generator.ts`
   - Streaming support for real-time generation

4. **AI Timer Suggester** ✅
   - Analyzes workout content to suggest appropriate timers
   - Detects EMOM, AMRAP, Tabata, and other formats
   - Recommends timer configuration (work/rest intervals, rounds)
   - Files: `src/lib/ai/timer-suggester.ts`

5. **Workout Content Organizer** ✅
   - Intelligently organizes messy workout text into structured format
   - Identifies supersets, circuits, and rest periods
   - Files: `src/lib/ai/workout-content-organizer.ts`

**AI Integration Details**:
- **Bedrock Client** (`src/lib/ai/bedrock-client.ts`):
  - Supports both `invoke` (single request) and `invokeStream` (streaming)
  - Automatic retry logic with exponential backoff
  - Cost calculation for all requests
  - Cross-region inference profile support
  - Prompt caching configuration
- **Profile Context** (`src/lib/ai/profile-context.ts`):
  - Converts training profile to AI context
  - Includes PRs, goals, equipment, constraints
  - Used by enhancer and generator for personalization
- **Error Handling**: Graceful fallbacks and user-friendly error messages
- **Testing**: Test connection endpoint at `/api/ai/test-connection`

**AI Cost Management**:
- Starter: ~$0.10/user/month (10 enhancements)
- Pro: ~$0.90/user/month (30 enhancements + 30 generations)
- Elite: ~$3.00/user/month (100 enhancements + 100 generations + AI Coach)
- Profit margins remain 70-85% with AI features
- Prompt caching reduces costs by up to 90% on repeated requests

**Future AI Features** (Roadmap):
- **AI Coach**: Interactive coaching with 20 messages/day (Elite tier)
- **Workout of the Day (WOD)**: Personalized daily workout suggestions
- **Progressive Overload Recommendations**: AI-suggested weight/rep increases
- **Form Analysis**: Video analysis for exercise form feedback (stretch goal)

### Multi-Platform Development Strategy

**Three Independent Projects**:
1. **Web App** (This repo) - Add AI features (Phase 6)
2. **Android App** (NEW) - Native Kotlin with Instagram share sheet
3. **iOS App** (Later) - Native Swift with Instagram share sheet

**Shared Backend**: All platforms use the same AWS infrastructure:
- DynamoDB (workouts, users, body metrics)
- AWS Cognito (authentication)
- AWS Textract (OCR)
- Stripe (subscriptions sync across platforms)
- API endpoints via Next.js on ECS Fargate

**Development Priority**:
1. **Android First** (Next 90 days) - Native app with share sheet integration
2. **Web AI Features** (After Android MVP) - Phase 6 implementation
3. **iOS** (Month 7+) - Port Android features to iOS

**Android Killer Feature**:
- Native share intent handler intercepts Instagram shares
- 2-tap workflow: Share from Instagram → Open Spot Buddy
- Automatic OCR processing and workout parsing
- Offline-first with Room database and background sync

## Production Considerations

### Deployment Configuration
- **Next.js**: Standalone output mode configured for containerization
- **Images**: Configured for production domain `spotter.cannashieldct.com`
- **Docker**: Dockerfile and docker-compose.yml available for containerization
- **AWS**: Deployment scripts available (`deploy-to-aws.ps1`)
- **Environment**: See `.env.example` for required variables

### Testing
No test framework currently configured. When adding tests, consider:
- Jest + React Testing Library for unit tests
- Playwright or Cypress for E2E tests
- CI/CD pipeline with test automation

## Documentation

**Architecture & Development**:
- **README.md** - Project overview, getting started, tech stack, deployment
- **ARCHITECTURE.md** - System architecture, design decisions, technical deep-dive
- **HOW-TO-GUIDE.md** - Complete user and developer guide
- **PROJECT-STATE.md** - Current state, MVP roadmap, north star goals
- **ROADMAP.md** - Detailed phase-by-phase development roadmap
- **DEPLOYMENT-SUMMARY.md** - AWS deployment procedures and troubleshooting

**Phase Implementation Guides**:
- **PHASE-1-IMPLEMENTATION.md** - DynamoDB persistence with cross-device sync
- **PHASE-2-CALENDAR-IMPLEMENTATION.md** - Calendar & Scheduling system
- **PHASE-3-TIMERS-IMPLEMENTATION.md** - Smart Timers (Interval, HIIT, Rest)
- **PHASE-4-IMPLEMENTATION.md** - Stats & PRs tracking with body metrics
- **PHASE-5-MONETIZATION.md** - Stripe integration and subscription tiers
- **PHASE-6-AI-FEATURES.md** - AI-powered features (Smart Parser, Generator, WOD)

**Business & Strategy**:
- **BUSINESS-OVERVIEW.md** - Complete feature set, monetization model, revenue projections
- **mobile_first_plan.md** - Multi-platform development strategy (Web, Android, iOS)
- **EFFICIENCY-OPPORTUNITIES.md** - Technical improvements and optimization opportunities
- **SECURITY-REVIEW.md** - Security audit and AWS permissions review
- **MASTER-FEATURE-LIST.md** - Complete feature inventory across all phases

## Recent Changes & Commit History

**December 2024 - Recent Enhancements**:

1. **AMRAP Workout Enhancement** (bc74a84 - Dec 12, 2024)
   - Added prominent amber-themed AMRAP badge across all workout touchpoints
   - Enhanced session execution with pulse animation when timer < 1 minute
   - Added round counter showing completed rounds
   - Created `AMRAPHeaderCard` component for time limit editing with +/- buttons
   - Implemented AMRAP-specific completion dialog ("AMRAP Complete! 💪")
   - Time limit now persists in DynamoDB workout structure
   - Research-based UX inspired by SmartWOD Timer and Box Timer

2. **Workout Parser Improvements** (e4a29c3 - Dec 10, 2024)
   - Fixed EMOM format parsing (e.g., "Min 1. 12 Squats" → correctly extracts 12 reps)
   - Added hyphenated plural forms to exercise glossary (push-ups, sit-ups, pull-ups)
   - Upgraded Instagram fetch to use smart parser instead of basic regex
   - Full caption display on edit page for reference
   - Ensures AI enhancer always uses original caption

3. **Workout Notes Feature** (62e9c76 - Dec 8, 2024)
   - Added optional notes textarea in completion and end workout dialogs
   - Notes saved to DynamoDB workout completions
   - Placeholder text encourages logging PRs and observations
   - Supports both completing full workout and early end scenarios
   - Completion tracking with multiple completions per workout

4. **Security Patch** (c653e0e - Dec 8, 2024)
   - Patched React2Shell vulnerability (CVE-2025-55182)
   - Updated dependencies and security configurations

5. **Card-Based Session Execution** (Previous commits)
   - Card carousel interface for workout session execution
   - Set-by-set tracking with progress indicators
   - Integrated rest timer and exercise navigation
   - Mobile-responsive design

## Common Issues & Solutions

### Next.js 15 Breaking Changes
- **Async Params**: Dynamic route params must be awaited in route handlers
  ```typescript
  export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params; // Must await
  }
  ```
- **Route Exports**: Only export GET, POST, etc. from route handlers (no custom exports)
- **NextAuth Config**: Must be in separate file (`src/lib/auth-options.ts`) for `getServerSession()` compatibility

### DynamoDB Best Practices
- Always include `userId` in queries for row-level security
- Use composite keys (userId + workoutId/date) for efficient queries
- Store dates as ISO strings, not Date objects
- Implement optimistic UI updates with localStorage cache
- Reserved keywords (e.g., "date", "tags") must use ExpressionAttributeNames

### Authentication
- Session is stored as JWT with 30-day expiration
- User data synced to DynamoDB on login via `jwt` callback
- Access `session.user.id` with type casting: `(session?.user as any)?.id`
- Use `getServerSession(authOptions)` in API routes, passing shared `authOptions` from `src/lib/auth-options.ts`
