#!/bin/bash

# Script to update Stripe products and create new pricing
# New 3-tier structure: Core, Pro, Elite with monthly and annual pricing

echo "Updating Stripe products and pricing..."

# 1. Update Core
echo ""
echo "1. Updating Core product..."
stripe products update prod_TUMTNghFco0wBj \
  --name="Spot Buddy Core" \
  --description="Unlimited workouts, 3 Instagram imports/week, 10 AI requests/month, PR tracking, body metrics"

# Create new Core monthly price ($8.99)
echo "Creating Core monthly price ($8.99)..."
CORE_MONTHLY=$(stripe prices create \
  --product=prod_TUMTNghFco0wBj \
  --unit-amount=899 \
  --currency=usd \
  --recurring[interval]=month \
  --nickname="Core Monthly" | grep '"id":' | head -1 | cut -d'"' -f4)
echo "Core Monthly Price ID: $CORE_MONTHLY"

# Create Core annual price ($69.99)
echo "Creating Core annual price ($69.99)..."
CORE_ANNUAL=$(stripe prices create \
  --product=prod_TUMTNghFco0wBj \
  --unit-amount=6999 \
  --currency=usd \
  --recurring[interval]=year \
  --nickname="Core Annual" | grep '"id":' | head -1 | cut -d'"' -f4)
echo "Core Annual Price ID: $CORE_ANNUAL"

# 2. Update Pro
echo ""
echo "2. Updating Pro product..."
stripe products update prod_TUMUyfF2rQGXYQ \
  --name="Spot Buddy Pro" \
  --description="Everything in Core + unlimited Instagram imports, 30 AI requests/month, advanced analytics, workout templates"

# Create new Pro monthly price ($13.99)
echo "Creating Pro monthly price ($13.99)..."
PRO_MONTHLY=$(stripe prices create \
  --product=prod_TUMUyfF2rQGXYQ \
  --unit-amount=1399 \
  --currency=usd \
  --recurring[interval]=month \
  --nickname="Pro Monthly" | grep '"id":' | head -1 | cut -d'"' -f4)
echo "Pro Monthly Price ID: $PRO_MONTHLY"

# Create Pro annual price ($109.99)
echo "Creating Pro annual price ($109.99)..."
PRO_ANNUAL=$(stripe prices create \
  --product=prod_TUMUyfF2rQGXYQ \
  --unit-amount=10999 \
  --currency=usd \
  --recurring[interval]=year \
  --nickname="Pro Annual" | grep '"id":' | head -1 | cut -d'"' -f4)
echo "Pro Annual Price ID: $PRO_ANNUAL"

# 3. Update Elite
echo ""
echo "3. Updating Elite product..."
stripe products update prod_TUMVz07Hp3HPi0 \
  --name="Spot Buddy Elite" \
  --description="Everything in Pro + 100 AI requests/month, priority support, early access, custom templates"

# Create new Elite monthly price ($24.99)
echo "Creating Elite monthly price ($24.99)..."
ELITE_MONTHLY=$(stripe prices create \
  --product=prod_TUMVz07Hp3HPi0 \
  --unit-amount=2499 \
  --currency=usd \
  --recurring[interval]=month \
  --nickname="Elite Monthly" | grep '"id":' | head -1 | cut -d'"' -f4)
echo "Elite Monthly Price ID: $ELITE_MONTHLY"

# Create Elite annual price ($199.99)
echo "Creating Elite annual price ($199.99)..."
ELITE_ANNUAL=$(stripe prices create \
  --product=prod_TUMVz07Hp3HPi0 \
  --unit-amount=19999 \
  --currency=usd \
  --recurring[interval]=year \
  --nickname="Elite Annual" | grep '"id":' | head -1 | cut -d'"' -f4)
echo "Elite Annual Price ID: $ELITE_ANNUAL"

# Output all price IDs for .env file
echo ""
echo "=========================================="
echo "Update your .env.local file with these values:"
echo "=========================================="
echo "STRIPE_PRICE_CORE=$CORE_MONTHLY"
echo "STRIPE_PRICE_CORE_ANNUAL=$CORE_ANNUAL"
echo "STRIPE_PRICE_PRO=$PRO_MONTHLY"
echo "STRIPE_PRICE_PRO_ANNUAL=$PRO_ANNUAL"
echo "STRIPE_PRICE_ELITE=$ELITE_MONTHLY"
echo "STRIPE_PRICE_ELITE_ANNUAL=$ELITE_ANNUAL"
echo ""
echo "NEXT_PUBLIC_STRIPE_PRICE_CORE=$CORE_MONTHLY"
echo "NEXT_PUBLIC_STRIPE_PRICE_CORE_ANNUAL=$CORE_ANNUAL"
echo "NEXT_PUBLIC_STRIPE_PRICE_PRO=$PRO_MONTHLY"
echo "NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL=$PRO_ANNUAL"
echo "NEXT_PUBLIC_STRIPE_PRICE_ELITE=$ELITE_MONTHLY"
echo "NEXT_PUBLIC_STRIPE_PRICE_ELITE_ANNUAL=$ELITE_ANNUAL"
echo "=========================================="
echo ""
echo "Note: Old price IDs can be archived after migration"
echo "Old Core Monthly: price_1SXNkhHdCvK1ftFggPNictAm"
echo "Old Pro Monthly: price_1SXNlyHdCvK1ftFg2rKRnNDG"
echo "Old Elite Monthly: price_1SXNmSHdCvK1ftFgibTcq5mI"
