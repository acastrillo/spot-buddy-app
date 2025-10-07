# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working with This Project

**IMPORTANT**: This project has MCP (Model Context Protocol) servers configured. Always check for and use available MCP tools when working on tasks:
- **AWS Operations**: Use `mcp__aws-api__*` tools for AWS CLI operations, infrastructure management, and cloud resources
- **n8n Workflows**: Use `mcp__n8n-mcp__*` tools for workflow automation and integration
- **Docker Hub**: Use `mcp__MCP_DOCKER__*` tools for Docker image management and container operations
- **GitHub**: Use `mcp__MCP_DOCKER__*` tools for GitHub operations (issues, PRs, repositories)
- **shadcn/ui**: Use `mcp__shadcn-ui-server__*` tools for UI component documentation and examples

Before using bash commands for AWS, GitHub, Docker, or n8n operations, check if an MCP tool is available first.

## Project Overview

Spot Buddy is a fitness tracking application built with Next.js 15.5.1, React 19, and TypeScript. It's designed to let users save Instagram workouts, upload workout screenshots, and track progress with OCR and AI features.

**Current Status**: v1.3 - Production deployment on AWS with:
- **Authentication**: AWS Cognito with Google OAuth federated sign-in
- **Database**: DynamoDB for workouts, users, and body metrics (production), SQLite/Prisma for development
- **Infrastructure**: ECS Fargate, ALB with HTTPS, Route53 DNS
- **Domain**: https://spotter.cannashieldct.com
- **Phase 1 Complete**: Full workout CRUD with cross-device sync
- **Phase 2 Complete**: Calendar & Scheduling with workout status tracking
- **Phase 3 Complete**: Smart Workout Timers (Interval, HIIT, Rest Timers)
- **Phase 4 Complete**: Enhanced Stats & PRs tracking with body metrics

**Latest Updates** (January 2025):
- ✅ Phase 1 Complete: DynamoDB workout persistence with cross-device sync
- ✅ Phase 2 Complete: Calendar & Scheduling with workout status tracking
- ✅ Phase 3 Complete: Smart Timers with interval, HIIT, and rest timer features
- ✅ Phase 4 Complete: Enhanced Stats & PRs tracking with body metrics
- ✅ Personal Records tracking with automatic PR detection and 7 different 1RM formulas
- ✅ Body metrics tracking (weight, body fat %, 8 body measurements) with progression charts
- ✅ Workout timers: Interval timer, HIIT timer with presets, floating rest timer widget
- ✅ Web Audio API beeps, Web Notifications, LocalStorage persistence
- ✅ API routes: `/api/workouts`, `/api/body-metrics`, `/api/workouts/[id]/schedule`
- 🚧 Next: Phase 5 (Monetization - Stripe Integration)

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
- `src/app/` - Next.js App Router pages and API routes
  - `add/` - Add workout functionality with edit mode
  - `api/` - API routes (health, workouts, body-metrics, ocr, instagram-fetch, auth)
  - `auth/` - Authentication pages
  - `calendar/` - Calendar view page
  - `library/` - Workout library page
  - `settings/` - User settings page
  - `stats/` - Stats pages (PRs, body metrics)
  - `workout/[id]/` - Dynamic workout detail pages with edit mode
  - `exercise/[name]/` - Individual exercise tracking pages
- `src/components/` - Reusable React components
  - `auth/` - Authentication components
  - `layout/` - Layout components (header, mobile navigation)
  - `providers/` - Context providers (session-provider)
  - `ui/` - Base UI components (shadcn/ui style)
- `src/store/` - Zustand state management
  - `index.ts` - Auth store wrapping NextAuth.js session
- `src/lib/` - Utility functions and shared logic
  - `dynamodb.ts` - DynamoDB client with workout, user, and body metrics CRUD operations
  - `db.ts` - Prisma client (dev mode)
  - `auth-options.ts` - Shared NextAuth configuration
  - `workout/` - Workout data transformation utilities
  - `exercise-history.ts` - Exercise extraction and analysis
  - `pr-calculator.ts` - PR detection and 1RM calculations (7 formulas)
  - `body-metrics.ts` - Body metrics utilities
  - `igParser.ts` & `igParser_toV1.ts` - Instagram parsing logic
  - `smartWorkoutParser.ts` - Enhanced workout parsing logic
  - `editable-workout-table.tsx` - Complex table component
  - `utils.ts` - Common utilities (cn function for className merging)

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

