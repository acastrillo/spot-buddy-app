#!/bin/bash
# Update AWS SSM Parameters for Stripe
# Run this after you've created products in Stripe and updated .env.local

set -e

echo "=================================================="
echo "🔧 UPDATING AWS SSM PARAMETERS FOR STRIPE"
echo "=================================================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found!"
    exit 1
fi

# Load environment variables from .env.local
source <(grep -v '^#' .env.local | sed 's/\r$//' | awk '/=/ {print "export " $0}')

# Verify required variables
if [ -z "$STRIPE_SECRET_KEY" ] || [ -z "$STRIPE_PUBLISHABLE_KEY" ] || [ -z "$STRIPE_WEBHOOK_SECRET" ]; then
    echo "❌ Error: Missing required Stripe keys in .env.local"
    exit 1
fi

if [ -z "$STRIPE_PRICE_CORE" ] || [ -z "$STRIPE_PRICE_PRO" ] || [ -z "$STRIPE_PRICE_ELITE" ]; then
    echo "❌ Error: Missing Stripe price IDs in .env.local"
    echo "   Make sure you've created products in Stripe and copied the price IDs!"
    exit 1
fi

# Check if price IDs look correct (should start with price_)
if [[ ! "$STRIPE_PRICE_CORE" =~ ^price_ ]] || [[ ! "$STRIPE_PRICE_PRO" =~ ^price_ ]] || [[ ! "$STRIPE_PRICE_ELITE" =~ ^price_ ]]; then
    echo "❌ Error: Price IDs must start with 'price_' not 'prod_'"
    echo "   You may have copied Product IDs instead of Price IDs"
    echo "   Core: $STRIPE_PRICE_CORE"
    echo "   Pro: $STRIPE_PRICE_PRO"
    echo "   Elite: $STRIPE_PRICE_ELITE"
    exit 1
fi

echo "✅ Found all required Stripe variables in .env.local"
echo ""
echo "Updating AWS SSM parameters..."
echo ""

# Function to update SSM parameter
update_param() {
    local name=$1
    local value=$2
    echo "Updating: $name"
    aws ssm put-parameter \
        --name "/spotter-app/$name" \
        --value "$value" \
        --type "SecureString" \
        --overwrite \
        --region us-east-1 \
        > /dev/null 2>&1
    echo "  ✓ Updated successfully"
}

# Update all Stripe parameters
update_param "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY"
update_param "STRIPE_PUBLISHABLE_KEY" "$STRIPE_PUBLISHABLE_KEY"
update_param "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET"
update_param "STRIPE_PRICE_CORE" "$STRIPE_PRICE_CORE"
update_param "STRIPE_PRICE_PRO" "$STRIPE_PRICE_PRO"
update_param "STRIPE_PRICE_ELITE" "$STRIPE_PRICE_ELITE"

echo ""
echo "=================================================="
echo "✅ ALL STRIPE PARAMETERS UPDATED IN AWS!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Deploy your app to AWS (docker build + push + ECS update)"
echo "2. Verify webhook is working: https://dashboard.stripe.com/test/webhooks"
echo "3. Test subscription flow on https://kinexfit.com"
echo ""
