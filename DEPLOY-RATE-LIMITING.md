# Deploy Rate Limiting to Production

This guide walks through deploying the rate limiting system to production by adding Upstash Redis credentials to AWS Parameter Store and updating the ECS task definition.

## Prerequisites

- ✅ Upstash Redis database created (completed)
- ✅ Rate limiting code implemented and tested locally (99-100% success)
- ✅ AWS CLI configured with credentials
- 📋 Your Upstash credentials ready:
  - `UPSTASH_REDIS_REST_URL` (e.g., https://your-redis.upstash.io)
  - `UPSTASH_REDIS_REST_TOKEN` (your token)

## Step 1: Add Credentials to AWS Parameter Store

We'll store the Upstash credentials as **SecureString** parameters in AWS Systems Manager Parameter Store.

### Option A: Using AWS CLI (Recommended)

```powershell
# 1. Add UPSTASH_REDIS_REST_URL
aws ssm put-parameter `
  --name "/spotter/prod/UPSTASH_REDIS_REST_URL" `
  --value "YOUR_UPSTASH_URL_HERE" `
  --type "SecureString" `
  --description "Upstash Redis REST URL for rate limiting" `
  --region us-east-1

# 2. Add UPSTASH_REDIS_REST_TOKEN
aws ssm put-parameter `
  --name "/spotter/prod/UPSTASH_REDIS_REST_TOKEN" `
  --value "YOUR_UPSTASH_TOKEN_HERE" `
  --type "SecureString" `
  --description "Upstash Redis REST token for rate limiting" `
  --region us-east-1
```

**Verify parameters were created:**
```powershell
aws ssm get-parameters `
  --names "/spotter/prod/UPSTASH_REDIS_REST_URL" "/spotter/prod/UPSTASH_REDIS_REST_TOKEN" `
  --with-decryption `
  --region us-east-1
```

### Option B: Using AWS Console

1. Go to AWS Systems Manager → Parameter Store
2. Click **Create parameter**
3. For the URL:
   - Name: `/spotter/prod/UPSTASH_REDIS_REST_URL`
   - Type: `SecureString`
   - Value: Your Upstash URL
4. Repeat for the token:
   - Name: `/spotter/prod/UPSTASH_REDIS_REST_TOKEN`
   - Type: `SecureString`
   - Value: Your Upstash token

## Step 2: Update ECS Task Definition

You have two options for updating the task definition:

### Option A: Update via AWS Console

1. Go to ECS → Task Definitions → `spotter-app-task`
2. Click **Create new revision**
3. Scroll to **Environment variables** section
4. Add two new environment variables:
   - Name: `UPSTASH_REDIS_REST_URL`
     - Value type: `ValueFrom`
     - Value: `arn:aws:ssm:us-east-1:YOUR_ACCOUNT_ID:parameter/spotter/prod/UPSTASH_REDIS_REST_URL`
   - Name: `UPSTASH_REDIS_REST_TOKEN`
     - Value type: `ValueFrom`
     - Value: `arn:aws:ssm:us-east-1:YOUR_ACCOUNT_ID:parameter/spotter/prod/UPSTASH_REDIS_REST_TOKEN`
5. Click **Create**

### Option B: Update via AWS CLI (Faster)

First, get your current task definition:

```powershell
# 1. Get current task definition
aws ecs describe-task-definition `
  --task-definition spotter-app-task `
  --region us-east-1 `
  --query 'taskDefinition' > task-definition.json

# 2. Edit task-definition.json to add the new environment variables
# (See example below)

# 3. Register new task definition
aws ecs register-task-definition `
  --cli-input-json file://task-definition.json `
  --region us-east-1
```

**Add these to the `environment` array in your task definition JSON:**

```json
{
  "name": "UPSTASH_REDIS_REST_URL",
  "valueFrom": "arn:aws:ssm:us-east-1:YOUR_ACCOUNT_ID:parameter/spotter/prod/UPSTASH_REDIS_REST_URL"
},
{
  "name": "UPSTASH_REDIS_REST_TOKEN",
  "valueFrom": "arn:aws:ssm:us-east-1:YOUR_ACCOUNT_ID:parameter/spotter/prod/UPSTASH_REDIS_REST_TOKEN"
}
```

## Step 3: Update IAM Role Permissions

The ECS task execution role needs permission to read from Parameter Store.

**Get your task execution role:**
```powershell
aws ecs describe-task-definition `
  --task-definition spotter-app-task `
  --region us-east-1 `
  --query 'taskDefinition.executionRoleArn'
```

**Add SSM read permissions:**

```powershell
# Create a policy document (save as ssm-policy.json)
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameters",
        "ssm:GetParameter"
      ],
      "Resource": [
        "arn:aws:ssm:us-east-1:*:parameter/spotter/prod/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt"
      ],
      "Resource": "arn:aws:kms:us-east-1:*:key/*"
    }
  ]
}

# Attach the policy to your execution role
aws iam put-role-policy `
  --role-name ecsTaskExecutionRole `
  --policy-name SpotterSSMAccess `
  --policy-document file://ssm-policy.json
```

## Step 4: Deploy to ECS

### Option A: Update Service (Recommended)

```powershell
# Force new deployment with latest task definition
aws ecs update-service `
  --cluster spotter-cluster `
  --service spotter-service `
  --task-definition spotter-app-task `
  --force-new-deployment `
  --region us-east-1
```

### Option B: Full Redeploy

If you prefer to rebuild and redeploy the Docker image:

```powershell
# Use your existing deployment script
.\deploy-to-aws.ps1
```

## Step 5: Verify Deployment

### 5.1 Check ECS Service Status

```powershell
# Monitor deployment progress
aws ecs describe-services `
  --cluster spotter-cluster `
  --services spotter-service `
  --region us-east-1 `
  --query 'services[0].deployments'
```

Wait until the new deployment shows `runningCount` equal to `desiredCount`.

### 5.2 Check Logs

```powershell
# Tail CloudWatch logs (adjust time window as needed)
aws logs tail /ecs/spotter-app --region us-east-1 --since 15m --format short
```

Look for:
- ✅ No errors about missing UPSTASH variables
- ✅ App starts successfully
- ✅ Rate limiting initialization messages (if any)

### 5.3 Test Rate Limiting in Production

**Test 1: Single Request (should succeed)**
```powershell
curl -X POST https://spotter.cannashieldct.com/api/workouts `
  -H "Cookie: your-session-cookie" `
  -H "Content-Type: application/json" `
  -d '{"title":"Test","exercises":[]}'
```

Expected:
- Status: 200 or 201
- Headers include: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

**Test 2: Rapid Requests (should hit rate limit)**

Modify the test script to point to production:
```javascript
// In scripts/test-rate-limits.mjs
const BASE_URL = 'https://spotter.cannashieldct.com';
```

Then run:
```powershell
node scripts/test-rate-limits.mjs
```

Expected:
- Most requests succeed
- 51st POST request returns 429 status
- Rate limit headers present on all responses

## Step 6: Monitor Production

### CloudWatch Metrics

Monitor these metrics in CloudWatch:
- **API Response Times**: Should not increase significantly
- **Error Rate**: Should remain stable
- **429 Responses**: Track rate limit hits

### Upstash Dashboard

1. Go to https://console.upstash.com
2. Select your Redis database
3. Monitor:
   - **Commands/sec**: Should show activity when rate limits are checked
   - **Used Storage**: Should be minimal (rate limit data is lightweight)
   - **Latency**: Should be <100ms

## Troubleshooting

### Issue: "UPSTASH_REDIS_REST_URL is not defined"

**Cause**: Environment variables not available to the container

**Fix**:
1. Verify parameters exist in Parameter Store
2. Verify IAM role has SSM read permissions
3. Verify task definition references correct parameter ARNs
4. Redeploy the service

### Issue: Rate limiting not working (all requests succeed)

**Cause**: Redis connection failing, system fails open

**Fix**:
1. Check CloudWatch logs for Redis connection errors
2. Verify Upstash credentials are correct
3. Test Redis connection manually:
   ```powershell
   curl -H "Authorization: Bearer YOUR_TOKEN" https://YOUR_URL/ping
   ```

### Issue: All requests getting 429 errors

**Cause**: Rate limits too aggressive or Redis caching issue

**Fix**:
1. Check current limits in `src/lib/rate-limit.ts`
2. Verify user ID extraction is working correctly
3. Flush Redis keys if needed:
   ```powershell
   curl -H "Authorization: Bearer YOUR_TOKEN" https://YOUR_URL/flushdb
   ```

## Rollback Plan

If rate limiting causes issues in production:

1. **Quick Fix**: Set environment variables to empty strings (fails open)
   ```powershell
   aws ecs update-service `
     --cluster spotter-cluster `
     --service spotter-service `
     --task-definition spotter-app-task:PREVIOUS_REVISION `
     --force-new-deployment `
     --region us-east-1
   ```

2. **Complete Rollback**: Revert to previous task definition
   ```powershell
   # Find previous revision
   aws ecs list-task-definitions --family-prefix spotter-app-task

   # Update to previous revision
   aws ecs update-service `
     --cluster spotter-cluster `
     --service spotter-service `
     --task-definition spotter-app-task:PREVIOUS_REVISION `
     --region us-east-1
   ```

## Success Criteria

Rate limiting is successfully deployed when:

- ✅ ECS tasks start without errors
- ✅ CloudWatch logs show no Redis connection errors
- ✅ API responses include rate limit headers
- ✅ 51st POST request within 1 minute returns 429
- ✅ Normal user behavior is not affected
- ✅ Upstash dashboard shows activity

## Cost Implications

**Upstash Redis Costs:**
- Free tier: 10,000 commands/day (sufficient for ~100 users)
- Pay-as-you-go: $0.20 per 100K commands
- Estimated cost: ~$2-5/month for 1,000 active users

**AWS Costs:**
- Parameter Store: Free (under 10,000 parameters)
- Additional API calls: Negligible (<$0.01/month)

## Next Steps After Deployment

1. Monitor for 24-48 hours to ensure stability
2. Consider tier-based rate limits (different limits for Free vs Pro users)
3. Add rate limiting analytics dashboard
4. Set up CloudWatch alarms for excessive 429 responses

---

**Deployment Date**: _________________
**Deployed By**: _________________
**Production Verification**: ☐ Passed ☐ Failed