### API Routes
Located in `src/app/api/`:
- `/api/health` - Health check endpoint
- `/api/workouts` - GET (list workouts), POST (create workout)
- `/api/workouts/[id]` - GET (get workout), PATCH (update), DELETE (delete)
- `/api/workouts/[id]/schedule` - PATCH (schedule workout), DELETE (unschedule)
- `/api/workouts/[id]/complete` - POST (mark workout as completed)
- `/api/workouts/scheduled` - GET (list scheduled workouts, optional ?date=YYYY-MM-DD)
- `/api/body-metrics` - GET (list metrics), POST (create metric)
- `/api/body-metrics/[date]` - GET (get metric), PATCH (update), DELETE (delete)
- `/api/body-metrics/latest` - GET (get most recent metric)
- `/api/ocr` - OCR processing (Tesseract.js integration)
- `/api/instagram-fetch` - Instagram content extraction
- `/api/upload-image` - S3 image upload endpoint
- `/api/ingest` - Data ingestion endpoint
- `/api/auth/[...nextauth]` - NextAuth.js authentication endpoints

### Page Structure
Next.js App Router pages in `src/app/`:
- `/` - Home page
- `/auth/login` - Authentication login page
- `/add` - Add workout functionality with edit mode
- `/library` - Workout library page
- `/calendar` - Calendar view page
- `/timer` - Workout timers (interval & HIIT)
- `/settings` - User settings page
- `/stats/prs` - Personal records tracking page
- `/stats/metrics` - Body metrics tracking page
- `/workout/[id]` - Dynamic workout detail pages with edit mode and rest timer
- `/exercise/[name]` - Individual exercise performance tracking

### External Integrations
- **Tesseract.js**: Client-side OCR capabilities via `/api/ocr`
- **AWS SDK**: Textract integration (`@aws-sdk/client-textract`) for document processing
- **AWS SDK**: S3 integration (`@aws-sdk/client-s3`) for image storage
- **Instagram**: Custom parser (`igParser.ts`) for workout content extraction
- **NextAuth.js**: Session management with AWS Cognito
- **Form Handling**: React Hook Form with Zod validation and Hookform resolvers
- **Icons**: Lucide React for consistent iconography
- **Charts**: Recharts for data visualization (line, bar, area charts)
- **Apify**: Instagram scraping (requires `APIFY_API_TOKEN`)

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
- **Web Audio API**: Generated beeps (no audio files required)
- **Web Notifications**: Background alerts when timer completes
- **Timer Page**: Dedicated page at `/timer` with tab selector
- **Mobile Nav**: Timer link in mobile navigation

### Subscription & Usage Tracking
- Tiered subscription model: free, starter, pro, elite
- Free tier: 2 OCR requests per week with quota tracking
- Stripe integration via `stripeCustomerId` and `stripeSubscriptionId` fields
- Usage tracking: `ocrQuotaUsed`, `workoutsSaved`

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

Comprehensive documentation available:
- **README.md** - Project overview, getting started, tech stack, deployment
- **ARCHITECTURE.md** - System architecture, design decisions, technical deep-dive
- **HOW-TO-GUIDE.md** - Complete user and developer guide
- **PROJECT-STATE.md** - Current state, MVP roadmap, north star goals
- **ROADMAP.md** - Detailed phase-by-phase development roadmap
- **PHASE-1-IMPLEMENTATION.md** - Technical details of Phase 1 (DynamoDB persistence)
- **PHASE-2-CALENDAR-IMPLEMENTATION.md** - Technical details of Phase 2 (Calendar & Scheduling)
- **PHASE-3-TIMERS-IMPLEMENTATION.md** - Technical details of Phase 3 (Smart Timers)
- **PHASE-4-IMPLEMENTATION.md** - Technical details of Phase 4 (Stats & PRs tracking)
- **DEPLOYMENT-SUMMARY.md** - AWS deployment procedures and troubleshooting

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
