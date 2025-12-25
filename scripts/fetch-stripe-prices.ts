/**
 * Fetch all Stripe products and prices
 */

import Stripe from 'stripe';

async function main() {
  console.log('\n==========================================');
  console.log('📦 FETCHING STRIPE PRODUCTS & PRICES');
  console.log('==========================================\n');

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    console.error('❌ STRIPE_SECRET_KEY not found');
    return;
  }

  const stripe = new Stripe(apiKey, {
    apiVersion: '2024-12-18.acacia',
    typescript: true,
  });

  try {
    console.log('Fetching products...\n');

    const products = await stripe.products.list({
      active: true,
      limit: 100,
    });

    console.log(`Found ${products.data.length} products:\n`);

    if (products.data.length === 0) {
      console.log('❌ No products found in Stripe account');
      console.log('   Please create products at: https://dashboard.stripe.com/test/products');
      return;
    }

    const priceMap: Record<string, string> = {};

    for (const product of products.data) {
      console.log(`\n🏷️  ${product.name}`);
      console.log(`   Product ID: ${product.id}`);

      // Get prices for this product
      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
      });

      if (prices.data.length > 0) {
        console.log(`   💰 Prices:`);
        for (const price of prices.data) {
          const amount = price.unit_amount ? `$${(price.unit_amount / 100).toFixed(2)}` : 'N/A';
          const interval = price.recurring?.interval || 'one-time';
          console.log(`      Price ID: ${price.id}`);
          console.log(`      Amount: ${amount}/${interval}`);
          console.log(`      Active: ${price.active}`);

          // Map product name to price ID
          if (product.name.includes('Core')) {
            priceMap.core = price.id;
          } else if (product.name.includes('Pro') && !product.name.includes('Core')) {
            priceMap.pro = price.id;
          } else if (product.name.includes('Elite')) {
            priceMap.elite = price.id;
          }
        }
      } else {
        console.log(`   ⚠️  No prices found`);
      }
    }

    // Generate .env.local format
    console.log('\n\n==========================================');
    console.log('📝 COPY THESE TO YOUR .env.local:');
    console.log('==========================================\n');

    if (priceMap.core && priceMap.pro && priceMap.elite) {
      console.log('# Stripe Price IDs (Test Mode)');
      console.log(`STRIPE_PRICE_CORE=${priceMap.core}`);
      console.log(`STRIPE_PRICE_PRO=${priceMap.pro}`);
      console.log(`STRIPE_PRICE_ELITE=${priceMap.elite}`);
      console.log('');
      console.log('# Client-side accessible Stripe price IDs (required for browser)');
      console.log(`NEXT_PUBLIC_STRIPE_PRICE_CORE=${priceMap.core}`);
      console.log(`NEXT_PUBLIC_STRIPE_PRICE_PRO=${priceMap.pro}`);
      console.log(`NEXT_PUBLIC_STRIPE_PRICE_ELITE=${priceMap.elite}`);
      console.log('\n');
    } else {
      console.log('⚠️  Could not find all three tiers');
      console.log('   Make sure products are named: "Spot Buddy Core", "Spot Buddy Pro", "Spot Buddy Elite"');
    }

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Error fetching products:', message);
  }
}

main().catch(console.error);
