# Spot Buddy - Fitness Tracking App

[![Production](https://img.shields.io/badge/production-live-green)](https://spotter.cannashieldct.com)
[![Next.js](https://img.shields.io/badge/Next.js-15.5.1-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)

Spot Buddy is a modern fitness tracking application that lets users save Instagram workouts, upload workout screenshots with OCR text extraction, and track their fitness progress across devices. Built with Next.js 15, React 19, and deployed on AWS infrastructure.

🌐 **Live App**: [https://spotter.cannashieldct.com](https://spotter.cannashieldct.com)

## 🎯 Features

### ✅ Current Features (v1.1)

- **Authentication**: Secure login with AWS Cognito (Google OAuth supported)
- **Workout Management**: Save, edit, and delete workouts with full CRUD operations
- **Cross-Device Sync**: DynamoDB-backed persistence with real-time synchronization
- **Instagram Workouts**: Parse and import workout routines from Instagram posts
- **OCR Processing**: Extract workout text from images using Tesseract.js and AWS Textract
- **Workout Library**: Browse and search your saved workouts
- **Workout Details**: View individual workouts with exercise breakdowns
- **Personal Records (PRs)**: Automatic PR detection with 7 different 1RM calculation formulas
- **Body Metrics Tracking**: Weight, body fat %, and 8 body measurements with progression charts
- **Stats & Progress**: Comprehensive tracking pages for PRs and body metrics
- **Offline Support**: LocalStorage cache for offline access
- **Dark Theme**: Fitness-focused dark UI with cyan/purple accents

### 📋 Coming Soon (Roadmap)

- **Calendar View**: Schedule and track workouts by date (Phase 2)
- **Smart Timers**: Interval timers for workouts with audio alerts (Phase 3)
- **Social Features**: Connect with workout crews, share routines (Phase 5)
- **Subscription Plans**: Free, Core, Pro, and Elite tiers with Stripe (Phase 5)
- **AI Analysis**: Workout recommendations with Amazon Bedrock (Phase 6+)
- **Apple Health Integration**: Sync with health data and wearables (Phase 8+)
- **Mobile App**: React Native app for iOS/Android (Phase 7+)

## 🏗️ Tech Stack

### Frontend
- **Framework**: Next.js 15.5.1 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript 5.7
- **Styling**: Tailwind CSS with custom dark theme
- **UI Components**: shadcn/ui (New York style)
- **State Management**: Zustand + NextAuth session
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React

### Backend & Infrastructure
- **Hosting**: AWS ECS Fargate (containerized)
- **Database**: AWS DynamoDB (production), SQLite + Prisma (development)
- **Authentication**: AWS Cognito with NextAuth.js
- **Load Balancer**: Application Load Balancer with HTTPS
- **DNS**: Route53 (spotter.cannashieldct.com)
- **Container Registry**: AWS ECR
- **OCR**: Tesseract.js + AWS Textract integration

### Developer Tools
- **Package Manager**: npm
- **Linting**: ESLint with TypeScript support
- **Database ORM**: Prisma (dev mode)
- **Docker**: Multi-stage builds with standalone output
- **Git**: Version control with feature branches

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- AWS account with configured credentials
- Docker (for production builds)
- Git

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd spotter-webapp-free
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure:
   - `DATABASE_URL` - SQLite database path (dev mode)
   - `COGNITO_CLIENT_ID`, `COGNITO_CLIENT_SECRET`, `COGNITO_USER_POOL_ID`
   - `AWS_REGION`, `AUTH_SECRET`, `COGNITO_ISSUER_URL`
   - `DYNAMODB_USERS_TABLE`, `DYNAMODB_WORKOUTS_TABLE`
   - `APIFY_API_TOKEN` (for Instagram scraping)

4. **Generate Prisma client** (dev mode):
   ```bash
   npx prisma generate
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

6. **Open browser**: Navigate to [http://localhost:3000](http://localhost:3000)

### Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linter
npm run lint

# Type checking
npx tsc --noEmit

# Database commands
npm run db:push          # Push schema to database
npm run db:generate      # Generate Prisma client
npm run db:seed:user     # Seed test user

# Add UI component
npx shadcn@latest add [component-name]
```

## 📁 Project Structure

```
spotter-webapp-free/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── add/               # Add/edit workout pages
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # NextAuth endpoints
│   │   │   ├── workouts/      # Workout CRUD API
│   │   │   ├── ocr/           # OCR processing
│   │   │   └── health/        # Health check
│   │   ├── auth/              # Auth pages (login)
│   │   ├── library/           # Workout library
│   │   ├── workout/[id]/      # Individual workout view
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/            # React components
│   │   ├── auth/              # Auth components
│   │   ├── layout/            # Layout components
│   │   ├── providers/         # Context providers
│   │   └── ui/                # shadcn/ui components
│   ├── lib/                   # Utilities & shared logic
│   │   ├── dynamodb.ts        # DynamoDB client & operations
│   │   ├── db.ts              # Prisma client (dev)
│   │   ├── workout/           # Workout transformations
│   │   ├── igParser.ts        # Instagram parser
│   │   └── utils.ts           # Common utilities
│   └── store/                 # Zustand state management
│       └── index.ts           # Auth store
├── prisma/                    # Database schema (dev)
│   └── schema.prisma
├── public/                    # Static assets
├── scripts/                   # Utility scripts
├── .env.example               # Environment template
├── next.config.ts             # Next.js configuration
├── tailwind.config.ts         # Tailwind CSS config
├── tsconfig.json              # TypeScript config
├── Dockerfile                 # Production container
└── docker-compose.yml         # Local Docker setup
```

## 🗄️ Database Architecture

### Production (DynamoDB)

**spotter-workouts** table:
- **Partition Key**: `userId` (string) - Enables per-user data isolation
- **Sort Key**: `workoutId` (string) - Unique workout identifier
- **Attributes**:
  - `title`, `description`, `exercises[]`, `content`
  - `author`, `source`, `type`, `difficulty`, `tags[]`
  - `totalDuration`, `createdAt`, `updatedAt`
  - `llmData` (AI analysis, future)

**spotter-users** table:
- **Partition Key**: `userId` (string)
- **Attributes**:
  - Profile: `email`, `firstName`, `lastName`, `image`
  - Subscription: `subscriptionTier`, `subscriptionStatus`, Stripe IDs
  - Usage: `ocrQuotaUsed`, `ocrQuotaLimit`, `workoutsSaved`

**spotter-body-metrics** table:
- **Partition Key**: `userId` (string)
- **Sort Key**: `date` (string) - ISO date format (YYYY-MM-DD)
- **Attributes**:
  - Weight: `weight`, `bodyFatPercentage`, `muscleMass`
  - Measurements: `chest`, `waist`, `hips`, `thighs`, `arms`, `calves`, `shoulders`, `neck`
  - Metadata: `unit` (metric/imperial), `notes`, `photoUrls[]`
  - Timestamps: `createdAt`, `updatedAt`

### Development (SQLite + Prisma)

See [prisma/schema.prisma](prisma/schema.prisma) for full schema with User, Account, Session, and VerificationToken models.

## 🔐 Authentication Flow

1. User clicks login → redirected to AWS Cognito hosted UI
2. Cognito validates credentials (or Google OAuth)
3. Cognito returns to callback with authorization code
4. NextAuth.js exchanges code for tokens
5. JWT callback syncs user to DynamoDB and fetches subscription data
6. Session callback shapes user object for client
7. Frontend accesses auth state via `useAuthStore` hook

## 🎨 Styling & UI

- **Design System**: Custom dark theme with CSS variables
- **Color Palette**:
  - Background: Dark navy (`--background`)
  - Primary: Cyan accent (`--primary`)
  - Secondary: Purple accent (`--secondary`)
  - Rest: Amber accent (`--rest-color`)
- **Components**: shadcn/ui with "new-york" style
- **Typography**: Geist font family
- **Animations**: Custom fade-in, slide-up, bounce effects

## 🐳 Docker Deployment

### Build Production Image

```bash
docker build -t spotter-app .
```

### Run Locally

```bash
docker-compose up
```

### Deploy to AWS ECS

See [DEPLOYMENT-SUMMARY.md](DEPLOYMENT-SUMMARY.md) for complete deployment guide.

Quick deploy:
```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker build -t spotter-app .
docker tag spotter-app:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest

# Force new deployment
aws ecs update-service --cluster spotter-cluster --service spotter-service --force-new-deployment
```

## 🧪 Testing

Currently no automated tests configured. To add:

```bash
# Recommended testing stack
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev @playwright/test  # For E2E
```

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Quality Standards

- TypeScript strict mode enabled
- ESLint warnings treated as build errors
- Use path aliases (`@/components`, `@/lib`)
- Follow Next.js App Router conventions
- Prefer editing existing files over creating new ones

## 📊 Monitoring & Logging

- **Application Logs**: CloudWatch Logs via ECS task
- **Error Tracking**: Console logging (Sentry integration planned)
- **Health Check**: `/api/health` endpoint
- **Metrics**: CloudWatch metrics for ECS tasks

## 🛣️ Roadmap

See [PROJECT-STATE.md](PROJECT-STATE.md) for detailed roadmap, MVP requirements, and north star goals.

### Phase 1: Core Persistence ✅ (Complete - Oct 2025)
- DynamoDB workout CRUD operations
- Cross-device synchronization
- API routes for workout management

### Phase 4: Enhanced Stats & PRs ✅ (Complete - Jan 6, 2025)
- Personal records tracking with automatic detection
- 7 different 1RM calculation formulas
- Body metrics tracking (weight, measurements, body fat)
- Progression charts and analytics

### Phase 2: Calendar & Scheduling (Next)
- Calendar view with workout scheduling
- Date range queries and filtering
- Workout reminders

### Phase 3: Enhanced Workouts
- Smart workout timers (interval, HIIT, rest)
- AI-powered features (Bedrock integration)
- Enhanced OCR with AWS Textract

See full roadmap in [ROADMAP.md](ROADMAP.md).

## 📄 License

This project is private and proprietary. All rights reserved.

## 🔗 Documentation

### Core Documentation
- **[HOW-TO-GUIDE.md](HOW-TO-GUIDE.md)** - Complete user and developer guide
- **[PROJECT-STATE.md](PROJECT-STATE.md)** - Current state, MVP goals, and north star vision
- **[ROADMAP.md](ROADMAP.md)** - Detailed phase-by-phase development roadmap
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and design decisions

### Deployment & Operations
- **[DEPLOYMENT-SUMMARY.md](DEPLOYMENT-SUMMARY.md)** - AWS deployment procedures and history
- **[COST-ANALYSIS.md](COST-ANALYSIS.md)** - AWS costs and profitability analysis

### Planning Documents
- **[LAUNCH-PLAN.md](LAUNCH-PLAN.md)** - Beta launch strategy and market research
- **[MONITORING-PLAN.md](MONITORING-PLAN.md)** - Monitoring and logging strategy

### Phase Implementation Details
- **[PHASE-1-IMPLEMENTATION.md](PHASE-1-IMPLEMENTATION.md)** - DynamoDB workout persistence
- **[PHASE-2-IMPLEMENTATION.md](PHASE-2-IMPLEMENTATION.md)** - OCR & image upload
- **[PHASE-3-IMPLEMENTATION.md](PHASE-3-IMPLEMENTATION.md)** - Analytics & dashboard
- **[PHASE-4-IMPLEMENTATION.md](PHASE-4-IMPLEMENTATION.md)** - Stats & PRs tracking

### Developer Resources
- **[CLAUDE.md](CLAUDE.md)** - Instructions for Claude Code AI assistant

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Built with ❤️ using Next.js, React, TypeScript, and AWS**
