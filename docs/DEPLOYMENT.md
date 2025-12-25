# Spot Buddy Deployment Guide

Complete guide for deploying Spot Buddy to AWS ECS.

## Prerequisites

- AWS CLI configured with appropriate credentials
- Docker installed and running
- Stripe products created (see [STRIPE-SETUP.md](./STRIPE-SETUP.md))
- Environment variables configured

## Pre-Deployment Checklist

### 1. Stripe Setup
- [ ] Created 3 products in Stripe (Core, Pro, Elite)
- [ ] Copied all price IDs to `.env.local`
- [ ] Created webhook endpoint for production URL
- [ ] Copied webhook signing secret
- [ ] Verified setup with `npx tsx scripts/verify-stripe-prices.ts`

### 2. Environment Variables
Ensure these are set in AWS Systems Manager (SSM):

```bash
# Auth
AUTH_SECRET
NEXTAUTH_URL=https://spotter.cannashieldct.com

# OAuth Providers
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
FACEBOOK_CLIENT_ID
FACEBOOK_CLIENT_SECRET

# Stripe
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_CORE
STRIPE_PRICE_PRO
STRIPE_PRICE_ELITE
NEXT_PUBLIC_STRIPE_PRICE_CORE
NEXT_PUBLIC_STRIPE_PRICE_PRO
NEXT_PUBLIC_STRIPE_PRICE_ELITE

# AWS
AWS_REGION=us-east-1
DYNAMODB_USERS_TABLE=spotter-users
DYNAMODB_WORKOUTS_TABLE=spotter-workouts
DYNAMODB_WORKOUT_COMPLETIONS_TABLE=spotter-workout-completions
```

Update AWS SSM parameters:
```bash
# Windows (PowerShell):
.\scripts\update-aws-stripe-params.ps1

# Mac/Linux:
bash scripts/update-aws-stripe-params.sh
```

## Deployment Steps

### 1. Build Docker Image

```bash
# Build the image
docker build -t spotter-app .

# Verify build was successful
docker images | grep spotter-app
```

### 2. Push to Amazon ECR

```bash
# Tag for ECR
docker tag spotter-app:latest 920013187591.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest

# Login to ECR
MSYS_NO_PATHCONV=1 aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 920013187591.dkr.ecr.us-east-1.amazonaws.com

# Push to ECR
docker push 920013187591.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest
```

### 3. Update ECS Service

```bash
# Force new deployment
MSYS_NO_PATHCONV=1 aws ecs update-service \
  --cluster SpotterCluster \
  --service spotter-app \
  --force-new-deployment \
  --region us-east-1
```

### 4. Monitor Deployment

```bash
# Watch deployment status
MSYS_NO_PATHCONV=1 aws ecs describe-services \
  --cluster SpotterCluster \
  --services spotter-app \
  --region us-east-1 \
  --query 'services[0].deployments' \
  --output table

# View logs
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --follow --region us-east-1
```

## Post-Deployment Testing

### 1. Verify Application
- [ ] Visit https://spotter.cannashieldct.com
- [ ] Confirm HTTP 200 response
- [ ] Check that sign-in page loads

### 2. Test Authentication
- [ ] Sign in with Google OAuth
- [ ] Sign in with Facebook OAuth
- [ ] Verify user profile shows correct name
- [ ] Sign out and sign in again (should reuse same user, no duplicates)

### 3. Test Subscription Flow
- [ ] Navigate to `/subscription`
- [ ] Click "Upgrade" on Core tier
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Complete checkout
- [ ] Verify redirect back to settings
- [ ] Confirm tier shows as "Core" with "Current Plan" badge
- [ ] Check that "Manage Subscription" button appears

### 4. Verify Webhook
```bash
# Check for successful webhook processing
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app \
  --region us-east-1 \
  --since 10m \
  --filter-pattern "Webhook"
```

Expected log entries:
- `[Webhook:evt_xxx] Successfully updated user <uuid> subscription to core`
- No "User not found" errors

### 5. Verify Database Updates
```bash
# Check user count and subscription tier
node scripts/list-all-users.mjs

# Verify single user (no duplicates)
node scripts/verify-single-user.mjs your-email@example.com
```

## Troubleshooting

### Build Failures

