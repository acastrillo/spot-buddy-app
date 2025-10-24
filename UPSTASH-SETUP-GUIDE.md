# Upstash Redis Setup Guide

**Purpose**: Set up rate limiting for Spot Buddy API routes
**Time Required**: 5-10 minutes
**Cost**: Free tier available (10,000 requests/day)

---

## Step 1: Create Upstash Account

1. Go to https://upstash.com/
2. Click "Sign Up" or "Get Started"
3. Sign up with GitHub, Google, or email
4. Verify your email if required

---

## Step 2: Create Redis Database

1. Once logged in, click "Create Database"
2. Configure your database:
   - **Name**: `spot-buddy-rate-limit` (or any name you prefer)
   - **Type**: Choose "Regional" (faster, cheaper)
   - **Region**: Choose closest to your app (e.g., `us-east-1` if using AWS US East)
   - **TLS**: Enable (recommended for security)
   - **Eviction**: No eviction (we want rate limit data to persist)

3. Click "Create"

---

## Step 3: Get REST API Credentials

After creating the database, you'll see the database dashboard.

1. Scroll to the **REST API** section
2. You'll see two important values:
   - **UPSTASH_REDIS_REST_URL**: Something like `https://us1-caring-fox-12345.upstash.io`
   - **UPSTASH_REDIS_REST_TOKEN**: Long alphanumeric string

3. Click the "Copy" buttons next to each value

---

## Step 4: Add to Local Environment

1. Open your `.env.local` file in the root of the project
   - If it doesn't exist, copy `.env.example` to `.env.local`

2. Add these lines (replace with your actual values):
   ```bash
   # Rate Limiting (Upstash Redis)
   UPSTASH_REDIS_REST_URL=https://us1-caring-fox-12345.upstash.io
   UPSTASH_REDIS_REST_TOKEN=AX8gASQgOTk5...your-long-token...
   ```

3. Save the file

**IMPORTANT**: Never commit `.env.local` to git! It's already in `.gitignore`.

---

## Step 5: Verify Configuration

Run this command to check if the environment variables are set:

```bash
# Windows PowerShell
Get-Content .env.local | Select-String "UPSTASH"

# Output should show:
# UPSTASH_REDIS_REST_URL=https://...
# UPSTASH_REDIS_REST_TOKEN=AX8g...
```

---

## Step 6: Test Locally

1. Restart your dev server if it's running:
   ```bash
   # Stop with Ctrl+C, then restart
   npm run dev
   ```

2. The rate limiting system will now be active!

---

## Step 7: Add to Production Environment

Once local testing works, add the same variables to your production environment:

### For AWS ECS (your current setup):

1. Go to AWS Systems Manager → Parameter Store
2. Create two new parameters:
   - **Name**: `/spotter/UPSTASH_REDIS_REST_URL`
   - **Type**: String
   - **Value**: Your Upstash URL

   - **Name**: `/spotter/UPSTASH_REDIS_REST_TOKEN`
   - **Type**: SecureString (encrypted)
   - **Value**: Your Upstash token

3. Update your ECS task definition to include these environment variables
4. Redeploy your service

### Alternative: Use AWS Secrets Manager

Store both values in a single secret named `spotter/upstash-redis` with this JSON:
```json
{
  "UPSTASH_REDIS_REST_URL": "https://us1-caring-fox-12345.upstash.io",
  "UPSTASH_REDIS_REST_TOKEN": "AX8g..."
}
```

---

## Step 8: Monitor Usage

1. Go to your Upstash dashboard
2. Click on your `spot-buddy-rate-limit` database
3. View the **Metrics** tab to see:
   - Total requests
   - Daily/hourly usage
   - Command breakdown
   - Latency

**Free Tier Limits**:
- 10,000 requests per day
- 256 MB storage
- Multiple regions available

**Upgrade if needed**: If you exceed free tier, upgrade to Pro for $0.20 per 100,000 requests.

---

## Troubleshooting

### Error: "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set"

**Solution**:
1. Check `.env.local` exists and contains the variables
2. Restart your dev server (`npm run dev`)
3. Verify no typos in variable names

### Error: "Failed to connect to Upstash"

**Solution**:
1. Check your internet connection
2. Verify the URL and token are correct
3. Check Upstash dashboard - is the database active?
4. Try creating a new database

### Rate limiting not working

**Solution**:
1. Check browser console for errors
2. Check server logs for Redis connection errors
3. Verify the rate limit is being called in the API route
4. Try making multiple requests (e.g., 11 OCR requests)

---

## Testing Rate Limits

### Test OCR endpoint (10 requests per hour):

1. Open your browser DevTools (F12)
2. Go to Network tab
3. Navigate to a page that calls `/api/ocr`
4. Make 11 requests in quick succession
5. The 11th request should return `429 Too Many Requests`
6. Check response headers:
   ```
   X-RateLimit-Limit: 10
   X-RateLimit-Remaining: 0
   X-RateLimit-Reset: 1234567890
   ```

### Test Instagram endpoint (20 requests per hour):

Same process, but you'll need to make 21 requests to hit the limit.

---

## Cost Estimation

**Free Tier**: 10,000 requests/day = 300,000 requests/month (FREE)

**Estimated Usage** (for Spot Buddy):
- 100 active users
- 50 API requests per user per day
- = 5,000 requests/day
- **Well within free tier!**

**If you exceed free tier**:
- $0.20 per 100,000 requests
- 500,000 requests/month = $1/month
- 1,000,000 requests/month = $2/month

Very affordable!

---

## Security Best Practices

1. ✅ **Never commit credentials** - Already in `.gitignore`
2. ✅ **Use SecureString in AWS** - Encrypt tokens in Parameter Store
3. ✅ **Rotate tokens periodically** - Create new database, update credentials
4. ✅ **Monitor usage** - Set up alerts for unusual spikes
5. ✅ **Use TLS** - Always enable TLS for Redis connections

---

## Next Steps

Once Upstash is configured:
1. ✅ Test rate limiting locally (see testing section above)
2. ✅ Apply rate limiting to remaining routes (workouts, upload, AI)
3. ✅ Deploy to staging/production
4. ✅ Monitor usage in Upstash dashboard

---

## Support

- **Upstash Docs**: https://docs.upstash.com/redis
- **Upstash Discord**: https://discord.gg/upstash
- **Rate Limit Library**: https://github.com/upstash/ratelimit

---

**Ready to proceed?** Once you've completed Steps 1-4 and added the credentials to `.env.local`, let me know and we'll test the rate limiting!
