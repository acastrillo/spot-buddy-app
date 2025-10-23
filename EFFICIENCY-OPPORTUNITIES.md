# Efficiency & Platform Readiness Opportunities

Captured from the latest architecture review. Focus is on improving runtime efficiency without sacrificing UI, pruning unused assets, and preparing the web stack for future native clients.

## Efficiency Targets

- **DynamoDB utilities (`src/lib/dynamodb.ts`)**  
  Split the 800+ line helper into scoped repositories (users, workouts, metrics). Route handlers would import only what they consume, trimming bundle size and reducing cold-start overhead.

- **Repeated session checks (`src/app/api/*`)**  
  Every route reimplements the same `getServerSession(authOptions)` block. Factor that into a shared helper to cut duplication and lower maintenance risk when auth logic changes.

- **Metrics & logging (`src/lib/metrics.ts`, `src/lib/logger.ts`)**  
  The in-memory queue flushes to console logs, inflating CPU time. Either wire the collector straight to CloudWatch (EMF) or disable buffering in dev to calm runtime churn.

- **Expensive data fetches in server components**  
  Pages such as `src/app/dashboard/page.tsx` and other dashboard views fetch large data sets per request. Add caching (`revalidateTag`, edge caching, or API layer) to avoid duplicate DynamoDB hits when the UI stays static.

- **Instagram scraper loop (`src/app/api/instagram-fetch/route.ts`)**  
  The route polls Apify synchronously for up to 60 seconds, locking serverless workers. Offload to a job queue or callback webhook so the API returns immediately.

## Orphaned / Legacy Artifacts

- **Prisma folder + scripts**  
  Production storage has moved to DynamoDB. If Prisma is no longer used, remove `prisma/schema.prisma`, Prisma dependencies in `package.json`, and related npm scripts.

- **Remaining `scripts/` utilities**  
  Review leftover deployment helpers; several overlap with the newer PowerShell/Bash tooling and may not be needed.

- **Transient directories**  
  Ensure `.next/` and `.claude/` never land in git—double-check ignore rules and CI cleanup.

- **Historical documentation**  
  Phase-specific markdown files should reflect current architecture. Retire or archive ones that no longer match reality to reduce onboarding confusion.

## Native App Translation Risks

- **Authentication store (`src/store/index.ts`)**  
  Depends on NextAuth session cookies. Native apps must integrate with Cognito/Google via mobile-friendly OAuth flows and get API tokens rather than SSR cookies.

- **UI primitives**  
  Tailwind-heavy components assume web layout constraints. Porting to native requires redesigned layout primitives; plan for separate component libraries instead of low-effort ports.

- **Feature gating logic (`src/lib/feature-gating.tsx`)**  
  Runs in Zustand with session-derived data. Provide API endpoints or shared business logic so mobile clients stay in sync with feature entitlements.

- **Media-heavy endpoints**  
  OCR and upload routes expect multipart form data and serve public URLs. Native clients should leverage presigned upload URLs, background transfers, and private buckets.

- **Stripe flows (`src/app/api/stripe/*`)**  
  Current implementation assumes web redirection. Mobile storefronts will need Stripe Mobile SDK integration or platform billing (Apple/Google), implying additional API work.

- **Telemetry**  
  Logging/metrics are Node-centric. Native apps require alternative observability pipelines (e.g., Amplify Analytics, Sentry) to remain consistent.

- **Server-rendered business logic**  
  Several components depend on server-side data shaping. Ensure there are REST/GraphQL endpoints or shared libraries so native clients can reuse the same business rules.

