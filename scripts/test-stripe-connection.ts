/**
 * Test Stripe API Connection
 */

import Stripe from 'stripe';

async function main() {
  console.log('\n==========================================');
  console.log('🔌 TESTING STRIPE CONNECTION');
  console.log('==========================================\n');

  const apiKey = process.env.STRIPE_SECRET_KEY;

  if (!apiKey) {
    console.error('❌ STRIPE_SECRET_KEY not found in environment variables');
    return;
  }

  console.log(`✅ API Key found: ${apiKey.substring(0, 20)}...`);
  console.log(`   Mode: ${apiKey.startsWith('sk_test_') ? 'TEST' : 'LIVE'}\n`);

  try {
    const stripe = new Stripe(apiKey, {
      apiVersion: '2025-09-30.clover',
      typescript: true,
    });

    console.log('Attempting to connect to Stripe API...\n');

    // Try to list products
    const products = await stripe.products.list({ limit: 1 });
    console.log('✅ Successfully connected to Stripe!\n');
    console.log(`Products in account: ${products.data.length > 0 ? 'Found products' : 'No products yet'}\n`);

    if (products.data.length === 0) {
      console.log('⚠️  No products found in your Stripe account.');
      console.log('   You need to create products first.');
      console.log('   Go to: https://dashboard.stripe.com/test/products\n');
    }

    // Get account info
    const balance = await stripe.balance.retrieve();
    console.log('Account Status: Active');
    console.log(`Available Balance: $${(balance.available[0]?.amount || 0) / 100}`);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to connect to Stripe:');
    console.error(`   Error: ${message}`);
    console.error('\n   Possible issues:');
    console.error('   1. Invalid API key');
    console.error('   2. API key has insufficient permissions');
    console.error('   3. Network connection issue');
  }
}

main().catch(console.error);
