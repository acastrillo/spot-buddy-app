# AWS SES Setup Guide

This guide will help you set up AWS Simple Email Service (SES) for sending signup alert emails.

## Quick Setup (5 steps, ~30 minutes)

### Step 1: Verify Email Addresses (5 minutes)

While in SES "sandbox mode", you can only send emails to verified addresses.

1. Go to [AWS SES Console](https://console.aws.amazon.com/ses/)
2. Click **Verified identities** in the left sidebar
3. Click **Create identity**
4. Select **Email address**
5. Enter your admin email (the one that will receive alerts)
6. Click **Create identity**
7. Check your email inbox and click the verification link
8. Repeat for the FROM address if different from admin email

**Result**: You can now send emails between verified addresses.

### Step 2: Request Production Access (5 minutes, 24hr approval)

To send emails to any address (not just verified ones), request production access:

1. In SES Console, click **Account dashboard** in left sidebar
2. Look for "Sending statistics" section
3. Click **Request production access** button
4. Fill out the form:
   - **Mail type**: Transactional
   - **Website URL**: Your app URL (e.g., https://kinexfit.com)
   - **Use case description**:
     ```
     We send transactional emails for our fitness app:
     - User signup notifications to administrators
     - Password reset emails (future)
     - Subscription confirmations (future)

     Expected volume: <100 emails per day initially
     ```
   - **Acknowledge compliance**: Check the boxes
5. Submit request

**Result**: Usually approved within 24 hours. You'll receive an email confirmation.

### Step 3: Configure Environment Variables (2 minutes)

Add to your `.env.local` file:

```bash
# Email Service
ADMIN_EMAIL=alejo@kinexfit.com
EMAIL_FROM=alejo@kinexfit.com  # Must be verified in SES
AWS_SES_REGION=us-east-1  # Or your preferred region
```

**Note**: The AWS SES SDK will automatically use your existing AWS credentials (from `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` env vars).

### Step 4: Verify Domain (Optional, Recommended for Production)

For better deliverability and to avoid "via amazonses.com" in email headers:

1. In SES Console, click **Verified identities**
2. Click **Create identity**
3. Select **Domain**
4. Enter your domain (e.g., `kinexfit.com`)
5. Enable **DKIM signing** (recommended)
6. Click **Create identity**
7. Copy the DNS records shown
8. Add these records to your domain's DNS settings (Route 53, Cloudflare, etc.)
9. Wait for verification (usually 5-30 minutes)

**Result**: You can send emails from any address at your domain (e.g., `notifications@kinexfit.com`).

### Step 5: Test Email Sending (5 minutes)

Test that everything works:

```bash
# Start your development server
npm run dev

# Create a test signup (visit your app)
# Or use the signup API directly:
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "firstName": "Test",
    "lastName": "User"
  }'

# Check your console logs for:
# [Email] ✓ Signup alert sent to a***n@e*****e.com for user t***t@e*****e.com (MessageId: ...)

# Check your ADMIN_EMAIL inbox for the signup alert
```

## Troubleshooting

### Error: "Email address is not verified"

**Problem**: Trying to send to/from an unverified email while in sandbox mode.

**Solution**:
1. Verify both `EMAIL_FROM` and `ADMIN_EMAIL` in SES Console
2. Or request production access (Step 2)

### Error: "Daily sending quota exceeded"

**Problem**: Hit the daily limit (starts at 200 emails/day in production).

**Solution**:
1. Wait 24 hours for reset
2. AWS automatically increases limits based on usage
3. Or request a limit increase in SES Console → Account dashboard

### Error: "Access Denied" or "User not authorized"

**Problem**: AWS credentials don't have SES permissions.

**Solution**: Add SES permissions to your IAM user/role:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

### Emails going to spam

**Solutions**:
1. Verify your domain (Step 4) and enable DKIM
2. Set up SPF record: `v=spf1 include:amazonses.com ~all`
3. Set up DMARC record
4. Request production access (sandbox emails have lower reputation)

## Cost Monitoring

Current costs (as of 2024):
- **First 62,000 emails/month**: FREE (when sending from EC2)
- **After that**: $0.10 per 1,000 emails ($0.0001 per email)

**Example costs**:
- 100 signups/day = 3,000/month = **$0.00** (free tier)
- 1,000 signups/day = 30,000/month = **$0.00** (free tier)
- 3,000 signups/day = 90,000/month = **$2.80** ($0.10 per 1k × 28k over free tier)

View your SES costs in AWS Cost Explorer → Filter by service "Amazon SES"

## Moving to Production Checklist

Before launching:

- [ ] Request production access (Step 2)
- [ ] Verify your domain (Step 4)
- [ ] Set up DKIM signing
- [ ] Add SPF record to DNS
- [ ] Test email deliverability (send test to Gmail, Outlook, etc.)
- [ ] Set up SNS notifications for bounces/complaints (optional)
- [ ] Monitor SES reputation dashboard
- [ ] Update `EMAIL_FROM` to use your verified domain

## Additional Resources

- [AWS SES Documentation](https://docs.aws.amazon.com/ses/)
- [SES Sending Limits](https://docs.aws.amazon.com/ses/latest/dg/manage-sending-quotas.html)
- [SES Best Practices](https://docs.aws.amazon.com/ses/latest/dg/best-practices.html)
- [Domain Verification](https://docs.aws.amazon.com/ses/latest/dg/verify-domain-procedure.html)

## Need Help?

If you run into issues:
1. Check CloudWatch Logs for detailed error messages
2. Review the SES sending statistics in the AWS Console
3. The email service includes helpful error messages in console logs
4. Feel free to ask for assistance!
