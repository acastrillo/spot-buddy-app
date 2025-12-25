/**
 * Get Price IDs from Product IDs
 *
 * This script takes your product IDs and fetches the associated price IDs
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

async function getPriceForProduct(productId: string, productName: string) {
  try {
    // Get all prices for this product
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 10,
    });

    if (prices.data.length === 0) {
      console.error(`❌ ${productName}: No active prices found for product ${productId}`);
      return null;
    }

    // Get the first recurring monthly price
    const monthlyPrice = prices.data.find(p => p.recurring?.interval === 'month');

    if (monthlyPrice) {
      console.log(`✅ ${productName}:`);
      console.log(`   Product ID: ${productId}`);
      console.log(`   Price ID: ${monthlyPrice.id}`);
      console.log(`   Amount: $${(monthlyPrice.unit_amount! / 100).toFixed(2)}/month`);
      return monthlyPrice.id;
    } else {
      console.error(`❌ ${productName}: No monthly recurring price found`);
      return null;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ ${productName}: ${message}`);
    return null;
  }
}

async function main() {
  console.log('\n==========================================');
  console.log('🔍 FETCHING PRICE IDs FROM PRODUCT IDs');
  console.log('==========================================\n');

  const productIds = {
    core: process.env.STRIPE_PRICE_CORE || process.env.NEXT_PUBLIC_STRIPE_PRICE_CORE,
    pro: process.env.STRIPE_PRICE_PRO || process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
    elite: process.env.STRIPE_PRICE_ELITE || process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE,
  };

  console.log('Current Product IDs from .env.local:\n');

  const corePriceId = await getPriceForProduct(productIds.core!, 'CORE');
  console.log('');
  const proPriceId = await getPriceForProduct(productIds.pro!, 'PRO');
  console.log('');
  const elitePriceId = await getPriceForProduct(productIds.elite!, 'ELITE');

  if (corePriceId && proPriceId && elitePriceId) {
    console.log('\n==========================================');
    console.log('📝 UPDATE YOUR .env.local WITH THESE:');
    console.log('==========================================\n');
    console.log(`# Stripe Price IDs (Test Mode)`);
    console.log(`STRIPE_PRICE_CORE=${corePriceId}`);
    console.log(`STRIPE_PRICE_PRO=${proPriceId}`);
    console.log(`STRIPE_PRICE_ELITE=${elitePriceId}`);
    console.log('');
    console.log(`# Client-side accessible Stripe price IDs (required for browser)`);
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_CORE=${corePriceId}`);
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_PRO=${proPriceId}`);
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_ELITE=${elitePriceId}`);
    console.log('\n');
  } else {
    console.log('\n❌ Could not fetch all price IDs. Check the errors above.');
  }
}

main().catch(console.error);
