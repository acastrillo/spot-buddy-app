# AWS Deployment Scripts - Complete Explanation

This document provides a comprehensive explanation of how the AWS deployment scripts work and how to use them.

## Overview

Kinex Fit uses AWS ECS Fargate for production hosting. The deployment scripts automate the process of building Docker images, pushing to Amazon ECR (Elastic Container Registry), and updating the ECS service.

## Files Created

### 1. Dockerfile (Root Directory)
**Location:** `Dockerfile`
**Purpose:** Multi-stage Docker build for Next.js 15 application

**How it works:**
```dockerfile
# Stage 1: Base image (Node 18 Alpine)
FROM node:18-alpine AS base

# Stage 2: Install dependencies
FROM base AS deps
- Copies package.json and package-lock.json
- Runs npm ci (clean install)
- Minimal layer with just node_modules

# Stage 3: Build the application
FROM base AS builder
- Copies dependencies from stage 2
- Copies entire application source
- Generates Prisma client
- Runs npm run build (Next.js build)
- Creates SQLite database for NextAuth (local sessions)

# Stage 4: Production runtime
FROM base AS runner
- Creates non-root user (nextjs:1001)
- Copies only production files:
  - public/ folder (static assets)
  - .next/standalone/ (built app with minimal dependencies)
  - .next/static/ (static JS/CSS)
  - Prisma database
- Sets environment to production
- Exposes port 3000
- Runs node server.js (Next.js standalone server)
```

**Why multi-stage?**
- Smaller final image (only runtime files, no build tools)
- Faster deployments (less data to transfer)
- More secure (no source code, no development dependencies)

**Image size:** ~150-200MB (vs 1GB+ without multi-stage)

### 2. update-deployment.sh (Bash Script)
**Location:** `scripts/update-deployment.sh`
**Platform:** Git Bash (Windows), Mac/Linux terminal
**Purpose:** Quick deployment to existing AWS infrastructure

**Step-by-step execution:**

```bash
# Step 1: Build Docker image
docker build -t spotter-app .
# Creates local image tagged 'spotter-app:latest'
# Uses Dockerfile multi-stage build
# Takes 3-5 minutes on first build, 1-2 minutes on subsequent builds

# Step 2: Tag image for ECR
docker tag spotter-app:latest 920013187591.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest
# Adds ECR repository tag to the image
# Format: {account-id}.dkr.ecr.{region}.amazonaws.com/{repo-name}:{tag}

# Step 3: Login to ECR
MSYS_NO_PATHCONV=1 aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin {ecr-repo}
# Gets temporary auth token from AWS
# MSYS_NO_PATHCONV=1 prevents Git Bash path conversion issues
# Token valid for 12 hours

# Step 4: Push image to ECR
docker push 920013187591.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest
# Uploads Docker image layers to ECR
# Only pushes changed layers (efficient)
# Takes 2-4 minutes depending on changes

# Step 5: Update ECS service
aws ecs update-service \
  --cluster spotter-cluster \
  --service spotter-web-service \
  --force-new-deployment \
  --region us-east-1
# Tells ECS to pull new image and redeploy
# Keeps existing task definition
# No downtime (rolling deployment)

# Step 6: Monitor deployment
# Polls ECS API every 10 seconds
# Checks deployment.rolloutState
# Shows status: IN_PROGRESS -> COMPLETED
# Timeout after 5 minutes (30 attempts × 10 seconds)
```

**Total time:** 6-10 minutes
- Build: 1-3 min
- Push: 2-4 min
- Deploy: 2-3 min

**Error handling:**
- Exits on first error (set -e)
- Color-coded output (green=success, red=error, yellow=warning)
- Clear error messages at each step
- Provides rollback commands on failure

### 3. update-deployment.ps1 (PowerShell Script)
**Location:** `scripts/update-deployment.ps1`
**Platform:** Windows PowerShell, PowerShell 7
**Purpose:** Same as bash script, but for PowerShell users

**Key differences from bash script:**
- PowerShell syntax and error handling ($LASTEXITCODE instead of $?)
- Uses `Out-Null` instead of `> /dev/null`
- Native Windows path handling (no MSYS_NO_PATHCONV needed)
- Write-Host for colored output instead of echo -e

**Execution:** Same 6 steps as bash script

### 4. deploy-to-aws.ps1 (Full Infrastructure Setup)
**Location:** `scripts/deploy-to-aws.ps1`
**Platform:** PowerShell only
**Purpose:** First-time AWS infrastructure creation

**Complete workflow (11 steps):**

