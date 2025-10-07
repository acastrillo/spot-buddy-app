# Spot Buddy - How-To Guide

**Last Updated**: January 6, 2025
**Version**: 1.1
**Production URL**: [https://spotter.cannashieldct.com](https://spotter.cannashieldct.com)

---

## Table of Contents

1. [User Guide](#user-guide)
   - [Getting Started](#getting-started)
   - [Adding Workouts](#adding-workouts)
   - [Managing Your Workout Library](#managing-your-workout-library)
   - [Tracking Personal Records](#tracking-personal-records)
   - [Tracking Body Metrics](#tracking-body-metrics)
   - [Settings & Account](#settings--account)

2. [Developer Guide](#developer-guide)
   - [Local Development Setup](#local-development-setup)
   - [Working with the Codebase](#working-with-the-codebase)
   - [Deployment Guide](#deployment-guide)
   - [Troubleshooting](#troubleshooting)

---

## User Guide

### Getting Started

#### 1. Create an Account

1. Navigate to [https://spotter.cannashieldct.com](https://spotter.cannashieldct.com)
2. Click **"Sign In"** in the top-right corner
3. Choose to sign in with:
   - **Google** (recommended for faster setup)
   - **Email and Password** (via AWS Cognito)
4. Complete the authentication flow
5. You'll be redirected to the home page

#### 2. Understand the Interface

**Navigation Menu** (accessible via hamburger icon on mobile):
- **Home** - Dashboard overview
- **Library** - All your saved workouts
- **Add Workout** - Create or import workouts
- **Calendar** - Schedule workouts (coming soon)
- **Settings** - Account and preferences

---

### Adding Workouts

Spot Buddy offers multiple ways to add workouts to your library.

#### Method 1: Import from Instagram

Best for quickly saving workouts shared by fitness influencers.

1. Go to **Add Workout** page
2. Find a workout post on Instagram
3. Copy the Instagram post URL (e.g., `https://instagram.com/p/ABC123`)
4. Paste the URL into the "Instagram URL" field
5. Click **"Fetch Workout"**
6. Review the parsed workout data
7. Edit title, exercises, or details if needed
8. Click **"Save Workout"**

**Tips**:
- Works best with posts that have structured workout info in the caption
- Automatically extracts exercises, sets, reps, and notes
- Instagram posts with clear formatting parse more accurately

#### Method 2: Upload a Screenshot (OCR)

Best for digitizing workout plans from photos, PDFs, or screenshots.

1. Go to **Add Workout** page
2. Click **"Upload Image"** or drag-and-drop an image
3. Wait for OCR processing (5-15 seconds)
4. Review the extracted workout data
5. Edit any misrecognized text
6. Click **"Save Workout"**

**Tips**:
- Use clear, high-resolution images for best results
- Ensure text is legible and not at extreme angles
- Free tier: 2 OCR uploads per week
- Pro tier: Unlimited OCR uploads

#### Method 3: Manual Entry

Best for custom workouts or when you know exactly what you want to create.

1. Go to **Add Workout** page
2. Click **"Create Manually"**
3. Enter workout details:
   - **Title**: Name your workout (e.g., "Chest & Triceps")
   - **Description**: Optional notes or goals
   - **Exercises**: Add exercises one by one
     - Exercise name (e.g., "Bench Press")
     - Sets, reps, weight
     - Rest time
     - Notes or form cues
4. Click **"Save Workout"**

**Tips**:
- Use clear, descriptive names for easy searching
- Add tags (e.g., "push", "legs", "cardio") for filtering
- Include rest times for better workout execution

---

### Managing Your Workout Library

#### Viewing Your Workouts

1. Go to **Library** page
2. Browse your saved workouts in a grid layout
3. Each card shows:
   - Workout title
   - Number of exercises
   - Tags (if any)
   - Thumbnail or icon

#### Searching and Filtering

1. Use the **search bar** to find workouts by name
2. Apply **filters** to narrow results:
   - By muscle group (chest, back, legs, etc.)
   - By difficulty (beginner, intermediate, advanced)
   - By workout type (strength, cardio, HIIT)
   - By source (Instagram, manual, OCR)

#### Viewing Workout Details

1. Click on any workout card
2. You'll see:
   - Full exercise list with sets/reps
   - Exercise notes and form cues
   - Workout source (if imported)
   - Date created

#### Editing a Workout

1. Open the workout detail page
2. Click **"Edit"** button
3. Modify any fields:
   - Workout title or description
   - Add/remove exercises
   - Update sets, reps, or weights
   - Change rest times
4. Click **"Save Changes"**

**Tips**:
- Edits are saved to the cloud automatically
- Changes sync across all your devices
- Original workout metadata is preserved

#### Deleting a Workout

1. Open the workout detail page
2. Click **"Delete"** button
3. Confirm deletion
4. Workout is permanently removed

**Warning**: Deletion is permanent and cannot be undone. Consider editing instead if you want to keep the workout history.

---

### Tracking Personal Records

Track your strength progress and celebrate new PRs (personal records).

#### Viewing Your PRs

1. Go to **Settings** > **Stats & Progress** > **Personal Records**
2. Or navigate directly to `/stats/prs`
3. You'll see three tabs:
   - **All PRs**: Current best for each exercise
   - **Recent PRs**: PRs achieved in the last 30 days
   - **Progression**: Charts showing strength gains over time

#### Understanding 1RM Calculations

Spot Buddy automatically calculates your estimated **1-Rep Max (1RM)** using multiple formulas:

- **Brzycki**: Best for 1-5 reps
- **Epley**: Good for 1-10 reps
- **Lander**: Conservative estimate
- **Lombardi**: Best for heavy singles
- **Mayhew**: Good for bodybuilders
- **O'Conner**: Best for 1-10 reps
- **Wathan**: General purpose

**Confidence Levels**:
- **High**: Based on 1-5 reps (most accurate)
- **Medium**: Based on 6-10 reps
- **Low**: Based on 11+ reps (less accurate)

#### How PRs Are Detected

PRs are automatically detected when you log workouts with weight and reps data:

1. **Add a workout** with exercises that include weight and reps
2. Spot Buddy compares to your previous records
3. If you lifted heavier or did more reps, a **PR is recorded**
4. PRs are marked with a 🏆 icon in your workout history

#### Viewing Exercise Progression

1. Go to the **Progression** tab
2. Select an exercise from the dropdown
3. View a chart showing:
   - Weight lifted over time
   - Estimated 1RM progression
   - Volume (sets × reps × weight)
   - Rep ranges

**Tips**:
- Track compound lifts (squat, bench, deadlift, OHP) for best insights
- Consistent rep ranges give more accurate 1RM estimates
- Log weights in the same unit (kg or lbs) for accurate trends

---

### Tracking Body Metrics

Track your weight, body composition, and measurements over time.

#### Adding a Body Metric Entry

1. Go to **Settings** > **Stats & Progress** > **Body Metrics**
2. Or navigate directly to `/stats/metrics`
3. Click **"Add Entry"**
4. Enter your metrics for today:
   - **Weight**: Current body weight
   - **Body Fat %**: If you measure it
   - **Muscle Mass**: If you track it
   - **Measurements**:
     - Chest
     - Waist
     - Hips
     - Thighs
     - Arms (bicep circumference)
     - Calves
     - Shoulders
     - Neck
5. Choose **Metric (kg/cm)** or **Imperial (lbs/inches)**
6. Add optional **notes** (e.g., "morning weight", "post-workout")
7. Click **"Save Entry"**

**Tips**:
- Measure at the same time each day for consistency (e.g., morning, before eating)
- Use the same scale and measuring tape
- Don't obsess over daily fluctuations; look at weekly trends

#### Viewing Your Progress

**Stats Cards** (top of page):
- **Current Weight**: Your most recent weight entry
- **Weight Change**: Difference from your first recorded weight
- **Body Fat %**: Your most recent body fat percentage

**Charts**:
- **Weight Progression**: Line chart showing weight over time
- **Body Fat Progression**: Line chart showing body fat % over time
- **Measurement History**: Timeline of all measurements

**Filtering by Date Range**:
1. Use the date picker to select a time range
2. View metrics for last 7 days, 30 days, 90 days, or custom range

#### Editing a Metric Entry

1. Find the entry in your history
2. Click **"Edit"**
3. Update any fields
4. Click **"Save Changes"**

#### Deleting a Metric Entry

1. Find the entry in your history
2. Click **"Delete"**
3. Confirm deletion

---

### Settings & Account

#### Accessing Settings

1. Click your **profile icon** or **hamburger menu**
2. Select **"Settings"**

#### Account Management

**Profile Settings**:
- Update your name
- Change your email (requires verification)
- Update password (if using email/password auth)

**Subscription & Billing**:
- View your current plan (Free, Starter, Pro, Elite)
- Upgrade or downgrade plans
- Manage payment methods
- View usage quotas (OCR requests, workouts saved)

**Stats & Progress**:
- Quick links to Personal Records and Body Metrics pages

**Privacy & Data**:
- Export your data (workouts, metrics, PRs)
- Delete your account

#### Understanding Subscription Tiers

| Feature | Free | Starter | Pro | Elite |
|---------|------|---------|-----|-------|
| **Workouts** | 50 max | Unlimited | Unlimited | Unlimited |
| **OCR/Week** | 2 | 10 | Unlimited | Unlimited |
| **PR Tracking** | ✅ | ✅ | ✅ | ✅ |
| **Body Metrics** | ✅ | ✅ | ✅ | ✅ |
| **Analytics** | Basic | Basic | Advanced | Advanced |
| **AI Features** | ❌ | ❌ | ✅ | ✅ |
| **Social/Crew** | ❌ | ❌ | ❌ | ✅ |
| **Priority Support** | ❌ | ❌ | ❌ | ✅ |

---

## Developer Guide

### Local Development Setup

#### Prerequisites

- **Node.js**: 18.x or higher
- **npm**: 10.x or higher
- **Docker** (optional): For containerization
- **AWS Account**: For production deployment
- **Git**: For version control

#### 1. Clone the Repository

```bash
git clone https://github.com/acastrillo/spot-buddy-app.git
cd spot-buddy-app
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# Copy from example
cp .env.example .env.local
```

**Required Environment Variables**:

```bash
# Authentication
AUTH_SECRET=your-random-secret-string
COGNITO_CLIENT_ID=your-cognito-client-id
COGNITO_CLIENT_SECRET=your-cognito-client-secret
COGNITO_USER_POOL_ID=your-user-pool-id
COGNITO_ISSUER_URL=https://cognito-idp.us-east-1.amazonaws.com/your-user-pool-id

# AWS Services
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
DYNAMODB_USERS_TABLE=spotter-users
DYNAMODB_WORKOUTS_TABLE=spotter-workouts
DYNAMODB_BODY_METRICS_TABLE=spotter-body-metrics

# Database (SQLite for dev)
DATABASE_URL=file:./prisma/dev.db

# Optional
NODE_ENV=development
APIFY_API_TOKEN=your-apify-token  # For Instagram scraping
```

#### 4. Set Up the Database

**Option A: DynamoDB (Production-like)**

Create tables in AWS:

```bash
# Create users table
aws dynamodb create-table \
  --table-name spotter-users \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# Create workouts table
aws dynamodb create-table \
  --table-name spotter-workouts \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=workoutId,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=workoutId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# Create body metrics table
aws dynamodb create-table \
  --table-name spotter-body-metrics \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=date,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=date,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

**Option B: SQLite (Local Dev)**

```bash
# Push Prisma schema to SQLite
npm run db:push

# Generate Prisma client
npm run db:generate

# Seed test data
npm run db:seed:user
```

#### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Working with the Codebase

#### Project Structure

```
spot-buddy/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── add/                # Add workout page
│   │   ├── api/                # API routes
│   │   │   ├── auth/           # NextAuth.js endpoints
│   │   │   ├── body-metrics/   # Body metrics CRUD
│   │   │   ├── workouts/       # Workout CRUD
│   │   │   ├── ocr/            # OCR processing
│   │   │   └── instagram-fetch/# Instagram parser
│   │   ├── calendar/           # Calendar page
│   │   ├── library/            # Workout library
│   │   ├── settings/           # Settings page
│   │   ├── stats/              # Stats & PRs pages
│   │   │   ├── prs/            # Personal records
│   │   │   └── metrics/        # Body metrics
│   │   └── workout/[id]/       # Workout detail pages
│   ├── components/             # React components
│   │   ├── auth/               # Authentication UI
│   │   ├── layout/             # Layout components
│   │   ├── providers/          # Context providers
│   │   └── ui/                 # shadcn/ui components
│   ├── lib/                    # Utilities and helpers
│   │   ├── dynamodb.ts         # DynamoDB client & operations
│   │   ├── db.ts               # Prisma client (dev)
│   │   ├── pr-calculator.ts    # 1RM calculations
│   │   ├── igParser.ts         # Instagram parsing
│   │   └── utils.ts            # Common utilities
│   └── store/                  # Zustand state management
│       └── index.ts            # Auth store
├── prisma/                     # Prisma schema (dev)
├── public/                     # Static assets
├── .env.local                  # Local environment variables
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS config
└── tsconfig.json               # TypeScript config
```

#### Key Files to Know

**Authentication**:
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth.js configuration
- `src/store/index.ts` - Auth store wrapping NextAuth session

**DynamoDB Operations**:
- `src/lib/dynamodb.ts` - All DynamoDB CRUD operations for workouts, users, and body metrics

**API Routes**:
- `src/app/api/workouts/route.ts` - List and create workouts
- `src/app/api/workouts/[id]/route.ts` - Get, update, delete workout
- `src/app/api/body-metrics/route.ts` - List and create metrics
- `src/app/api/body-metrics/[date]/route.ts` - Get, update, delete metric

**UI Pages**:
- `src/app/library/page.tsx` - Workout library with grid view
- `src/app/add/page.tsx` - Add workout (Instagram, OCR, manual)
- `src/app/stats/prs/page.tsx` - Personal records tracking
- `src/app/stats/metrics/page.tsx` - Body metrics tracking

#### Common Development Tasks

**Adding a New API Route**:

1. Create the route file:
   ```typescript
   // src/app/api/my-route/route.ts
   import { NextRequest, NextResponse } from "next/server";
   import { getServerSession } from "next-auth";
   import { authOptions } from "@/lib/auth-options";

   export async function GET(request: NextRequest) {
     const session = await getServerSession(authOptions);

     if (!(session?.user as any)?.id) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
     }

     const userId = (session.user as any).id;

     // Your logic here

     return NextResponse.json({ data: "Hello" });
   }
   ```

2. Test the route:
   ```bash
   curl http://localhost:3000/api/my-route
   ```

**Adding a New Page**:

1. Create the page file:
   ```typescript
   // src/app/my-page/page.tsx
   "use client";

   export default function MyPage() {
     return (
       <div className="container mx-auto p-6">
         <h1 className="text-3xl font-bold">My Page</h1>
       </div>
     );
   }
   ```

2. Add navigation link in header or menu

**Adding a shadcn/ui Component**:

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
```

**Running Type Checks**:

```bash
npx tsc --noEmit
```

**Running Linter**:

```bash
npm run lint
```

**Building for Production**:

```bash
npm run build
```

---

### Deployment Guide

#### Prerequisites

- AWS account with appropriate permissions
- AWS CLI configured
- Docker installed
- ECR repository created

#### 1. Build the Docker Image

```bash
docker build -t spotter-app:latest .
```

**Multi-stage Dockerfile Overview**:
- **Stage 1 (deps)**: Install dependencies
- **Stage 2 (builder)**: Build Next.js app
- **Stage 3 (runner)**: Production runtime

#### 2. Tag and Push to ECR

```bash
# Authenticate Docker to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  920013187591.dkr.ecr.us-east-1.amazonaws.com

# Tag the image with timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
docker tag spotter-app:latest \
  920013187591.dkr.ecr.us-east-1.amazonaws.com/spotter-app:$TIMESTAMP

# Push to ECR
docker push 920013187591.dkr.ecr.us-east-1.amazonaws.com/spotter-app:$TIMESTAMP
docker push 920013187591.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest
```

#### 3. Update ECS Task Definition

```bash
# Register new task definition (uses Python script)
python register-new-taskdef.py

# Or manually with AWS CLI
aws ecs register-task-definition --cli-input-json file://task-def.json
```

#### 4. Deploy to ECS

```bash
# Update service with new task definition
aws ecs update-service \
  --cluster SpotterCluster \
  --service spotter-app \
  --task-definition spotter-app:10 \
  --force-new-deployment \
  --region us-east-1
```

#### 5. Monitor Deployment

```bash
# Check service status
aws ecs describe-services \
  --cluster SpotterCluster \
  --services spotter-app \
  --region us-east-1 \
  --query "services[0].{Status:status,Running:runningCount,Desired:desiredCount}"

# View logs
export MSYS_NO_PATHCONV=1
aws logs tail spotter-app-logs --region us-east-1 --follow
```

#### 6. Verify Deployment

```bash
# Health check
curl https://spotter.cannashieldct.com/api/health

# Expected response: {"status":"ok"}
```

#### Automated Deployment Script

For faster deployments, use the provided deployment script:

```bash
# Make executable
chmod +x update-deployment-fixed.sh

# Run deployment
./update-deployment-fixed.sh
```

This script:
1. Builds the Docker image
2. Tags with timestamp
3. Pushes to ECR
4. Updates ECS service
5. Monitors deployment progress

---

### Troubleshooting

#### Common Issues

**1. "Module not found" errors**

```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
```

**2. TypeScript errors during build**

- Check `tsconfig.json` settings
- Ensure all types are properly imported
- Use `// @ts-ignore` for NextAuth session type issues (temporary)

**3. DynamoDB access denied**

- Verify AWS credentials are set correctly
- Check IAM role has DynamoDB permissions
- Ensure table names match environment variables

**4. NextAuth session not working**

- Verify `AUTH_SECRET` is set
- Check Cognito client ID and secret
- Ensure `COGNITO_ISSUER_URL` is correct
- Clear browser cookies and retry

**5. Docker build fails**

- Check Dockerfile for syntax errors
- Ensure `.dockerignore` excludes `node_modules` and `.next`
- Increase Docker memory allocation (Docker Desktop settings)

**6. ECS task failing health checks**

- Check task logs in CloudWatch
- Verify container port (3000) matches target group
- Ensure environment variables are set in task definition
- Check security group allows ALB traffic

#### Debugging Tips

**Enable verbose logging**:

```bash
# In .env.local
NODE_ENV=development
DEBUG=true
```

**View Next.js build errors**:

```bash
npm run build 2>&1 | tee build.log
```

**Test DynamoDB locally**:

```bash
# List tables
aws dynamodb list-tables --region us-east-1

# Scan workouts table
aws dynamodb scan --table-name spotter-workouts --region us-east-1

# Query by userId
aws dynamodb query \
  --table-name spotter-workouts \
  --key-condition-expression "userId = :uid" \
  --expression-attribute-values '{":uid":{"S":"your-user-id"}}'
```

**Test API routes locally**:

```bash
# Health check
curl http://localhost:3000/api/health

# Get workouts (requires auth cookie)
curl -X GET http://localhost:3000/api/workouts \
  -H "Cookie: next-auth.session-token=your-token"
```

---

## Additional Resources

- **Documentation**: See [README.md](README.md), [ARCHITECTURE.md](ARCHITECTURE.md), [ROADMAP.md](ROADMAP.md)
- **Project State**: See [PROJECT-STATE.md](PROJECT-STATE.md)
- **Deployment Details**: See [DEPLOYMENT-SUMMARY.md](DEPLOYMENT-SUMMARY.md)
- **Next.js Docs**: https://nextjs.org/docs
- **NextAuth.js Docs**: https://next-auth.js.org
- **AWS DynamoDB Docs**: https://docs.aws.amazon.com/dynamodb
- **shadcn/ui**: https://ui.shadcn.com

---

## Getting Help

**For Users**:
- Check this How-To Guide first
- Visit the Settings page for account-specific issues
- Contact support via the app (Elite tier only)

**For Developers**:
- Review the documentation files in the repository
- Check the GitHub Issues page
- Review commit history for recent changes
- Use the debugging tips above

---

**Document Version**: 1.0
**Last Updated**: January 6, 2025
**Maintained by**: Spot Buddy Team