**Issue**: Docker build fails
```bash
# Check Docker is running
docker ps

# Clean Docker cache
docker system prune -a

# Rebuild
docker build -t spotter-app .
```

### Deployment Issues

**Issue**: ECS service not updating
```bash
# Check service events
MSYS_NO_PATHCONV=1 aws ecs describe-services \
  --cluster SpotterCluster \
  --services spotter-app \
  --region us-east-1 \
  --query 'services[0].events[0:5]'
```

**Issue**: Task failing to start
```bash
# Check task definition
MSYS_NO_PATHCONV=1 aws ecs describe-task-definition \
  --task-definition spotter-app-task \
  --region us-east-1

# View stopped tasks
MSYS_NO_PATHCONV=1 aws ecs list-tasks \
  --cluster SpotterCluster \
  --desired-status STOPPED \
  --region us-east-1
```

### Application Errors

**Issue**: "No such price" error
- Verify price IDs in AWS SSM match Stripe Dashboard
- Check both `STRIPE_PRICE_*` and `NEXT_PUBLIC_STRIPE_PRICE_*` are set
- Run `npx tsx scripts/verify-stripe-prices.ts` locally

**Issue**: Webhook not receiving events
- Verify webhook endpoint in Stripe Dashboard: `https://spotter.cannashieldct.com/api/stripe/webhook`
- Check webhook signing secret in AWS SSM
- Test webhook in Stripe Dashboard ("Send test webhook")

**Issue**: Duplicate users still being created
```bash
# Check auth logs
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app \
  --region us-east-1 \
  --filter-pattern "Auth:SignIn"
```
Should see `[Auth:SignIn] ✓ Existing user found` on repeat sign-ins

**Issue**: Subscription not updating in app
1. Check webhook logs in Stripe Dashboard
2. Verify webhook events are being delivered (status 200)
3. Check application logs for webhook processing errors
4. Try signing out and back in to refresh session

## Rollback Procedure

If deployment fails:

```bash
# 1. List recent task definitions
MSYS_NO_PATHCONV=1 aws ecs list-task-definitions \
  --family-prefix spotter-app-task \
  --region us-east-1

# 2. Update service to previous task definition
MSYS_NO_PATHCONV=1 aws ecs update-service \
  --cluster SpotterCluster \
  --service spotter-app \
  --task-definition spotter-app-task:PREVIOUS_REVISION \
  --force-new-deployment \
  --region us-east-1
```

## Production Monitoring

### Key Metrics to Watch

```bash
# Monitor logs continuously
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app \
  --follow \
  --region us-east-1 \
  --filter-pattern "ERROR OR Webhook OR Auth:SignIn"

# Check service health
MSYS_NO_PATHCONV=1 aws ecs describe-services \
  --cluster SpotterCluster \
  --services spotter-app \
  --region us-east-1 \
  --query 'services[0].[runningCount,desiredCount,deployments]'
```

### Webhook Monitoring

Monitor webhook delivery in Stripe Dashboard:
- https://dashboard.stripe.com/test/webhooks (test mode)
- https://dashboard.stripe.com/webhooks (live mode)

Look for:
- Response times < 5 seconds
- Status codes: 200 (success)
- No timeout errors

## Quick Command Reference

```bash
# Build and deploy (full process)
docker build -t spotter-app .
docker tag spotter-app:latest 920013187591.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest
MSYS_NO_PATHCONV=1 aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 920013187591.dkr.ecr.us-east-1.amazonaws.com
docker push 920013187591.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest
MSYS_NO_PATHCONV=1 aws ecs update-service --cluster SpotterCluster --service spotter-app --force-new-deployment --region us-east-1

# Monitor
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --follow --region us-east-1

# Database operations
node scripts/list-all-users.mjs
node scripts/verify-single-user.mjs <email>
node scripts/delete-all-users.mjs --confirm

# Stripe verification
npx tsx scripts/test-stripe-connection.ts
npx tsx scripts/verify-stripe-prices.ts
npx tsx scripts/list-all-stripe-products.ts
```

## Related Documentation

- [STRIPE-SETUP.md](./STRIPE-SETUP.md) - Setting up Stripe products
- [STRIPE-LIVE-MODE-SETUP.md](./STRIPE-LIVE-MODE-SETUP.md) - Switching to live mode
- [MONITORING-GUIDE.md](./MONITORING-GUIDE.md) - Production monitoring
