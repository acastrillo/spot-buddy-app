/**
 * Verify Stripe Price IDs
 *
 * This script checks if the price IDs in your environment variables
 * actually exist in your Stripe account.
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
  typescript: true,
});

async function verifyPrice(priceId: string, tierName: string) {
  try {
    const price = await stripe.prices.retrieve(priceId);
    console.log(`✅ ${tierName}: ${priceId}`);
    console.log(`   Product: ${price.product}`);
    console.log(`   Amount: $${(price.unit_amount! / 100).toFixed(2)}/${price.recurring?.interval}`);
    console.log(`   Active: ${price.active}`);
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ ${tierName}: ${priceId}`);
    console.error(`   Error: ${message}`);
    return false;
  }
}

async function listAllPrices() {
  console.log('\n📋 All available prices in your Stripe account:\n');
  const prices = await stripe.prices.list({
    active: true,
    limit: 100,
    expand: ['data.product'],
  });

  for (const price of prices.data) {
    const product = price.product as Stripe.Product;
    console.log(`Price ID: ${price.id}`);
    console.log(`  Product: ${product.name}`);
    console.log(`  Amount: $${(price.unit_amount! / 100).toFixed(2)}/${price.recurring?.interval || 'one-time'}`);
    console.log('');
  }
}

async function main() {
  console.log('\n==========================================');
  console.log('🔍 STRIPE PRICE VERIFICATION');
  console.log('==========================================\n');

  const priceIds = {
    core: process.env.STRIPE_PRICE_CORE || process.env.NEXT_PUBLIC_STRIPE_PRICE_CORE,
    pro: process.env.STRIPE_PRICE_PRO || process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
    elite: process.env.STRIPE_PRICE_ELITE || process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE,
  };

  console.log('Checking configured price IDs:\n');

  const results = await Promise.all([
    verifyPrice(priceIds.core!, 'CORE'),
    verifyPrice(priceIds.pro!, 'PRO'),
    verifyPrice(priceIds.elite!, 'ELITE'),
  ]);

  const allValid = results.every(Boolean);

  if (!allValid) {
    console.log('\n⚠️  Some price IDs are invalid!\n');
    await listAllPrices();
    console.log('💡 Update your .env.local with the correct price IDs from above.');
  } else {
    console.log('\n✅ All price IDs are valid!\n');
  }
}

main().catch(console.error);