```powershell
# Step 1: Get AWS Account ID
$AccountId = (aws sts get-caller-identity --query Account --output text)
# Dynamically retrieves your AWS account ID
# Used to construct ARNs and resource names

# Step 2: Create ECR repository
aws ecr create-repository --repository-name spotter-app --region us-east-1
# Creates Docker image repository
# Idempotent: Ignores if already exists

# Step 3: Build Docker image
docker build -t spotter-app .
# Same as update script

# Step 4: ECR login
# Same as update script

# Step 5: Push to ECR
# Same as update script

# Step 6: Create ECS task execution role
# Role: SpotterTaskExecutionRole
# Allows ECS to:
#   - Pull images from ECR
#   - Write logs to CloudWatch
#   - Read parameters from SSM Parameter Store
# Attaches policies:
#   - AmazonECSTaskExecutionRolePolicy (managed)
#   - SsmParameterAccess (inline for /spotter-app/* parameters)

# Step 7: Create ECS task role
# Role: SpotterTaskRole
# Allows application to:
#   - Read/write DynamoDB tables (spotter-*)
#   - Invoke Bedrock models (AI features)
#   - Send emails via SES
# Policy: SpotterAppPolicy (inline)

# Step 8: Create ECS cluster
aws ecs create-cluster --cluster-name spotter-cluster
# Logical grouping for services
# No EC2 instances needed (Fargate serverless)

# Step 9: Create CloudWatch log group
aws logs create-log-group --log-group-name "/ecs/spotter-app"
# Container logs sent here
# Retention: Default (never expires, can be changed)

# Step 10: Register task definition
aws ecs register-task-definition --cli-input-json file://aws-task-definition.json
# Defines container configuration:
#   - Image: {ecr-repo}:latest
#   - CPU: 256 (.25 vCPU)
#   - Memory: 512 MB
#   - Port: 3000
#   - Environment: 63 variables from SSM
#   - Logging: CloudWatch
# Creates revision: spotter-app-task:1

# Step 11: Create Application Load Balancer
# Detects default VPC
# Selects 2 subnets (ALB requires multi-AZ)
# Creates 2 security groups:
#   - ALB SG: Allow 80, 443 from internet
#   - ECS SG: Allow 3000 from ALB only
# Creates ALB with HTTP listener (port 80)
# Creates target group (HTTP:3000, health check: /)

# Step 12: Create ECS service
aws ecs create-service ...
# Configuration:
#   - Launch type: FARGATE (serverless)
#   - Desired count: 1 task
#   - Network: awsvpc mode with public IP
#   - Load balancer: Connects to target group
#   - Service discovery: None (uses ALB DNS)
# ECS will:
#   1. Pull image from ECR
#   2. Start Fargate task
#   3. Register task with target group
#   4. Health check (HTTP GET /)
#   5. Add to load balancer rotation
```

**Total time:** 10-15 minutes (infrastructure creation is slow)

**Outputs:**
- ALB DNS name (e.g., spotter-alb-56827129.us-east-1.elb.amazonaws.com)
- Service name and cluster
- Next steps (DNS, SSL setup)

**Important notes:**
- Run this script ONLY ONCE per environment
- For routine updates, use update-deployment.ps1
- Creates resources with default configurations
- Does NOT create:
  - Route53 DNS records
  - SSL certificates
  - DynamoDB tables (must exist beforehand)
  - SSM parameters (must be set manually)

### 5. docker-compose.yml (Local Testing)
**Location:** `docker-compose.yml`
**Purpose:** Test Docker build locally before production

**Configuration:**
```yaml
services:
  spotter-app:
    build: .              # Uses Dockerfile in current directory
    ports:
      - "3000:3000"       # Maps container port 3000 to host port 3000
    environment:
      - NODE_ENV=production  # Runs in production mode
    restart: unless-stopped  # Auto-restart on failure
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3000 || exit 1"]
      interval: 30s       # Check every 30 seconds
      timeout: 10s        # Fail if no response in 10s
      retries: 3          # Unhealthy after 3 failures
      start_period: 10s   # Grace period on startup
```

**Usage:**
```bash
# Build and start
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

**Why use this?**
- Verifies Dockerfile builds correctly
- Tests application in production-like environment
- Catches Docker-specific issues before production
- Faster iteration than deploying to AWS

## Production Infrastructure

### Current AWS Setup
- **Account ID:** 920013187591
- **Region:** us-east-1 (N. Virginia)
- **Domain:** https://spotter.cannashieldct.com
- **Cluster:** spotter-cluster
- **Service:** spotter-web-service
- **Task:** spotter-app-task (revision 11 as of Jan 7, 2025)
- **ECR Repo:** 920013187591.dkr.ecr.us-east-1.amazonaws.com/spotter-app

### Architecture
```
Internet
  ↓
Route53 DNS (spotter.cannashieldct.com)
  ↓
Application Load Balancer (HTTP:80, HTTPS:443)
  ↓
Target Group (HTTP:3000)
  ↓
ECS Service (Fargate)
  ↓
Task(s) running Docker container
  ↓
DynamoDB tables (users, workouts, etc.)
  ↓
AWS Bedrock (AI generation)
  ↓
