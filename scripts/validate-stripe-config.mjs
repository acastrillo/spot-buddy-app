#!/usr/bin/env node

import Stripe from 'stripe';
import { config } from 'dotenv';

// Load environment variables
config();

const TIERS = ['starter', 'pro', 'elite'];

async function validateStripeConfig() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   Stripe Configuration Validator');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Check if secret key is set
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error('❌ STRIPE_SECRET_KEY is not set');
    process.exit(1);
  }

  // 2. Detect mode
  const mode = detectMode(secretKey);
  const nodeEnv = process.env.NODE_ENV || 'development';
  console.log(`📋 Environment: ${nodeEnv}`);
  console.log(`🔑 Stripe Mode: ${mode}\n`);

  // 3. Validate mode vs environment
  if (nodeEnv === 'production' && mode === 'test') {
    console.error('❌ CRITICAL: Using test Stripe keys in production!');
    console.error('   This will prevent real payments from being processed.');
    process.exit(1);
  }

  if (nodeEnv !== 'production' && mode === 'live') {
    console.warn('⚠️  WARNING: Using live Stripe keys in non-production environment!');
    console.warn('   Real charges will be processed.\n');
  }

  // 4. Initialize Stripe
  const stripe = new Stripe(secretKey, {
    apiVersion: '2024-12-18.acacia',
    typescript: true,
  });

  // 5. Validate webhook secret
  console.log('🔒 Webhook Secret:');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('   ❌ STRIPE_WEBHOOK_SECRET is not set');
    console.error('   Webhooks will fail signature verification!\n');
  } else if (webhookSecret.startsWith('whsec_')) {
    console.log('   ✅ Webhook secret is set\n');
  } else {
    console.error('   ❌ Invalid webhook secret format (should start with "whsec_")\n');
  }

  // 6. Validate price IDs
  console.log('💰 Price ID Validation:\n');

  const envKeys = {
    starter: ['STRIPE_PRICE_STARTER', 'NEXT_PUBLIC_STRIPE_PRICE_STARTER'],
    pro: ['STRIPE_PRICE_PRO', 'NEXT_PUBLIC_STRIPE_PRICE_PRO'],
    elite: ['STRIPE_PRICE_ELITE', 'NEXT_PUBLIC_STRIPE_PRICE_ELITE'],
  };

  let allValid = true;

  for (const tier of TIERS) {
    console.log(`   ${tier.toUpperCase()}:`);

    // Find the price ID from env vars
    let priceId = null;
    for (const envKey of envKeys[tier]) {
      const value = process.env[envKey];
      if (value) {
        priceId = value;
        break;
      }
    }

    if (!priceId) {
      console.error(`      ❌ No price ID configured`);
      console.error(`         Missing env vars: ${envKeys[tier].join(' or ')}\n`);
      allValid = false;
      continue;
    }

    // Validate price ID format
    if (!priceId.startsWith('price_')) {
      console.error(`      ❌ Invalid price ID format: ${priceId}`);
      console.error(`         Price IDs should start with "price_"\n`);
      allValid = false;
      continue;
    }

    // Fetch price from Stripe
    try {
      const price = await stripe.prices.retrieve(priceId);

      // Check if price is active
      if (!price.active) {
        console.error(`      ❌ Price exists but is INACTIVE: ${priceId}`);
        console.error(`         Reactivate this price in Stripe Dashboard\n`);
        allValid = false;
        continue;
      }

      // Check if price mode matches
      const priceMode = price.livemode ? 'live' : 'test';
      if (priceMode !== mode) {
        console.error(`      ❌ Price mode mismatch: ${priceId}`);
        console.error(`         Key mode: ${mode}, Price mode: ${priceMode}\n`);
        allValid = false;
        continue;
      }

      // Get product details
      const product = await stripe.products.retrieve(price.product);

      // Success
      console.log(`      ✅ ${priceId}`);
      console.log(`         Product: ${product.name}`);
      console.log(`         Amount: ${formatPrice(price)}`);
      console.log(`         Status: Active`);
      console.log(`         Mode: ${priceMode}\n`);

    } catch (error) {
      if (error.code === 'resource_missing') {
        console.error(`      ❌ Price ID not found in Stripe: ${priceId}`);
        console.error(`         This price does not exist or was deleted\n`);
      } else {
        console.error(`      ❌ Error validating price: ${error.message}\n`);
      }
      allValid = false;
    }
  }

  // 7. Summary
  console.log('═══════════════════════════════════════════════════════════');
  if (allValid && webhookSecret) {
    console.log('   ✅ All Stripe configuration is valid!');
    console.log('═══════════════════════════════════════════════════════════\n');
    process.exit(0);
  } else {
    console.log('   ❌ Stripe configuration has errors - fix them before deploying!');
    console.log('═══════════════════════════════════════════════════════════\n');
    process.exit(1);
  }
}

function detectMode(key) {
  if (key.startsWith('sk_test_')) return 'test';
  if (key.startsWith('sk_live_')) return 'live';
  return 'unknown';
}

function formatPrice(price) {
  const amount = (price.unit_amount / 100).toFixed(2);
  const currency = price.currency.toUpperCase();
  const interval = price.recurring ? `/${price.recurring.interval}` : '';
  return `$${amount} ${currency}${interval}`;
}

validateStripeConfig().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
