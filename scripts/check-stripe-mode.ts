/**
 * Check Stripe API mode and account info
 */

import Stripe from 'stripe';

async function main() {
  const apiKey = process.env.STRIPE_SECRET_KEY;

  console.log('\n==========================================');
  console.log('🔍 STRIPE MODE CHECK');
  console.log('==========================================\n');

  if (!apiKey) {
    console.error('❌ STRIPE_SECRET_KEY not found');
    return;
  }

  console.log(`API Key: ${apiKey.substring(0, 15)}...`);

  if (apiKey.startsWith('sk_test_')) {
    console.log('Mode: TEST MODE ✅\n');
  } else if (apiKey.startsWith('sk_live_')) {
    console.log('Mode: LIVE MODE ⚠️\n');
  } else {
    console.log('Mode: UNKNOWN ❌\n');
  }

  const stripe = new Stripe(apiKey, {
    apiVersion: '2025-09-30.clover',
    typescript: true,
  });

  try {
    // Try both test and checking actual mode
    console.log('Fetching account information...\n');

    const balance = await stripe.balance.retrieve();
    console.log('✅ API connection successful');
    console.log(`Account currency: ${balance.available[0]?.currency || 'N/A'}\n`);

    // Try fetching products with different filters
    console.log('Checking for products...\n');

    const allProducts = await stripe.products.list({ limit: 100 });
    console.log(`Total products (all): ${allProducts.data.length}`);

    const activeProducts = await stripe.products.list({ active: true, limit: 100 });
    console.log(`Active products: ${activeProducts.data.length}`);

    const inactiveProducts = await stripe.products.list({ active: false, limit: 100 });
    console.log(`Inactive products: ${inactiveProducts.data.length}\n`);

    if (allProducts.data.length > 0) {
      console.log('Products found:');
      for (const product of allProducts.data) {
        console.log(`  - ${product.name} (${product.active ? 'active' : 'inactive'})`);
      }
    } else {
      console.log('⚠️  NO PRODUCTS FOUND');
      console.log('\nPossible reasons:');
      console.log('1. You\'re viewing LIVE mode in dashboard but API key is for TEST mode');
      console.log('2. You\'re viewing TEST mode in dashboard but API key is for LIVE mode');
      console.log('3. Products were just created and need a moment to sync');
      console.log('\n💡 Solution:');
      console.log('Check the toggle in top-right of Stripe Dashboard:');
      console.log('- Should say "Test mode" if using test API key');
      console.log('- Should say "Live mode" if using live API key');
    }

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Error:', message);
  }
}

main().catch(console.error);
