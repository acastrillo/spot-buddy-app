65# 🚀 Ready to Deploy - Phase 6 AI Features

**Status**: ✅ Code Complete | ⏳ Deployment Pending
**Date**: January 24, 2025

---

## What We Built (Steps 1-3 Complete! ✅)

### ✅ Step 1: Bedrock Infrastructure
- Complete AI client with cost tracking
- Streaming and non-streaming support
- Automatic error handling

### ✅ Step 2: Training Profile System
- Full CRUD API
- UI page at `/settings/training-profile`
- PR tracking with 1RM calculations
- Equipment and goals management

### ✅ Step 3: AI Workout Generator
- Natural language → full workout
- Personalized based on training profile
- Weight suggestions from PRs
- Exercise alternatives

### ✅ Bonus: Smart Workout Parser
- Enhance OCR/Instagram imports
- Standardize exercise names
- Add form cues and suggestions

---

## ⏭️ Step 4: Deploy to AWS (YOUR ACTION REQUIRED)

### Quick Deployment (15-20 minutes)

**1. Deploy Rate Limiting** (10 minutes)

```powershell
cd c:\spot-buddy-web

# Replace with YOUR actual Upstash credentials
.\scripts\deploy-rate-limiting.ps1 `
  -UpstashUrl "https://YOUR-REDIS.upstash.io" `
  -UpstashToken "YOUR_TOKEN_HERE"
```

**2. Add Bedrock Permissions** (5 minutes)

```powershell
# Get task role
$taskRole = aws ecs describe-task-definition `
  --task-definition spotter-app-task `
  --region us-east-1 `
  --query 'taskDefinition.taskRoleArn' `
  --output text

$roleName = $taskRole.Split('/')[-1]

# Create and attach Bedrock policy
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

aws iam put-role-policy `
  --role-name $roleName `
  --policy-name SpotterBedrockAccess `
  --policy-document file://bedrock-policy.json

Remove-Item "bedrock-policy.json"
```

**3. Verify Deployment** (5 minutes)

```powershell
# Wait for ECS deployment to complete
aws ecs describe-services `
  --cluster spotter-cluster `
  --services spotter-service `
  --region us-east-1 `
  --query 'services[0].deployments'

# Check logs
aws logs tail /ecs/spotter-app --region us-east-1 --since 5m
```

---

## 🧪 Test in Production

### Test Rate Limiting

```powershell
# Should succeed and show rate limit headers
curl -X POST https://spotter.cannashieldct.com/api/workouts `
  -H "Cookie: your-session-cookie" `
  -H "Content-Type: application/json" `
  -d '{"title":"Test","exercises":[]}' `
  -v
```

Look for headers:
- `X-RateLimit-Limit: 50`
- `X-RateLimit-Remaining: 49`

### Test AI Enhancement

```powershell
$body = @{
  rawText = "Bench press 3x8 @ 185 lbs, Incline dumbbell press 4x12"
} | ConvertTo-Json

curl -X POST https://spotter.cannashieldct.com/api/ai/enhance-workout `
  -H "Cookie: your-session-cookie" `
  -H "Content-Type: application/json" `
  -d $body
```

Expected response:
```json
{
  "success": true,
  "enhancedWorkout": {
    "title": "Upper Body Push Workout",
    "exercises": [...]
  },
  "changes": ["Standardized exercise names", "Added form cues"],
  "suggestions": ["Consider warm-up sets"],
  "cost": { "estimatedCost": 0.0123 }
}
```

### Test Training Profile

```powershell
# Get profile (should return default if new)
curl https://spotter.cannashieldct.com/api/user/profile `
  -H "Cookie: your-session-cookie"

# Add a PR
$prBody = @{
  exercise = "Bench press"
  pr = @{
    weight = 225
    reps = 5
    unit = "lbs"
  }
} | ConvertTo-Json

curl -X POST https://spotter.cannashieldct.com/api/user/profile/pr `
  -H "Cookie: your-session-cookie" `
  -H "Content-Type: application/json" `
  -d $prBody
```

---

## 💰 Cost Monitoring

### After deployment, check costs daily for first week:

**Upstash Redis**:
```
https://console.upstash.com → Your Database → Metrics
```
- Commands/day should be <10,000 (free tier)
- Alert if approaching 8,000/day

**AWS Bedrock**:
```
AWS Console → Bedrock → Monitoring → Invocations
```
- Cost per request: ~$0.01-0.02
- Daily budget: ~$5-10 for testing
- Alert if daily cost >$10

**CloudWatch Logs**:
```powershell
# Search for Bedrock usage logs
aws logs filter-log-events `
  --log-group-name /ecs/spotter-app `
  --filter-pattern "[Bedrock Usage]" `
  --region us-east-1
```

