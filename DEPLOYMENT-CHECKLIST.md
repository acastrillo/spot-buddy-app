# Production Deployment Checklist

## Phase 1: Rate Limiting Deployment

### Prerequisites ✅

Before deploying rate limiting, ensure you have:

1. **Upstash Redis Account**
   - ✅ Account created at https://upstash.com
   - ✅ Redis database created
   - ✅ REST URL copied (format: `https://your-redis.upstash.io`)
   - ✅ REST Token copied (long alphanumeric string)

2. **AWS CLI Configured**
   - ✅ AWS credentials configured (`aws configure`)
   - ✅ Access to your AWS account
   - ✅ Permissions for: SSM Parameter Store, ECS, IAM

### Deployment Steps

**Option A: Automated Deployment (Recommended)**

Run the PowerShell deployment script:

```powershell
cd c:\spot-buddy-web

# Replace with your actual Upstash credentials
.\scripts\deploy-rate-limiting.ps1 `
  -UpstashUrl "https://YOUR-REDIS.upstash.io" `
  -UpstashToken "YOUR_TOKEN_HERE"
```

The script will:
1. ✅ Add credentials to AWS Parameter Store (SecureString)
2. ✅ Update IAM role permissions
3. ✅ Register new ECS task definition
4. ✅ Deploy to ECS with monitoring
5. ✅ Wait for deployment completion (~3 minutes)

**Option B: Manual Deployment**

Follow the step-by-step guide in [DEPLOY-RATE-LIMITING.md](DEPLOY-RATE-LIMITING.md).

---

## Phase 2: Bedrock IAM Permissions

After rate limiting is deployed, add Bedrock permissions for AI features.

### Add Bedrock Policy to ECS Task Role

```powershell
# 1. Get your ECS task role name
$taskRole = aws ecs describe-task-definition `
  --task-definition spotter-app-task `
  --region us-east-1 `
  --query 'taskDefinition.taskRoleArn' `
  --output text

$roleName = $taskRole.Split('/')[-1]
Write-Host "Task Role: $roleName"

# 2. Create Bedrock policy file
@"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-sonnet-4-5-*"
    }
  ]
}
"@ | Out-File -FilePath "bedrock-policy.json" -Encoding utf8

# 3. Attach policy to role
aws iam put-role-policy `
  --role-name $roleName `
  --policy-name SpotterBedrockAccess `
  --policy-document file://bedrock-policy.json

Write-Host "✅ Bedrock permissions added"

# 4. Clean up
Remove-Item "bedrock-policy.json"
```

---

## Phase 3: Verify Deployment

### 1. Check ECS Service Status

```powershell
# Monitor deployment
aws ecs describe-services `
  --cluster spotter-cluster `
  --services spotter-service `
  --region us-east-1 `
  --query 'services[0].deployments'
```

Wait until `runningCount` equals `desiredCount`.

### 2. Check CloudWatch Logs

```powershell
# Tail logs (last 15 minutes)
aws logs tail /ecs/spotter-app --region us-east-1 --since 15m --format short
```

Look for:
- ✅ No errors about missing environment variables
- ✅ App starts successfully
- ✅ No Redis connection errors

### 3. Test Rate Limiting

**Option A: Using Production URL**

```powershell
# Test single request (should succeed)
curl -X POST https://spotter.cannashieldct.com/api/workouts `
  -H "Cookie: your-session-cookie" `
  -H "Content-Type: application/json" `
  -d '{"title":"Test Workout","exercises":[]}'
```

Check response headers:
- `X-RateLimit-Limit: 50`
- `X-RateLimit-Remaining: 49`
- `X-RateLimit-Reset: <timestamp>`

**Option B: Using Test Script**

Modify `scripts/test-rate-limits.mjs` to use production URL:

```javascript
const BASE_URL = 'https://spotter.cannashieldct.com';
```

Then run:
```powershell
node scripts/test-rate-limits.mjs
```

### 4. Monitor Upstash Dashboard

1. Go to https://console.upstash.com
2. Select your Redis database
3. Check metrics:
   - **Commands/sec**: Should show activity
   - **Used Storage**: Should be minimal (<1 MB)
   - **Latency**: Should be <100ms

---

## Phase 4: Test AI Features (After Step 2 Complete)

### 1. Test Smart Workout Parser

```powershell
# Test with raw text (OCR/Instagram import scenario)
$body = @{
  rawText = @"
Bench press 3x8 @ 185
Incline DB press 4x12
Cable flies 3x15
Dips 3xAMRAP
"@
} | ConvertTo-Json

curl -X POST https://spotter.cannashieldct.com/api/ai/enhance-workout `
  -H "Cookie: your-session-cookie" `
  -H "Content-Type: application/json" `
  -d $body
