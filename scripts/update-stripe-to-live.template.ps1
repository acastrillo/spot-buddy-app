# Update Stripe keys to LIVE mode in AWS SSM
#
# INSTRUCTIONS:
# 1. Copy this file to update-stripe-to-live.ps1
# 2. Replace the placeholder values below with your actual LIVE Stripe keys
# 3. Run the script to update AWS SSM parameters
# 4. DO NOT commit the file with actual keys - it's in .gitignore

# IMPORTANT: Replace these with your ACTUAL LIVE Stripe keys from https://dashboard.stripe.com/apikeys
$STRIPE_SECRET_KEY = "sk_live_YOUR_SECRET_KEY_HERE"
$STRIPE_PUBLISHABLE_KEY = "pk_live_YOUR_PUBLISHABLE_KEY_HERE"
$STRIPE_WEBHOOK_SECRET = "whsec_YOUR_WEBHOOK_SECRET_HERE"

# Price IDs for LIVE mode (get these from your Stripe Products page)
$STRIPE_PRICE_CORE = "price_YOUR_CORE_PRICE_ID"
$STRIPE_PRICE_PRO = "price_YOUR_PRO_PRICE_ID"
$STRIPE_PRICE_ELITE = "price_YOUR_ELITE_PRICE_ID"

Write-Host "Updating Stripe keys to LIVE mode..." -ForegroundColor Cyan

# Update Stripe keys
aws ssm put-parameter --name "/spotter-app/STRIPE_SECRET_KEY" --value $STRIPE_SECRET_KEY --type "SecureString" --overwrite --region us-east-1
aws ssm put-parameter --name "/spotter-app/STRIPE_PUBLISHABLE_KEY" --value $STRIPE_PUBLISHABLE_KEY --type "String" --overwrite --region us-east-1
aws ssm put-parameter --name "/spotter-app/STRIPE_WEBHOOK_SECRET" --value $STRIPE_WEBHOOK_SECRET --type "SecureString" --overwrite --region us-east-1

# Update price IDs
aws ssm put-parameter --name "/spotter-app/STRIPE_PRICE_CORE" --value $STRIPE_PRICE_CORE --type "String" --overwrite --region us-east-1
aws ssm put-parameter --name "/spotter-app/STRIPE_PRICE_PRO" --value $STRIPE_PRICE_PRO --type "String" --overwrite --region us-east-1
aws ssm put-parameter --name "/spotter-app/STRIPE_PRICE_ELITE" --value $STRIPE_PRICE_ELITE --type "String" --overwrite --region us-east-1

# Update public price IDs (for client-side)
aws ssm put-parameter --name "/spotter-app/NEXT_PUBLIC_STRIPE_PRICE_CORE" --value $STRIPE_PRICE_CORE --type "String" --overwrite --region us-east-1
aws ssm put-parameter --name "/spotter-app/NEXT_PUBLIC_STRIPE_PRICE_PRO" --value $STRIPE_PRICE_PRO --type "String" --overwrite --region us-east-1
aws ssm put-parameter --name "/spotter-app/NEXT_PUBLIC_STRIPE_PRICE_ELITE" --value $STRIPE_PRICE_ELITE --type "String" --overwrite --region us-east-1

Write-Host "`nStripe keys updated to LIVE mode!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Configure webhook in Stripe Dashboard: https://dashboard.stripe.com/webhooks" -ForegroundColor White
Write-Host "   - Endpoint URL: https://spotter.cannashieldct.com/api/stripe/webhook" -ForegroundColor White
Write-Host "   - Events: checkout.session.completed, customer.subscription.*, invoice.payment_*" -ForegroundColor White
Write-Host "2. Copy the webhook signing secret and update STRIPE_WEBHOOK_SECRET above" -ForegroundColor White
Write-Host "3. Restart ECS service:" -ForegroundColor White
Write-Host "   aws ecs update-service --cluster SpotterCluster --service spotter-app --force-new-deployment --region us-east-1" -ForegroundColor White