---

## 📊 Success Metrics

After 24 hours, you should see:

### Technical Metrics
- ✅ ECS tasks running (2/2 desired)
- ✅ Zero errors in CloudWatch logs
- ✅ Upstash showing ~100-500 commands/day
- ✅ Bedrock invocations < 100/day (testing phase)

### Business Metrics
- 🎯 AI enhancements: Track usage by tier
- 🎯 User satisfaction: Enhanced workouts saved
- 🎯 Cost per user: <$0.10 for Starter, <$1.00 for Pro
- 🎯 Profit margin: >80% maintained

---

## 🆘 Troubleshooting

### "UPSTASH_REDIS_REST_URL is not defined"
1. Check Parameter Store: `aws ssm get-parameters --names "/spotter/prod/UPSTASH_REDIS_REST_URL" --with-decryption --region us-east-1`
2. Verify IAM role has SSM read permissions
3. Force new ECS deployment

### "AccessDeniedException" from Bedrock
1. Verify IAM role: `aws iam get-role-policy --role-name YOUR_TASK_ROLE --policy-name SpotterBedrockAccess`
2. Check region matches (us-east-1)
3. Verify model ID is correct

### All requests return 429
1. Redis is working but limits too aggressive
2. Flush Redis: `curl -H "Authorization: Bearer YOUR_TOKEN" https://YOUR_URL/flushdb`
3. Adjust limits in `src/lib/rate-limit.ts` if needed

---

## 📝 Deployment Checklist

### Before Deployment
- [x] All code changes committed to git
- [x] TypeScript compilation passes
- [x] Dev server runs without errors
- [x] Documentation complete

### During Deployment
- [ ] Upstash credentials added to Parameter Store
- [ ] IAM execution role has SSM permissions
- [ ] New ECS task definition registered
- [ ] Service updated with new task definition
- [ ] Bedrock permissions added to task role

### After Deployment
- [ ] ECS service shows 2/2 tasks running
- [ ] CloudWatch logs show no errors
- [ ] Rate limiting works (test 51st request)
- [ ] AI enhancement returns valid results
- [ ] Training Profile CRUD operations work
- [ ] Costs tracked in Upstash/Bedrock dashboards

---

## 🎉 What's Working Now

After deployment, users can:

1. **Set up Training Profile**
   - Go to `/settings/training-profile`
   - Enter PRs for exercises
   - Select equipment and goals
   - Save preferences

2. **Get AI-Enhanced Workouts** (API ready, UI integration pending)
   - Import workout via OCR/Instagram
   - Call `/api/ai/enhance-workout` with raw text
   - Receive structured, enhanced workout
   - Get form cues and suggestions

3. **Generate Custom Workouts** (API ready, UI pending)
   - Natural language input
   - AI creates complete workout
   - Based on training profile
   - Includes warm-up/cool-down

---

## 🔜 What's Next (Optional)

These are nice-to-haves, not blockers:

1. **Workout of the Day** (Step 4 from original plan)
   - 4-6 hours to implement
   - Daily workout suggestions
   - Can wait for v1.6

2. **Frontend Integration**
   - Add "Enhance with AI" buttons to OCR/Instagram flows
   - Create workout generator page at `/add/generate`
   - 3-4 hours total

3. **Prompt Optimization**
   - Tune based on user feedback
   - Add prompt caching for 90% cost savings
   - Ongoing improvement

---

## 📚 Full Documentation

- [PHASE-6-SESSION-COMPLETE.md](PHASE-6-SESSION-COMPLETE.md) - Complete session summary
- [DEPLOYMENT-CHECKLIST.md](DEPLOYMENT-CHECKLIST.md) - Detailed deployment workflow
- [DEPLOY-RATE-LIMITING.md](DEPLOY-RATE-LIMITING.md) - Rate limiting guide
- [PHASE-6-PROGRESS.md](PHASE-6-PROGRESS.md) - Technical implementation details

---

## 🚦 Deployment Status

**Current**: Local development complete, production deployment pending

**Your Action Required**:
1. Run rate limiting deployment script (10 min)
2. Add Bedrock IAM permissions (5 min)
3. Verify deployment (5 min)

**Total Time**: ~20 minutes

**After That**: All Phase 6 features are LIVE! 🎉

---

**Ready to deploy? Run the commands above!**
