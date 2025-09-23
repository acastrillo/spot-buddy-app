# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Spotter is a fitness tracking application built with Next.js 15.5.1, React 19, and TypeScript. It's currently a development prototype that uses NextAuth.js authentication and SQLite/Prisma for data persistence.

**Important**: The working codebase is consolidated in the root `spotter-free/` directory.

## Development Commands

Navigate to `spotter-free/` before running commands:

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

### Directory Structure
- `spotter-free/src/app/` - Next.js App Router pages and API routes
  - `add/` - Add workout functionality
  - `api/` - API routes (health, instagram-fetch, ocr)
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
  - `index.ts` - Auth store using NextAuth.js session
- `src/lib/` - Utility functions and shared logic
  - `db.ts` - Database utilities
  - `workout/` - Workout data transformation utilities
  - `igParser.ts` & `igParser_toV1.ts` - Instagram parsing logic
  - `smartWorkoutParser.ts` - Enhanced workout parsing logic
  - `editable-workout-table.tsx` - Complex table component
  - `utils.ts` - Common utilities (cn function for className merging)

### Key Technologies
- **Framework**: Next.js 15 with App Router
- **UI**: React 19 with TypeScript, Tailwind CSS
- **Database**: SQLite with Prisma ORM
- **Authentication**: NextAuth.js with credentials provider
- **State**: Zustand for client state management
- **Build**: Standalone output mode configured for containerization

### Database Schema
Uses Prisma with SQLite for local development:
- `User` model with NextAuth.js fields (email, firstName, lastName, password)
- `Account`, `Session`, `VerificationToken` models for NextAuth.js
- Database URL configured via `DATABASE_URL` environment variable (defaults to SQLite file)
- Password hashing with bcryptjs for secure authentication
- User seeding script at `scripts/seed-user.mjs` with default credentials

### Authentication System
Uses NextAuth.js with credentials provider:
- `useAuthStore` in `src/store/index.ts` wraps NextAuth session
- Authentication routes configured in `src/app/api/auth/[...nextauth]/route.ts`
- Session management handled by NextAuth.js
- User seeding available via `npm run db:seed:user` script

### Styling System
- **Framework**: Tailwind CSS with custom dark theme and CSS custom properties
- **Configuration**: `components.json` configures shadcn/ui with "new-york" style, no RSC
- **Colors**: Custom color palette defined via CSS variables for fitness app
  - Background: Dark navy (via `--background`)
  - Primary: Cyan accent (via `--primary`)
  - Secondary: Purple accent (via `--secondary`)
  - Rest: Amber accent (via `--rest-color`)
  - Surface levels with elevation support
- **Components**: shadcn/ui style component library in `src/components/ui/`
- **Path Aliases**: Component imports use `@/components`, utils use `@/lib/utils`
- **Fonts**: Inter with system font fallbacks
- **Animations**: Custom keyframes for fade-in, slide-up, and bounce effects

## Development Guidelines

### Code Quality
- **TypeScript**: Strict mode enabled with target ES2017 - all type errors fail builds
- **ESLint**: Configured with Next.js and TypeScript rules in `eslint.config.mjs`
- **Custom ESLint rules** (all set to "warn"):
  - `@typescript-eslint/no-explicit-any`
  - `@typescript-eslint/no-unused-vars`
  - `@typescript-eslint/no-empty-object-type`
  - `react/no-unescaped-entities`
  - `react-hooks/exhaustive-deps`
  - `prefer-const`
- **Path aliases**: `@/*` maps to `./src/*` for clean imports
- **Build enforcement**: Next.js config enforces both TypeScript and ESLint during builds
- **No ignore flags**: Both `ignoreDuringBuilds` and `ignoreBuildErrors` set to false

### API Routes
Located in `src/app/api/` with endpoints:
- `/api/health` - Health check endpoint
- `/api/ocr` - OCR processing capabilities (Tesseract.js integration)
- `/api/instagram-fetch` - Instagram content extraction
- `/api/ingest` - Data ingestion endpoint
- `/api/auth/[...nextauth]` - NextAuth.js authentication endpoints

### Page Structure
Next.js App Router pages in `src/app/`:
- `/` - Home page (`page.tsx`)
- `/auth/login` - Authentication login page
- `/add` - Add workout functionality with edit mode
- `/library` - Workout library page
- `/calendar` - Calendar view page
- `/settings` - User settings page
- `/workout/[id]` - Dynamic workout detail pages with edit mode

### Component Patterns
- Uses React 19 features and patterns
- Functional components with hooks
- Custom UI components follow consistent patterns
- Authentication components handle routing and state via NextAuth.js

### External Integrations
- **Tesseract.js**: Client-side OCR capabilities via `/api/ocr`
- **AWS SDK**: Textract integration (`@aws-sdk/client-textract`) for document processing
- **Instagram**: Custom parser (`igParser.ts`) for workout content extraction
- **NextAuth.js**: Session management with Prisma adapter
- **Form Handling**: React Hook Form with Zod validation and Hookform resolvers
- **Icons**: Lucide React for consistent iconography

## Production Considerations

### Current Status (Development Prototype)
- NextAuth.js authentication with credentials provider
- SQLite database with Prisma ORM
- Session management via NextAuth.js
- See `PRODUCTION-READINESS.md` for detailed production deployment requirements

### Deployment Configuration
- **Next.js**: Standalone output mode configured for containerization
- **Images**: Currently configured for localhost domain (update for production)
- **Docker**: Dockerfile and docker-compose.yml included for containerization
- **AWS**: Deployment scripts available (`deploy-to-aws.ps1`)
- **Environment**: Uses `DATABASE_URL` environment variable for database configuration

### Testing
No test framework currently configured. When adding tests:
- Consider Jest + React Testing Library for unit tests
- Add E2E tests with Playwright or Cypress
- Set up CI/CD pipeline with test automation

## Key Features & Data Flow

### Authentication System
- NextAuth.js with credentials provider in `src/store/index.ts`
- User data persists to SQLite database via Prisma
- Session management handled by NextAuth.js
- Default demo credentials configured in auth provider

### Workout Data Processing
- Instagram content parsing via custom `igParser.ts` and `igParser_toV1.ts`
- AST (Abstract Syntax Tree) to workout data transformation
- Editable workout table component for data manipulation
- OCR processing for workout images via Tesseract.js

### UI/UX Architecture
- Dark theme with custom fitness app color palette
- Mobile-responsive design with dedicated mobile navigation
- Tailwind CSS with shadcn/ui component patterns
- Geist font family for modern typography

### Database Operations
- Prisma client for type-safe database operations
- SQLite for local development (can be switched to PostgreSQL for production)
- Database utilities in `src/lib/db.ts`
- User seeding script available at `scripts/seed-user.mjs`