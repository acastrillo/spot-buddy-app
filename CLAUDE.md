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

Spotter is a fitness tracking application built with Next.js 15.5.1, React 19, and TypeScript. It's designed to let users save Instagram workouts, upload workout screenshots, and track progress with OCR and AI features.

**Current Status**: v1.0 - Production deployment on AWS with:
- **Authentication**: AWS Cognito with Google OAuth federated sign-in
- **Database**: DynamoDB for workouts and users (production), SQLite/Prisma for development
- **Infrastructure**: ECS Fargate, ALB with HTTPS, Route53 DNS
- **Domain**: https://spotter.cannashieldct.com
- **Phase 1 Complete**: Full workout CRUD with cross-device sync

**Latest Updates** (January 2025):
- ✅ Deployed Phase 1: DynamoDB workout persistence
- ✅ API routes for workout management (`/api/workouts`, `/api/workouts/[id]`)
- ✅ Cross-device synchronization with userId partition key
- ✅ Offline support with localStorage cache
- 🚧 Next: Phase 2 (Calendar & Scheduling)

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

### Directory Structure
- `src/app/` - Next.js App Router pages and API routes
  - `add/` - Add workout functionality
  - `api/` - API routes (health, instagram-fetch, ocr, ingest, auth)
  - `auth/` - Authentication pages
  - `calendar/` - Calendar view page
  - `library/` - Workout library page
  - `settings/` - User settings page
  - `workout/[id]/` - Dynamic workout detail pages
- `src/components/` - Reusable React components
  - `auth/` - Authentication components
  - `layout/` - Layout components (header, mobile navigation)
  - `providers/` - Context providers (session-provider)
  - `ui/` - Base UI components (shadcn/ui style)
- `src/store/` - Zustand state management
  - `index.ts` - Auth store wrapping NextAuth.js session
- `src/lib/` - Utility functions and shared logic
  - `dynamodb.ts` - DynamoDB client with workout CRUD operations
  - `db.ts` - Prisma client (dev mode)
  - `workout/` - Workout data transformation utilities
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
- Configuration in `src/app/api/auth/[...nextauth]/route.ts`
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
  - `DYNAMODB_USERS_TABLE`, `DYNAMODB_WORKOUTS_TABLE`
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

### API Routes
Located in `src/app/api/`:
- `/api/health` - Health check endpoint
- `/api/workouts` - GET (list workouts), POST (create workout)
- `/api/workouts/[id]` - GET (get workout), PATCH (update), DELETE (delete)
- `/api/ocr` - OCR processing (Tesseract.js integration)
- `/api/instagram-fetch` - Instagram content extraction
- `/api/ingest` - Data ingestion endpoint
- `/api/auth/[...nextauth]` - NextAuth.js authentication endpoints

### Page Structure
Next.js App Router pages in `src/app/`:
- `/` - Home page
- `/auth/login` - Authentication login page
- `/add` - Add workout functionality with edit mode
- `/library` - Workout library page
- `/calendar` - Calendar view page
- `/settings` - User settings page
- `/workout/[id]` - Dynamic workout detail pages with edit mode

### External Integrations
- **Tesseract.js**: Client-side OCR capabilities via `/api/ocr`
- **AWS SDK**: Textract integration (`@aws-sdk/client-textract`) for document processing
- **Instagram**: Custom parser (`igParser.ts`) for workout content extraction
- **NextAuth.js**: Session management with AWS Cognito
- **Form Handling**: React Hook Form with Zod validation and Hookform resolvers
- **Icons**: Lucide React for consistent iconography
- **Apify**: Instagram scraping (requires `APIFY_API_TOKEN`)

## Key Features & Data Flow

### Authentication Flow
1. User clicks login → redirected to AWS Cognito hosted UI
2. Cognito validates credentials and returns to callback
3. NextAuth.js JWT callback extracts Cognito profile (sub, email, given_name, family_name)
4. Session callback shapes user object for client
5. `useAuthStore` provides auth state via `useSession` hook

### Workout Data Processing
- Instagram content parsing via custom `igParser.ts` and `igParser_toV1.ts`
- AST (Abstract Syntax Tree) to workout data transformation
- Editable workout table component for data manipulation
- OCR processing for workout images via Tesseract.js and AWS Textract

### Workout Persistence & Sync (Phase 1 - Complete)
- Full CRUD operations via `dynamoDBWorkouts` service layer:
  - `list(userId)` - Get all user workouts
  - `get(userId, workoutId)` - Get specific workout
  - `upsert(userId, workout)` - Create or update workout
  - `update(userId, workoutId, updates)` - Partial update
  - `delete(userId, workoutId)` - Delete workout
- Cross-device synchronization with userId as partition key
- Offline support with localStorage cache as fallback
- API routes at `/api/workouts` and `/api/workouts/[id]`
- Frontend pages updated to use DynamoDB:
  - `src/app/add/edit/page.tsx` - Save to DynamoDB
  - `src/app/library/page.tsx` - Load from DynamoDB
  - `src/app/workout/[id]/page.tsx` - Fetch from DynamoDB

### Subscription & Usage Tracking
- Tiered subscription model: free, starter, pro, elite
- Free tier: 2 OCR requests per week with quota tracking
- Stripe integration via `stripeCustomerId` and `stripeSubscriptionId` fields
- Usage tracking: `ocrQuotaUsed`, `workoutsSaved`

## Production Considerations

### Deployment Configuration
- **Next.js**: Standalone output mode configured for containerization
- **Images**: Currently configured for localhost domain (update `next.config.ts` for production)
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
- **USAGE-GUIDE.md** - End-user guide for using Spotter
- **PROJECT-STATE.md** - Current state, MVP roadmap, north star goals
- **ROADMAP.md** - Detailed phase-by-phase development roadmap
- **PHASE-1-IMPLEMENTATION.md** - Technical details of Phase 1 (DynamoDB persistence)
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

### DynamoDB Best Practices
- Always include `userId` in queries for row-level security
- Use composite keys (userId + workoutId) for efficient queries
- Store dates as ISO strings, not Date objects
- Implement optimistic UI updates with localStorage cache

### Authentication
- Session is stored as JWT with 30-day expiration
- User data synced to DynamoDB on login via `jwt` callback
- Access `session.user.id` with type casting: `(session?.user as any)?.id`