```

Expected response:
- Status: 200
- `success: true`
- `enhancedWorkout` with structured data
- `changes` array with standardizations
- `suggestions` array with recommendations
- `cost` object with token counts

### 2. Test with Existing Workout

```powershell
# Get a workout ID first
$workouts = curl https://spotter.cannashieldct.com/api/workouts `
  -H "Cookie: your-session-cookie"

# Use first workout ID
$workoutId = "workout_123..."

$body = @{
  workoutId = $workoutId
} | ConvertTo-Json

curl -X POST https://spotter.cannashieldct.com/api/ai/enhance-workout `
  -H "Cookie: your-session-cookie" `
  -H "Content-Type: application/json" `
  -d $body
```

### 3. Monitor AI Costs

Check CloudWatch logs for Bedrock usage:

```powershell
aws logs filter-log-events `
  --log-group-name /ecs/spotter-app `
  --region us-east-1 `
  --filter-pattern "[Bedrock Usage]" `
  --start-time (Get-Date).AddHours(-1).ToUniversalTime().Subtract([datetime]'1970-01-01').TotalMilliseconds
```

Look for cost tracking logs:
```
[Bedrock Usage] {
  operation: 'workout-enhancement',
  userId: 'user_123',
  inputTokens: 523,
  outputTokens: 1247,
  cost: '0.020163'
}
```

---

## Rollback Plan

### If Rate Limiting Causes Issues

**Quick Fix**: Revert to previous task definition

```powershell
# List task definitions
aws ecs list-task-definitions --family-prefix spotter-app-task --region us-east-1

# Update to previous revision (e.g., revision 10)
aws ecs update-service `
  --cluster spotter-cluster `
  --service spotter-service `
  --task-definition spotter-app-task:10 `
  --region us-east-1
```

### If AI Features Cause Issues

**Option 1**: AI features fail gracefully (catch all errors, return 500)

**Option 2**: Remove Bedrock permissions temporarily:

```powershell
# Get role name (from Phase 2)
$roleName = "spotter-task-role"

# Remove Bedrock policy
aws iam delete-role-policy `
  --role-name $roleName `
  --policy-name SpotterBedrockAccess
```

---

## Success Criteria

### Rate Limiting ✅
- [ ] ECS tasks start without errors
- [ ] CloudWatch logs show no Redis errors
- [ ] API responses include rate limit headers
- [ ] 51st POST request returns 429
- [ ] Upstash dashboard shows activity
- [ ] Normal user behavior unaffected

### AI Features ✅
- [ ] Bedrock permissions configured
- [ ] AI enhancement API returns 200
- [ ] Enhanced workouts are structured correctly
- [ ] Changes and suggestions are relevant
- [ ] Cost tracking logs appear in CloudWatch
- [ ] User quota tracking works correctly
- [ ] Rate limiting (30/hour) blocks excessive requests

---

## Cost Monitoring

### Daily Checks (First Week)

1. **Upstash Costs**
   - Check Upstash dashboard → Billing
   - Expected: <10,000 commands/day (free tier)
   - Alert if >8,000 commands/day

2. **Bedrock Costs**
   - AWS Console → Bedrock → Monitoring
   - Expected: ~$0.01-0.02 per request
   - Alert if daily cost >$10

3. **User Quota Usage**
   - Query DynamoDB for `aiRequestsUsed` field
   - Verify quota reset logic works monthly

---

## Troubleshooting

### Issue: "UPSTASH_REDIS_REST_URL is not defined"

**Cause**: Environment variables not loaded

**Fix**:
1. Verify parameters exist in Parameter Store
2. Check IAM execution role has SSM permissions
3. Verify task definition references correct ARNs
4. Force new deployment

### Issue: All requests return 429

**Cause**: Rate limits too aggressive or Redis cache issue

**Fix**:
1. Check current limits in `src/lib/rate-limit.ts`
2. Flush Redis if needed:
   ```powershell
   curl -H "Authorization: Bearer YOUR_TOKEN" https://YOUR_URL/flushdb
   ```

### Issue: "AccessDeniedException" from Bedrock

**Cause**: IAM role missing Bedrock permissions

**Fix**: Re-run Phase 2 IAM permissions script

### Issue: AI responses are low quality

**Cause**: System prompt needs tuning

**Fix**: Edit `src/lib/ai/workout-enhancer.ts` → `buildEnhancementSystemPrompt()`

---

## Next Steps After Deployment

1. Monitor for 24-48 hours
2. Gather user feedback on AI enhancements
3. Tune system prompts based on feedback
4. Complete remaining Phase 6 features:
   - Training Profile
   - AI Workout Generator
   - Workout of the Day
5. Consider tier-based rate limits (different for Free vs Pro)

---

**Deployment Date**: _________________
**Deployed By**: _________________
**Status**: ☐ Success ☐ Partial ☐ Rollback Required
