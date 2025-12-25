/**
 * Verify specific Stripe price IDs
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

const priceIds = {
  core: 'price_1SZCI8HqcH7hy1ecDXvm2FrT',
  pro: 'price_1SZCIlHqcH7hy1ecfjWftBk2',
  elite: 'price_1SZCJEHqcH7hy1echqpdgJ5y',
};

async function verifyPrice(priceId: string, tierName: string) {
  try {
    const price = await stripe.prices.retrieve(priceId);
    console.log(`✅ ${tierName}: ${priceId}`);
    console.log(`   Amount: $${(price.unit_amount! / 100).toFixed(2)}/${price.recurring?.interval}`);
    console.log(`   Active: ${price.active}`);
    console.log(`   Product: ${price.product}`);
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ ${tierName}: ${priceId}`);
    console.error(`   Error: ${message}`);
    return false;
  }
}

async function main() {
  console.log('\n==========================================');
  console.log('🔍 VERIFYING NEW PRICE IDs');
  console.log('==========================================\n');

  const results = await Promise.all([
    verifyPrice(priceIds.core, 'CORE ($7.99)'),
    verifyPrice(priceIds.pro, 'PRO ($14.99)'),
    verifyPrice(priceIds.elite, 'ELITE ($34.99)'),
  ]);

  const allValid = results.every(Boolean);

  console.log('\n==========================================');
  if (allValid) {
    console.log('✅ ALL PRICE IDs ARE VALID!');
    console.log('==========================================\n');
    console.log('Ready to update AWS SSM parameters.');
  } else {
    console.log('❌ SOME PRICE IDs ARE INVALID');
    console.log('==========================================\n');
    console.log('Please check the Stripe Dashboard and update .env.local');
  }
}

main().catch(console.error);