SES (email)
```

### Environment Variables (63 total)
All stored in AWS Systems Manager (SSM) Parameter Store under `/spotter-app/*`:

**Categories:**
- Auth: AUTH_SECRET, NEXTAUTH_URL, Google OAuth, Facebook OAuth
- Stripe: Secret key, publishable key, webhook secret, 12 price IDs
- AWS: Region, DynamoDB table names, Bedrock model
- Email: SES SMTP configuration
- Rate limiting: Upstash Redis

**Why SSM?**
- Centralized secret management
- No secrets in code or Docker image
- IAM-controlled access
- Automatic rotation support
- Audit logging

### Task Definition
**File:** aws-task-definition.json (174 lines)

**Key sections:**
```json
{
  "family": "spotter-app-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",        // 0.25 vCPU
  "memory": "512",     // 512 MB RAM
  "taskRoleArn": "arn:aws:iam::920013187591:role/SpotterTaskRole",
  "executionRoleArn": "arn:aws:iam::920013187591:role/SpotterTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "spotter-web",
      "image": "{ecr-repo}:latest",
      "portMappings": [{"containerPort": 3000}],
      "environment": [
        // 63 environment variables...
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/spotter-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

## Deployment Process Explained

### What happens when you run update-deployment.sh?

1. **Local build (your machine):**
   - Reads Dockerfile
   - Downloads Node 18 Alpine base image (cached after first time)
   - Runs npm ci to install dependencies
   - Generates Prisma client
   - Builds Next.js app
   - Creates final image with only runtime files
   - Tags image as `spotter-app:latest`

2. **Push to ECR (AWS):**
   - Authenticates with AWS using your credentials
   - Uploads Docker layers to ECR
   - Only uploads changed layers (saves time)
   - ECR stores image with SHA256 digest

3. **ECS service update (AWS):**
   - AWS API call to update service
   - ECS creates new task definition revision (if needed)
   - Starts new task with updated image
   - Waits for health check to pass
   - Adds new task to load balancer
   - Drains connections from old task
   - Stops old task
   - Deployment complete

4. **Zero-downtime deployment:**
   - Old version keeps running while new version starts
   - Load balancer health checks new version
   - Once healthy, traffic shifts to new version
   - Old version terminates
   - Total transition: 2-3 minutes

### How does ECS know to pull the new image?

The `:latest` tag doesn't automatically trigger updates. The `--force-new-deployment` flag tells ECS:
1. Pull the image again (even if tag is the same)
2. Start new tasks with fresh image
3. Replace old tasks

Alternative: Use image digest (SHA256) in task definition for guaranteed specific version.

## Troubleshooting

### Build fails
```bash
# Clear Docker cache
docker system prune -a

# Rebuild from scratch
docker build --no-cache -t spotter-app .
```

### Push fails (authentication)
```bash
# Re-login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 920013187591.dkr.ecr.us-east-1.amazonaws.com

# Verify AWS credentials
aws sts get-caller-identity
```

### Deployment stuck
```bash
# Check service events
aws ecs describe-services --cluster spotter-cluster --services spotter-web-service --region us-east-1 --query 'services[0].events[0:5]'

# Check task logs
aws logs tail /ecs/spotter-app --follow --region us-east-1
```

### Task fails to start
Common causes:
- Missing environment variables in SSM
- Insufficient task role permissions
- Image pull errors (ECR permissions)
- Port conflicts
- Out of memory (increase from 512 MB)

## Security Best Practices

1. **No secrets in Dockerfile or code**
   - All secrets in SSM Parameter Store
   - IAM role-based access

2. **Least privilege IAM**
   - Execution role: Only ECR, CloudWatch, SSM
   - Task role: Only required DynamoDB tables, Bedrock, SES

3. **Network security**
   - ECS tasks in private subnets (if using NAT Gateway)
   - Security groups: ALB → ECS only on port 3000
   - No direct internet access to tasks

4. **Container security**
   - Non-root user (nextjs:1001)
   - Minimal base image (Alpine Linux)
   - No unnecessary packages
   - Multi-stage build (no source code in final image)

5. **Image integrity**
   - ECR scans images for vulnerabilities
   - Use specific image digests for production
   - Regular base image updates

## Cost Optimization

**Current costs (approximate):**
- ECS Fargate: $10-15/month (1 task × 0.25 vCPU × 0.5 GB RAM)
- ALB: $20/month (always running)
- ECR: $0.50/month (few GB storage)
- Data transfer: $1-5/month (depends on traffic)
- CloudWatch Logs: $1-3/month (retention policy)

**Total:** ~$35-45/month

**Optimization tips:**
- Use Fargate Spot for dev/staging (70% cheaper)
- Set log retention to 7-30 days (reduces storage costs)
- Use reserved capacity for predictable workloads
- Enable ECS Service Connect instead of ALB for internal services

## Next Steps

1. **Set up CI/CD**
   - GitHub Actions workflow
   - Automatic deployment on push to main
   - Run tests before deployment

2. **Monitoring**
   - CloudWatch alarms (CPU, memory, error rate)
   - Application Performance Monitoring (APM)
   - Custom metrics from application

3. **Scaling**
   - Auto Scaling based on CPU/memory
   - Multiple tasks for high availability
   - Multi-region deployment

4. **Blue/Green deployments**
   - CodeDeploy integration
   - Instant rollback capability
   - Traffic shifting strategies

## References

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Docker Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Next.js Standalone Output](https://nextjs.org/docs/advanced-features/output-file-tracing)
- [Project DEPLOYMENT.md](./docs/DEPLOYMENT.md)
