/**
 * Verify the user-provided price IDs
 */

import Stripe from 'stripe';

const priceIds = {
  core: 'price_1SZCI8HqcH7hy1ecDXvm2FrT',
  pro: 'price_1SZCIlHqcH7hy1ecfjWftBk2',
  elite: 'price_1SZCJEHqcH7hy1echqpdgJ5y',
};

async function verifyPrice(stripe: Stripe, priceId: string, tierName: string) {
  try {
    const price = await stripe.prices.retrieve(priceId);
    const product = await stripe.products.retrieve(price.product as string);
    console.log(`✅ ${tierName}: ${priceId}`);
    console.log(`   Product: ${product.name}`);
    console.log(`   Amount: $${(price.unit_amount! / 100).toFixed(2)}/${price.recurring?.interval}`);
    console.log(`   Active: ${price.active}`);
    console.log('');
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ ${tierName}: ${priceId}`);
    console.error(`   Error: ${message}`);
    console.log('');
    return false;
  }
}

async function main() {
  const apiKey = process.env.STRIPE_SECRET_KEY;

  console.log('\n==========================================');
  console.log('🔍 VERIFYING USER-PROVIDED PRICE IDs');
  console.log('==========================================\n');

  if (!apiKey) {
    console.error('❌ STRIPE_SECRET_KEY not found');
    return;
  }

  const stripe = new Stripe(apiKey, {
    apiVersion: '2025-09-30.clover',
    typescript: true,
  });

  const results = await Promise.all([
    verifyPrice(stripe, priceIds.core, 'CORE ($7.99)'),
    verifyPrice(stripe, priceIds.pro, 'PRO ($14.99)'),
    verifyPrice(stripe, priceIds.elite, 'ELITE ($34.99)'),
  ]);

  const allValid = results.every(Boolean);

  console.log('==========================================');
  if (allValid) {
    console.log('✅ ALL PRICE IDs ARE VALID!');
    console.log('==========================================\n');
    console.log('Next steps:');
    console.log('1. Price IDs are already in your .env.local ✓');
    console.log('2. Ready to update AWS SSM parameters');
    console.log('3. Ready to deploy to production\n');
  } else {
    console.log('❌ SOME PRICE IDs ARE INVALID');
    console.log('==========================================\n');
    console.log('Please check the Stripe Dashboard and get the correct price IDs.\n');
  }
}

main().catch(console.error);
